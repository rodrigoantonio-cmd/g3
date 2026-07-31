"use client";

// Assistente passo a passo para criar uma campanha de lancamento.
// Uma acao por vez, com aprovacao em cada etapa:
//   0) Briefing            -> gera 10 Big Ideas (/api/bigideas)
//   1) Big Ideas           -> escolhe uma (radio) ou escreve outra
//   2) Resumo              -> gera o resumo (/api/resumo) + info adicional
//   3) Planilha editavel   -> gera a estrutura (/api/estrutura), edita, baixa .xlsx
//   4) Copies              -> gera copies (/api/copies) e salva (/api/save)

import { useState } from "react";
import Link from "next/link";
import EditorEstrutura from "../EditorEstrutura";
import type { Briefing, CampanhaEstruturada, Situacao } from "@/lib/types";

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

const TOTAL_ETAPAS = 5;

// Categorias de copy — cada uma vira uma requisicao curta e separada a
// /api/copies?categoria=X (evita estourar o tempo limite da funcao na Vercel).
const CATEGORIAS_COPY = [
  { id: "emails", rotulo: "📧 E-mails" },
  { id: "whatsapp", rotulo: "💬 WhatsApp" },
  { id: "anuncios", rotulo: "📢 Anúncios" },
  { id: "youtube", rotulo: "▶️ YouTube" },
  { id: "paginas", rotulo: "📄 Páginas (LP/vendas/sucesso)" },
] as const;

