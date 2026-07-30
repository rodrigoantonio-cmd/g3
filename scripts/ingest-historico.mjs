// scripts/ingest-historico.mjs
// Ingerir o SEU histórico de copies (pasta local) na base "referencias" do app.
// Lê .docx (via mammoth) e .md/.txt de uma pasta (recursivo), extrai o texto e
// envia em lotes para POST /api/ingest.
//
// Uso:
//   node scripts/ingest-historico.mjs "<caminho-da-pasta>" [urlBase]
// Ex.:
//   node scripts/ingest-historico.mjs "/Users/voce/Desktop/.../1 - GROWTH EC"
//   node scripts/ingest-historico.mjs "/caminho" https://seu-app.vercel.app
//
// Requisitos: o app precisa estar no ar (localhost:3000 por padrão) com
// SUPABASE_SERVICE_ROLE_KEY configurada (é o que autoriza /api/ingest).

import fs from "node:fs";
import path from "node:path";
import mammoth from "mammoth";

const pasta = process.argv[2];
const urlBase = (process.argv[3] || "http://localhost:3000").replace(/\/$/, "");
const INGEST_URL = `${urlBase}/api/ingest`;
const LOTE = 20;          // quantos itens por requisição
const MAX_CHARS = 8000;   // corta textos muito longos

if (!pasta) {
  console.error('Uso: node scripts/ingest-historico.mjs "<caminho-da-pasta>" [urlBase]');
  process.exit(1);
}

// Descobre o "tipo" da peça pelo nome do arquivo (ajuda o contexto de geração).
function tipoPorNome(nome) {
  const n = nome.toLowerCase();
  if (n.includes("convite")) return "email-convite";
  if (n.includes("promo")) return "email-promo";
  if (n.includes("alerta")) return "email-alerta";
  if (n.includes("whats")) return "whatsapp";
  if (n.includes("carrossel") || n.includes("carousel")) return "carrossel";
  if (n.includes("estático") || n.includes("estatico") || n.includes("google first") || n.includes("meta first") || n.includes("display")) return "anuncio";
  if (n.includes("youtube") || n.includes("descrição") || n.includes("descricao")) return "youtube";
  if (n.includes("página") || n.includes("pagina") || n.includes("landing") || n.includes("vendas")) return "pagina";
  return "copy";
}

// Percorre a pasta recursivamente e coleta arquivos suportados.
function coletar(dir, acc = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name.startsWith("~$") || item.name.startsWith(".")) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) coletar(full, acc);
    else {
      const ext = path.extname(item.name).toLowerCase();
      if ([".docx", ".md", ".txt"].includes(ext)) acc.push(full);
    }
  }
  return acc;
}

async function extrair(arquivo) {
  const ext = path.extname(arquivo).toLowerCase();
  if (ext === ".docx") {
    const { value } = await mammoth.extractRawText({ path: arquivo });
    return value || "";
  }
  return fs.readFileSync(arquivo, "utf-8");
}

async function enviar(itens) {
  const resp = await fetch(INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itens }),
  });
  const txt = await resp.text();
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${txt}`);
  try { return JSON.parse(txt).inseridos ?? 0; } catch { return 0; }
}

async function main() {
  const arquivos = coletar(pasta);
  console.log(`Encontrados ${arquivos.length} arquivos em "${pasta}".`);
  const raiz = path.basename(pasta);
  let lote = [];
  let total = 0;
  for (const arq of arquivos) {
    let texto = "";
    try { texto = (await extrair(arq)).trim(); } catch (e) { console.warn("  ! falha ao ler:", arq, e.message); continue; }
    if (!texto) continue;
    lote.push({
      titulo: path.basename(arq).replace(/\.(docx|md|txt)$/i, ""),
      fonte: `${raiz}/${path.relative(pasta, path.dirname(arq))}`.replace(/\/$/, ""),
      tipo: tipoPorNome(arq),
      conteudo: texto.slice(0, MAX_CHARS),
    });
    if (lote.length >= LOTE) {
      total += await enviar(lote);
      console.log(`  ...${total} inseridos`);
      lote = [];
    }
  }
  if (lote.length) { total += await enviar(lote); }
  console.log(`✅ Concluído: ${total} referências inseridas em ${INGEST_URL}`);
}

main().catch((e) => { console.error("Erro:", e.message); process.exit(1); });
