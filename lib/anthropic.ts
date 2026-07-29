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
