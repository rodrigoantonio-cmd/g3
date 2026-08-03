// Route handler POST /api/copies
// Recebe a CampanhaEstruturada (JSON). Para cada e-mail (disparos), chama a
// Anthropic para escrever SO o CORPO (lista de paragrafos), renderiza um .docx
// no template EC (lib/docx) e junta tudo num .zip. Os whatsappGrupos sao
// renderizados direto do campo "mensagem" (sem LLM).

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
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
import {
  renderEmailDocx,
  renderAnuncioEstaticoDocx,
  renderAnuncioVideoDocx,
  renderYoutubeDocx,
} from "@/lib/docx";
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
- Cada paragrafo e um item da lista; use um item vazio "" para linha em branco entre blocos.
- ESTRUTURA OBRIGATORIA — o e-mail NUNCA termina no botao:
  1) Abertura/gancho.
  2) Desenvolvimento (conteudo/oferta/prova social).
  3) CTA (botao) no MEIO da mensagem, em uma linha propria.
  4) Depois do botao, MAIS UM trecho curto de reforco/urgencia (1-3 paragrafos).
  5) Assinatura final em duas linhas: "Um abraço," e depois "**Estratégia Concursos**".
- CTA por tipo (na linha propria do passo 3):
  - Convite -> "**>>> QUERO PARTICIPAR GRATUITAMENTE <<<**"
  - Alerta  -> "**>>> ASSISTIR AO VIVO NO YOUTUBE <<<**"
  - Promo   -> uma CTA em "**[COLCHETES MAIUSCULOS]**"; e um P.S. com o WhatsApp dos consultores DEPOIS da assinatura.
- Regra de ouro: sempre ha texto de reforco e a assinatura da Estrategia APOS o CTA. Nunca finalize a mensagem no botao.
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

  const texto = await chamarLLM(client, systemPrompt, userPrompt);
  return parseCorpo(texto);
}

// Chamada generica ao modelo com retry/backoff. Devolve o texto concatenado.
async function chamarLLM(
  client: NonNullable<ReturnType<typeof getAnthropic>>,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4000
): Promise<string> {
  const criar = () =>
    client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
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

  return resposta.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// Extrai o primeiro objeto JSON da resposta do modelo (tolerante a ```json```).
function parseJsonObjeto<T = Record<string, unknown>>(texto: string): T {
  const limpo = texto.replace(/```json/gi, "").replace(/```/g, "").trim();
  const ini = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (ini >= 0 && fim > ini) {
    return JSON.parse(limpo.slice(ini, fim + 1)) as T;
  }
  throw new Error("resposta do modelo não contém um objeto JSON válido");
}

// Normaliza um campo do JSON para lista de strings (aceita string ou array).
function comoLista(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : String(x ?? "")));
  if (typeof v === "string") return v.split(/\r?\n/);
  if (v == null) return [];
  return [String(v)];
}

// Extrai um bloco de HTML autocontido da resposta do modelo.
function parseHtml(texto: string): string {
  let limpo = texto.replace(/```html/gi, "").replace(/```/g, "").trim();
  const ini = limpo.search(/<!doctype html|<html/i);
  if (ini > 0) limpo = limpo.slice(ini);
  return limpo.trim();
}

// Detecta se o formato do anuncio pede roteiro de video.
function ehVideo(formato: string): boolean {
  const f = (formato || "").toLowerCase();
  return (
    f.includes("vídeo") ||
    f.includes("video") ||
    f.includes("google first") ||
    f.includes("meta first")
  );
}

// Monta o bloco de contexto da campanha (reutilizado em varios prompts).
function contextoCampanha(capa: CampanhaEstruturada["capa"]): string {
  return [
    "CONTEXTO DA CAMPANHA (capa):",
    `- Campanha: ${capa?.campanha ?? ""}`,
    `- Concurso: ${capa?.concurso ?? ""}`,
    `- Orgao: ${capa?.orgao ?? ""}`,
    `- Situacao: ${capa?.situacao ?? ""}`,
    `- Banca: ${capa?.banca ?? ""}`,
    `- Vagas: ${capa?.vagas ?? ""}`,
    `- Salario: ${capa?.salario ?? ""}`,
    `- Escolaridade: ${capa?.escolaridade ?? ""}`,
    `- Carrinho: ${capa?.carrinho ?? ""}`,
    `- Cupom: ${capa?.cupom ?? ""}`,
    `- Oferta: ${capa?.oferta ?? ""}`,
    `- Abrangencia: ${capa?.abrangencia ?? ""}`,
  ].join("\n");
}

