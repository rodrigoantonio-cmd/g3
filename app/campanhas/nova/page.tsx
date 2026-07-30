"use client";

// Formulario de briefing. Ao enviar, chama POST /api/generate e mostra o
// resultado. O botao "Salvar campanha" grava via POST /api/save (sem login);
// o historico e compartilhado pelo time.

import { useState } from "react";
import Link from "next/link";
import type { Briefing, CampanhaEstruturada, Situacao } from "@/lib/types";

// A geracao pode devolver a campanha estruturada + um aviso opcional (stub).
type ResultadoGeracao = CampanhaEstruturada & { aviso?: string };

// Estado inicial do briefing (campos vazios).
const briefingVazio: Briefing = {
  concurso: "",
  orgao: "",
  situacao: "pre-edital",
  banca: "",
  vagas: "",
  salario: "",
  dataInicioCarrinho: "",
  dataFimCarrinho: "",
  descontoPercent: "",
  cupom: "",
  observacoes: "",
};

export default function NovaCampanhaPage() {
  const [briefing, setBriefing] = useState<Briefing>(briefingVazio);
  const [resultado, setResultado] = useState<ResultadoGeracao | null>(null);
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [baixandoCopies, setBaixandoCopies] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okSalvar, setOkSalvar] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  // Atualiza um campo do briefing.
  function set<K extends keyof Briefing>(campo: K, valor: Briefing[K]) {
    setBriefing((b) => ({ ...b, [campo]: valor }));
  }

  // Envia o briefing para a rota de geracao.
  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOkSalvar(null);
    setSalvo(false);
    setResultado(null);
    setGerando(true);

    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(briefing),
      });
      const dados = await resp.json();
      if (!resp.ok) {
        throw new Error(dados?.erro || "Falha ao gerar a campanha.");
      }
      setResultado(dados as ResultadoGeracao);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setGerando(false);
    }
  }

  // Monta e baixa a planilha .xlsx a partir da campanha gerada.
  async function baixarPlanilha() {
    if (!resultado) return;
    setErro(null);
    setBaixando(true);

    try {
      const resp = await fetch("/api/planilha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultado),
      });

      if (!resp.ok) {
        let msg = "Falha ao gerar a planilha.";
        try {
          const dados = await resp.json();
          msg = dados?.erro || msg;
        } catch {
          // resposta nao-JSON; mantem mensagem padrao
        }
        throw new Error(msg);
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "campanha.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao baixar a planilha.");
    } finally {
      setBaixando(false);
    }
  }

  // Monta e baixa as copies (.docx) num .zip a partir da campanha gerada.
  async function baixarCopies() {
    if (!resultado) return;
    setErro(null);
    setBaixandoCopies(true);

    try {
      const resp = await fetch("/api/copies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultado),
      });

      if (!resp.ok) {
        let msg = "Falha ao gerar as copies.";
        try {
          const dados = await resp.json();
          msg = dados?.erro || msg;
        } catch {
          // resposta nao-JSON; mantem mensagem padrao
        }
        throw new Error(msg);
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "copies.docx.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao baixar as copies.");
    } finally {
      setBaixandoCopies(false);
    }
  }

  // Salva a campanha via POST /api/save (sem login: acesso aberto).
  // O servidor grava com o service role e user_id = null (historico do time).
  async function salvar() {
    setErro(null);
    setOkSalvar(null);
    setSalvo(false);

    if (!resultado) return;

    setSalvando(true);
    try {
      const resp = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campanha: resultado, briefing }),
      });

      const dados = await resp.json();
      if (!resp.ok) {
        throw new Error(dados?.erro || "Falha ao salvar a campanha.");
      }

      const nome =
        resultado.nomeEscolhido || resultado.capa?.campanha || briefing.concurso;
      setOkSalvar(`Campanha "${nome}" salva com sucesso!`);
      setSalvo(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar a campanha.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <h1>Nova campanha</h1>
      <p className="subtitulo">
        Preencha o briefing. Os campos com * sao os mais importantes.
      </p>

      {erro && <div className="erro">{erro}</div>}
      {okSalvar && (
        <div className="aviso">
          {okSalvar}
          {salvo && (
            <>
              {" "}
              <Link href="/campanhas">Ver campanhas</Link>.
            </>
          )}
        </div>
      )}

      <form className="card" onSubmit={gerar}>
        <label htmlFor="concurso">Nome do concurso *</label>
        <input
          id="concurso"
          value={briefing.concurso}
          onChange={(e) => set("concurso", e.target.value)}
          placeholder="Ex.: TCE-SC"
          required
        />

        <label htmlFor="orgao">Orgao</label>
        <input
          id="orgao"
          value={briefing.orgao}
          onChange={(e) => set("orgao", e.target.value)}
          placeholder="Ex.: Tribunal de Contas do Estado de SC"
        />

        <label htmlFor="situacao">Situacao *</label>
        <select
          id="situacao"
          value={briefing.situacao}
          onChange={(e) => set("situacao", e.target.value as Situacao)}
        >
          <option value="pre-edital">Pre-edital</option>
          <option value="edital publicado">Edital publicado</option>
          <option value="reta final">Reta final</option>
        </select>

        <label htmlFor="banca">Banca</label>
        <input
          id="banca"
          value={briefing.banca}
          onChange={(e) => set("banca", e.target.value)}
          placeholder="Ex.: FGV, Cebraspe, FCC..."
        />

        <div className="linha">
          <div>
            <label htmlFor="vagas">Vagas</label>
            <input
              id="vagas"
              value={briefing.vagas}
              onChange={(e) => set("vagas", e.target.value)}
              placeholder="Ex.: 2.000 previstas"
            />
          </div>
          <div>
            <label htmlFor="salario">Salario</label>
            <input
              id="salario"
              value={briefing.salario}
              onChange={(e) => set("salario", e.target.value)}
              placeholder="Ex.: ate R$ 15 mil/mes"
            />
          </div>
        </div>

        <div className="linha">
          <div>
            <label htmlFor="inicio">Inicio do carrinho</label>
            <input
              id="inicio"
              type="date"
              value={briefing.dataInicioCarrinho}
              onChange={(e) => set("dataInicioCarrinho", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="fim">Fim do carrinho</label>
            <input
              id="fim"
              type="date"
              value={briefing.dataFimCarrinho}
              onChange={(e) => set("dataFimCarrinho", e.target.value)}
            />
          </div>
        </div>

        <div className="linha">
          <div>
            <label htmlFor="desconto">% de desconto</label>
            <input
              id="desconto"
              value={briefing.descontoPercent}
              onChange={(e) => set("descontoPercent", e.target.value)}
              placeholder="Ex.: 30"
            />
          </div>
          <div>
            <label htmlFor="cupom">Cupom</label>
            <input
              id="cupom"
              value={briefing.cupom}
              onChange={(e) => set("cupom", e.target.value)}
              placeholder="Ex.: #TCESC30"
            />
          </div>
        </div>

        <label htmlFor="obs">Observacoes</label>
        <textarea
          id="obs"
          value={briefing.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
          placeholder="Qualquer detalhe extra que ajude a gerar a campanha."
        />

        <p style={{ marginTop: 16 }}>
          <button type="submit" disabled={gerando}>
            {gerando ? "Gerando..." : "Gerar campanha"}
          </button>
        </p>
      </form>

      {resultado && (
        <div>
          <h2>Resultado</h2>

          {resultado.aviso && <div className="aviso">{resultado.aviso}</div>}

          {resultado.bigIdeas?.length > 0 && (
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Ideias de nome (Big Ideas)</h2>
              <ul className="limpa">
                {resultado.bigIdeas.map((ideia, i) => (
                  <li key={i}>
                    {ideia}
                    {resultado.nomeEscolhido === ideia ? " (escolhida)" : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resultado.resumo && (
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Resumo</h2>
              <pre className="bloco">{resultado.resumo}</pre>
            </div>
          )}

          <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={baixarPlanilha} disabled={baixando}>
              {baixando ? "Gerando planilha..." : "Baixar planilha (.xlsx)"}
            </button>
            <button
              type="button"
              onClick={baixarCopies}
              disabled={baixandoCopies}
            >
              {baixandoCopies
                ? "Gerando copies..."
                : "Baixar copies (.docx .zip)"}
            </button>
            <button type="button" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar campanha"}
            </button>
          </p>
          <p className="subtitulo" style={{ marginTop: 4 }}>
            Gerar as copies chama a IA para cada e-mail e pode levar de 1 a 2
            minutos.
          </p>
        </div>
      )}
    </div>
  );
}
