// Monta a planilha .xlsx (uma aba por bloco) a partir da CampanhaEstruturada.
// Usa exceljs. Roda apenas no servidor (runtime Node.js).

import ExcelJS from "exceljs";
import type { CampanhaEstruturada } from "@/lib/types";

// Cor de preenchimento do cabecalho (azul escuro) e cor do texto (branco).
const HEADER_FILL = "FF1F2937";
const HEADER_FONT = "FFFFFFFF";

// Aplica estilo padrao na linha de cabecalho (negrito, fundo escuro, texto branco).
function estilizarCabecalho(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FONT } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL },
    };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCCCCCC" } },
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
      left: { style: "thin", color: { argb: "FFCCCCCC" } },
      right: { style: "thin", color: { argb: "FFCCCCCC" } },
    };
  });
  row.height = 22;
}

// Cria uma aba de tabela: define colunas, aplica estilo no cabecalho, adiciona linhas.
function criarAbaTabela(
  workbook: ExcelJS.Workbook,
  nomeAba: string,
  colunas: { header: string; key: string; width: number; wrap?: boolean }[],
  linhas: Record<string, string>[]
): void {
  const ws = workbook.addWorksheet(nomeAba);
  ws.columns = colunas.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  estilizarCabecalho(ws.getRow(1));

  for (const linha of linhas) {
    const row = ws.addRow(linha);
    row.eachCell((cell, colNumber) => {
      const col = colunas[colNumber - 1];
      cell.alignment = {
        vertical: "top",
        horizontal: "left",
        wrapText: Boolean(col?.wrap),
      };
    });
  }

  ws.views = [{ state: "frozen", ySplit: 1 }];
}

