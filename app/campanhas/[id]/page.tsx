"use client";

// Reabrir uma campanha salva: carrega a estrutura (GET /api/campanha/[id]),
// mostra o EditorEstrutura preenchido e permite:
//   - Baixar .xlsx           (POST /api/planilha)
//   - Salvar alteracoes      (PUT  /api/campanha/[id])
//   - Regenerar copies       (POST /api/regenerar) -> baixa zip so com as pecas alteradas

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import EditorEstrutura from "../EditorEstrutura";
import type { CampanhaEstruturada } from "@/lib/types";

type CampanhaMeta = {
  id: string;
  nome: string;
  concurso: string;
  status: string;
  created_at: string;
};

export default function CampanhaDetalhePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [meta, setMeta] = useState<CampanhaMeta | null>(null);
  const [estrutura, setEstrutura] = useState<CampanhaEstruturada | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [baixando, setBaixando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [regenerando, setRegenerando] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // ---- Carrega a campanha ----
  useEffect(() => {
    if (!id) return;
    async function carregar() {
      setCarregando(true);
      setErro(null);
      try {
        const resp = await fetch(`/api/campanha/${id}`);
        const dados = await resp.json();
        if (!resp.ok) throw new Error(dados?.erro || "Falha ao carregar a campanha.");
        setMeta(dados.campaign as CampanhaMeta);
        setEstrutura(dados.estrutura as CampanhaEstruturada);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro inesperado.");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [id]);

  // Helper: dispara o download de uma resposta binaria.
  async function baixarBlob(resp: Response, nomeArquivo: string) {
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ---- Baixar planilha (.xlsx) com a estrutura atual ----
  async function baixarPlanilha() {
    if (!estrutura) return;
    setErro(null);
    setOk(null);
    setBaixando(true);
    try {
      const resp = await fetch("/api/planilha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estrutura),
      });
      if (!resp.ok) {
        let msg = "Falha ao gerar a planilha.";
        try {
          const dados = await resp.json();
          msg = dados?.erro || msg;
        } catch {
          /* resposta nao-JSON */
        }
        throw new Error(msg);
      }
      await baixarBlob(resp, "campanha.xlsx");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao baixar a planilha.");
    } finally {
      setBaixando(false);
    }
  }

  // ---- Salvar alteracoes (PUT) ----
  async function salvar() {
    if (!estrutura || !id) return;
    setErro(null);
    setOk(null);
    setSalvando(true);
    try {
      const resp = await fetch(`/api/campanha/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estrutura }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados?.erro || "Falha ao salvar as alteracoes.");
      setOk("Alterações salvas com sucesso.");
      setMeta((m) => (m ? { ...m, status: "ajustada" } : m));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar as alteracoes.");
    } finally {
      setSalvando(false);
    }
  }

  // ---- Regenerar copies impactadas (POST) -> baixa zip ----
  async function regenerar() {
    if (!estrutura || !id) return;
    setErro(null);
    setOk(null);
    setRegenerando(true);
    try {
      const resp = await fetch("/api/regenerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estruturaNova: estrutura }),
      });
      if (!resp.ok) {
        let msg = "Falha ao regenerar as copies.";
        try {
          const dados = await resp.json();
          msg = dados?.erro || msg;
        } catch {
          /* resposta nao-JSON */
        }
        throw new Error(msg);
      }
      await baixarBlob(resp, "copies-atualizadas.docx.zip");
      // O /api/regenerar ja salva a estruturaNova como novo asset (status=ajustada).
      setOk(
        "Copies regeneradas: baixamos um zip apenas com as peças impactadas (veja _alteracoes.txt). A campanha foi salva."
      );
      setMeta((m) => (m ? { ...m, status: "ajustada" } : m));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao regenerar as copies.");
    } finally {
      setRegenerando(false);
    }
  }

  return (
    <div>
      <p className="subtitulo">
        <Link href="/campanhas">← Campanhas</Link>
      </p>

      <h1>{meta?.nome || meta?.concurso || "Campanha"}</h1>
      {meta && (
        <p className="subtitulo">
          Concurso: {meta.concurso} · Status: {meta.status} · Criada em{" "}
          {new Date(meta.created_at).toLocaleDateString("pt-BR")}
        </p>
      )}

      {erro && <div className="erro">{erro}</div>}
      {ok && <div className="aviso">{ok}</div>}

      {carregando && <p>Carregando...</p>}

      {!carregando && estrutura && (
        <>
          <EditorEstrutura value={estrutura} onChange={setEstrutura} />

          <p style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            <button
              type="button"
              className="botao-secundario"
              onClick={baixarPlanilha}
              disabled={baixando}
            >
              {baixando ? "Gerando planilha..." : "Baixar .xlsx"}
            </button>
            <button type="button" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
            <button type="button" onClick={regenerar} disabled={regenerando}>
              {regenerando ? "Regenerando..." : "Regenerar copies impactadas"}
            </button>
          </p>
        </>
      )}
    </div>
  );
}
