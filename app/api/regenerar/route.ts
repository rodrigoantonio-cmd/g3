// Route handler POST /api/regenerar
// Regenera SO as copies IMPACTADAS por edicoes numa campanha ja salva.
//
// Corpo (JSON): { id: string, estruturaNova: CampanhaEstruturada }
//
// Fluxo:
//   1) Carrega a estrutura ANTERIOR (asset campanha_json mais recente da campanha).
//   2) DIFF dos disparos por chave `fase||peca`: impactada = peca nova OU cujo
//      assunto/preHeader/base mudou. Para whatsappGrupos: impactada se a
//      "mensagem" mudou (re-render direto, sem LLM).
//   3) Regenera SO as impactadas (e-mails via LLM no mesmo padrao do /api/copies;
//      whatsapp via mensagem), monta um zip com essas pecas + "_alteracoes.txt".
//   4) Salva a estruturaNova como NOVO asset (status='ajustada').
//
// Responde application/zip (filename="copies-atualizadas.docx.zip").
// A logica de LLM/parse/retry e uma COPIA do padrao de /api/copies (nao importada).

import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import {
  getAnthropic,
  ANTHROPIC_MODEL,
  anthropicConfigurado,
  ehErroDeCredito,
  MSG_SEM_CREDITO,
} from "@/lib/anthropic";
import { getKnowledge } from "@/lib/knowledge";
import { getReferencias } from "@/lib/referencias";
import { renderEmailDocx } from "@/lib/docx";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CampanhaEstruturada } from "@/lib/types";

// Precisa do runtime Node.js (fs para knowledge, Buffer para docx/zip).
export const runtime = "nodejs";
export const maxDuration = 300;

// ===== Guardrails / regras de template (mesma fonte de verdade do /api/copies) =====
const GUARDRAILS = `
REGRAS (guardrails) que voce DEVE seguir ao escrever a copy:
- O SQ (Sistema de Questoes) e uma FERRAMENTA JA INCLUSA nos Pacotes/Assinaturas, NAO e bonus.
- O unico bonus tipico sao as 3 mentorias.
- Garantia = 7 dias. Acesso/atualizacao (incl. SQ) = 12 meses (nunca "ate a prova" nem "permanente"). A data da prova pode ser citada.
- Promo exclui compradores + assinantes. Alerta so para inscritos. Mentoria so para compradores do cupom.
- Prova social e historica/da area — nunca inventar aprovado do concurso-alvo.
- Nunca inventar a oferta: use os dados da capa/oferta fornecidos.
- Escreva em portugues do Brasil, tom direto e comercial.
`;

const REGRAS_TEMPLATE = `
FORMATACAO DO CORPO (template EC):
- Escreva APENAS o corpo do e-mail (nao repita Assunto, Pre-header nem cabecalho).
- Use **negrito** para enfase forte e _italico_ para enfase leve (marcacao inline).
- Separe paragrafos como itens distintos da lista (um paragrafo por item).
- Para representar uma linha em branco entre blocos, inclua um item vazio "".
- Inclua a CTA apropriada ao tipo da peca, em uma linha propria:
  - Convite  -> "**>>> QUERO PARTICIPAR GRATUITAMENTE <<<**"
  - Alerta   -> "**>>> ASSISTIR AO VIVO NO YOUTUBE <<<**"
  - Promo    -> uma CTA em "**[COLCHETES MAIUSCULOS]**" e, ao final, um P.S. com o WhatsApp dos consultores.
- Se a peca nao se encaixar em Convite/Alerta/Promo, use uma CTA adequada a fase.
`;

// Descobre o tipo da peca a partir do texto (para orientar a CTA).
function tipoDaPeca(peca: string): "Convite" | "Alerta" | "Promo" | "Outro" {
  const p = (peca || "").toLowerCase();
  if (p.includes("convite")) return "Convite";
  if (p.includes("alerta")) return "Alerta";
  if (p.includes("promo") || p.includes("venda") || p.includes("oferta")) return "Promo";
  return "Outro";
}

