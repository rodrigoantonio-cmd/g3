// Renderiza os CORPOS das copies em .docx no template EC (Estrategia Concursos).
// Usa a lib "docx". Roda apenas no servidor (runtime Node.js).

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";

// Estilo padrão de TODOS os .docx gerados: Arial 12 (size em meios-pontos = 24).
// Rótulos/ênfases usam bold/italic nos runs; a fonte/tamanho base vem daqui.
const ESTILO_PADRAO = {
  default: {
    document: {
      run: { font: "Arial", size: 24 },
    },
  },
};

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

  // Nome CURTO da campanha (Big Idea, sem a red line/Big Promise depois do "|").
  // Usado em "Evento" e "Remetente" — o remetente é o nome da campanha, não a promessa.
  const nomeCurto = (campanha || "").split("|")[0].trim();

  // ===== Bloco de cabecalho (cada rotulo em negrito) =====
  paragrafos.push(paragrafoRotulo("Evento:", nomeCurto));
  paragrafos.push(paragrafoRotulo("Data/Horário:", dataHora));
  paragrafos.push(paragrafoRotulo(whatsapp ? "WhatsApp:" : "E-mail:", peca));
  if (!whatsapp) {
    paragrafos.push(paragrafoRotulo("Remetente:", nomeCurto));
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
    styles: ESTILO_PADRAO,
    sections: [{ children: paragrafos }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

// ---------------------------------------------------------------------------
// Helpers para as pecas de anuncio/youtube (titulos em negrito + linhas).
// ---------------------------------------------------------------------------

// Paragrafo de titulo de secao (todo em negrito). Remove marcadores inline
// (** e _) e escreve tudo em um unico run negrito.
function paragrafoTitulo(texto: string): Paragraph {
  const limpo = (texto ?? "").replace(/\*\*/g, "").replace(/_/g, "");
  return new Paragraph({ children: [new TextRun({ text: limpo, bold: true })] });
}

// Empurra um titulo de secao seguido das linhas de conteudo (com inline).
function pushSecao(paragrafos: Paragraph[], titulo: string, linhas: string[] | undefined) {
  paragrafos.push(paragrafoVazio());
  paragrafos.push(paragrafoTitulo(titulo));
  const ls = linhas && linhas.length > 0 ? linhas : [""];
  for (const l of ls) paragrafos.push(paragrafoDeLinha(l ?? ""));
}

// Celula de tabela com texto (inline) e opcao de negrito no cabecalho.
function celula(texto: string, bold = false): TableCell {
  const runs = bold
    ? [new TextRun({ text: texto, bold: true })]
    : parseInline(texto ?? "");
  return new TableCell({
    children: [new Paragraph({ children: runs.length > 0 ? runs : [new TextRun({ text: texto ?? "" })] })],
  });
}

// ---------------------------------------------------------------------------
// renderAnuncioEstaticoDocx: anuncio estatico no padrao EC (Meta Ads).
// ---------------------------------------------------------------------------
export async function renderAnuncioEstaticoDocx(args: {
  campanha: string;
  nome: string;
  titulo1: string;
  titulo2: string;
  textoMeta: string[];
  laminas: { lamina: string; copy: string; arte: string }[];
  legenda: string[];
}): Promise<Buffer> {
  const { campanha, nome, titulo1, titulo2, textoMeta, laminas, legenda } = args;
  const paragrafos: (Paragraph | Table)[] = [];

  paragrafos.push(paragrafoRotulo("Campanha:", campanha));
  paragrafos.push(paragrafoRotulo("Anúncio:", nome));
  paragrafos.push(paragrafoVazio());

  paragrafos.push(paragrafoTitulo("Título 1"));
  paragrafos.push(paragrafoDeLinha(titulo1 || ""));
  paragrafos.push(paragrafoVazio());
  paragrafos.push(paragrafoTitulo("Título 2"));
  paragrafos.push(paragrafoDeLinha(titulo2 || ""));

  paragrafos.push(paragrafoVazio());
  paragrafos.push(paragrafoTitulo("Texto principal — Meta Ads"));
  const textos = textoMeta && textoMeta.length > 0 ? textoMeta : [""];
  for (const l of textos) paragrafos.push(paragrafoDeLinha(l ?? ""));

  // Tabela LAMINA | COPY | ARTE REF.
  paragrafos.push(paragrafoVazio());
  const linhasTabela = laminas && laminas.length > 0 ? laminas : [{ lamina: "", copy: "", arte: "" }];
  const tabela = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [celula("LÂMINA", true), celula("COPY", true), celula("ARTE REF.", true)],
        tableHeader: true,
      }),
      ...linhasTabela.map(
        (r) =>
          new TableRow({
            children: [celula(r.lamina || ""), celula(r.copy || ""), celula(r.arte || "")],
          })
      ),
    ],
  });
  paragrafos.push(tabela);

  paragrafos.push(paragrafoVazio());
  paragrafos.push(paragrafoTitulo("Legenda Completa com emojis"));
  const legs = legenda && legenda.length > 0 ? legenda : [""];
  for (const l of legs) paragrafos.push(paragrafoDeLinha(l ?? ""));

  const doc = new Document({
    creator: "Máquina de Lançamentos Growth",
    title: `${nome} - ${campanha}`,
    styles: ESTILO_PADRAO,
    sections: [{ children: paragrafos }],
  });
  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

