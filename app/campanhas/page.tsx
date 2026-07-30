"use client";

// Lista o historico COMPARTILHADO do time (sem login).
// Client component: busca os dados via GET /api/campanhas (service role no
// servidor, que ignora a RLS e retorna todas as campanhas).

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Campaign } from "@/lib/types";

export default function CampanhasPage() {
  const [campanhas, setCampanhas] = useState<Campaign[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const resp = await fetch("/api/campanhas");
        const dados = await resp.json();
        if (!resp.ok) {
          throw new Error(dados?.erro || "Falha ao carregar as campanhas.");
        }
        setCampanhas((dados?.campanhas ?? []) as Campaign[]);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro inesperado.");
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, []);

  return (
    <div>
      <h1>Campanhas do time</h1>
      <p className="subtitulo">
        Historico compartilhado das campanhas criadas pelo time.{" "}
        <Link href="/campanhas/nova">Criar nova</Link>.
      </p>

      {erro && <div className="erro">{erro}</div>}

      {carregando && <p>Carregando...</p>}

      {!carregando && campanhas.length === 0 && !erro && (
        <div className="card">
          <p>Ainda nao ha campanhas salvas.</p>
          <Link className="botao" href="/campanhas/nova">
            Criar a primeira campanha
          </Link>
        </div>
      )}

      {!carregando &&
        campanhas.map((c) => (
          <Link
            className="card"
            key={c.id}
            href={`/campanhas/${c.id}`}
            style={{ display: "block", textDecoration: "none", color: "inherit" }}
          >
            <strong>{c.nome || c.concurso}</strong>
            <div className="rodape">
              Concurso: {c.concurso} · Status: {c.status} · Criada em{" "}
              {new Date(c.created_at).toLocaleDateString("pt-BR")}
            </div>
          </Link>
        ))}
    </div>
  );
}