// ===== Anuncio ESTATICO — gera o conteudo (JSON) e renderiza o .docx =====
async function gerarAnuncioEstatico(
  client: NonNullable<ReturnType<typeof getAnthropic>>,
  systemPrompt: string,
  anuncio: CampanhaEstruturada["anuncios"][number],
  capa: CampanhaEstruturada["capa"],
  nomeCampanha: string
): Promise<Buffer> {
  const userPrompt = [
    "Escreva um ANÚNCIO ESTÁTICO (Meta Ads) para a campanha. Responda SOMENTE com um objeto JSON com as chaves:",
    '{ "titulo1": "string curta", "titulo2": "string curta", "textoMeta": ["paragrafo", "..."], "laminas": [{ "lamina": "1", "copy": "texto da arte", "arte": "referencia visual" }], "legenda": ["linha com emojis", "..."] }',
    "Use 3 a 5 laminas. Use **negrito** e _italico_ na marcacao inline quando fizer sentido. Escreva em PT-BR.",
    "",
    "DADOS DO ANÚNCIO:",
    `- Objetivo: ${anuncio.objetivo ?? ""}`,
    `- Formato: ${anuncio.formato ?? ""}`,
    `- Angulo: ${anuncio.angulo ?? ""}`,
    `- Publico: ${anuncio.publico ?? ""}`,
    "",
    contextoCampanha(capa),
  ].join("\n");

  const texto = await chamarLLM(client, systemPrompt, userPrompt);
  const j = parseJsonObjeto<{
    titulo1?: string;
    titulo2?: string;
    textoMeta?: unknown;
    laminas?: unknown;
    legenda?: unknown;
  }>(texto);

  const laminas = Array.isArray(j.laminas)
    ? (j.laminas as Record<string, unknown>[]).map((r) => ({
        lamina: String(r?.lamina ?? ""),
        copy: String(r?.copy ?? ""),
        arte: String(r?.arte ?? ""),
      }))
    : [];

  return renderAnuncioEstaticoDocx({
    campanha: nomeCampanha,
    nome: `${anuncio.formato || "Estático"} — ${anuncio.angulo || ""}`.trim(),
    titulo1: String(j.titulo1 ?? ""),
    titulo2: String(j.titulo2 ?? ""),
    textoMeta: comoLista(j.textoMeta),
    laminas,
    legenda: comoLista(j.legenda),
  });
}

// ===== Anuncio VIDEO — gera o roteiro (JSON) e renderiza o .docx =====
async function gerarAnuncioVideo(
  client: NonNullable<ReturnType<typeof getAnthropic>>,
  systemPrompt: string,
  anuncio: CampanhaEstruturada["anuncios"][number],
  capa: CampanhaEstruturada["capa"],
  nomeCampanha: string
): Promise<Buffer> {
  const userPrompt = [
    "Escreva um ROTEIRO DE VÍDEO (anúncio) para a campanha. Responda SOMENTE com um objeto JSON com as chaves:",
    '{ "longo": ["linha do roteiro ~1 min"], "curto": ["linha do roteiro ~15 seg"], "legendaEmoji": ["linha"], "legendaSem": ["linha"], "titulo1": "string curta", "titulo2": "string curta" }',
    "No roteiro, marque **PRINT** onde entra uma tela/print e **CTA** na chamada para ação. Use **negrito**/_italico_ inline. Escreva em PT-BR.",
    "",
    "DADOS DO ANÚNCIO:",
    `- Objetivo: ${anuncio.objetivo ?? ""}`,
    `- Formato: ${anuncio.formato ?? ""}`,
    `- Angulo: ${anuncio.angulo ?? ""}`,
    `- Publico: ${anuncio.publico ?? ""}`,
    "",
    contextoCampanha(capa),
  ].join("\n");

  const texto = await chamarLLM(client, systemPrompt, userPrompt);
  const j = parseJsonObjeto<{
    longo?: unknown;
    curto?: unknown;
    legendaEmoji?: unknown;
    legendaSem?: unknown;
    titulo1?: string;
    titulo2?: string;
  }>(texto);

  return renderAnuncioVideoDocx({
    campanha: nomeCampanha,
    nome: `${anuncio.formato || "Vídeo"} — ${anuncio.angulo || ""}`.trim(),
    longo: comoLista(j.longo),
    curto: comoLista(j.curto),
    legendaEmoji: comoLista(j.legendaEmoji),
    legendaSem: comoLista(j.legendaSem),
    titulo1: String(j.titulo1 ?? ""),
    titulo2: String(j.titulo2 ?? ""),
  });
}

