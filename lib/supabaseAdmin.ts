// Cliente do Supabase com SERVICE ROLE para uso NO SERVIDOR.
// O service role IGNORA a RLS, permitindo operacoes anonimas (sem login)
// como salvar campanhas e listar o historico compartilhado do time.
//
// NUNCA importe este arquivo em client components: a chave de service role
// e secreta e so pode existir no servidor.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Cria um client com service role. Retorna null se faltar URL ou a chave,
// para que as rotas possam devolver um aviso claro (503) em vez de quebrar.
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
