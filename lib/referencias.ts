// Le a "base de consulta" de copies (tabela public.referencias) e devolve tudo
// concatenado numa unica string, para entrar como contexto extra no system
// prompt da geracao (generate/copies).
//
// Roda apenas no servidor. Usa o service role se estiver disponivel (bypassa a
// RLS); caso contrario, cai para o cliente de servidor com a sessao do usuario
// (cookies), que respeita a RLS (SELECT liberado para autenticados).
//
// Nunca quebra: se a tabela nao existir, estiver vazia ou faltar configuracao,
// devolve "" (string vazia).

import { createClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabaseServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// true quando da para usar o cliente com service role (leitura sem RLS).
export const referenciasServiceRoleConfigurado = Boolean(
  supabaseUrl && serviceRoleKey
);

// Cliente para leitura das referencias:
// - service role se houver a chave (ignora RLS);
// - senao, o cliente de servidor ligado aos cookies (respeita RLS).
function getClienteLeitura() {
  if (referenciasServiceRoleConfigurado) {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return getSupabaseServer();
}

// Le as referencias e devolve "### <titulo>\n<conteudo>" concatenado,
// cortado em maxChars. Nunca lanca: em qualquer falha, devolve "".
export async function getReferencias(maxChars = 20000): Promise<string> {
  try {
    const supabase = getClienteLeitura();
    const { data, error } = await supabase
      .from("referencias")
      .select("titulo, conteudo")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error || !Array.isArray(data) || data.length === 0) return "";

    const partes = data
      .map((r) => {
        const titulo = typeof r?.titulo === "string" ? r.titulo.trim() : "";
        const conteudo = typeof r?.conteudo === "string" ? r.conteudo.trim() : "";
        if (!conteudo) return "";
        return `### ${titulo || "(sem titulo)"}\n${conteudo}`;
      })
      .filter(Boolean);

    const texto = partes.join("\n\n").trim();
    if (!texto) return "";
    return texto.length > maxChars ? texto.slice(0, maxChars) : texto;
  } catch {
    // Tabela inexistente, sem config, erro de rede etc. -> contexto vazio.
    return "";
  }
}