// ===== Descricao de YouTube — gera JSON e renderiza o .docx =====
async function gerarYoutube(
  client: NonNullable<ReturnType<typeof getAnthropic>>,
  systemPrompt: string,
  fase: string,
  capa: CampanhaEstruturada["capa"]
): Promise<Buffer> {
  const userPrompt = [
    `Escreva a DESCRIÇÃO de um vídeo de YouTube para a fase "${fase}" da campanha. Responda SOMENTE com um objeto JSON com as chaves:`,
    '{ "titulo": ["opcao de titulo do video"], "corpo": ["paragrafo da descricao", "..."], "hashtags": "#tag1 #tag2 #tag3" }',
    "Inclua CTA e (quando fizer sentido) menção ao cupom/link. Use **negrito**/_italico_ inline. Escreva em PT-BR.",
    "",
    contextoCampanha(capa),
  ].join("\n");

  const texto = await chamarLLM(client, systemPrompt, userPrompt);
  const j = parseJsonObjeto<{ titulo?: unknown; corpo?: unknown; hashtags?: string }>(texto);

  return renderYoutubeDocx({
    titulo: comoLista(j.titulo),
    corpo: comoLista(j.corpo),
    hashtags: String(j.hashtags ?? ""),
  });
}

// Monta o bloco de PALETA da campanha para os prompts de pagina.
// Quando a capa tem paleta definida, o modelo deve usar ESTRITAMENTE essas
// cores no CSS. Sem paleta, devolve "" (mantem o comportamento atual: deriva
// do framework).
function blocoPaleta(capa: CampanhaEstruturada["capa"]): string {
  const paleta = (capa?.paleta ?? "").trim();
  if (!paleta) return "";
  return [
    `PALETA DA CAMPANHA (use ESTRITAMENTE estas cores no CSS — fundos, textos, destaques, CTAs): ${paleta}.`,
    "Não introduza cores fora desta paleta (exceto neutros de leitura).",
  ].join("\n");
}

// ===== Pagina HTML autocontida — gera o HTML direto do modelo =====
async function gerarPaginaHtml(
  client: NonNullable<ReturnType<typeof getAnthropic>>,
  systemPrompt: string,
  tipo: "landing" | "sucesso" | "vendas",
  capa: CampanhaEstruturada["capa"],
  exemploVendas: string
): Promise<string> {
  // A pagina de VENDAS tem tratamento proprio: segue o "Framework de Paginas
  // de Vendas" (ja presente na base de conhecimento) e se espelha na estrutura
  // do exemplo-ouro (BACEN), porem com os DADOS da campanha atual.
  if (tipo === "vendas") {
    return gerarPaginaVendas(client, systemPrompt, capa, exemploVendas);
  }

  const descricoes: Record<"landing" | "sucesso", string> = {
    landing:
      "LANDING PAGE de captação: headline forte, subheadline, benefícios do evento gratuito, FORM com campos Nome, E-mail e WhatsApp (action=[INSERIR_URL_DO_FORM]), data/hora do 1º evento e CTA de inscrição.",
    sucesso:
      "PÁGINA DE SUCESSO: confirmação da inscrição, convite para entrar no Grupo VIP do WhatsApp (link [INSERIR_LINK_GRUPO_VIP]), lembrete do 1º evento (data/hora) e próximos passos.",
  };

  const userPrompt = [
    "Gere uma página web COMPLETA e AUTOCONTIDA em HTML para a campanha.",
    "REQUISITOS TÉCNICOS:",
    "- Responda SOMENTE com o HTML (comece em <!doctype html>). Sem comentários fora do HTML, sem ```.",
    "- CSS inline no <head> (<style>), responsivo (mobile-first), sem dependências externas.",
    "- PT-BR. Use placeholders operacionais entre colchetes quando faltar dado (ex.: [INSERIR_URL_DO_FORM], [INSERIR_LINK_GRUPO_VIP], [INSERIR_URL_CHECKOUT], [INSERIR_CUPOM]).",
    "- Siga o \"FRAMEWORK DE PÁGINAS DE VENDAS\" da base de conhecimento no que se aplicar a esta página.",
    "",
    `TIPO DE PÁGINA: ${descricoes[tipo]}`,
    "",
    "GUARDRAILS DE OFERTA: SQ é ferramenta inclusa (não bônus); único bônus = 3 mentorias; garantia 7 dias; acesso/SQ 12 meses; prova social histórica/da área (nunca inventar aprovado do concurso-alvo).",
    ...(blocoPaleta(capa) ? ["", blocoPaleta(capa)] : []),
    "",
    contextoCampanha(capa),
  ].join("\n");

  const texto = await chamarLLM(client, systemPrompt, userPrompt, 8000);
  return parseHtml(texto);
}

