// Route handler POST /api/generate
// Recebe o briefing (JSON), monta o system prompt a partir do "cerebro"
// (knowledge/) + guardrails, chama a Anthropic e devolve a CampanhaEstruturada.
//
// Se a chave ANTHROPIC_API_KEY nao estiver configurada, devolve 200 com um
// payload de exemplo (stub estruturado) e um aviso, para o app rodar mesmo sem chave.

import { NextRequest, NextResponse } from "next/server";
import { getAnthropic, ANTHROPIC_MODEL, anthropicConfigurado } from "@/lib/anthropic";
import { getKnowledge } from "@/lib/knowledge";
import { getReferencias } from "@/lib/referencias";
import type { Briefing, CampanhaEstruturada } from "@/lib/types";

// Roda no runtime Node.js (precisamos de fs para ler o knowledge/).
export const runtime = "nodejs";

// Regras/guardrails do time de Growth (resumo do knowledge/00).
const GUARDRAILS = `
REGRAS (guardrails) que voce DEVE seguir:
- Big Idea vende o conceito; Big Promise entrega o numero (vagas + salario + prazo + prova social).
- Regionalizacao: concurso fiscal/federal de alto salario => nacional; estadual/municipal => regional.
- Nunca vender para quem ja comprou/assina.
- Funil padrao: Convite -> Alerta -> Promo -> Mentoria (+ Reminder VIP). Canais: e-mail, WhatsApp API (broadcast) e WhatsApp de grupo (organico).
- Verdade nos numeros: salario/vagas plausiveis; se nao confirmados, marque como "previstas/solicitadas" com aviso.
- Foco em lancamentos individuais por concurso (nao campanhas grandes tipo Black Friday).
- Escreva em portugues do Brasil, tom direto e comercial.
- O SQ (Sistema de Questoes) e uma FERRAMENTA JA INCLUSA nos Pacotes/Assinaturas, NAO e bonus. O unico bonus tipico sao as mentorias.
- Garantia = 7 dias. Acesso/atualizacao (incl. SQ) = 12 meses (nunca "ate a prova" nem "permanente"). A data da prova pode ser citada.
- Promo exclui compradores + assinantes. Alerta so para inscritos. Mentoria so para compradores do cupom.
- Prova social e historica/da area — nunca inventar aprovado do concurso-alvo.
`;

// Monta o texto do briefing de forma legivel para o modelo.
function briefingParaTexto(b: Briefing): string {
  return [
    `Concurso: ${b.concurso}`,
    `Orgao: ${b.orgao}`,
    `Situacao: ${b.situacao}`,
    `Banca: ${b.banca}`,
    `Vagas: ${b.vagas}`,
    `Salario: ${b.salario}`,
    `Inicio do carrinho: ${b.dataInicioCarrinho}`,
    `Fim do carrinho: ${b.dataFimCarrinho}`,
    `Desconto (%): ${b.descontoPercent}`,
    `Cupom: ${b.cupom}`,
    `Observacoes: ${b.observacoes}`,
  ].join("\n");
}

// Formato exato (esqueleto) da CampanhaEstruturada pedido ao modelo.
const FORMATO_JSON = `{
  "bigIdeas": ["...", "...", "...", "...", "..."],
  "nomeEscolhido": "...",
  "resumo": "...",
  "capa": {
    "campanha": "...", "concurso": "...", "orgao": "...", "situacao": "...",
    "banca": "...", "vagas": "...", "salario": "...", "escolaridade": "...",
    "carrinho": "...", "cupom": "...", "oferta": "...", "abrangencia": "..."
  },
  "disparos": [
    { "fase": "Captação|Ao vivo|Vendas", "peca": "...", "data": "...", "hora": "...", "base": "...", "excluir": "...", "assunto": "...", "preHeader": "..." }
  ],
  "anuncios": [
    { "objetivo": "Captação|Vendas", "formato": "...", "angulo": "...", "publico": "..." }
  ],
  "oferta": [
    { "periodo": "...", "produtos": "...", "promocao": "...", "bonus": "...", "cupom": "..." }
  ],
  "programacao": [
    { "data": "...", "hora": "...", "professor": "...", "evento": "...", "conteudo": "..." }
  ],
  "mentorias": [
    { "data": "...", "hora": "...", "professor": "...", "tema": "..." }
  ],
  "whatsappGrupos": [
    { "data": "...", "hora": "...", "fase": "...", "assunto": "...", "mensagem": "..." }
  ]
}`;

