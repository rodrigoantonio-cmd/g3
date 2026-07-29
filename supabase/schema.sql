-- =============================================================================
-- ESQUEMA DO BANCO (Supabase / PostgreSQL)
-- -----------------------------------------------------------------------------
-- Como usar: abra o painel do Supabase > SQL Editor > cole este arquivo > Run.
-- Cria as tabelas do app e ativa a seguranca por linha (RLS), de modo que cada
-- usuario so enxerga e mexe nas SUAS proprias campanhas.
-- =============================================================================

-- Extensao para gerar UUIDs (normalmente ja vem habilitada no Supabase).
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- PROFILES: dados extras do usuario, ligados a auth.users do Supabase.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  papel text default 'copywriter', -- ex.: 'head', 'copywriter'
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- CAMPAIGNS: uma linha por campanha de lancamento.
-- -----------------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null default '',
  concurso text not null default '',
  status text not null default 'rascunho', -- rascunho | ativa | encerrada
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- BRIEFINGS: o briefing preenchido, guardado como JSON, ligado a uma campanha.
-- -----------------------------------------------------------------------------
create table if not exists public.briefings (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- ASSETS: pecas geradas da campanha (nome, funil, copies, links etc.).
-- -----------------------------------------------------------------------------
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  tipo text not null default 'geracao', -- ex.: geracao | copy | anuncio
  nome text,
  conteudo text, -- texto/JSON da peca
  url text,      -- link opcional (ex.: planilha)
  created_at timestamptz not null default now()
);

-- Indices uteis para as consultas por usuario/campanha.
create index if not exists idx_campaigns_user on public.campaigns (user_id);
create index if not exists idx_briefings_campaign on public.briefings (campaign_id);
create index if not exists idx_assets_campaign on public.assets (campaign_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Ativa a protecao e cria politicas: cada usuario so acessa o que e seu.
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.briefings enable row level security;
alter table public.assets enable row level security;

-- PROFILES: o usuario ve/edita apenas o proprio perfil.
drop policy if exists "profiles_proprio" on public.profiles;
create policy "profiles_proprio" on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- CAMPAIGNS: o usuario ve/edita apenas as campanhas onde user_id = ele.
drop policy if exists "campaigns_proprio" on public.campaigns;
create policy "campaigns_proprio" on public.campaigns
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- BRIEFINGS: acesso permitido se a campanha ligada for do usuario.
drop policy if exists "briefings_por_campanha" on public.briefings;
create policy "briefings_por_campanha" on public.briefings
  for all
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = briefings.campaign_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = briefings.campaign_id and c.user_id = auth.uid()
    )
  );

-- ASSETS: mesma regra dos briefings (segue a dona da campanha).
drop policy if exists "assets_por_campanha" on public.assets;
create policy "assets_por_campanha" on public.assets
  for all
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = assets.campaign_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = assets.campaign_id and c.user_id = auth.uid()
    )
  );

-- =============================================================================
-- REFERENCIAS: "base de consulta" de copies (estilo/historico) ingerida de fora
-- (ex.: pasta do Drive) via /api/ingest. Alimenta o contexto da geracao.
-- Nao pertence a nenhum usuario: e um acervo compartilhado do time.
-- -----------------------------------------------------------------------------
create table if not exists public.referencias (
  id uuid primary key default gen_random_uuid(),
  titulo text,
  fonte text,
  tipo text,
  conteudo text,
  created_at timestamptz not null default now()
);

-- Indice para ordenar/paginar por data de ingestao.
create index if not exists idx_referencias_created_at on public.referencias (created_at desc);

-- RLS: qualquer usuario AUTENTICADO pode LER as referencias (contexto da geracao).
-- Escrita (INSERT/UPDATE/DELETE) NAO tem policy para anon/authenticated: so o
-- service_role escreve (via /api/ingest), pois o service_role ignora a RLS.
alter table public.referencias enable row level security;

drop policy if exists "referencias_select_autenticado" on public.referencias;
create policy "referencias_select_autenticado" on public.referencias
  for select
  to authenticated
  using (true);
