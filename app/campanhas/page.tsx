"use client";

// Lista as campanhas do usuario logado (lidas do Supabase).
// Client component: busca os dados no navegador com a sessao do usuario.

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser, supabaseConfigurado } from "@/lib/supabaseClient";
import type { Campaign } from "@/lib/types";

export default function CampanhasPage() {
  const [campanhas, setCampanhas] = useState<Campaign[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [logado, setLogado] = useState<boolean | null>(null);

  useEffect(() => {
    async function carregar() {
      if (!supabaseConfigurado) {
        setErro(
          "O Supabase ainda nao esta configurado. Preencha o .env.local (veja o README)."
        );
        setCarregando(false);
        return;
      }

      const supabase = getSupabaseBrowser();

      // Verifica se ha usuario logado.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLogado(false);
        setCarregando(false);
        return;
      }
      setLogado(true);

      // Le as campanhas (a RLS garante que so vem as do proprio usuario).
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, user_id, nome, concurso, status, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setErro(error.message);
      } else {
        setCampanhas((data ?? []) as Campaign[]);
      }
      setCarregando(false);
    }

    carregar();
  }, []);

  return (
    <div>
      <h1>Minhas campanhas</h1>
      <p className="subtitulo">
        Historico das campanhas que voce criou.{" "}
        <Link href="/campanhas/nova">Criar nova</Link>.
      </p>

      {erro && <div className="erro">{erro}</div>}

      {carregando && <p>Carregando...</p>}

      {!carregando && logado === false && (
        <div className="aviso">
          Voce precisa <Link href="/login">entrar</Link> para ver suas
          campanhas.
        </div>
      )}

      {!carregando && logado && campanhas.length === 0 && !erro && (
        <div className="card">
          <p>Voce ainda nao tem campanhas.</p>
          <Link className="botao" href="/campanhas/nova">
            Criar minha primeira campanha
          </Link>
        </div>
      )}

      {!carregando &&
        campanhas.map((c) => (
          <div className="card" key={c.id}>
            <strong>{c.nome || c.concurso}</strong>
            <div className="rodape">
              Concurso: {c.concurso} · Status: {c.status} · Criada em{" "}
              {new Date(c.created_at).toLocaleDateString("pt-BR")}
            </div>
          </div>
        ))}
    </div>
  );
}