export default function NovaCampanhaPage() {
  // ---- Estado do wizard ----
  const [etapa, setEtapa] = useState(0);
  const [briefing, setBriefing] = useState<Briefing>(briefingVazio);

  const [bigIdeas, setBigIdeas] = useState<string[]>([]);
  const [bigIdeaRadio, setBigIdeaRadio] = useState<string>("");
  const [bigIdeaOutra, setBigIdeaOutra] = useState<string>("");

  const [resumo, setResumo] = useState<string>("");
  const [extra, setExtra] = useState<string>("");

  const [estrutura, setEstrutura] = useState<CampanhaEstruturada | null>(null);

  // ---- Flags de carregamento / mensagens ----
  const [carregando, setCarregando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  // Guarda qual categoria de copy esta sendo gerada ("emails" | ... | "tudo"),
  // ou null quando nada esta rodando. Usado para desabilitar os botoes e mostrar
  // o "gerando..." no botao certo.
  const [gerando, setGerando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [okFinal, setOkFinal] = useState<string | null>(null);

  // Big Idea efetivamente escolhida (o campo "outra" tem prioridade).
  const bigIdeaEscolhida = (bigIdeaOutra.trim() || bigIdeaRadio).trim();

  function set<K extends keyof Briefing>(campo: K, valor: Briefing[K]) {
    setBriefing((b) => ({ ...b, [campo]: valor }));
  }

  // ---- Etapa 0 -> 1: gerar Big Ideas ----
  async function gerarBigIdeas(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setCarregando(true);
    try {
      const resp = await fetch("/api/bigideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(briefing),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados?.erro || "Falha ao gerar as Big Ideas.");
      const lista: string[] = Array.isArray(dados?.bigIdeas) ? dados.bigIdeas : [];
      setBigIdeas(lista);
      setBigIdeaRadio(lista[0] ?? "");
      setBigIdeaOutra("");
      if (dados?.aviso) setAviso(dados.aviso);
      setEtapa(1);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }

  // ---- Etapa 1 -> 2: gerar Resumo ----
  async function gerarResumo() {
    if (!bigIdeaEscolhida) {
      setErro("Escolha uma Big Idea ou escreva a sua.");
      return;
    }
    setErro(null);
    setAviso(null);
    setCarregando(true);
    try {
      const resp = await fetch("/api/resumo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefing, bigIdea: bigIdeaEscolhida }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados?.erro || "Falha ao gerar o resumo.");
      setResumo(typeof dados?.resumo === "string" ? dados.resumo : "");
      if (dados?.aviso) setAviso(dados.aviso);
      setEtapa(2);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }

  // ---- Etapa 2 -> 3: gerar a estrutura (planilha) ----
  async function gerarEstrutura() {
    setErro(null);
    setAviso(null);
    setCarregando(true);
    try {
      const resp = await fetch("/api/estrutura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefing, bigIdea: bigIdeaEscolhida, resumo, extra }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados?.erro || "Falha ao gerar a estrutura.");
      const { aviso: avisoResp, ...campanha } = dados as CampanhaEstruturada & {
        aviso?: string;
      };
      setEstrutura(campanha as CampanhaEstruturada);
      if (avisoResp) setAviso(avisoResp);
      setEtapa(3);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }

  // ---- Baixar planilha (.xlsx) com a estrutura EDITADA ----
  async function baixarPlanilha() {
    if (!estrutura) return;
    setErro(null);
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

  // ---- Etapa 3 -> 4: aprovar planilha e ir para copies ----
  function aprovarPlanilha() {
    setErro(null);
    setAviso(null);
    setOkFinal(null);
    setEtapa(4);
  }

  // ---- Gera UMA categoria de copy (requisicao curta) e baixa o zip. ----
  // Nao mexe no estado global de erro/loading (quem chama cuida disso) para
  // poder ser reaproveitada tanto pelos botoes individuais quanto pelo
  // "Baixar tudo (em partes)". Devolve {ok, msg} para o chamador decidir.
  async function gerarCategoria(
    categoria: string
  ): Promise<{ ok: boolean; msg?: string }> {
    if (!estrutura) return { ok: false, msg: "Estrutura indisponível." };
    let resp: Response;
    try {
      resp = await fetch(`/api/copies?categoria=${encodeURIComponent(categoria)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estrutura),
      });
    } catch (err) {
      const detalhe = err instanceof Error ? err.message : "erro de rede";
      return { ok: false, msg: `Falha ao gerar ${categoria}: ${detalhe}` };
    }
    if (!resp.ok) {
      // Melhora o diagnostico: inclui o status HTTP e o texto do servidor.
      let servidor = resp.statusText || "";
      try {
        const dados = await resp.json();
        servidor = dados?.erro || servidor;
      } catch {
        /* resposta nao-JSON */
      }
      return {
        ok: false,
        msg: `Falha (HTTP ${resp.status}) ao gerar ${categoria}: ${servidor}`,
      };
    }
    await baixarBlob(resp, `copies-${categoria}.zip`);
    return { ok: true };
  }

  // ---- Botao individual: gera e baixa UMA categoria. ----
  async function baixarCategoria(categoria: string) {
    if (!estrutura) return;
    setErro(null);
    setGerando(categoria);
    try {
      const r = await gerarCategoria(categoria);
      if (!r.ok) setErro(r.msg || `Falha ao gerar ${categoria}.`);
    } finally {
      setGerando(null);
    }
  }

  // ---- Botao "Baixar tudo (em partes)": chama as 5 categorias EM SEQUENCIA. ----
  // Uma de cada vez (await). Se uma falhar, segue para as proximas e, ao final,
  // mostra quais falharam.
  async function baixarTudoEmPartes() {
    if (!estrutura) return;
    setErro(null);
    setGerando("tudo");
    const falhas: string[] = [];
    try {
      for (const c of CATEGORIAS_COPY) {
        const r = await gerarCategoria(c.id);
        if (!r.ok) falhas.push(r.msg || `Falha ao gerar ${c.id}`);
      }
    } finally {
      setGerando(null);
    }
    if (falhas.length > 0) {
      setErro(`Algumas categorias falharam: ${falhas.join(" | ")}`);
    }
  }

  // ---- Salvar a campanha (estrutura EDITADA) ----
  async function salvar() {
    if (!estrutura) return;
    setErro(null);
    setOkFinal(null);
    setSalvando(true);
    try {
      const resp = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campanha: estrutura, briefing }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados?.erro || "Falha ao salvar a campanha.");
      const nome =
        estrutura.nomeEscolhido || estrutura.capa?.campanha || briefing.concurso;
      setOkFinal(`Campanha "${nome}" salva com sucesso!`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar a campanha.");
    } finally {
      setSalvando(false);
    }
  }

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

  // ---- UI ----
  return (
    <div>
      <h1>Nova campanha</h1>

      {/* Barra de progresso simples */}
      <div className="card" style={{ padding: "12px 16px", marginBottom: 16 }}>
        <strong>Etapa {etapa + 1} de {TOTAL_ETAPAS}</strong>
        <div
          style={{
            marginTop: 8,
            height: 8,
            background: "#eef1f5",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${((etapa + 1) / TOTAL_ETAPAS) * 100}%`,
              height: "100%",
              background: "var(--cor-primaria)",
              transition: "width .2s",
            }}
          />
        </div>
        <p className="subtitulo" style={{ marginTop: 8, marginBottom: 0 }}>
          {["Briefing", "Big Ideas", "Resumo", "Planilha", "Copies"][etapa]}
        </p>
      </div>

      {erro && <div className="erro">{erro}</div>}
      {aviso && <div className="aviso">{aviso}</div>}

      {/* ================= Etapa 0 — Briefing ================= */}
      {etapa === 0 && (
        <form className="card" onSubmit={gerarBigIdeas}>
          <label htmlFor="concurso">Nome do concurso *</label>
          <input
            id="concurso"
            value={briefing.concurso}
            onChange={(e) => set("concurso", e.target.value)}
            placeholder="Ex.: TCE-SC"
            required
          />

          <label htmlFor="orgao">Órgão</label>
          <input
            id="orgao"
            value={briefing.orgao}
            onChange={(e) => set("orgao", e.target.value)}
            placeholder="Ex.: Tribunal de Contas do Estado de SC"
          />

          <label htmlFor="situacao">Situação *</label>
          <select
            id="situacao"
            value={briefing.situacao}
            onChange={(e) => set("situacao", e.target.value as Situacao)}
          >
            <option value="pre-edital">Pré-edital</option>
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
              <label htmlFor="salario">Salário</label>
              <input
                id="salario"
                value={briefing.salario}
                onChange={(e) => set("salario", e.target.value)}
                placeholder="Ex.: até R$ 15 mil/mês"
              />
            </div>
          </div>

          <div className="linha">
            <div>
              <label htmlFor="inicio">Início do carrinho</label>
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

          <label htmlFor="obs">Observações</label>
          <textarea
            id="obs"
            value={briefing.observacoes}
            onChange={(e) => set("observacoes", e.target.value)}
            placeholder="Qualquer detalhe extra que ajude a gerar a campanha."
          />

          <p style={{ marginTop: 16 }}>
            <button type="submit" disabled={carregando}>
              {carregando ? "Gerando..." : "Gerar Big Ideas"}
            </button>
          </p>
        </form>
      )}

      {/* ================= Etapa 1 — Big Ideas ================= */}
      {etapa === 1 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Escolha o nome da campanha (Big Idea)</h2>
          <p className="subtitulo">
            Selecione uma das opções ou escreva a sua no campo abaixo.
          </p>

          <ul className="limpa" style={{ listStyle: "none", paddingLeft: 0 }}>
            {bigIdeas.map((ideia, i) => (
              <li key={i} style={{ margin: "8px 0" }}>
                <label style={{ fontWeight: 400, display: "flex", gap: 8, margin: 0 }}>
                  <input
                    type="radio"
                    name="bigidea"
                    style={{ width: "auto" }}
                    checked={!bigIdeaOutra.trim() && bigIdeaRadio === ideia}
                    onChange={() => setBigIdeaRadio(ideia)}
                  />
                  <span>{ideia}</span>
                </label>
              </li>
            ))}
          </ul>

          <label htmlFor="outra">Escrever outra (opcional)</label>
          <input
            id="outra"
            value={bigIdeaOutra}
            onChange={(e) => setBigIdeaOutra(e.target.value)}
            placeholder="Digite um nome próprio no formato Big Idea | Big Promise"
          />
          {bigIdeaOutra.trim() && (
            <p className="subtitulo" style={{ marginTop: 4 }}>
              Usaremos o texto que você escreveu.
            </p>
          )}

          <p style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="botao-secundario"
              onClick={() => setEtapa(0)}
            >
              ← Voltar
            </button>
            <button type="button" onClick={gerarResumo} disabled={carregando}>
              {carregando ? "Gerando resumo..." : "Usar esta Big Idea →"}
            </button>
          </p>
        </div>
      )}

      {/* ================= Etapa 2 — Resumo ================= */}
      {etapa === 2 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Resumo da campanha</h2>
          <p className="subtitulo">
            Big Idea escolhida: <strong>{bigIdeaEscolhida}</strong>
          </p>

          <label htmlFor="resumo">Resumo (você pode editar)</label>
          <textarea
            id="resumo"
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            style={{ minHeight: 160 }}
          />

          <label htmlFor="extra">Informações adicionais (opcional)</label>
          <textarea
            id="extra"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Instruções extras para orientar a montagem da planilha (datas, professores, ênfases...)."
          />

          <p style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="botao-secundario"
              onClick={() => setEtapa(1)}
            >
              ← Voltar
            </button>
            <button type="button" onClick={gerarEstrutura} disabled={carregando}>
              {carregando ? "Gerando planilha..." : "Gerar planilha →"}
            </button>
          </p>
        </div>
      )}

      {/* ================= Etapa 3 — Planilha editavel ================= */}
      {etapa === 3 && estrutura && (
        <div className="full-bleed">
          <EditorEstrutura value={estrutura} onChange={setEstrutura} />

          <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="botao-secundario"
              onClick={() => setEtapa(2)}
            >
              ← Voltar
            </button>
            <button type="button" onClick={baixarPlanilha} disabled={baixando}>
              {baixando ? "Gerando planilha..." : "Baixar .xlsx"}
            </button>
            <button type="button" onClick={aprovarPlanilha}>
              Aprovar planilha e gerar copies →
            </button>
          </p>
        </div>
      )}

      {/* ================= Etapa 4 — Copies ================= */}
      {etapa === 4 && estrutura && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Gerar copies e salvar</h2>
          <p className="subtitulo">
            As copies são geradas a partir da planilha que você editou, agora
            <strong> por categoria</strong> (uma requisição curta cada) para não
            estourar o tempo limite. Cada categoria pode levar de 1 a 2 minutos.
          </p>

          {okFinal && (
            <div className="aviso">
              {okFinal} <Link href="/campanhas">Ver campanhas</Link>.
            </div>
          )}

          {/* Botoes por categoria — cada um chama /api/copies?categoria=X */}
          <p style={{ marginTop: 16, marginBottom: 8, fontWeight: 600 }}>
            Baixar por categoria
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {CATEGORIAS_COPY.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => baixarCategoria(c.id)}
                disabled={gerando !== null}
              >
                {gerando === c.id ? "Gerando..." : c.rotulo}
              </button>
            ))}
          </div>

          {/* Baixar tudo em partes (5 categorias em sequencia) */}
          <p style={{ marginTop: 16, marginBottom: 8, fontWeight: 600 }}>
            Ou baixar tudo de uma vez
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={baixarTudoEmPartes}
              disabled={gerando !== null}
            >
              {gerando === "tudo"
                ? "Gerando tudo em partes..."
                : "⬇️ Baixar tudo (em partes)"}
            </button>
          </div>

          <p className="subtitulo" style={{ marginTop: 8, marginBottom: 0 }}>
            {gerando !== null
              ? "Gerando... isso pode levar ~1–2 min por categoria. Não feche a página."
              : "Cada botão gera e baixa um .zip. O “Baixar tudo” faz as 5 categorias em sequência (um .zip por categoria)."}
          </p>

          <p style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="botao-secundario"
              onClick={() => setEtapa(3)}
              disabled={gerando !== null}
            >
              ← Voltar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando || gerando !== null}
            >
              {salvando ? "Salvando..." : "Salvar campanha"}
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
