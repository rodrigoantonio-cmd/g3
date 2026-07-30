"use client";

// Editor visual da CampanhaEstruturada em TABELAS EDITAVEIS por bloco.
// Componente controlado: recebe { value, onChange } e emite uma nova
// CampanhaEstruturada a cada edicao (capa, disparos, anuncios, oferta,
// programacao, mentorias, whatsappGrupos).
//
// Este componente e a UNICA fonte da planilha editavel: o wizard
// (app/campanhas/nova/page.tsx, etapa 3) e a pagina de reabrir/editar
// (app/campanhas/[id]/page.tsx) usam os dois este mesmo editor, garantindo
// visual identico (largura cheia + textareas que mostram tudo).

import { useLayoutEffect, useRef } from "react";
import type { CampanhaEstruturada } from "@/lib/types";

// ---- Tipos auxiliares para as tabelas editaveis ----
type Linha = Record<string, string>;
// long  -> renderiza <textarea> (texto longo, quebra de linha, auto-crescimento)
// min   -> largura minima da coluna em px (dica para telas largas)
type Coluna = { key: string; label: string; long?: boolean; min?: number };

// Chaves de blocos da estrutura que viram tabelas (arrays de linhas).
type BlocoArray =
  | "disparos"
  | "anuncios"
  | "oferta"
  | "programacao"
  | "mentorias"
  | "whatsappGrupos";

// Colunas de cada bloco (ordem = ordem de exibicao).
// Campos curtos (data, hora, nº, cupom) ficam estreitos; campos de texto
// longo (assunto, base, mensagem, etc.) viram textarea larga.
const COLUNAS: Record<BlocoArray, Coluna[]> = {
  disparos: [
    { key: "fase", label: "Fase", min: 130 },
    { key: "peca", label: "Peça", min: 140 },
    { key: "data", label: "Data", min: 100 },
    { key: "hora", label: "Hora", min: 80 },
    { key: "base", label: "Base", long: true, min: 200 },
    { key: "excluir", label: "Excluir", long: true, min: 170 },
    { key: "assunto", label: "Assunto", long: true, min: 280 },
    { key: "preHeader", label: "Pré-header", long: true, min: 240 },
  ],
  anuncios: [
    { key: "objetivo", label: "Objetivo", min: 140 },
    { key: "formato", label: "Formato", min: 140 },
    { key: "angulo", label: "Ângulo", long: true, min: 280 },
    { key: "publico", label: "Público", long: true, min: 240 },
  ],
  oferta: [
    { key: "periodo", label: "Período", min: 130 },
    { key: "produtos", label: "Produtos", long: true, min: 280 },
    { key: "promocao", label: "Promoção", long: true, min: 220 },
    { key: "bonus", label: "Bônus", long: true, min: 200 },
    { key: "cupom", label: "Cupom", min: 110 },
  ],
  programacao: [
    { key: "data", label: "Data", min: 100 },
    { key: "hora", label: "Hora", min: 80 },
    { key: "professor", label: "Professor", min: 160 },
    { key: "evento", label: "Evento", min: 160 },
    { key: "conteudo", label: "Conteúdo", long: true, min: 320 },
  ],
  mentorias: [
    { key: "data", label: "Data", min: 100 },
    { key: "hora", label: "Hora", min: 80 },
    { key: "professor", label: "Professor", min: 160 },
    { key: "tema", label: "Tema", long: true, min: 320 },
  ],
  whatsappGrupos: [
    { key: "data", label: "Data", min: 100 },
    { key: "hora", label: "Hora", min: 80 },
    { key: "fase", label: "Fase", min: 130 },
    { key: "assunto", label: "Assunto", long: true, min: 220 },
    { key: "mensagem", label: "Mensagem", long: true, min: 360 },
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
  paleta: "Paleta",
};

// ---- Textarea que cresce em altura conforme o conteudo ----
// Ajusta a altura para scrollHeight no mount e a cada mudanca de valor,
// para que nada fique escondido/cortado.
function AutoTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      onInput={(e) => {
        const el = e.currentTarget;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }}
    />
  );
}

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
          {Object.keys(value.capa)
            .filter((key) => key !== "paleta")
            .map((key) => (
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
        <div style={{ marginTop: 16 }}>
          <label htmlFor="capa-paleta">{CAPA_LABELS.paleta}</label>
          <AutoTextarea
            value={value.capa.paleta ?? ""}
            onChange={(v) => atualizarCapa("paleta", v)}
          />
        </div>
      </div>

      {(Object.keys(COLUNAS) as BlocoArray[]).map((bloco) => {
        const linhas = value[bloco] as unknown as Linha[];
        const cols = COLUNAS[bloco];
        return (
          <div className="card" key={bloco}>
            <h2 style={{ marginTop: 0 }}>{TITULOS[bloco]}</h2>
            <div className="tabela-wrap">
              <table className="tabela-editavel">
                <thead>
                  <tr>
                    {cols.map((c) => (
                      <th key={c.key} style={{ minWidth: c.min }}>
                        {c.label}
                      </th>
                    ))}
                    <th style={{ width: 44 }} />
                  </tr>
                </thead>
                <tbody>
                  {linhas.length === 0 && (
                    <tr>
                      <td
                        colSpan={cols.length + 1}
                        style={{ color: "var(--cor-suave)" }}
                      >
                        Nenhuma linha. Use “＋ linha” para adicionar.
                      </td>
                    </tr>
                  )}
                  {linhas.map((linha, i) => (
                    <tr key={i}>
                      {cols.map((c) => (
                        <td key={c.key} style={{ minWidth: c.min }}>
                          {c.long ? (
                            <AutoTextarea
                              value={linha[c.key] ?? ""}
                              onChange={(v) => atualizarCelula(bloco, i, c.key, v)}
                            />
                          ) : (
                            <input
                              value={linha[c.key] ?? ""}
                              onChange={(e) =>
                                atualizarCelula(bloco, i, c.key, e.target.value)
                              }
                            />
                          )}
                        </td>
                      ))}
                      <td>
                        <button
                          type="button"
                          className="botao-secundario btn-remover"
                          onClick={() => removerLinha(bloco, i)}
                          title="Remover linha"
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
