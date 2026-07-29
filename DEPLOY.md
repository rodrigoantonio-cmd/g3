# DEPLOY — Publicar a Máquina de Lançamentos Growth no Vercel

> Passo a passo simples. As etapas marcadas **[VOCÊ]** exigem suas contas/senha (o Claude não faz login por você). As **[CLAUDE]** eu já deixei prontas ou faço a seu pedido.

## Pré-requisitos (contas — grátis)
- [VOCÊ] Conta no **GitHub** (github.com)
- [VOCÊ] Conta na **Vercel** (vercel.com) — pode entrar com o GitHub
- Projeto **Supabase** ✅ já existe (`yrokfwttbrgzneuquxco`)
- Chave **Anthropic** ✅ já em uso no `.env.local`

## 1) Subir o código para o GitHub
- [CLAUDE] O repositório local já está iniciado e com um commit pronto (o `.env.local` fica de fora, protegido).
- [VOCÊ] Crie um repositório **privado** vazio no GitHub (ex.: `maquina-lancamentos-growth`), **sem** README.
- [VOCÊ] Conecte e envie. Me passe a URL do repositório que eu te dou os 2 comandos exatos (`git remote add` + `git push`), OU rode:
  ```bash
  git remote add origin https://github.com/<seu-usuario>/maquina-lancamentos-growth.git
  git branch -M main
  git push -u origin main
  ```
  (O push vai pedir seu login/token do GitHub — isso é com você.)

## 2) Importar na Vercel
- [VOCÊ] Em vercel.com → **Add New… → Project** → **Import** o repositório do GitHub.
- Framework: **Next.js** (a Vercel detecta sozinho). Build: padrão. Não precisa mexer.

## 3) Variáveis de ambiente na Vercel  ⭐ (o passo que não pode faltar)
- [VOCÊ] Em **Project → Settings → Environment Variables**, cadastre as **mesmas 4** do seu `.env.local` (copie os valores de lá):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`  (secreta)
  - `ANTHROPIC_API_KEY`  (secreta)
  - `ANTHROPIC_MODEL` = `claude-sonnet-5`
- Marque para os ambientes **Production** e **Preview**.

## 4) Deploy
- [VOCÊ] Clique em **Deploy**. Em ~1–2 min sai uma URL (ex.: `maquina-lancamentos-growth.vercel.app`).
- Cada novo `git push` na branch `main` publica sozinho (deploy automático).

## 5) Ajustes finais no Supabase (para o login funcionar no ar)
- [VOCÊ] Supabase → **Authentication → URL Configuration** → adicione a URL da Vercel em **Site URL** e **Redirect URLs**.
- [VOCÊ] Supabase → **Authentication → Providers → Email** → habilitado (senha). Para testes rápidos, pode desativar a confirmação por e-mail.

## Observações
- **Tempo de geração:** gerar as copies chama o Claude várias vezes e pode levar 1–2 min. No plano gratuito da Vercel, funções têm limite de tempo; se estourar, subir para o plano Pro **ou** rodar a geração de copies como tarefa em segundo plano (evolução futura — anotado no `PLANO DE BUILD.md`).
- **Custo:** GitHub/Vercel/Supabase começam no grátis; a **Anthropic** cobra por uso.
- **Acesso restrito:** como é interno, deixe o app só com login (sem cadastro aberto) ou restrinja os e-mails permitidos.

> Quando você criar o repositório no GitHub e me mandar a URL, eu te devolvo os comandos exatos e confirmo o `.gitignore`. O resto do deploy (cliques na Vercel) é rápido e eu te acompanho.
