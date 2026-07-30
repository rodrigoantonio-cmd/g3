// Route handlers para uma campanha salva especifica:
//   GET  /api/campanha/[id] -> { campaign, estrutura } (le o asset campanha_json mais recente)
//   PUT  /api/campanha/[id] -> salva a estrutura editada como NOVO asset (mantem historico)
//
// Ambos usam o cliente com SERVICE ROLE (bypassa a RLS) para ler/gravar o
// historico compartilhado do time (sem login). Sem service role -> 503.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CampanhaEstruturada } from "@/lib/types";

// Precisa do runtime Node.js.
export const runtime = "nodejs";

// GET: carrega os metadados da campanha + a estrutura (asset campanha_json mais recente).
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        erro:
          "SUPABASE_SERVICE_ROLE_KEY nao esta configurada. Defina no ambiente do servidor para abrir campanhas.",
      },
      { status: 503 }
    );
  }

  const id = params.id;

  // Metadados da campanha.
  const { data: campaign, error: errCampaign } = await supabase
    .from("campaigns")
    .select("id, nome, concurso, status, created_at")
    .eq("id", id)
    .maybeSingle();

  if (errCampaign) {
    return NextResponse.json(
      { erro: `Falha ao carregar a campanha: ${errCampaign.message}` },
      { status: 500 }
    );
  }
  if (!campaign) {
    return NextResponse.json({ erro: "Campanha nao encontrada." }, { status: 404 });
  }

  // Estrutura = asset campanha_json mais recente daquela campanha.
  const { data: asset, error: errAsset } = await supabase
    .from("assets")
    .select("conteudo")
    .eq("campaign_id", id)
    .eq("tipo", "campanha_json")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errAsset) {
    return NextResponse.json(
      { erro: `Falha ao carregar a estrutura: ${errAsset.message}` },
      { status: 500 }
    );
  }
  if (!asset?.conteudo) {
    return NextResponse.json(
      { erro: "Estrutura da campanha nao encontrada." },
      { status: 404 }
    );
  }

  let estrutura: CampanhaEstruturada;
  try {
    estrutura = JSON.parse(asset.conteudo) as CampanhaEstruturada;
  } catch {
    return NextResponse.json(
      { erro: "Estrutura da campanha esta corrompida (JSON invalido)." },
      { status: 500 }
    );
  }

  return NextResponse.json({ campaign, estrutura }, { status: 200 });
}

// PUT: grava a estrutura editada como NOVO asset (mantem o historico) e marca
// a campanha como 'ajustada'.
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        erro:
          "SUPABASE_SERVICE_ROLE_KEY nao esta configurada. Defina no ambiente do servidor para salvar alteracoes.",
      },
      { status: 503 }
    );
  }

  const id = params.id;

  let corpo: { estrutura?: CampanhaEstruturada };
  try {
    corpo = (await req.json()) as { estrutura?: CampanhaEstruturada };
  } catch {
    return NextResponse.json(
      { erro: "JSON invalido no corpo da requisicao." },
      { status: 400 }
    );
  }

  const estrutura = corpo?.estrutura;
  if (!estrutura || typeof estrutura !== "object") {
    return NextResponse.json(
      { erro: 'Informe "estrutura": a campanha estruturada editada.' },
      { status: 400 }
    );
  }

  // Confere que a campanha existe.
  const { data: campaign, error: errCampaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (errCampaign) {
    return NextResponse.json(
      { erro: `Falha ao localizar a campanha: ${errCampaign.message}` },
      { status: 500 }
    );
  }
  if (!campaign) {
    return NextResponse.json({ erro: "Campanha nao encontrada." }, { status: 404 });
  }

  const nome = estrutura.nomeEscolhido || estrutura.capa?.campanha || "";

  try {
    // Insere um NOVO asset campanha_json (nao sobrescreve: mantem historico).
    const { error: errInsert } = await supabase.from("assets").insert({
      campaign_id: id,
      tipo: "campanha_json",
      nome,
      conteudo: JSON.stringify(estrutura),
    });
    if (errInsert) throw errInsert;

    // Marca a campanha como ajustada (e atualiza nome/concurso derivados).
    const { error: errUpdate } = await supabase
      .from("campaigns")
      .update({
        status: "ajustada",
        nome: nome || undefined,
        concurso: estrutura.capa?.concurso || undefined,
      })
      .eq("id", id);
    if (errUpdate) throw errUpdate;

    return NextResponse.json({ id, status: "ajustada" }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json(
      { erro: `Falha ao salvar as alteracoes: ${msg}` },
      { status: 500 }
    );
  }
}
