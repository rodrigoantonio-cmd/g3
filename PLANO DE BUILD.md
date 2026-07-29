# PLANO DE BUILD — Máquina de Lançamentos Growth

> Roadmap do app, do esqueleto até o "gerador completo" no ar. Linguagem simples. Marque ✅ conforme avança.

## Visão
Web app (Next.js na Vercel + Supabase + Claude API) onde o time de Growth gera campanhas a partir de um briefing curto, usando o cérebro (`knowledge/`) como base. MVP escolhido = **gerador completo** (planilha + copies + páginas).

## Fases
### Fase 0 — Fundação (feita nesta sessão) ✅
- Pasta do projeto criada; cérebro copiado para `knowledge/`; cérebro do projeto (`CLAUDE.md`, `DECISIONS.md`, este plano).
- Esqueleto Next.js + Supabase + Anthropic (login, form de briefing, rota de geração stub, schema SQL, CI).

### Fase 1 — Rodar local e conectar contas (depende de você)
1. Criar contas: **GitHub**, **Vercel**, **Supabase**; gerar **chave da Anthropic**.
2. Criar projeto no Supabase → rodar `supabase/schema.sql` no SQL editor → copiar URL e chaves.
3. Copiar `.env.example` → `.env.local` e preencher as chaves. `npm install` → `npm run dev`.
4. (Claude te guia em cada passo; você digita as chaves.)

### Fase 2 — Geração de texto de verdade
- Rota `/api/generate` chamando o Claude com o cérebro como contexto → big ideas + funil + resumo. (Esqueleto já prevê; ligar com a chave.)
- Salvar campanha + briefing no Supabase; listar histórico.

### Fase 3 — Geração dos arquivos (planilha + copies)
- Portar a lógica que hoje roda em Python (`ec_docx`, montagem da planilha) para o servidor Node:
  - **Planilha .xlsx** → biblioteca `exceljs`.
  - **Copies .docx** → biblioteca `docx` (npm).
  - **Páginas** (Vendas/LP/Sucesso) → HTML gerado.
- Salvar os arquivos no **Supabase Storage**; botões de download por campanha.

### Fase 4 — Base de consulta (Drive) + refinamentos
- **Conectar a base de referência de copies** (pasta do Google Drive) — ver abaixo.
- Edição in-app das copies, versões, aprovação, dashboard.

### Fase 5 — Publicar (deploy)
- Subir o código no GitHub → conectar no Vercel → configurar as variáveis de ambiente no Vercel → deploy automático.
- Acesso restrito ao time (login Supabase).

## Integração da base de consulta (pasta do Google Drive)
Fonte informada: `https://drive.google.com/drive/folders/1lHeytPtul5OwnGY2NUEcrx9ALssFPyfW`
Papel: **base de referência das copies** (histórico do estilo/template) — alimenta o contexto da geração.
Como conectar (escolher 1):
- **A) Ingestão para o app (recomendado):** um script lê os arquivos da pasta (via Google Drive API com uma *chave de serviço*) e grava o texto no Supabase (tabela `referencias`), para a geração consultar rápido. Reingestão periódica quando o Drive muda.
- **B) Leitura ao vivo:** o app lê a pasta do Drive a cada geração (mais lento, depende da API do Drive online).
> ⚠️ Nesta sessão o conector do Google Drive estava **offline**, então o conteúdo da pasta ainda não foi lido. Quando o Drive voltar (ou com a chave de serviço), fazemos a ingestão (opção A).

## Modelo de dados (Supabase) — resumo
- `profiles` (usuário + papel) · `campaigns` (campanha) · `briefings` (dados do briefing, JSON) · `assets` (arquivos gerados) · `referencias` (base de consulta ingerida do Drive — Fase 4).

## O que só VOCÊ faz (o Claude não cria conta nem digita senha/chave)
- [ ] Criar conta GitHub · Vercel · Supabase
- [ ] Gerar a **chave da API Anthropic** (console.anthropic.com) — é o que tem custo por uso
- [ ] Dar acesso à pasta do Drive (ou gerar a chave de serviço do Google) para a ingestão
- [ ] Conectar o repositório ao Vercel e aprovar o deploy
> O Claude prepara todo o código, os scripts e o passo a passo; você só executa as partes que exigem suas contas/chaves.

## Custos (ordem de grandeza)
- GitHub, Vercel (hobby) e Supabase (free) têm plano grátis para começar.
- **Anthropic** cobra por uso (por geração). Some conforme o volume de campanhas.
