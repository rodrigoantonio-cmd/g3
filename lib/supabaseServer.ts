// Cliente do Supabase para uso NO SERVIDOR (route handlers e server components).
// Le/escreve o cookie de sessao do usuario via @supabase/ssr.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// true quando as duas variaveis estao preenchidas.
export const supabaseServerConfigurado = Boolean(supabaseUrl && supabaseAnonKey);

// Cria o cliente de servidor ligado aos cookies da requisicao atual.
export function getSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        // Em server components a escrita de cookie pode nao ser permitida;
        // ignoramos o erro para nao quebrar a renderizacao.
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // ignorado de proposito
        }
      },
    },
  });
}