// ===== PÁGINA DE VENDAS — segue o Framework + espelha o exemplo-ouro BACEN =====
async function gerarPaginaVendas(
  client: NonNullable<ReturnType<typeof getAnthropic>>,
  systemPrompt: string,
  capa: CampanhaEstruturada["capa"],
  exemploVendas: string
): Promise<string> {
  // System prompt dedicado: reforca o framework e injeta o exemplo-ouro (BACEN)
  // como padrao de ESTRUTURA/HTML/CSS/responsividade — nunca de conteudo.
  const systemVendas = [
    systemPrompt,
    "",
    "===== TAREFA: PÁGINA DE VENDAS (LONGA) =====",
    "Você vai gerar UMA página de vendas longa, completa e autocontida em HTML.",
    "Ela DEVE seguir À RISCA o \"FRAMEWORK DE PÁGINAS DE VENDAS\" que está na BASE DE CONHECIMENTO acima.",
    "",
    "PRINCÍPIOS DO FRAMEWORK (não negociáveis):",
    "- Comece pela TRANSFORMAÇÃO (o momento/oportunidade e a mudança de vida), nunca pelo produto.",
    "- UM argumento por dobra. Cada seção defende uma única ideia.",
    "- NUNCA prometa aprovação garantida. Só fatos verificáveis; nada de números inventados.",
    "- Ícones VETORIAIS (SVG inline ou CSS). SEM emojis nos cards de carreira.",
    "- Mobile-first (largura de referência 375–430px); tudo tem que ficar impecável no celular.",
    "- Dourado reservado para o que é premium / para números de destaque.",
    "- Cupom e cálculo de preços corretos e coerentes entre todas as seções de oferta.",
    "- Garantia conforme o briefing (padrão 7 dias).",
    "",
    "ORDEM OBRIGATÓRIA DAS DOBRAS (de cima para baixo):",
    "1) Faixa fixa (barra topo fixa com CTA/oferta).",
    "2) Hero (transformação + headline + CTA principal).",
    "3) Faixa de fatos (números/fatos verificáveis do concurso).",
    "4) O momento (por que agora — janela de oportunidade).",
    "5) Carreira (o que a carreira oferece — cards com ícones vetoriais, sem emojis).",
    "6) Prova social (histórica/da área — nunca aprovado do concurso-alvo).",
    "7) Ecossistema (o que compõe a preparação: cursos, SQ como FERRAMENTA inclusa, etc.).",
    "8) Bônus (SOMENTE se houver — o único bônus típico são as mentorias).",
    "9) Ofertas (Assinatura e Pacote/Pacotaço) com preços, cupom e CTA de checkout.",
    "10) Comparação (tabela comparando os planos/ofertas).",
    "11) Professores.",
    "12) Garantia (conforme o briefing; padrão 7 dias).",
    "13) Última chamada (reforço final + urgência real).",
    "14) Ofertas resumidas (recap das ofertas com CTA).",
    "15) FAQ.",
    "16) Footer.",
    "",
    "GUARDRAILS DE OFERTA (repita mentalmente antes de escrever cada seção):",
    "- O SQ (Sistema de Questões) é FERRAMENTA JÁ INCLUSA nos pacotes/assinaturas — NUNCA aparece como bônus.",
    "- Único bônus típico = as mentorias.",
    "- Garantia conforme o briefing (padrão 7 dias). Acesso/atualização = 12 meses (nunca \"até a prova\" nem \"permanente\").",
    "- Prova social é histórica/da área; nunca invente aprovado do concurso-alvo.",
    "- Nunca invente a oferta: use os dados da capa/briefing.",
    "",
    "EXEMPLO-OURO (BACEN) — use como PADRÃO DE ESTRUTURA, SEÇÕES, RESPONSIVIDADE e CSS INLINE.",
    "Reproduza este NÍVEL de estrutura, seções, responsividade e CSS inline, mas com os DADOS da campanha atual.",
    "NÃO reutilize textos, números, preços, nomes de professores nem dados do BACEN — eles são apenas referência de forma.",
    "===== EXEMPLO-OURO (BACEN) =====",
    exemploVendas || "(exemplo indisponível — siga o framework mesmo assim)",
    "===== FIM DO EXEMPLO-OURO (BACEN) =====",
  ].join("\n");

  const userPrompt = [
    "Gere a PÁGINA DE VENDAS COMPLETA e AUTOCONTIDA em HTML para a campanha abaixo.",
    "",
    "REQUISITOS TÉCNICOS:",
    "- Responda SOMENTE com o HTML (comece em <!doctype html>). Sem comentários fora do HTML, sem ```.",
    "- CSS inline no <head> (<style>), responsivo (mobile-first 375–430px), sem dependências externas (sem CDN, sem fontes externas, sem imagens remotas).",
    "- Ícones vetoriais (SVG inline / CSS). Sem emojis nos cards de carreira.",
    "- PT-BR, tom comercial e direto.",
    "- Placeholders operacionais entre colchetes: [INSERIR_URL_CHECKOUT], [INSERIR_PRECO_CHEIO], [INSERIR_PRECO_COM_DESCONTO] e o cupom da campanha (use o cupom da capa; se faltar, [INSERIR_CUPOM]).",
    "- Mantenha o cálculo de preços coerente entre todas as seções de oferta.",
    "",
    "ESTRUTURA: siga EXATAMENTE a ordem de dobras do framework (faixa fixa → Hero → faixa de fatos → O momento → carreira → prova social → ecossistema → bônus [se houver] → ofertas [Assinatura e Pacote/Pacotaço] → comparação → professores → garantia → última chamada → ofertas resumidas → FAQ → footer).",
    ...(blocoPaleta(capa) ? ["", blocoPaleta(capa)] : []),
    "",
    contextoCampanha(capa),
  ].join("\n");

  const texto = await chamarLLM(client, systemVendas, userPrompt, 32000);
  return parseHtml(texto);
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
  const anuncios = Array.isArray(campanha.anuncios) ? campanha.anuncios : [];

  // ===== Recorte por CATEGORIA (?categoria=...) =====
  // Gera/empacota apenas a categoria pedida. Ausente/invalida/"tudo" => gera
  // tudo (backward compat), com o zip "copies-completas.zip".
  const CATEGORIAS_VALIDAS = ["emails", "whatsapp", "anuncios", "youtube", "paginas"] as const;
  type Categoria = (typeof CATEGORIAS_VALIDAS)[number];
  const categoriaParam = new URL(req.url).searchParams.get("categoria");
  const categoria: Categoria | null = CATEGORIAS_VALIDAS.includes(categoriaParam as Categoria)
    ? (categoriaParam as Categoria)
    : null; // null = "tudo" (inclui ausente/invalida/"tudo")
  const gerarTudo = categoria === null;

  // Se a categoria pedida nao tiver itens, avisa (a UI trata). YouTube e Paginas
  // sempre tem itens (fases/paginas fixas), entao so validamos as data-driven.
  if (categoria === "emails" && disparos.length === 0) {
    return NextResponse.json({ erro: "Nada para gerar em emails." }, { status: 400 });
  }
  if (categoria === "whatsapp" && whatsapp.length === 0) {
    return NextResponse.json({ erro: "Nada para gerar em whatsapp." }, { status: 400 });
  }
  if (categoria === "anuncios" && anuncios.length === 0) {
    return NextResponse.json({ erro: "Nada para gerar em anuncios." }, { status: 400 });
  }

  // Monta o system prompt (cerebro + guardrails + regras de template).
  const cerebro = await getKnowledge();
  // Base de consulta (referencias de copy): opcional, entra depois do cerebro.
  const referencias = await getReferencias();
  // Exemplo-ouro de PAGINA DE VENDAS (BACEN): usado so no gerador da pagina de
  // vendas como padrao de estrutura/HTML/CSS. Nao entra no getKnowledge (.html).
  const exemploVendas = await readFile(
    path.join(process.cwd(), "knowledge", "EXEMPLO - Pagina de Vendas BACEN.html"),
    "utf-8"
  ).catch(() => "");
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
  if (gerarTudo || categoria === "emails") {
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
      const nomeArquivo = `emails/${ordem} - ${nomeSeguro(disparo.peca || "E-mail")}.docx`;
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
  }

  // ===== WhatsApp (grupos) — direto do campo "mensagem" (sem LLM) =====
  if (gerarTudo || categoria === "whatsapp") {
    for (let i = 0; i < whatsapp.length; i++) {
      const w = whatsapp[i];
      const corpo = (w.mensagem || "").split(/\r?\n/);
      const nomeArquivo = `whatsapp/WhatsApp Grupo - ${nomeSeguro(w.assunto || `Mensagem ${i + 1}`)}.docx`;
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
  }

  // ===== Anuncios — 1 chamada LLM por item (video vs estatico), concorrencia 4 =====
  if (gerarTudo || categoria === "anuncios") {
    const anunciosBuf: (Buffer | null)[] = new Array(anuncios.length).fill(null);
    await comConcorrencia(anuncios, 4, async (anuncio, i) => {
      try {
        anunciosBuf[i] = ehVideo(anuncio.formato)
          ? await gerarAnuncioVideo(client, systemPrompt, anuncio, capa, nomeCampanha)
          : await gerarAnuncioEstatico(client, systemPrompt, anuncio, capa, nomeCampanha);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "erro desconhecido";
        anunciosBuf[i] = null;
        erros.push(
          `Anúncio #${String(i + 1).padStart(2, "0")} (${anuncio.formato ?? "sem formato"}): ${msg}`
        );
      }
    });
    for (let i = 0; i < anuncios.length; i++) {
      const buf = anunciosBuf[i];
      if (!buf) continue; // erro ja registrado
      const ordem = String(i + 1).padStart(2, "0");
      const nome = nomeSeguro(`${anuncios[i].formato || "Anuncio"} - ${anuncios[i].angulo || ""}`);
      zip.file(`anuncios/${ordem} - ${nome}.docx`, buf);
    }
  }

  // ===== YouTube — 3 descricoes (fases), concorrencia 4 =====
  if (gerarTudo || categoria === "youtube") {
    const fasesYoutube = ["Pré-lançamento", "Promoção", "Último dia"];
    const youtubeBuf: (Buffer | null)[] = new Array(fasesYoutube.length).fill(null);
    await comConcorrencia(fasesYoutube, 4, async (fase, i) => {
      try {
        youtubeBuf[i] = await gerarYoutube(client, systemPrompt, fase, capa);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "erro desconhecido";
        youtubeBuf[i] = null;
        erros.push(`YouTube (${fase}): ${msg}`);
      }
    });
    for (let i = 0; i < fasesYoutube.length; i++) {
      const buf = youtubeBuf[i];
      if (!buf) continue;
      zip.file(`youtube/Descricao YouTube - ${nomeSeguro(fasesYoutube[i])}.docx`, buf);
    }
  }

  // ===== Paginas — 3 HTML autocontidos, concorrencia 4 =====
  if (gerarTudo || categoria === "paginas") {
    const paginas: { tipo: "landing" | "sucesso" | "vendas"; arquivo: string; rotulo: string }[] = [
      { tipo: "landing", arquivo: "landing-page.html", rotulo: "Landing Page" },
      { tipo: "sucesso", arquivo: "pagina-de-sucesso.html", rotulo: "Página de Sucesso" },
      { tipo: "vendas", arquivo: "pagina-de-vendas.html", rotulo: "Página de Vendas" },
    ];
    const paginasHtml: (string | null)[] = new Array(paginas.length).fill(null);
    await comConcorrencia(paginas, 4, async (p, i) => {
      try {
        paginasHtml[i] = await gerarPaginaHtml(client, systemPrompt, p.tipo, capa, exemploVendas);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "erro desconhecido";
        paginasHtml[i] = null;
        erros.push(`Página (${p.rotulo}): ${msg}`);
      }
    });
    for (let i = 0; i < paginas.length; i++) {
      const html = paginasHtml[i];
      if (!html) continue;
      zip.file(`paginas/${paginas[i].arquivo}`, html);
    }
  }

  // Se alguma peca falhou por falta de saldo na API, responde a mensagem
  // amigavel (402) em vez de devolver um zip so com _erros.txt.
  if (erros.some((e) => ehErroDeCredito(e))) {
    return NextResponse.json({ erro: MSG_SEM_CREDITO }, { status: 402 });
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
    const nomeZip = gerarTudo ? "copies-completas.zip" : `copies-${categoria}.zip`;
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${nomeZip}"`,
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
