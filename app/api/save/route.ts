// Route handler POST /api/save
// Salva uma campanha gerada SEM exigir login (acesso aberto). Usa o cliente
// com SERVICE ROLE (bypassa a RLS), gravando com user_id = null.
//
// Corpo esperado (JSON):
//   { "campanha": CampanhaEstruturada, "briefing": Briefing }
//
// Grava em 3 tabelas ligadas: campaigns -> briefings + assets.
// Retorna { id } da campanha criada. Sem service role -> 503.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { Briefing, CampanhaEstruturada } from "@/lib/types";

// Precisa do runtime Node.js.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 1) Exige o service role: sem ele nao ha como inserir (RLS bloqueia anon).
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        erro:
          "SUPABASE_SERVICE_ROLE_KEY nao esta configurada. Defina no ambiente do servidor para salvar campanhas.",
      },
      { status: 503 }
    );
  }

  // 2) Le e valida o corpo.
  let corpo: { campanha?: CampanhaEstruturada; briefing?: Briefing };
  try {
    corpo = (await req.json()) as {
      campanha?: CampanhaEstruturada;
      briefing?: Briefing;
    };
  } catch {
    return NextResponse.json(
      { erro: "JSON invalido no corpo da requisicao." },
      { status: 400 }
    );
  }

  const campanha = corpo?.campanha;
  const briefing = corpo?.briefing;

  if (!campanha || typeof campanha !== "object") {
    return NextResponse.json(
      { erro: 'Informe "campanha": a campanha estruturada gerada.' },
      { status: 400 }
    );
  }

  // Nome e concurso vem da campanha gerada (fonte-da-verdade).
  const nome = campanha.nomeEscolhido || campanha.capa?.campanha || "";
  const concurso = campanha.capa?.concurso || "";

  try {
    // 3) Cria a campanha (user_id = null: registro anonimo/compartilhado).
    const { data: registro, error: err1 } = await supabase
      .from("campaigns")
      .insert({
        user_id: null,
        nome,
        concurso,
        status: "gerada",
      })
      .select("id")
      .single();

    if (err1) throw err1;
    const id = registro.id as string;

    // 4) Salva o briefing (JSON) ligado a campanha.
    const { error: err2 } = await supabase.from("briefings").insert({
      campaign_id: id,
      dados: briefing ?? {},
    });
    if (err2) throw err2;

    // 5) Salva a campanha estruturada completa como asset (JSON serializado).
    const { error: err3 } = await supabase.from("assets").insert({
      campaign_id: id,
      tipo: "campanha_json",
      nome,
      conteudo: JSON.stringify(campanha),
    });
    if (err3) throw err3;

    return NextResponse.json({ id }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json(
      { erro: `Falha ao salvar a campanha: ${msg}` },
      { status: 500 }
    );
  }
}
