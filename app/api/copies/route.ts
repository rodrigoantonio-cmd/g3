// Route handler POST /api/copies
// Recebe a CampanhaEstruturada (JSON). Para cada e-mail (disparos), chama a
// Anthropic para escrever SO o CORPO (lista de paragrafos), renderiza um .docx
// no template EC (lib/docx) e junta tudo num .zip. Os whatsappGrupos sao
// renderizados direto do campo "mensagem" (sem LLM).

import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getAnthropic, ANTHROPIC_MODEL, anthropicConfigurado } from "@/lib/anthropic";
import { getKnowledge } from "@/lib/knowledge";
import { getReferencias } from "@/lib/referencias";
import { renderEmailDocx } from "@/lib/docx";
import type { CampanhaEstruturada } from "@/lib/types";

// Precisa do runtime Node.js (fs para o knowledge, Buffer para docx/zip).
export const runtime = "nodejs";
export const maxDuration = 300;

// Guardrails repassados ao modelo (mesma fonte de verdade do /api/generate).
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

// Regras do template EC repassadas ao modelo (formatacao do CORPO).
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
  // Tenta achar um array JSON.
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
  // Fallback tolerante: recupera os paragrafos mesmo de um array JSON
  // malformado/truncado (remove colchetes, aspas externas, virgulas e escapes).
  let corpo = limpo;
  const a = corpo.indexOf("[");
  if (a >= 0) corpo = corpo.slice(a + 1);
  const b = corpo.lastIndexOf("]");
  if (b >= 0) corpo = corpo.slice(0, b);
  return corpo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .map((l) => l.replace(/,\s*$/, "")) // virgula ao final do item
    .map((l) => l.replace(/^"([\s\S]*)"$/, "$1")) // aspas externas
    .map((l) => l.replace(/\\"/g, '"').replace(/\\n/g, " ").replace(/\\t/g, " ")) // escapes
    .filter((l, i, arr) => !(l === "" && (i === 0 || i === arr.length - 1))); // tira vazios nas pontas
}

// Nome de arquivo seguro (remove caracteres problematicos em zip/OS).
function nomeSeguro(s: string): string {
  return (s || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

// Gera o corpo de UM e-mail via Anthropic. Lanca em caso de erro.
async function gerarCorpoEmail(
  client: NonNullable<ReturnType<typeof getAnthropic>>,
  systemPrompt: string,
  disparo: CampanhaEstruturada["disparos"][number],
  capa: CampanhaEstruturada["capa"]
): Promise<string[]> {
  const tipo = tipoDaPeca(disparo.peca);
  const userPrompt = [
    "Escreva o CORPO desta peca de e-mail. Responda SOMENTE com um array JSON de strings (cada string = um paragrafo; use \"\" para linha em branco).",
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

  // Retry com backoff: a API pode falhar por "connection error" transitorio.
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

export async function POST(req: NextRequest) {
  let campanha: CampanhaEstruturada;
  try {
    campanha = (await req.json()) as CampanhaEstruturada;
  } catch {
    return NextResponse.json(
      { erro: "JSON inválido no corpo da requisição." },
      { status: 400 }
    );
  }

  const client = getAnthropic();
  if (!client || !anthropicConfigurado) {
    return NextResponse.json(
      {
        erro:
          "A chave ANTHROPIC_API_KEY não está configurada. Configure o .env.local para gerar as copies.",
      },
      { status: 400 }
    );
  }

  const capa = campanha.capa;
  const nomeCampanha = capa?.campanha || campanha.nomeEscolhido || "Campanha";
  const disparos = Array.isArray(campanha.disparos) ? campanha.disparos : [];
  const whatsapp = Array.isArray(campanha.whatsappGrupos) ? campanha.whatsappGrupos : [];

  // Monta o system prompt (cerebro + guardrails + regras de template).
  const cerebro = await getKnowledge();
  // Base de consulta (referencias de copy): opcional, entra depois do cerebro.
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
      ? [
          "===== REFERENCIAS DE COPY (estilo/historico) =====",
          referencias,
          "=====",
        ]
      : []),
  ].join("\n");

  const zip = new JSZip();
  const erros: string[] = [];

  // ===== E-mails (disparos) — corpo via LLM, concorrencia ~4 =====
  const corpos: (string[] | null)[] = new Array(disparos.length).fill(null);

  await comConcorrencia(disparos, 4, async (disparo, i) => {
    try {
      corpos[i] = await gerarCorpoEmail(client, systemPrompt, disparo, capa);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro desconhecido";
      corpos[i] = null;
      erros.push(
        `E-mail #${String(i + 1).padStart(2, "0")} (${disparo.peca ?? "sem nome"}): ${msg}`
      );
    }
  });

  // Renderiza os .docx dos e-mails (mantendo a ordem).
  for (let i = 0; i < disparos.length; i++) {
    const disparo = disparos[i];
    const corpo = corpos[i];
    if (!corpo) continue; // erro ja registrado
    const ordem = String(i + 1).padStart(2, "0");
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
        corpo,
        whatsapp: false,
      });
      zip.file(nomeArquivo, buffer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro desconhecido";
      erros.push(`E-mail #${ordem} (${disparo.peca ?? "sem nome"}): ${msg}`);
    }
  }

  // ===== WhatsApp (grupos) — direto do campo "mensagem" (sem LLM) =====
  for (let i = 0; i < whatsapp.length; i++) {
    const w = whatsapp[i];
    const corpo = (w.mensagem || "").split(/\r?\n/);
    const nomeArquivo = `WhatsApp Grupo - ${nomeSeguro(w.assunto || `Mensagem ${i + 1}`)}.docx`;
    try {
      const buffer = await renderEmailDocx({
        campanha: nomeCampanha,
        peca: w.assunto || `WhatsApp ${i + 1}`,
        dataHora: dataHora(w.data, w.hora),
        base: w.fase || "",
        excluir: "",
        assunto: w.assunto || "",
        preHeader: "",
        corpo,
        whatsapp: true,
      });
      zip.file(nomeArquivo, buffer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro desconhecido";
      erros.push(`WhatsApp #${i + 1} (${w.assunto ?? "sem assunto"}): ${msg}`);
    }
  }

  // Se houve erros, inclui um arquivo _erros.txt em vez de quebrar tudo.
  if (erros.length > 0) {
    zip.file(
      "_erros.txt",
      [
        "Algumas peças não puderam ser geradas:",
        "",
        ...erros.map((linha) => `- ${linha}`),
      ].join("\n")
    );
  }

  // Se nada foi gerado (nem erros, nem pecas), avisa.
  const totalArquivos = Object.keys(zip.files).length;
  if (totalArquivos === 0) {
    return NextResponse.json(
      { erro: "Nada para gerar: a campanha não tem disparos nem grupos de WhatsApp." },
      { status: 400 }
    );
  }

  try {
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="copies.docx.zip"',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json(
      { erro: `Falha ao montar o zip: ${msg}` },
      { status: 500 }
    );
  }
}
