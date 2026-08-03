// Route handler POST /api/resumo
// Recebe { briefing, bigIdea } e devolve { resumo: string }: um resumo
// executivo da campanha para a Big Idea escolhida (funil, cadencia, canais,
// oferta), usando o "cerebro" (knowledge/) + guardrails.
//
// Sem chave da Anthropic -> devolve um resumo de exemplo (stub) + aviso.

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
- Funil padrao: Convite -> Alerta -> Promo -> Mentoria (+ Reminder VIP). Canais: e-mail, WhatsApp API (broadcast) e WhatsApp de grupo (organico).
- O SQ (Sistema de Questoes) e uma FERRAMENTA JA INCLUSA nos Pacotes/Assinaturas, NAO e bonus. O unico bonus tipico sao as mentorias.
- Garantia = 7 dias. Acesso/atualizacao (incl. SQ) = 12 meses (nunca "ate a prova" nem "permanente").
- Promo exclui compradores + assinantes. Alerta so para inscritos. Mentoria so para compradores do cupom.
- Regionalizacao: fiscal/federal => nacional; estadual/municipal => regional.
- Verdade nos numeros: se nao confirmados, marque como "previstas/solicitadas".
- Escreva em portugues do Brasil, tom direto e comercial.
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

export async function POST(req: NextRequest) {
  let corpo: { briefing?: Briefing; bigIdea?: string };
  try {
    corpo = (await req.json()) as { briefing?: Briefing; bigIdea?: string };
  } catch {
    return NextResponse.json(
      { erro: "JSON invalido no corpo da requisicao." },
      { status: 400 }
    );
  }

  const briefing = corpo?.briefing;
  const bigIdea = (corpo?.bigIdea || "").trim();

  if (!briefing?.concurso) {
    return NextResponse.json(
      { erro: "Informe o briefing (pelo menos o nome do concurso)." },
      { status: 400 }
    );
  }
  if (!bigIdea) {
    return NextResponse.json(
      { erro: "Informe a Big Idea escolhida." },
      { status: 400 }
    );
  }

  // Sem chave -> stub (status 200) para o app rodar.
  const client = getAnthropic();
  if (!client || !anthropicConfigurado) {
    return NextResponse.json(
      {
        resumo:
          `Resumo de exemplo para a campanha "${bigIdea}" (${briefing.concurso}, situacao: ${briefing.situacao}). ` +
          "Funil: Convite -> Alerta -> Promo -> Mentoria (+ Reminder), pelos canais e-mail, WhatsApp API e grupos. " +
          "Este e um resultado de demonstracao. Configure a chave ANTHROPIC_API_KEY para gerar conteudo real.",
        aviso:
          "A chave ANTHROPIC_API_KEY nao esta configurada. Este e um resumo de exemplo (stub).",
      },
      { status: 200 }
    );
  }

  // Monta o system prompt com o cerebro + guardrails.
  const cerebro = await getKnowledge();
  const referencias = await getReferencias();
  const systemPrompt = [
    "Voce e um especialista em lancamentos digitais do time de Growth da Estrategia Concursos.",
    "Use a BASE DE CONHECIMENTO abaixo como fonte de verdade para funil, cadencia, canais e oferta.",
    GUARDRAILS,
    "===== BASE DE CONHECIMENTO (CEREBRO) =====",
    cerebro,
    "===== FIM DA BASE DE CONHECIMENTO =====",
    ...(referencias
      ? ["", "===== REFERENCIAS DE COPY (estilo/historico) =====", referencias, "====="]
      : []),
    "",
    "Sua tarefa: escrever o RESUMO EXECUTIVO da campanha para a Big Idea escolhida.",
    "O resumo deve cobrir: conceito da campanha, funil (Convite -> Alerta -> Promo -> Mentoria), cadencia/cronograma geral, canais, publico e a oferta.",
    "Responda SOMENTE com o texto do resumo (sem markdown, sem titulos, sem JSON). De 1 a 3 paragrafos, tom direto e comercial.",
  ].join("\n");

  const userPrompt = [
    `Big Idea escolhida: ${bigIdea}`,
    "",
    "Briefing:",
    briefingParaTexto(briefing),
  ].join("\n");

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

  const resumo = resposta.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return NextResponse.json({ resumo }, { status: 200 });
}