export async function montarPlanilha(
  c: CampanhaEstruturada
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Máquina de Lançamentos Growth";
  workbook.created = new Date();

  // ===== Aba: Capa (rotulo | valor) =====
  const capa = workbook.addWorksheet("Capa");
  capa.columns = [
    { header: "Campo", key: "rotulo", width: 22 },
    { header: "Valor", key: "valor", width: 60 },
  ];
  estilizarCabecalho(capa.getRow(1));

  const capaLinhas: { rotulo: string; valor: string }[] = [
    { rotulo: "Campanha", valor: c.capa?.campanha ?? "" },
    { rotulo: "Concurso", valor: c.capa?.concurso ?? "" },
    { rotulo: "Órgão", valor: c.capa?.orgao ?? "" },
    { rotulo: "Situação", valor: c.capa?.situacao ?? "" },
    { rotulo: "Banca", valor: c.capa?.banca ?? "" },
    { rotulo: "Vagas", valor: c.capa?.vagas ?? "" },
    { rotulo: "Salário", valor: c.capa?.salario ?? "" },
    { rotulo: "Escolaridade", valor: c.capa?.escolaridade ?? "" },
    { rotulo: "Carrinho", valor: c.capa?.carrinho ?? "" },
    { rotulo: "Cupom", valor: c.capa?.cupom ?? "" },
    { rotulo: "Oferta", valor: c.capa?.oferta ?? "" },
    { rotulo: "Abrangência", valor: c.capa?.abrangencia ?? "" },
  ];
  for (const linha of capaLinhas) {
    const row = capa.addRow(linha);
    row.getCell("rotulo").font = { bold: true };
    row.getCell("valor").alignment = { wrapText: true, vertical: "top" };
  }
  capa.views = [{ state: "frozen", ySplit: 1 }];

  // ===== Aba: 1. Disparos =====
  criarAbaTabela(
    workbook,
    "1. Disparos",
    [
      { header: "Fase", key: "fase", width: 14 },
      { header: "Peça", key: "peca", width: 22 },
      { header: "Data", key: "data", width: 12 },
      { header: "Hora", key: "hora", width: 10 },
      { header: "Base", key: "base", width: 22 },
      { header: "Excluir", key: "excluir", width: 22 },
      { header: "Assunto", key: "assunto", width: 40, wrap: true },
      { header: "Pré-header", key: "preHeader", width: 40, wrap: true },
    ],
    (c.disparos ?? []).map((d) => ({
      fase: d.fase ?? "",
      peca: d.peca ?? "",
      data: d.data ?? "",
      hora: d.hora ?? "",
      base: d.base ?? "",
      excluir: d.excluir ?? "",
      assunto: d.assunto ?? "",
      preHeader: d.preHeader ?? "",
    }))
  );

  // ===== Aba: 2. Anúncios =====
  criarAbaTabela(
    workbook,
    "2. Anúncios",
    [
      { header: "Objetivo", key: "objetivo", width: 14 },
      { header: "Formato", key: "formato", width: 20 },
      { header: "Ângulo", key: "angulo", width: 45, wrap: true },
      { header: "Público", key: "publico", width: 30, wrap: true },
    ],
    (c.anuncios ?? []).map((a) => ({
      objetivo: a.objetivo ?? "",
      formato: a.formato ?? "",
      angulo: a.angulo ?? "",
      publico: a.publico ?? "",
    }))
  );

  // ===== Aba: 3. Programação =====
  criarAbaTabela(
    workbook,
    "3. Programação",
    [
      { header: "Data", key: "data", width: 12 },
      { header: "Hora", key: "hora", width: 10 },
      { header: "Professor", key: "professor", width: 24 },
      { header: "Evento", key: "evento", width: 28 },
      { header: "Conteúdo", key: "conteudo", width: 45, wrap: true },
    ],
    (c.programacao ?? []).map((p) => ({
      data: p.data ?? "",
      hora: p.hora ?? "",
      professor: p.professor ?? "",
      evento: p.evento ?? "",
      conteudo: p.conteudo ?? "",
    }))
  );

  // ===== Aba: 4. Mentorias =====
  criarAbaTabela(
    workbook,
    "4. Mentorias",
    [
      { header: "Data", key: "data", width: 12 },
      { header: "Hora", key: "hora", width: 10 },
      { header: "Professor", key: "professor", width: 24 },
      { header: "Tema", key: "tema", width: 50, wrap: true },
    ],
    (c.mentorias ?? []).map((m) => ({
      data: m.data ?? "",
      hora: m.hora ?? "",
      professor: m.professor ?? "",
      tema: m.tema ?? "",
    }))
  );

  // ===== Aba: 5. Oferta =====
  criarAbaTabela(
    workbook,
    "5. Oferta",
    [
      { header: "Período", key: "periodo", width: 22 },
      { header: "Produtos", key: "produtos", width: 35, wrap: true },
      { header: "Promoção", key: "promocao", width: 25, wrap: true },
      { header: "Bônus", key: "bonus", width: 30, wrap: true },
      { header: "Cupom", key: "cupom", width: 16 },
    ],
    (c.oferta ?? []).map((o) => ({
      periodo: o.periodo ?? "",
      produtos: o.produtos ?? "",
      promocao: o.promocao ?? "",
      bonus: o.bonus ?? "",
      cupom: o.cupom ?? "",
    }))
  );

  // ===== Aba: 6. WhatsApp (Grupos) =====
  criarAbaTabela(
    workbook,
    "6. WhatsApp (Grupos)",
    [
      { header: "Data", key: "data", width: 12 },
      { header: "Hora", key: "hora", width: 10 },
      { header: "Fase", key: "fase", width: 16 },
      { header: "Assunto", key: "assunto", width: 30, wrap: true },
      { header: "Mensagem", key: "mensagem", width: 60, wrap: true },
    ],
    (c.whatsappGrupos ?? []).map((w) => ({
      data: w.data ?? "",
      hora: w.hora ?? "",
      fase: w.fase ?? "",
      assunto: w.assunto ?? "",
      mensagem: w.mensagem ?? "",
    }))
  );

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