// Formata "Data/Horario" a partir de data + hora.
function dataHora(data?: string, hora?: string): string {
  return [data, hora].filter(Boolean).join(" ").trim();
}

// Extrai uma lista de paragrafos (strings) da resposta do modelo, de forma robusta.
function parseCorpo(texto: string): string[] {
  const limpo = texto.replace(/```json/gi, "").replace(/```/g, "").trim();
  const ini = limpo.indexOf("[");
  const fim = limpo.lastIndexOf("]");
  if (ini >= 0 && fim > ini) {
    try {
      const arr = JSON.parse(limpo.slice(ini, fim + 1));
      if (Array.isArray(arr)) {
        return arr.map((x) => (typeof x === "string" ? x : String(x ?? "")));
      }
    } catch {
      // cai no fallback abaixo
    }
  }
  let corpo = limpo;
  const a = corpo.indexOf("[");
  if (a >= 0) corpo = corpo.slice(a + 1);
  const b = corpo.lastIndexOf("]");
  if (b >= 0) corpo = corpo.slice(0, b);
  return corpo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .map((l) => l.replace(/,\s*$/, ""))
    .map((l) => l.replace(/^"([\s\S]*)"$/, "$1"))
    .map((l) => l.replace(/\\"/g, '"').replace(/\\n/g, " ").replace(/\\t/g, " "))
    .filter((l, i, arr) => !(l === "" && (i === 0 || i === arr.length - 1)));
}

// Nome de arquivo seguro (remove caracteres problematicos em zip/OS).
function nomeSeguro(s: string): string {
  return (s || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

// Gera o corpo de UM e-mail via Anthropic (retry com backoff). Lanca em erro.
async function gerarCorpoEmail(
  client: NonNullable<ReturnType<typeof getAnthropic>>,
  systemPrompt: string,
  disparo: CampanhaEstruturada["disparos"][number],
  capa: CampanhaEstruturada["capa"]
): Promise<string[]> {
  const tipo = tipoDaPeca(disparo.peca);
  const userPrompt = [
    'Escreva o CORPO desta peca de e-mail. Responda SOMENTE com um array JSON de strings (cada string = um paragrafo; use "" para linha em branco).',
    "",
    "DADOS DA PECA:",
    `- Fase: ${disparo.fase ?? ""}`,
    `- Peca: ${disparo.peca ?? ""} (tipo detectado: ${tipo})`,
    `- Assunto: ${disparo.assunto ?? ""}`,
    `- Pre-header: ${disparo.preHeader ?? ""}`,
    `- Base: ${disparo.base ?? ""}`,
    `- Excluir: ${disparo.excluir ?? ""}`,
    "",
    "CONTEXTO DA CAMPANHA (capa):",
    `- Campanha: ${capa?.campanha ?? ""}`,
    `- Concurso: ${capa?.concurso ?? ""}`,
    `- Orgao: ${capa?.orgao ?? ""}`,
    `- Situacao: ${capa?.situacao ?? ""}`,
    `- Banca: ${capa?.banca ?? ""}`,
    `- Vagas: ${capa?.vagas ?? ""}`,
    `- Salario: ${capa?.salario ?? ""}`,
    `- Carrinho: ${capa?.carrinho ?? ""}`,
    `- Cupom: ${capa?.cupom ?? ""}`,
    `- Oferta: ${capa?.oferta ?? ""}`,
    `- Abrangencia: ${capa?.abrangencia ?? ""}`,
  ].join("\n");

  const criar = () =>
    client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
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
  if (!resposta) throw ultimoErro instanceof Error ? ultimoErro : new Error("falha na API");

  const texto = resposta.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return parseCorpo(texto);
}

// Executa tarefas com concorrencia limitada (pool simples).
async function comConcorrencia<T>(
  itens: T[],
  limite: number,
  tarefa: (item: T, indice: number) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const trabalhadores = new Array(Math.min(limite, itens.length || 0))
    .fill(null)
    .map(async () => {
      while (true) {
        const i = cursor++;
        if (i >= itens.length) return;
        await tarefa(itens[i], i);
      }
    });
  await Promise.all(trabalhadores);
}

// ===== Helpers de DIFF =====
type Disparo = CampanhaEstruturada["disparos"][number];
type Whats = CampanhaEstruturada["whatsappGrupos"][number];

// Chave estavel de um disparo: fase || peca.
function chaveDisparo(d: Disparo): string {
  return `${d?.fase ?? ""}||${d?.peca ?? ""}`;
}

// Chave estavel de uma mensagem de whatsapp: data || hora || assunto.
function chaveWhats(w: Whats): string {
  return `${w?.data ?? ""}||${w?.hora ?? ""}||${w?.assunto ?? ""}`;
}

export async function POST(req: NextRequest) {
  // 1) Le e valida o corpo.
  let corpo: { id?: string; estruturaNova?: CampanhaEstruturada };
  try {
    corpo = (await req.json()) as { id?: string; estruturaNova?: CampanhaEstruturada };
  } catch {
    return NextResponse.json(
      { erro: "JSON invalido no corpo da requisicao." },
      { status: 400 }
    );
  }

  const id = corpo?.id;
  const estruturaNova = corpo?.estruturaNova;
  if (!id) {
    return NextResponse.json({ erro: 'Informe "id" da campanha.' }, { status: 400 });
  }
  if (!estruturaNova || typeof estruturaNova !== "object") {
    return NextResponse.json(
      { erro: 'Informe "estruturaNova": a campanha estruturada editada.' },
      { status: 400 }
    );
  }

  // 2) Exige service role (para ler a estrutura anterior e salvar a nova).
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        erro:
          "SUPABASE_SERVICE_ROLE_KEY nao esta configurada. Defina no ambiente do servidor para regenerar copies.",
      },
      { status: 503 }
    );
  }

  // 3) Exige a chave da Anthropic (e-mails passam pelo LLM).
  const client = getAnthropic();
  if (!client || !anthropicConfigurado) {
    return NextResponse.json(
      {
        erro:
          "A chave ANTHROPIC_API_KEY nao esta configurada. Configure o ambiente para regenerar as copies.",
      },
      { status: 400 }
    );
  }

  // 4) Carrega a estrutura ANTERIOR (asset campanha_json mais recente = a de antes desta edicao).
  const { data: assetAnterior, error: errAsset } = await supabase
    .from("assets")
    .select("conteudo")
    .eq("campaign_id", id)
    .eq("tipo", "campanha_json")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errAsset) {
    return NextResponse.json(
      { erro: `Falha ao carregar a estrutura anterior: ${errAsset.message}` },
      { status: 500 }
    );
  }
  if (!assetAnterior?.conteudo) {
    return NextResponse.json(
      { erro: "Estrutura anterior nao encontrada para esta campanha." },
      { status: 404 }
    );
  }

  let estruturaAntiga: CampanhaEstruturada;
  try {
    estruturaAntiga = JSON.parse(assetAnterior.conteudo) as CampanhaEstruturada;
  } catch {
    return NextResponse.json(
      { erro: "Estrutura anterior corrompida (JSON invalido)." },
      { status: 500 }
    );
  }

  const capa = estruturaNova.capa;
  const nomeCampanha = capa?.campanha || estruturaNova.nomeEscolhido || "Campanha";

  const disparosNovos = Array.isArray(estruturaNova.disparos) ? estruturaNova.disparos : [];
  const disparosAntigos = Array.isArray(estruturaAntiga.disparos)
    ? estruturaAntiga.disparos
    : [];
  const whatsNovos = Array.isArray(estruturaNova.whatsappGrupos)
    ? estruturaNova.whatsappGrupos
    : [];
  const whatsAntigos = Array.isArray(estruturaAntiga.whatsappGrupos)
    ? estruturaAntiga.whatsappGrupos
    : [];

  // Mapas da estrutura ANTIGA por chave.
  const mapDisparoAntigo = new Map<string, Disparo>();
  for (const d of disparosAntigos) mapDisparoAntigo.set(chaveDisparo(d), d);
  const mapWhatsAntigo = new Map<string, Whats>();
  for (const w of whatsAntigos) mapWhatsAntigo.set(chaveWhats(w), w);

  // 5) DIFF dos disparos (mantem o indice na estruturaNova para nomear/ordenar).
  const alteracoes: string[] = [];
  const disparosImpactados: { disparo: Disparo; indice: number }[] = [];

  disparosNovos.forEach((d, i) => {
    const chave = chaveDisparo(d);
    const antigo = mapDisparoAntigo.get(chave);
    const ordem = String(i + 1).padStart(2, "0");
    if (!antigo) {
      disparosImpactados.push({ disparo: d, indice: i });
      alteracoes.push(`E-mail #${ordem} (${d.peca || "sem nome"}): PECA NOVA`);
      return;
    }
    const mudancas: string[] = [];
    if ((antigo.assunto ?? "") !== (d.assunto ?? "")) mudancas.push("assunto");
    if ((antigo.preHeader ?? "") !== (d.preHeader ?? "")) mudancas.push("pre-header");
    if ((antigo.base ?? "") !== (d.base ?? "")) mudancas.push("base");
    if (mudancas.length > 0) {
      disparosImpactados.push({ disparo: d, indice: i });
      alteracoes.push(
        `E-mail #${ordem} (${d.peca || "sem nome"}): mudou ${mudancas.join(", ")}`
      );
    }
  });

  // DIFF dos whatsappGrupos: impactada se a "mensagem" mudou (ou peca nova).
  const whatsImpactados: { w: Whats; indice: number }[] = [];
  whatsNovos.forEach((w, i) => {
    const chave = chaveWhats(w);
    const antigo = mapWhatsAntigo.get(chave);
    if (!antigo) {
      whatsImpactados.push({ w, indice: i });
      alteracoes.push(`WhatsApp #${i + 1} (${w.assunto || "sem assunto"}): PECA NOVA`);
      return;
    }
    if ((antigo.mensagem ?? "") !== (w.mensagem ?? "")) {
      whatsImpactados.push({ w, indice: i });
      alteracoes.push(
        `WhatsApp #${i + 1} (${w.assunto || "sem assunto"}): mudou mensagem`
      );
    }
  });

  const zip = new JSZip();
  const erros: string[] = [];

  // 6) Regenera SO os e-mails impactados (corpo via LLM, concorrencia 4).
  if (disparosImpactados.length > 0) {
    const cerebro = await getKnowledge();
    const referencias = await getReferencias();
    const systemPrompt = [
      "Voce e um copywriter especialista em lancamentos da Estrategia Concursos.",
      "Use a BASE DE CONHECIMENTO abaixo como fonte de verdade para tom, funil e oferta.",
      GUARDRAILS,
      REGRAS_TEMPLATE,
      "===== BASE DE CONHECIMENTO (CEREBRO) =====",
      cerebro,
      "===== FIM DA BASE DE CONHECIMENTO =====",
      ...(referencias
        ? ["===== REFERENCIAS DE COPY (estilo/historico) =====", referencias, "====="]
        : []),
    ].join("\n");

    const corpos: (string[] | null)[] = new Array(disparosImpactados.length).fill(null);
    await comConcorrencia(disparosImpactados, 4, async (item, idx) => {
      try {
        corpos[idx] = await gerarCorpoEmail(client, systemPrompt, item.disparo, capa);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "erro desconhecido";
        corpos[idx] = null;
        erros.push(
          `E-mail #${String(item.indice + 1).padStart(2, "0")} (${
            item.disparo.peca ?? "sem nome"
          }): ${msg}`
        );
      }
    });

    for (let idx = 0; idx < disparosImpactados.length; idx++) {
      const { disparo, indice } = disparosImpactados[idx];
      const corpoGerado = corpos[idx];
      if (!corpoGerado) continue; // erro ja registrado
      const ordem = String(indice + 1).padStart(2, "0");
      const nomeArquivo = `${ordem} - ${nomeSeguro(disparo.peca || "E-mail")}.docx`;
      try {
        const buffer = await renderEmailDocx({
          campanha: nomeCampanha,
          peca: disparo.peca || "E-mail",
          dataHora: dataHora(disparo.data, disparo.hora),
          base: disparo.base || "",
          excluir: disparo.excluir || "",
          assunto: disparo.assunto || "",
          preHeader: disparo.preHeader || "",
          corpo: corpoGerado,
          whatsapp: false,
        });
        zip.file(nomeArquivo, buffer);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "erro desconhecido";
        erros.push(`E-mail #${ordem} (${disparo.peca ?? "sem nome"}): ${msg}`);
      }
    }
  }

  // 7) Regenera SO os whatsapp impactados (direto do campo "mensagem", sem LLM).
  for (const { w, indice } of whatsImpactados) {
    const corpoWhats = (w.mensagem || "").split(/\r?\n/);
    const nomeArquivo = `WhatsApp Grupo - ${nomeSeguro(
      w.assunto || `Mensagem ${indice + 1}`
    )}.docx`;
    try {
      const buffer = await renderEmailDocx({
        campanha: nomeCampanha,
        peca: w.assunto || `WhatsApp ${indice + 1}`,
        dataHora: dataHora(w.data, w.hora),
        base: w.fase || "",
        excluir: "",
        assunto: w.assunto || "",
        preHeader: "",
        corpo: corpoWhats,
        whatsapp: true,
      });
      zip.file(nomeArquivo, buffer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro desconhecido";
      erros.push(`WhatsApp #${indice + 1} (${w.assunto ?? "sem assunto"}): ${msg}`);
    }
  }

  // Se alguma falha foi por falta de saldo na API, responde a mensagem amigavel
  // (402) em vez de entregar um zip com _alteracoes.txt listando o erro cru.
  if (erros.some((e) => ehErroDeCredito(e))) {
    return NextResponse.json({ erro: MSG_SEM_CREDITO }, { status: 402 });
  }

  // 8) Arquivo _alteracoes.txt listando o que mudou.
  const totalImpactadas = disparosImpactados.length + whatsImpactados.length;
  const linhasAlteracoes = [
    "Copies atualizadas (apenas as pecas impactadas pelas mudancas na planilha).",
    `Campanha: ${nomeCampanha}`,
    "",
    totalImpactadas === 0
      ? "Nenhuma peca impactada: nada foi regenerado."
      : `Pecas impactadas: ${totalImpactadas}`,
    "",
    ...alteracoes.map((linha) => `- ${linha}`),
  ];
  if (erros.length > 0) {
    linhasAlteracoes.push("", "Falhas durante a regeneracao:", ...erros.map((l) => `- ${l}`));
  }
  zip.file("_alteracoes.txt", linhasAlteracoes.join("\n"));

  // 9) Salva a estruturaNova como NOVO asset e marca status='ajustada'.
  //    Feito APOS o diff (que leu a estrutura anterior).
  const nome = estruturaNova.nomeEscolhido || estruturaNova.capa?.campanha || "";
  try {
    await supabase.from("assets").insert({
      campaign_id: id,
      tipo: "campanha_json",
      nome,
      conteudo: JSON.stringify(estruturaNova),
    });
    await supabase
      .from("campaigns")
      .update({
        status: "ajustada",
        nome: nome || undefined,
        concurso: estruturaNova.capa?.concurso || undefined,
      })
      .eq("id", id);
  } catch {
    // Nao interrompe a entrega do zip: registra no proprio zip.
    zip.file(
      "_aviso-salvamento.txt",
      "Atencao: as copies foram regeneradas, mas houve falha ao salvar a nova estrutura no historico. Tente 'Salvar alteracoes' novamente."
    );
  }

  // 10) Devolve o zip.
  try {
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="copies-atualizadas.docx.zip"',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json({ erro: `Falha ao montar o zip: ${msg}` }, { status: 500 });
  }
}
