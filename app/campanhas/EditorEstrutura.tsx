"use client";

// Editor visual da CampanhaEstruturada em TABELAS EDITAVEIS por bloco.
// Componente controlado: recebe { value, onChange } e emite uma nova
// CampanhaEstruturada a cada edicao (capa, disparos, anuncios, oferta,
// programacao, mentorias, whatsappGrupos).
//
// A logica de tabelas espelha a do wizard (app/campanhas/nova/page.tsx). Aqui
// ela vive como componente reutilizavel para a pagina de reabrir/editar uma
// campanha salva (app/campanhas/[id]/page.tsx).

import type { CampanhaEstruturada } from "@/lib/types";

// ---- Tipos auxiliares para as tabelas editaveis ----
type Linha = Record<string, string>;
type Coluna = { key: string; label: string; wide?: boolean };

// Chaves de blocos da estrutura que viram tabelas (arrays de linhas).
type BlocoArray =
  | "disparos"
  | "anuncios"
  | "oferta"
  | "programacao"
  | "mentorias"
  | "whatsappGrupos";

// Colunas de cada bloco (ordem = ordem de exibicao).
const COLUNAS: Record<BlocoArray, Coluna[]> = {
  disparos: [
    { key: "fase", label: "Fase" },
    { key: "peca", label: "Peça" },
    { key: "data", label: "Data" },
    { key: "hora", label: "Hora" },
    { key: "base", label: "Base" },
    { key: "excluir", label: "Excluir" },
    { key: "assunto", label: "Assunto", wide: true },
    { key: "preHeader", label: "Pré-header", wide: true },
  ],
  anuncios: [
    { key: "objetivo", label: "Objetivo" },
    { key: "formato", label: "Formato" },
    { key: "angulo", label: "Ângulo", wide: true },
    { key: "publico", label: "Público", wide: true },
  ],
  oferta: [
    { key: "periodo", label: "Período" },
    { key: "produtos", label: "Produtos", wide: true },
    { key: "promocao", label: "Promoção" },
    { key: "bonus", label: "Bônus" },
    { key: "cupom", label: "Cupom" },
  ],
  programacao: [
    { key: "data", label: "Data" },
    { key: "hora", label: "Hora" },
    { key: "professor", label: "Professor" },
    { key: "evento", label: "Evento" },
    { key: "conteudo", label: "Conteúdo", wide: true },
  ],
  mentorias: [
    { key: "data", label: "Data" },
    { key: "hora", label: "Hora" },
    { key: "professor", label: "Professor" },
    { key: "tema", label: "Tema", wide: true },
  ],
  whatsappGrupos: [
    { key: "data", label: "Data" },
    { key: "hora", label: "Hora" },
    { key: "fase", label: "Fase" },
    { key: "assunto", label: "Assunto" },
    { key: "mensagem", label: "Mensagem", wide: true },
  ],
};

const TITULOS: Record<BlocoArray, string> = {
  disparos: "Disparos (e-mail / WhatsApp API)",
  anuncios: "Anúncios (mídia paga)",
  oferta: "Oferta",
  programacao: "Programação (eventos ao vivo)",
  mentorias: "Mentorias (bônus)",
  whatsappGrupos: "WhatsApp de grupos (orgânico)",
};

// Rótulos amigáveis para os campos da capa.
const CAPA_LABELS: Record<string, string> = {
  campanha: "Campanha",
  concurso: "Concurso",
  orgao: "Órgão",
  situacao: "Situação",
  banca: "Banca",
  vagas: "Vagas",
  salario: "Salário",
  escolaridade: "Escolaridade",
  carrinho: "Carrinho",
  cupom: "Cupom",
  oferta: "Oferta",
  abrangencia: "Abrangência",
};

