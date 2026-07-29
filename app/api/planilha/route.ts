// Route handler POST /api/planilha
// Recebe a CampanhaEstruturada (JSON) no corpo, monta a planilha .xlsx
// com exceljs e devolve o arquivo para download.

import { NextRequest, NextResponse } from "next/server";
import { montarPlanilha } from "@/lib/xlsx";
import type { CampanhaEstruturada } from "@/lib/types";

// Roda no runtime Node.js (exceljs usa APIs de Node).
export const runtime = "nodejs";

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

  try {
    const buffer = await montarPlanilha(campanha);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="campanha.xlsx"',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json(
      { erro: `Falha ao montar a planilha: ${msg}` },
      { status: 500 }
    );
  }
}