// Stub estruturado usado quando nao ha chave da Anthropic (ou como base de defaults).
function stub(b: Briefing): CampanhaEstruturada {
  const concurso = b.concurso || "seu concurso";
  const bigIdeas = [
    `Marco Zero ${concurso} | O plano para largar na frente`,
    `Missao ${concurso} | Do edital a aprovacao`,
    `Reta Final ${concurso} | Ultimos dias para virar o jogo`,
    `Operacao ${concurso} | O caminho mais curto ate a vaga`,
    `Alerta ${concurso} | A hora de garantir sua preparacao`,
  ];
  const carrinho =
    b.dataInicioCarrinho || b.dataFimCarrinho
      ? `${b.dataInicioCarrinho || "?"} a ${b.dataFimCarrinho || "?"}`
      : "a definir";
  return {
    bigIdeas,
    nomeEscolhido: bigIdeas[0],
    resumo:
      `Exemplo de campanha para ${concurso} (situacao: ${b.situacao}). ` +
      "Este e um resultado de demonstracao. Configure a chave ANTHROPIC_API_KEY para gerar conteudo real.",
    capa: {
      campanha: bigIdeas[0],
      concurso,
      orgao: b.orgao || "",
      situacao: b.situacao || "",
      banca: b.banca || "",
      vagas: b.vagas || "",
      salario: b.salario || "",
      escolaridade: "",
      carrinho,
      cupom: b.cupom || "",
      oferta: b.descontoPercent ? `${b.descontoPercent}% de desconto` : "",
      abrangencia: "",
    },
    disparos: [],
    anuncios: [],
    oferta: [],
    programacao: [],
    mentorias: [],
    whatsappGrupos: [],
  };
}

// Garante que o objeto tenha todos os campos esperados (arrays default []).
function normalizar(parcial: Partial<CampanhaEstruturada>, b: Briefing): CampanhaEstruturada {
  const base = stub(b);
  const bigIdeas = Array.isArray(parcial.bigIdeas) ? parcial.bigIdeas : base.bigIdeas;
  return {
    bigIdeas,
    nomeEscolhido:
      typeof parcial.nomeEscolhido === "string" && parcial.nomeEscolhido
        ? parcial.nomeEscolhido
        : bigIdeas[0] ?? "",
    resumo: typeof parcial.resumo === "string" ? parcial.resumo : "",
    capa: { ...base.capa, ...(parcial.capa ?? {}) },
    disparos: Array.isArray(parcial.disparos) ? parcial.disparos : [],
    anuncios: Array.isArray(parcial.anuncios) ? parcial.anuncios : [],
    oferta: Array.isArray(parcial.oferta) ? parcial.oferta : [],
    programacao: Array.isArray(parcial.programacao) ? parcial.programacao : [],
    mentorias: Array.isArray(parcial.mentorias) ? parcial.mentorias : [],
    whatsappGrupos: Array.isArray(parcial.whatsappGrupos) ? parcial.whatsappGrupos : [],
  };
}

