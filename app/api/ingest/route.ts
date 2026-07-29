// Route handler POST /api/ingest
// Ingere itens de referencia (base de consulta de copies) na tabela
// public.referencias, usando o cliente com SERVICE ROLE (bypassa a RLS).
//
// Corpo esperado (JSON):
//   { "itens": [ { "titulo": "...", "fonte": "...", "tipo": "...", "conteudo": "..." }, ... ] }
//
// Protegido: so funciona se SUPABASE_SERVICE_ROLE_KEY estiver configurada.
// Devolve a contagem de itens inseridos.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Precisa do runtime Node.js.
export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Um item de referencia (todos os campos opcionais, mas conteudo e obrigatorio).
type ItemReferencia = {
  titulo?: unknown;
  fonte?: unknown;
  tipo?: unknown;
  conteudo?: unknown;
};

// Converte um valor desconhecido para string limpa (ou "").
function paraTexto(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: NextRequest) {
  // 1) Exige o service role: sem ele, nao ha como inserir (RLS bloqueia anon).
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        erro:
          "SUPABASE_SERVICE_ROLE_KEY nao esta configurada. Defina no ambiente do servidor para usar a ingestao.",
      },
      { status: 503 }
    );
  }

  // 2) Le e valida o corpo.
  let corpo: { itens?: unknown };
  try {
    corpo = (await req.json()) as { itens?: unknown };
  } catch {
    return NextResponse.json(
      { erro: "JSON invalido no corpo da requisicao." },
      { status: 400 }
    );
  }

  if (!Array.isArray(corpo?.itens) || corpo.itens.length === 0) {
    return NextResponse.json(
      { erro: 'Informe "itens": um array nao-vazio de referencias.' },
      { status: 400 }
    );
  }

  // 3) Normaliza e valida os itens (conteudo e obrigatorio).
  const linhas = (corpo.itens as ItemReferencia[])
    .map((it) => ({
      titulo: paraTexto(it?.titulo),
      fonte: paraTexto(it?.fonte),
      tipo: paraTexto(it?.tipo),
      conteudo: paraTexto(it?.conteudo),
    }))
    .filter((it) => it.conteudo.length > 0);

  if (linhas.length === 0) {
    return NextResponse.json(
      { erro: "Nenhum item valido: cada item precisa de um campo 'conteudo' nao-vazio." },
      { status: 400 }
    );
  }

  // 4) Insere usando o service role (bypassa RLS).
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("referencias")
      .insert(linhas)
      .select("id");

    if (error) {
      return NextResponse.json(
        { erro: `Falha ao inserir referencias: ${error.message}` },
        { status: 500 }
      );
    }

    const inseridos = Array.isArray(data) ? data.length : linhas.length;
    return NextResponse.json({ inseridos }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json(
      { erro: `Falha ao inserir referencias: ${msg}` },
      { status: 500 }
    );
  }
}
