// Route handler GET /api/campanhas
// Lista o historico COMPARTILHADO do time (sem login). Usa o cliente com
// SERVICE ROLE (bypassa a RLS) para ler todas as campanhas.
//
// Retorna { campanhas: [{ id, nome, concurso, status, created_at }, ...] }.
// Sem service role -> 503.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Precisa do runtime Node.js.
export const runtime = "nodejs";

export async function GET() {
  // Exige o service role: sem ele a RLS bloqueia a leitura anonima.
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        erro:
          "SUPABASE_SERVICE_ROLE_KEY nao esta configurada. Defina no ambiente do servidor para ver o historico.",
      },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("id, nome, concurso, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { erro: `Falha ao listar campanhas: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ campanhas: data ?? [] }, { status: 200 });
}
