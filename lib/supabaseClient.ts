"use client";

// Cliente do Supabase para uso NO NAVEGADOR (client components).
// Usa a chave publica (anon), que pode ficar exposta no front-end.

import { createBrowserClient } from "@supabase/ssr";

// Lemos as variaveis publicas. Se faltarem, usamos string vazia para o app
// ainda compilar/rodar (as chamadas so falham em runtime, com aviso claro).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// true quando as duas variaveis estao preenchidas.
export const supabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey);

// Cria o cliente do navegador. Chame dentro de um client component.
export function getSupabaseBrowser() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
