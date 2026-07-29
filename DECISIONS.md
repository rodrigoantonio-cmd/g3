# DECISIONS.md — Máquina de Lançamentos Growth

> Log de decisões. Cada linha: decisão → motivo. Base para evoluir sem reperguntar.

| Data | Decisão | Motivo |
|---|---|---|
| 2026-07-28 | **Stack = Next.js + Vercel + Supabase + Anthropic + GitHub** | Escolha do dono (Rodrigo). Mais simples/rápido para ferramenta interna. |
| 2026-07-28 | **Diverge do padrão AWS/Go/Vue da Estratégia** | Ciente e aceito; se a engenharia adotar oficialmente, reavaliar migração para o padrão. |
| 2026-07-28 | **MVP = gerador completo** (planilha + copies + páginas) | Decisão do dono; entrega o valor cheio, ainda que leve mais etapas. |
| 2026-07-28 | **Cérebro (00–08) embutido em `knowledge/`** | Fonte de contexto e guardrails da geração; mantém o app autossuficiente. |
| 2026-07-28 | **Base de consulta = pasta do Google Drive** (ingestão p/ Supabase, Fase 4) | Reaproveitar o histórico de copies como referência de estilo/template. Conector do Drive estava offline na criação — ingestão pendente. |
| 2026-07-28 | **Público interno; login via Supabase** | Uso restrito a Rodrigo + 2 copywriters. |
| 2026-07-28 | **Modelo default `claude-sonnet-5`** | Equilíbrio custo/qualidade para geração; troca via `ANTHROPIC_MODEL`. |
| 2026-07-29 | **Reusar projeto Supabase existente** (`yrokfwttbrgzneuquxco`, ca-central-1) em vez de criar novo | Já existia projeto ativo na org; evita custo de novo provisionamento. Schema aplicado (migration `maquina_lancamentos_growth_schema`). `.env.local` preenchido com URL + anon key. |
| 2026-07-29 | **Scaffold builda** (`npm run build` OK após fix de tipo em `supabaseServer.ts`) | Esqueleto validado; pronto para rodar local assim que as chaves service_role + Anthropic forem coladas. |
| 2026-07-29 | **Geração validada ponta a ponta** (chave Anthropic + faturamento OK; lê o cérebro) | `/api/generate` devolve `{bigIdeas, funil, resumo}` real; corrigido `max_tokens` (→8000/16000) + parse robusto do JSON. |
| 2026-07-29 | **Fase 3 concluída: campanha estruturada + planilha .xlsx** | `/api/generate` agora devolve `CampanhaEstruturada` completa; `lib/xlsx.ts` (exceljs) monta 7 abas; `/api/planilha` faz o download; botão na tela. Testado: 25 disparos/10 anúncios/14 WhatsApp grupo → .xlsx válido. |
| 2026-07-29 | **Fase 3b concluída: copies em .docx (zip)** | `lib/docx.ts` (lib `docx`, template EC) + `/api/copies` (corpo via LLM por peça, concorrência 4, retry c/ backoff em connection error, `_erros.txt` tolerante) + jszip + botão na tela. Testado: zip com .docx de Convite/Promo/WhatsApp, corpo formatado e guardrails OK. |
