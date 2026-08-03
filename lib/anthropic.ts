// Instancia o SDK da Anthropic (Claude). Usado APENAS no servidor.

import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY ?? "";

// Modelo padrao; pode ser trocado pela variavel de ambiente ANTHROPIC_MODEL.
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// true quando a chave da Anthropic esta configurada.
export const anthropicConfigurado = Boolean(apiKey);

// Retorna o cliente da Anthropic, ou null se a chave nao estiver configurada.
// Assim o app roda mesmo sem chave (a rota /api/generate devolve um stub).
export function getAnthropic(): Anthropic | null {
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

// Mensagem amigavel exibida quando a API da Anthropic esta sem saldo.
export const MSG_SEM_CREDITO =
  "⚠️ Sem saldo na API da Anthropic. Peça ao Rodrigo para recarregar os créditos em console.anthropic.com/settings/billing e tente novamente.";

// Detecta se a mensagem de erro indica falta de saldo/credito na API da Anthropic.
// A API devolve 400 (invalid_request_error) com "credit balance is too low" quando
// o saldo acabou; cobrimos tambem variacoes comuns de erro de faturamento.
export function ehErroDeCredito(msg: string): boolean {
  const m = (msg || "").toLowerCase();
  return (
    m.includes("credit balance") ||
    m.includes("too low") ||
    m.includes("insufficient") ||
    m.includes("billing")
  );
}
