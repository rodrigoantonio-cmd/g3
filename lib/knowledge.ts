// Le e concatena o "cerebro" (arquivos .md da pasta knowledge/) em uma unica
// string, que sera usada como contexto no system prompt da geracao.
//
// Roda apenas no servidor (usa fs). O resultado fica em cache no modulo para
// nao reler os arquivos a cada requisicao.

import { promises as fs } from "fs";
import path from "path";

let cache: string | null = null;

// Pasta do cerebro na raiz do projeto.
const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");

// Le todos os .md da pasta knowledge/ (em ordem alfabetica -> 00, 01, 02...)
// e devolve tudo concatenado, com um cabecalho por arquivo.
export async function getKnowledge(): Promise<string> {
  if (cache) return cache;

  let arquivos: string[] = [];
  try {
    const entradas = await fs.readdir(KNOWLEDGE_DIR);
    arquivos = entradas
      .filter((nome) => nome.toLowerCase().endsWith(".md"))
      .sort();
  } catch {
    // Se a pasta nao existir por algum motivo, devolvemos contexto vazio.
    cache = "";
    return cache;
  }

  const partes: string[] = [];
  for (const nome of arquivos) {
    try {
      const conteudo = await fs.readFile(
        path.join(KNOWLEDGE_DIR, nome),
        "utf-8"
      );
      partes.push(`===== ARQUIVO: ${nome} =====\n${conteudo}`);
    } catch {
      // ignora arquivo que nao pode ser lido
    }
  }

  cache = partes.join("\n\n");
  return cache;
}