// ---------------------------------------------------------------------------
// renderAnuncioVideoDocx: roteiro de video (longo + curto) no padrao EC.
// ---------------------------------------------------------------------------
export async function renderAnuncioVideoDocx(args: {
  campanha: string;
  nome: string;
  longo: string[];
  curto: string[];
  legendaEmoji: string[];
  legendaSem: string[];
  titulo1: string;
  titulo2: string;
}): Promise<Buffer> {
  const { campanha, nome, longo, curto, legendaEmoji, legendaSem, titulo1, titulo2 } = args;
  const paragrafos: Paragraph[] = [];

  paragrafos.push(paragrafoRotulo("Campanha:", campanha));
  paragrafos.push(paragrafoRotulo("Anúncio:", nome));

  pushSecao(paragrafos, "ANÚNCIO LONGO (~1 min)", longo);
  pushSecao(paragrafos, "ANÚNCIO CURTO (~15 seg)", curto);
  pushSecao(paragrafos, "Legenda com emojis", legendaEmoji);
  pushSecao(paragrafos, "Legenda sem emojis", legendaSem);

  paragrafos.push(paragrafoVazio());
  paragrafos.push(paragrafoRotulo("Título 1:", titulo1 || ""));
  paragrafos.push(paragrafoRotulo("Título 2:", titulo2 || ""));

  const doc = new Document({
    creator: "Máquina de Lançamentos Growth",
    title: `${nome} - ${campanha}`,
    styles: ESTILO_PADRAO,
    sections: [{ children: paragrafos }],
  });
  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

// ---------------------------------------------------------------------------
// renderYoutubeDocx: descricao de YouTube (titulo + corpo + hashtags).
// ---------------------------------------------------------------------------
export async function renderYoutubeDocx(args: {
  titulo: string[];
  corpo: string[];
  hashtags: string;
}): Promise<Buffer> {
  const { titulo, corpo, hashtags } = args;
  const paragrafos: Paragraph[] = [];

  paragrafos.push(paragrafoTitulo("Título"));
  const titulos = titulo && titulo.length > 0 ? titulo : [""];
  for (const l of titulos) paragrafos.push(paragrafoDeLinha(l ?? ""));

  paragrafos.push(paragrafoVazio());
  paragrafos.push(paragrafoTitulo("Descrição"));
  const corpos = corpo && corpo.length > 0 ? corpo : [""];
  for (const l of corpos) paragrafos.push(paragrafoDeLinha(l ?? ""));

  paragrafos.push(paragrafoVazio());
  paragrafos.push(paragrafoRotulo("Hashtags:", hashtags || ""));

  const doc = new Document({
    creator: "Máquina de Lançamentos Growth",
    title: "Descrição YouTube",
    styles: ESTILO_PADRAO,
    sections: [{ children: paragrafos }],
  });
  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