export default function EditorEstrutura({
  value,
  onChange,
}: {
  value: CampanhaEstruturada;
  onChange: (proximo: CampanhaEstruturada) => void;
}) {
  // ---- Edicao das tabelas: atualiza uma celula de um bloco ----
  function atualizarCelula(bloco: BlocoArray, i: number, key: string, valor: string) {
    const linhas = (value[bloco] as unknown as Linha[]).map((l) => ({ ...l }));
    linhas[i] = { ...linhas[i], [key]: valor };
    onChange({ ...value, [bloco]: linhas } as CampanhaEstruturada);
  }

  function adicionarLinha(bloco: BlocoArray) {
    const vazio: Linha = {};
    for (const c of COLUNAS[bloco]) vazio[c.key] = "";
    const linhas = [...(value[bloco] as unknown as Linha[]), vazio];
    onChange({ ...value, [bloco]: linhas } as CampanhaEstruturada);
  }

  function removerLinha(bloco: BlocoArray, i: number) {
    const linhas = (value[bloco] as unknown as Linha[]).filter((_, idx) => idx !== i);
    onChange({ ...value, [bloco]: linhas } as CampanhaEstruturada);
  }

  function atualizarCapa(key: string, valor: string) {
    onChange({ ...value, capa: { ...value.capa, [key]: valor } } as CampanhaEstruturada);
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Capa</h2>
        <p className="subtitulo">
          Edite os campos livremente. As mudanças entram na planilha e nas copies.
        </p>
        <div className="linha" style={{ gap: 16 }}>
          {Object.keys(value.capa).map((key) => (
            <div key={key} style={{ flex: "1 1 240px" }}>
              <label htmlFor={`capa-${key}`}>{CAPA_LABELS[key] ?? key}</label>
              <input
                id={`capa-${key}`}
                value={(value.capa as unknown as Linha)[key] ?? ""}
                onChange={(e) => atualizarCapa(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {(Object.keys(COLUNAS) as BlocoArray[]).map((bloco) => {
        const linhas = value[bloco] as unknown as Linha[];
        const cols = COLUNAS[bloco];
        return (
          <div className="card" key={bloco}>
            <h2 style={{ marginTop: 0 }}>{TITULOS[bloco]}</h2>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr>
                    {cols.map((c) => (
                      <th
                        key={c.key}
                        style={{
                          textAlign: "left",
                          padding: "6px 8px",
                          borderBottom: "1px solid var(--cor-borda)",
                          whiteSpace: "nowrap",
                          color: "var(--cor-suave)",
                          fontWeight: 600,
                        }}
                      >
                        {c.label}
                      </th>
                    ))}
                    <th style={{ padding: "6px 8px" }} />
                  </tr>
                </thead>
                <tbody>
                  {linhas.length === 0 && (
                    <tr>
                      <td
                        colSpan={cols.length + 1}
                        style={{ padding: "8px", color: "var(--cor-suave)" }}
                      >
                        Nenhuma linha. Use “＋ linha” para adicionar.
                      </td>
                    </tr>
                  )}
                  {linhas.map((linha, i) => (
                    <tr key={i}>
                      {cols.map((c) => (
                        <td
                          key={c.key}
                          style={{
                            padding: "4px 6px",
                            verticalAlign: "top",
                            minWidth: c.wide ? 220 : 110,
                          }}
                        >
                          {c.wide ? (
                            <textarea
                              value={linha[c.key] ?? ""}
                              onChange={(e) =>
                                atualizarCelula(bloco, i, c.key, e.target.value)
                              }
                              style={{ minHeight: 44, fontSize: 13, padding: "6px 8px" }}
                            />
                          ) : (
                            <input
                              value={linha[c.key] ?? ""}
                              onChange={(e) =>
                                atualizarCelula(bloco, i, c.key, e.target.value)
                              }
                              style={{ fontSize: 13, padding: "6px 8px" }}
                            />
                          )}
                        </td>
                      ))}
                      <td style={{ padding: "4px 6px", verticalAlign: "top" }}>
                        <button
                          type="button"
                          className="botao-secundario"
                          onClick={() => removerLinha(bloco, i)}
                          title="Remover linha"
                          style={{ padding: "6px 10px" }}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: 10 }}>
              <button
                type="button"
                className="botao-secundario"
                onClick={() => adicionarLinha(bloco)}
              >
                ＋ linha
              </button>
            </p>
          </div>
        );
      })}
    </div>
  );
}
