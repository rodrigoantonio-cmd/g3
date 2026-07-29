// Renderiza os CORPOS das copies em .docx no template EC (Estrategia Concursos).
// Usa a lib "docx". Roda apenas no servidor (runtime Node.js).

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

// ---------------------------------------------------------------------------
// Parser inline: transforma uma linha com marcacao **negrito** e _italico_
// em um array de TextRun. Suporta os dois marcadores combinados no mesmo run.
// ---------------------------------------------------------------------------
export function parseInline(linha: string): TextRun[] {
  const runs: TextRun[] = [];
  if (!linha) return runs;

  // Token regex: captura **...** ou _..._ (nao-guloso), ou texto solto.
  // Processamos em uma unica passada mantendo o estado de negrito/italico.
  const regex = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let ultimoIndice = 0;
  let match: RegExpExecArray | null;

  const empurrar = (texto: string, bold: boolean, italics: boolean) => {
    if (texto.length === 0) return;
    runs.push(new TextRun({ text: texto, bold, italics }));
  };

  while ((match = regex.exec(linha)) !== null) {
    // Texto solto antes do marcador.
    if (match.index > ultimoIndice) {
      empurrar(linha.slice(ultimoIndice, match.index), false, false);
    }
    const token = match[0];
    if (token.startsWith("**")) {
      empurrar(token.slice(2, -2), true, false);
    } else {
      // token com _..._
      empurrar(token.slice(1, -1), false, true);
    }
    ultimoIndice = regex.lastIndex;
  }

  // Texto solto restante.
  if (ultimoIndice < linha.length) {
    empurrar(linha.slice(ultimoIndice), false, false);
  }

  return runs;
}

// Cria um paragrafo a partir de uma linha (com marcacao inline).
// Linha vazia => paragrafo vazio (equivale a uma linha em branco).
function paragrafoDeLinha(linha: string): Paragraph {
  const runs = parseInline(linha);
  return new Paragraph({ children: runs });
}

// Cria um paragrafo de cabecalho no formato "Rotulo: valor", com o rotulo em
// negrito e o valor em texto normal (o valor pode conter marcacao inline).
function paragrafoRotulo(rotulo: string, valor: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${rotulo} `, bold: true }),
      ...parseInline(valor ?? ""),
    ],
  });
}

// Paragrafo vazio (linha em branco).
function paragrafoVazio(): Paragraph {
  return new Paragraph({ children: [] });
}

// ---------------------------------------------------------------------------
// renderEmailDocx: monta o Document no template EC e devolve o Buffer.
// Serve tambem para WhatsApp (whatsapp=true), que NAO tem "Remetente".
// ---------------------------------------------------------------------------
export async function renderEmailDocx(args: {
  campanha: string;
  peca: string;
  dataHora: string;
  base: string;
  excluir: string;
  assunto: string;
  preHeader: string;
  corpo: string[];
  whatsapp?: boolean;
}): Promise<Buffer> {
  const {
    campanha,
    peca,
    dataHora,
    base,
    excluir,
    assunto,
    preHeader,
    corpo,
    whatsapp,
  } = args;

  // Monta o campo "Lista:" = base + exclusoes.
  const lista = excluir
    ? `${base || ""} (excluir: ${excluir})`
    : base || "";

  const paragrafos: Paragraph[] = [];

  // ===== Bloco de cabecalho (cada rotulo em negrito) =====
  paragrafos.push(paragrafoRotulo("Evento:", campanha));
  paragrafos.push(paragrafoRotulo("Data/Horário:", dataHora));
  paragrafos.push(paragrafoRotulo(whatsapp ? "WhatsApp:" : "E-mail:", peca));
  if (!whatsapp) {
    paragrafos.push(paragrafoRotulo("Remetente:", campanha));
  }
  paragrafos.push(paragrafoRotulo("Comentários:", "inserir link no botão"));
  paragrafos.push(paragrafoRotulo("Lista:", lista));

  // Linha em branco.
  paragrafos.push(paragrafoVazio());

  // ASSUNTO / PRE-HEADER (para WhatsApp o assunto ainda ajuda a identificar).
  paragrafos.push(paragrafoRotulo("ASSUNTO:", assunto));
  if (!whatsapp) {
    paragrafos.push(paragrafoRotulo("PRÉ-HEADER:", preHeader));
  }

  // Linha em branco antes do corpo.
  paragrafos.push(paragrafoVazio());

  // ===== Corpo (parágrafos; linha vazia = parágrafo vazio) =====
  const linhas = corpo && corpo.length > 0 ? corpo : [""];
  for (const linha of linhas) {
    paragrafos.push(paragrafoDeLinha(linha ?? ""));
  }

  const doc = new Document({
    creator: "Máquina de Lançamentos Growth",
    title: `${peca} - ${campanha}`,
    sections: [{ children: paragrafos }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
