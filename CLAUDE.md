# CLAUDE.md — Máquina de Lançamentos Growth

> Leia este arquivo primeiro. Ele diz o que é o projeto, a stack, as regras e como continuar em qualquer sessão futura.

## O que é
App web para o time de **Growth do Estratégia Concursos** gerar **campanhas de lançamento** a partir de um briefing curto. O usuário loga, cria uma campanha (concurso, situação, datas, oferta) e o app gera nome/big idea, funil, planilha e copies — usando o "cérebro" em `knowledge/` como contexto. Histórico salvo por campanha.

**Usuários:** Rodrigo (Head de Growth) + 2 copywriters. Público **interno**. Usuário não-técnico.

## Stack (escolha do dono — NÃO é o padrão AWS da Estratégia)
- **Next.js** (App Router, TypeScript) — o app.
- **Vercel** — hospedagem + deploy automático a cada push no GitHub.
- **Supabase** — Auth (e-mail/senha), Postgres (dados) e Storage (arquivos gerados).
- **Anthropic Claude API** — motor de geração (modelo em `ANTHROPIC_MODEL`, default `claude-sonnet-5`).
- **GitHub** — repositório + CI (`.github/workflows/ci.yml`).
> ⚠️ Esta stack diverge do padrão oficial da Estratégia (AWS + Go + Vue). Registrado em `DECISIONS.md`. Se a engenharia for adotar oficialmente, reavaliar.

## Base de conhecimento (o "cérebro") — `knowledge/`
Arquivos `00–08` (framework de nomes, funil, briefing, oferta, planilha, gerador, tutorial, WhatsApp de grupo) + `dados/` (histórico de 240 campanhas) + `EXEMPLO - ISS Manaus`. **Toda geração deve usar esse conteúdo como contexto e respeitar os guardrails abaixo.**

## Guardrails de comunicação (inegociáveis na geração)
1. **SQ é ferramenta, não bônus** — já vem nos Pacotes/Assinaturas (acesso 12 meses). Único bônus típico = **mentorias**.
2. **Garantia = 7 dias.** Acesso/atualização = **12 meses** (nunca "até a prova"/"permanente"). A data da prova pode ser citada.
3. **Prova social é histórica/da área** — nunca inventar aprovado do concurso-alvo.
4. **Promo exclui compradores + assinantes.** Alerta só p/ inscritos. Mentoria só p/ compradores do cupom.
5. **Números verdadeiros** (vagas/salário do edital); se não confirmados → "previstas" + ⚠️.
6. **Cupom** `#[SIGLA][%]`. **Regionalização:** fiscal/federal → nacional; estadual/municipal → regional.
7. **Funil** = Convite → Alerta → Promo → Mentoria (+ Reminder). Canais: e-mail, WhatsApp API, WhatsApp de grupo, anúncios, posts, páginas.

## Comandos
- Instalar: `npm install`
- Rodar local: `npm run dev` (abre em http://localhost:3000)
- Build: `npm run build`
- Segredos: copie `.env.example` para `.env.local` e preencha. **Nunca commitar `.env.local`** (já está no .gitignore).

## Estrutura
- `app/` — páginas (App Router) + `app/api/` (rotas de servidor, ex.: geração).
- `lib/` — clientes (Supabase, Anthropic), carregador do `knowledge/`, tipos.
- `supabase/schema.sql` — tabelas + RLS (rodar no SQL editor do Supabase).
- `knowledge/` — o cérebro (contexto da geração). **Não apagar.**
- `PLANO DE BUILD.md` — roadmap por fases + integração do Drive + o que só o dono faz.
- `DECISIONS.md` — decisões (stack, escopo).

## Como continuar (sessões futuras)
Abra o Claude nesta pasta. Ele lê este arquivo e o `PLANO DE BUILD.md` e sabe onde parou. Para evoluir, peça em português (ex.: "implemente a geração da planilha .xlsx no servidor"). Mantenha os guardrails acima e registre decisões novas em `DECISIONS.md`.

## O que o Claude NÃO faz por você (precisa de você / time técnico)
Criar contas (GitHub/Vercel/Supabase), gerar/inserir a chave da Anthropic, conectar o repositório ao Vercel e publicar. O Claude prepara tudo e te guia; as senhas/chaves são sempre digitadas por você.