export async function POST(req: NextRequest) {
  // 1) Le e valida o briefing recebido.
  let briefing: Briefing;
  try {
    briefing = (await req.json()) as Briefing;
  } catch {
    return NextResponse.json(
      { erro: "JSON invalido no corpo da requisicao." },
      { status: 400 }
    );
  }

  if (!briefing?.concurso) {
    return NextResponse.json(
      { erro: "Informe pelo menos o nome do concurso." },
      { status: 400 }
    );
  }

  // 2) Sem chave da Anthropic -> devolve stub (status 200) para o app rodar.
  const client = getAnthropic();
  if (!client || !anthropicConfigurado) {
    return NextResponse.json(
      {
        ...stub(briefing),
        aviso:
          "A chave ANTHROPIC_API_KEY nao esta configurada. Este e um resultado de exemplo (stub). " +
          "Preencha a chave no .env.local para gerar campanhas de verdade.",
      },
      { status: 200 }
    );
  }

  // 3) Monta o system prompt com o cerebro + guardrails.
  const cerebro = await getKnowledge();
  // Base de consulta (referencias de copy): opcional, entra depois do cerebro.
  const referencias = await getReferencias();
  const systemPrompt = [
    "Voce e um especialista em lancamentos digitais do time de Growth da Estrategia Concursos.",
    "Use a BASE DE CONHECIMENTO abaixo como fonte de verdade para nomes, funil, cronograma e oferta.",
    GUARDRAILS,
    "===== BASE DE CONHECIMENTO (CEREBRO) =====",
    cerebro,
    "===== FIM DA BASE DE CONHECIMENTO =====",
    ...(referencias
      ? [
          "",
          "===== REFERENCIAS DE COPY (estilo/historico) =====",
          referencias,
          "=====",
        ]
      : []),
    "",
    "Sua tarefa: gerar a CAMPANHA ESTRUTURADA COMPLETA em JSON, pronta para virar planilha.",
    "Responda SOMENTE com um JSON valido, sem markdown e sem texto fora do JSON, no formato EXATO:",
    FORMATO_JSON,
    "",
    "Instrucoes de preenchimento:",
    "- bigIdeas: 5 opcoes de nome (Big Idea | Big Promise). nomeEscolhido = a melhor opcao (normalmente bigIdeas[0]).",
    "- resumo: resumo executivo curto da campanha (funil, cadencia, canais, oferta).",
    "- capa: preencha todos os campos com base no briefing e no cerebro.",
    "- disparos: cronograma de e-mails/WhatsApp API por fase (Captação, Ao vivo, Vendas). Seja completo e realista.",
    "- anuncios: pecas de midia paga por objetivo (Captação e Vendas).",
    "- oferta: linhas com periodo, produtos, promocao, bonus (mentorias) e cupom.",
    "- programacao: agenda de eventos ao vivo (aulas, lives).",
    "- mentorias: agenda de mentorias (o unico bonus tipico).",
    "- whatsappGrupos: mensagens organicas para grupos de WhatsApp por fase.",
    "Preencha TODOS os arrays com o maximo de itens uteis. Nunca deixe um array vazio se houver conteudo plausivel.",
  ].join("\n");

  const userPrompt = `Gere a campanha estruturada a partir deste briefing:\n\n${briefingParaTexto(
    briefing
  )}`;

  // 4) Chama a Anthropic Messages API.
  try {
    const resposta = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Junta os blocos de texto da resposta.
    const texto = resposta.content
      .filter((bloco): bloco is { type: "text"; text: string } => bloco.type === "text")
      .map((bloco) => bloco.text)
      .join("\n")
      .trim();

    // Tenta interpretar o JSON devolvido pelo modelo, de forma robusta:
    // remove cercas de codigo e extrai do primeiro "{" ao ultimo "}".
    let campanha: CampanhaEstruturada;
    try {
      const semCercas = texto.replace(/```json/gi, "").replace(/```/g, "").trim();
      const ini = semCercas.indexOf("{");
      const fim = semCercas.lastIndexOf("}");
      const candidato = ini >= 0 && fim > ini ? semCercas.slice(ini, fim + 1) : semCercas;
      const parcial = JSON.parse(candidato) as Partial<CampanhaEstruturada>;
      campanha = normalizar(parcial, briefing);
    } catch {
      // Se nao vier JSON valido, devolvemos um stub com o texto cru no resumo.
      campanha = { ...stub(briefing), resumo: texto };
    }

    return NextResponse.json(campanha, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json(
      { erro: `Falha ao chamar a Anthropic: ${msg}` },
      { status: 502 }
    );
  }
}
