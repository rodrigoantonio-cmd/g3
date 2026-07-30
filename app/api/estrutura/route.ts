// Route handler POST /api/estrutura
// Recebe { briefing, bigIdea, resumo, extra } e devolve a CampanhaEstruturada
// COMPLETA (mesmo tipo consumido por /api/planilha e /api/copies).
//   - nomeEscolhido = bigIdea
//   - resumo        = resumo
//   - extra         = instrucoes adicionais do usuario
//
// Segue o padrao do /api/generate (cerebro + guardrails + JSON robusto).
// Sem chave da Anthropic -> devolve um stub estruturado + aviso.

import { NextRequest, NextResponse } from "next/server";
import { getAnthropic, ANTHROPIC_MODEL, anthropicConfigurado } from "@/lib/anthropic";
import { getKnowledge } from "@/lib/knowledge";
import { getReferencias } from "@/lib/referencias";
import type { Briefing, CampanhaEstruturada } from "@/lib/types";

// Roda no runtime Node.js (precisamos de fs para ler o knowledge/).
export const runtime = "nodejs";
export const maxDuration = 300;

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
    "carrinho": "...", "cupom": "...", "oferta": "...", "abrangencia": "...",
    "paleta": "..."
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
function stub(b: Briefing, bigIdea: string, resumo: string): CampanhaEstruturada {
  const concurso = b.concurso || "seu concurso";
  const nome = bigIdea || `Missao ${concurso} | Do edital a aprovacao`;
  const carrinho =
    b.dataInicioCarrinho || b.dataFimCarrinho
      ? `${b.dataInicioCarrinho || "?"} a ${b.dataFimCarrinho || "?"}`
      : "a definir";
  return {
    bigIdeas: [nome],
    nomeEscolhido: nome,
    resumo:
      resumo ||
      `Exemplo de campanha para ${concurso} (situacao: ${b.situacao}). ` +
        "Configure a chave ANTHROPIC_API_KEY para gerar conteudo real.",
    capa: {
      campanha: nome,
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
// Forca nomeEscolhido = bigIdea e resumo = resumo (fonte-da-verdade das etapas).
function normalizar(
  parcial: Partial<CampanhaEstruturada>,
  b: Briefing,
  bigIdea: string,
  resumo: string
): CampanhaEstruturada {
  const base = stub(b, bigIdea, resumo);
  const bigIdeasArr =
    Array.isArray(parcial.bigIdeas) && parcial.bigIdeas.length > 0
      ? parcial.bigIdeas
      : base.bigIdeas;
  const nomeEscolhido = bigIdea || parcial.nomeEscolhido || bigIdeasArr[0] || "";
  return {
    bigIdeas: bigIdeasArr,
    nomeEscolhido,
    resumo: resumo || (typeof parcial.resumo === "string" ? parcial.resumo : ""),
    capa: { ...base.capa, ...(parcial.capa ?? {}), campanha: nomeEscolhido || base.capa.campanha },
    disparos: Array.isArray(parcial.disparos) ? parcial.disparos : [],
    anuncios: Array.isArray(parcial.anuncios) ? parcial.anuncios : [],
    oferta: Array.isArray(parcial.oferta) ? parcial.oferta : [],
    programacao: Array.isArray(parcial.programacao) ? parcial.programacao : [],
    mentorias: Array.isArray(parcial.mentorias) ? parcial.mentorias : [],
    whatsappGrupos: Array.isArray(parcial.whatsappGrupos) ? parcial.whatsappGrupos : [],
  };
}

export async function POST(req: NextRequest) {
  let corpo: { briefing?: Briefing; bigIdea?: string; resumo?: string; extra?: string };
  try {
    corpo = (await req.json()) as {
      briefing?: Briefing;
      bigIdea?: string;
      resumo?: string;
      extra?: string;
    };
  } catch {
    return NextResponse.json(
      { erro: "JSON invalido no corpo da requisicao." },
      { status: 400 }
    );
  }

  const briefing = corpo?.briefing;
  const bigIdea = (corpo?.bigIdea || "").trim();
  const resumo = (corpo?.resumo || "").trim();
  const extra = (corpo?.extra || "").trim();

  if (!briefing?.concurso) {
    return NextResponse.json(
      { erro: "Informe o briefing (pelo menos o nome do concurso)." },
      { status: 400 }
    );
  }
  if (!bigIdea) {
    return NextResponse.json(
      { erro: "Informe a Big Idea escolhida." },
      { status: 400 }
    );
  }

  // Sem chave -> stub (status 200) para o app rodar.
  const client = getAnthropic();
  if (!client || !anthropicConfigurado) {
    return NextResponse.json(
      {
        ...stub(briefing, bigIdea, resumo),
        aviso:
          "A chave ANTHROPIC_API_KEY nao esta configurada. Esta e uma estrutura de exemplo (stub). " +
          "Preencha a chave no .env.local para gerar a planilha de verdade.",
      },
      { status: 200 }
    );
  }

  // Monta o system prompt com o cerebro + guardrails.
  const cerebro = await getKnowledge();
  const referencias = await getReferencias();
  const systemPrompt = [
    "Voce e um especialista em lancamentos digitais do time de Growth da Estrategia Concursos.",
    "Use a BASE DE CONHECIMENTO abaixo como fonte de verdade para nomes, funil, cronograma e oferta.",
    GUARDRAILS,
    "===== BASE DE CONHECIMENTO (CEREBRO) =====",
    cerebro,
    "===== FIM DA BASE DE CONHECIMENTO =====",
    ...(referencias
      ? ["", "===== REFERENCIAS DE COPY (estilo/historico) =====", referencias, "====="]
      : []),
    "",
    "Sua tarefa: gerar a CAMPANHA ESTRUTURADA COMPLETA em JSON, pronta para virar planilha.",
    "A Big Idea (nome) e o resumo executivo JA FORAM ESCOLHIDOS pelo usuario e sao fixos:",
    `- nomeEscolhido DEVE ser exatamente: ${bigIdea}`,
    `- resumo DEVE ser exatamente o resumo fornecido (nao reescreva).`,
    "Responda SOMENTE com um JSON valido, sem markdown e sem texto fora do JSON, no formato EXATO:",
    FORMATO_JSON,
    "",
    "Instrucoes de preenchimento:",
    "- bigIdeas: pode repetir o nomeEscolhido como primeira opcao (o array nao e mais o foco).",
    "- nomeEscolhido: use exatamente a Big Idea escolhida (acima).",
    "- resumo: use exatamente o resumo fornecido.",
    "- capa: preencha todos os campos com base no briefing e no cerebro (campanha = nomeEscolhido).",
    "- capa.paleta: proponha uma paleta de cores COERENTE com a identidade visual do concurso/orgao. Informe as cores em HEX e ONDE usar cada uma (fundo, destaques/numeros, CTA, texto). Mantenha os padroes do framework: dourado para o que e premium/numeros de destaque; use vermelho SOMENTE se for parte da identidade do orgao/concurso. Se o briefing nao indicar cores, proponha uma paleta sobria e legivel.",
    "- disparos: cronograma de e-mails/WhatsApp API por fase (Captação, Ao vivo, Vendas). Seja completo e realista.",
    "- anuncios: pecas de midia paga por objetivo (Captação e Vendas).",
    "- oferta: linhas com periodo, produtos, promocao, bonus (mentorias) e cupom.",
    "- programacao: agenda de eventos ao vivo (aulas, lives).",
    "- mentorias: agenda de mentorias (o unico bonus tipico).",
    "- whatsappGrupos: mensagens organicas para grupos de WhatsApp por fase.",
    "Preencha TODOS os arrays com o maximo de itens uteis. Nunca deixe um array vazio se houver conteudo plausivel.",
  ].join("\n");

  const userPrompt = [
    "Gere a campanha estruturada a partir destes dados ja aprovados:",
    "",
    `BIG IDEA ESCOLHIDA (nomeEscolhido): ${bigIdea}`,
    "",
    "RESUMO EXECUTIVO (resumo, use exatamente):",
    resumo || "(nao fornecido)",
    "",
    "BRIEFING:",
    briefingParaTexto(briefing),
    ...(extra ? ["", "INSTRUCOES ADICIONAIS DO USUARIO (respeite-as):", extra] : []),
  ].join("\n");

  // Retry com backoff (4x) em erro de conexao transitorio.
  const criar = () =>
    client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  let resposta;
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    try {
      resposta = await criar();
      break;
    } catch (e) {
      ultimoErro = e;
      if (tentativa < 4) {
        await new Promise((r) => setTimeout(r, tentativa * 1500));
      }
    }
  }
  if (!resposta) {
    const msg = ultimoErro instanceof Error ? ultimoErro.message : "erro desconhecido";
    return NextResponse.json(
      { erro: `Falha ao chamar a Anthropic: ${msg}` },
      { status: 502 }
    );
  }

  const texto = resposta.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  // Parse robusto: remove cercas e extrai do primeiro "{" ao ultimo "}".
  let campanha: CampanhaEstruturada;
  try {
    const semCercas = texto.replace(/```json/gi, "").replace(/```/g, "").trim();
    const ini = semCercas.indexOf("{");
    const fim = semCercas.lastIndexOf("}");
    const candidato = ini >= 0 && fim > ini ? semCercas.slice(ini, fim + 1) : semCercas;
    const parcial = JSON.parse(candidato) as Partial<CampanhaEstruturada>;
    campanha = normalizar(parcial, briefing, bigIdea, resumo);
  } catch {
    campanha = { ...stub(briefing, bigIdea, resumo) };
  }

  return NextResponse.json(campanha, { status: 200 });
}
