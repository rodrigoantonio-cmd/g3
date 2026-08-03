// Route handler POST /api/bigideas
// Recebe o briefing (JSON), monta o system prompt a partir do "cerebro"
// (knowledge/) + guardrails, chama a Anthropic e devolve 10 opcoes de nome
// (Big Idea | Big Promise): { bigIdeas: string[] }.
//
// Sem chave da Anthropic -> devolve 10 opcoes de exemplo (stub) + aviso,
// para o app rodar mesmo sem chave.

import { NextRequest, NextResponse } from "next/server";
import {
  getAnthropic,
  ANTHROPIC_MODEL,
  anthropicConfigurado,
  ehErroDeCredito,
  MSG_SEM_CREDITO,
} from "@/lib/anthropic";
import { getKnowledge } from "@/lib/knowledge";
import { getReferencias } from "@/lib/referencias";
import type { Briefing } from "@/lib/types";

// Roda no runtime Node.js (precisamos de fs para ler o knowledge/).
export const runtime = "nodejs";

// Regras/guardrails do time de Growth (resumo do knowledge/00).
const GUARDRAILS = `
REGRAS (guardrails) que voce DEVE seguir:
- Big Idea vende o conceito; Big Promise entrega o numero (vagas + salario + prazo + prova social).
- Regionalizacao: concurso fiscal/federal de alto salario => nacional; estadual/municipal => regional.
- Verdade nos numeros: salario/vagas plausiveis; se nao confirmados, marque como "previstas/solicitadas".
- Foco em lancamentos individuais por concurso (nao campanhas grandes tipo Black Friday).
- Escreva em portugues do Brasil, tom direto e comercial.
- Prova social e historica/da area — nunca inventar aprovado do concurso-alvo.
`;

// Monta o texto do briefing de forma legivel para o modelo.
function briefingParaTexto(b: Briefing): string {
  return [
    `Concurso: ${b.concurso}`,
    `Orgao: ${b.orgao}`,
    `Situacao: ${b.situacao}`,
    `Banca: ${b.banca}`,
    `Vagas: ${b.vagas}`,
    `Salario: ${b.salario}`,
    `Inicio do carrinho: ${b.dataInicioCarrinho}`,
    `Fim do carrinho: ${b.dataFimCarrinho}`,
    `Desconto (%): ${b.descontoPercent}`,
    `Cupom: ${b.cupom}`,
    `Observacoes: ${b.observacoes}`,
  ].join("\n");
}

// 10 opcoes de exemplo (stub) usadas quando nao ha chave da Anthropic.
function stubBigIdeas(b: Briefing): string[] {
  const c = b.concurso || "seu concurso";
  return [
    `Marco Zero ${c} | O plano para largar na frente`,
    `Missao ${c} | Do edital a aprovacao`,
    `Reta Final ${c} | Ultimos dias para virar o jogo`,
    `Operacao ${c} | O caminho mais curto ate a vaga`,
    `Alerta ${c} | A hora de garantir sua preparacao`,
    `Virada ${c} | Comece hoje e chegue pronto na prova`,
    `Rota da Aprovacao ${c} | Passo a passo ate a nomeacao`,
    `Convocacao ${c} | Sua vaga esta te esperando`,
    `Alta Performance ${c} | Estude com quem mais aprova`,
    `Contagem Regressiva ${c} | Cada dia conta para a sua vaga`,
  ];
}

// Extrai um array JSON de strings da resposta do modelo, de forma robusta.
function parseBigIdeas(texto: string): string[] {
  const limpo = texto.replace(/```json/gi, "").replace(/```/g, "").trim();
  const ini = limpo.indexOf("[");
  const fim = limpo.lastIndexOf("]");
  if (ini >= 0 && fim > ini) {
    try {
      const arr = JSON.parse(limpo.slice(ini, fim + 1));
      if (Array.isArray(arr)) {
        return arr
          .map((x) => (typeof x === "string" ? x : String(x ?? "")))
          .map((s) => s.trim())
          .filter(Boolean);
      }
    } catch {
      // cai no fallback abaixo
    }
  }
  // Fallback tolerante: uma opcao por linha (remove bullets/numeracao/aspas).
  return limpo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .map((l) => l.replace(/^[-*\d.)\]\s]+/, ""))
    .map((l) => l.replace(/,\s*$/, ""))
    .map((l) => l.replace(/^"([\s\S]*)"$/, "$1"))
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  let briefing: Briefing;
  try {
    briefing = (await req.json()) as Briefing;
  } catch {
    return NextResponse.json(
      { erro: "JSON invalido no corpo da requisicao." },
      { status: 400 }
    );
  }

  if (!briefing?.concurso) {
    return NextResponse.json(
      { erro: "Informe pelo menos o nome do concurso." },
      { status: 400 }
    );
  }

  // Sem chave -> stub (status 200) para o app rodar.
  const client = getAnthropic();
  if (!client || !anthropicConfigurado) {
    return NextResponse.json(
      {
        bigIdeas: stubBigIdeas(briefing),
        aviso:
          "A chave ANTHROPIC_API_KEY nao esta configurada. Estas sao opcoes de exemplo (stub). " +
          "Preencha a chave no .env.local para gerar nomes de verdade.",
      },
      { status: 200 }
    );
  }

  // Monta o system prompt com o cerebro + guardrails.
  const cerebro = await getKnowledge();
  const referencias = await getReferencias();
  const systemPrompt = [
    "Voce e um especialista em lancamentos digitais do time de Growth da Estrategia Concursos.",
    "Use a BASE DE CONHECIMENTO abaixo como fonte de verdade para o framework de nomes.",
    GUARDRAILS,
    "===== BASE DE CONHECIMENTO (CEREBRO) =====",
    cerebro,
    "===== FIM DA BASE DE CONHECIMENTO =====",
    ...(referencias
      ? ["", "===== REFERENCIAS DE COPY (estilo/historico) =====", referencias, "====="]
      : []),
    "",
    "Sua tarefa: gerar EXATAMENTE 10 opcoes de nome para a campanha, no formato Big Idea | Big Promise.",
    "Responda SOMENTE com um array JSON de 10 strings, sem markdown e sem texto fora do JSON.",
    'Exemplo de formato: ["Nome A | Promessa A", "Nome B | Promessa B", ...]',
  ].join("\n");

  const userPrompt = `Gere 10 opcoes de nome para a campanha a partir deste briefing:\n\n${briefingParaTexto(
    briefing
  )}`;

  // Retry com backoff (4x) em erro de conexao transitorio.
  const criar = () =>
    client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  let resposta;
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    try {
      resposta = await criar();
      break;
    } catch (e) {
      ultimoErro = e;
      if (tentativa < 4) {
        await new Promise((r) => setTimeout(r, tentativa * 1500));
      }
    }
  }
  if (!resposta) {
    const msg = ultimoErro instanceof Error ? ultimoErro.message : "erro desconhecido";
    if (ehErroDeCredito(msg)) {
      return NextResponse.json({ erro: MSG_SEM_CREDITO }, { status: 402 });
    }
    return NextResponse.json(
      { erro: `Falha ao chamar a Anthropic: ${msg}` },
      { status: 502 }
    );
  }

  const texto = resposta.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const bigIdeas = parseBigIdeas(texto);
  if (bigIdeas.length === 0) {
    return NextResponse.json(
      { bigIdeas: stubBigIdeas(briefing), aviso: "Nao foi possivel interpretar a resposta; mostrando exemplos." },
      { status: 200 }
    );
  }

  return NextResponse.json({ bigIdeas: bigIdeas.slice(0, 10) }, { status: 200 });
}
