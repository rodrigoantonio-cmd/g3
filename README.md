# Maquina de Lancamentos - Growth

App interno do time de Growth da Estrategia Concursos para **criar campanhas de lancamento** a partir de um briefing simples. O app usa o "cerebro" do time (a pasta `knowledge/`) e a inteligencia da Claude (Anthropic) para gerar ideias de nome, o funil e um resumo da campanha. As campanhas ficam salvas na sua conta.

Este guia foi escrito para quem **nao e tecnico**. Siga na ordem.

---

## O que voce vai precisar (contas)

Crie estas contas antes de comecar (todas tem plano gratuito para testar):

1. **GitHub** (https://github.com) - guarda o codigo do projeto.
2. **Vercel** (https://vercel.com) - coloca o app no ar (publica na internet).
3. **Supabase** (https://supabase.com) - login dos usuarios e banco de dados das campanhas.
4. **Anthropic** (https://console.anthropic.com) - a chave da Claude que gera o conteudo.

---

## Parte 1 - Rodar no seu computador (opcional, para testar)

> Se quiser apenas publicar direto, pule para a Parte 3. Mas testar local ajuda.

### 1. Instalar o Node.js

Baixe e instale o **Node.js versao 20** em https://nodejs.org (opcao "LTS").

### 2. Preencher o arquivo de configuracao (`.env.local`)

Na pasta do projeto existe um arquivo chamado **`.env.example`**. Faca uma copia dele com o nome **`.env.local`** e preencha os valores:

- **NEXT_PUBLIC_SUPABASE_URL** - no Supabase: *Project Settings > Data API > Project URL*.
- **NEXT_PUBLIC_SUPABASE_ANON_KEY** - no Supabase: *Project Settings > API Keys > anon public*.
- **SUPABASE_SERVICE_ROLE_KEY** - no Supabase: *Project Settings > API Keys > service_role* (chave secreta, nao compartilhe).
- **ANTHROPIC_API_KEY** - no console da Anthropic: *Settings > API Keys*. (Se deixar em branco, o app ainda roda e mostra um exemplo, com um aviso.)
- **ANTHROPIC_MODEL** - pode deixar o valor padrao `claude-sonnet-5`.

> O arquivo `.env.local` **nunca** vai para o GitHub - ele fica so no seu computador. E o certo: chaves nao devem ser publicadas.

### 3. Instalar e rodar

Abra o Terminal na pasta do projeto e rode:

```bash
npm install
npm run dev
```

Depois abra no navegador: **http://localhost:3000**

---

## Parte 2 - Preparar o banco de dados (Supabase)

1. Entre no Supabase e crie um projeto novo.
2. No menu lateral, abra **SQL Editor**.
3. Abra o arquivo **`supabase/schema.sql`** deste projeto, copie todo o conteudo, cole no SQL Editor e clique em **Run**.
4. Pronto: as tabelas (`profiles`, `campaigns`, `briefings`, `assets`) e a seguranca por usuario ja estao criadas.

> Dica: em *Authentication > Providers*, confirme que **Email** esta ativado para permitir login por e-mail e senha.

---

## Parte 3 - Publicar na internet (Vercel + GitHub)

### 1. Enviar o codigo para o GitHub

- Crie um repositorio novo (pode ser privado) no GitHub.
- Suba a pasta do projeto para esse repositorio. (Se preferir, peca ajuda ao time tecnico para o primeiro envio.)

### 2. Conectar no Vercel

1. Entre no Vercel e clique em **Add New > Project**.
2. Escolha **Import** no repositorio do GitHub que voce criou.
3. O Vercel reconhece que e um projeto **Next.js** sozinho - nao precisa mudar nada na configuracao de build.

### 3. Configurar as chaves no Vercel

Antes de publicar, va em **Settings > Environment Variables** do projeto no Vercel e cadastre as **mesmas** variaveis do `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` (valor: `claude-sonnet-5`)

### 4. Publicar

Clique em **Deploy**. Em alguns minutos o app estara no ar em um endereco `.vercel.app`. A cada novo envio para o GitHub, o Vercel republica sozinho.

---

## Como usar o app

1. Acesse o endereco do app e clique em **Entrar** (crie sua conta na primeira vez).
2. Va em **Nova campanha** e preencha o briefing (concurso, situacao, datas, oferta).
3. Clique em **Gerar campanha**. O app devolve ideias de nome, o funil e um resumo.
4. Clique em **Salvar campanha** para guardar no historico.
5. Veja tudo em **Campanhas**.

---

## Observacoes importantes

- **Sem a chave da Anthropic**, o app funciona mesmo assim: ele mostra um resultado de **exemplo** com um aviso. Assim voce testa o fluxo antes de configurar tudo.
- A pasta **`knowledge/`** e o "cerebro" (padroes de nome, funil e oferta do time). O app le esses arquivos para gerar campanhas no nosso estilo. **Nao apague nem mova essa pasta.**
- Nunca compartilhe as chaves (`service_role` e `ANTHROPIC_API_KEY`) em lugares publicos.
