# 07 — COMO RODAR UMA CAMPANHA COMPLETA (Passo a Passo)

> Guia didático para você reproduzir, do zero, o que foi feito no piloto **ISS Manaus em 90 dias**. Leia uma vez inteiro; depois use como receita. São **2 fases** (Concepção → Copies) + ajustes. Em cada passo você tem: **o que fazer**, **o que digitar** (prompt) e **o que revisar**.

---

## PASSO 0 — Preparação (só na 1ª vez)
1. Claude Code instalado e logado; pasta de projeto criada (ex.: `GROWTH - Lançamentos`).
2. Cérebro instalado dentro dela: pasta `Base de Conhecimento Growth/` (arquivos `00`–`07` + `dados/` + o piloto em `Lançamentos/`).
3. **Seu histórico de copies** acessível no seu terminal (os `.docx` das campanhas que VOCÊ já fez) — é o que a Fase B vai espelhar.
4. Primeira mensagem ao Claude:
> "Leia a Base de Conhecimento Growth (arquivos 00 a 07) e o exemplo em `Lançamentos/ISS Manaus`. Use isso como base para gerar campanhas. Se precisar gerar planilha/.docx, instale as dependências (openpyxl e python-docx)."

Pronto. Daqui pra frente é sempre o mesmo fluxo.

---

## PASSO 1 — Pegue o gatilho e junte 5 informações
Toda campanha nasce de uma **notícia** (banca autorizada, edital publicado, prova marcada). Você só precisa levantar 5 coisas:
1. **Concurso** (qual é / cargo).
2. **Situação:** pré-edital · edital publicado · reta final · pós-prova.
3. **Data-chave:** prova/edital em [data].
4. **Data do lançamento:** início e fim do carrinho.
5. **Oferta:** desconto, produtos, cupom, bônus.

> No ISS Manaus: *edital publicado (24/07), prova 01/11, lançamento 03–10/08, oferta 20% OFF em pacotes + premium.* Não sabe algum número? Tudo bem — o Claude pesquisa no blog do Estratégia e **marca como suposição a confirmar (⚠️)**.

---

## PASSO 2 — FASE A: peça a concepção da campanha
Digite algo assim (foi exatamente o formato do ISS Manaus):
> "Vou fazer um lançamento para o concurso **[CONCURSO]**. Pesquise a situação no blog do Estratégia. Situação **[edital publicado]**, prova em **[data]**, lançamento de **[data]** a **[data]**. Oferta: **[ex.: pacotes 20% OFF, assinatura premium 20% OFF, de X a Y]**. Gere a campanha completa (briefing, nomes, funil e planilha)."

**O que o Claude devolve:**
1. **Briefing** com os dados do concurso (vagas, salário, banca, área, abrangência).
2. **5 nomes** no formato *Big Idea | Big Promise* (recomenda 1) + sugestão de cupom.
3. **Funil dimensionado** (quantos e-mails/anúncios, cadência dia a dia).
4. A **planilha `.xlsx`** completa do lançamento.

**O que VOCÊ faz:** escolha o nome e valide a oferta. Ex.:
> "Gostei. Escolhi: **[nome]**. Confirmo a oferta."

⚠️ **Regra de ouro:** sempre revise nome + oferta ANTES de mandar expandir tudo. Evita retrabalho.

---

## PASSO 3 — Refine a planilha (as abas)
A planilha sai completa, mas você ajusta os detalhes reais da sua campanha, uma coisa por vez. Foi o que fizemos no ISS Manaus. Exemplos de pedidos:
- **Programação:** "Inclua 3 eventos: o principal com o nome da campanha + [tema 2] + [tema 3]. Professores: [Fulano] nos eventos 1 e 2, [Beltrano] no 3." E: "deixe os nomes dos eventos atraentes, como nas outras campanhas."
- **Mentorias:** "Aba de mentorias com 3 temas de reta final + os 3 disparos de alerta."
- **Oferta:** "Ajuste a oferta para este formato: [Período | Cursos e Assinaturas | Promoção | Bônus | Cupom]." (dica: desconto único costuma otimizar melhor os anúncios do que virada 30/20 em campanha curta).
- **Disparos:** "Separe os e-mails por fase (captação / ao vivo / vendas). Inclua 1 WhatsApp de edital e 2 de promo."
- **Anúncios:** "2 vídeos + 3 estáticos na captação; 3 estáticos + 2 vídeos nas vendas."
- **Mídias:** "Aba de mídias com 2 posts (captação e venda) em carrossel estilo Twitter, com a data de cada um."
- **Checklist:** "Crie uma aba de checklist com tudo que o responsável deve fazer."

**O que VOCÊ faz:** confere cada aba. A planilha é reemitida a cada ajuste.

---

## PASSO 4 — FASE B: peça TODAS as copies
Aqui entra o **seu histórico**. Digite:
> "Agora escreva todas as copies da campanha (e-mails, WhatsApp, anúncios, posts, descrição de YouTube, página de vendas, LP e sucesso), espelhando **o MEU histórico de copies** em `[caminho da SUA pasta de histórico]`. Respeite EXATAMENTE o template dos documentos: onde tem meta-ads, negrito, espaçamento, tabelas, layout. Entregue em `.docx` individuais (padrão MC). Os slides eu faço à mão."

**O que o Claude faz:** lê os modelos do seu histórico, extrai o padrão e gera as peças (no ISS Manaus foram **43 `.docx`** + as páginas), tudo com os dados travados no briefing.

**O que VOCÊ faz:** abra 2–3 peças e confira formato/tom contra o seu histórico e contra o piloto ISS Manaus (o gabarito). Peça correções pontuais se precisar.

---

## PASSO 5 — Ajustes finais (política e detalhes)
Mudou uma regra? Peça a correção em TODA a comunicação de uma vez. Exemplos reais do piloto:
> "A garantia agora é de **7 dias**, não 30 — corrija onde estiver."
> "Acesso e atualização dos pacotes é por **12 meses**, não 'até a prova' — ajuste."
> "Na aba de mídias, coloque a data ao lado de cada post."

O Claude aplica de forma ancorada (sem quebrar frases legítimas) e reverifica.

---

## PASSO 6 — Entrega
- Tudo fica na pasta do lançamento: a **planilha `.xlsx`** (abas do funil) + a pasta de **copies** (`.docx` + páginas HTML/MD).
- **Manual (seu):** slides das aulas e a arte dos criativos.
- Confira os **guardrails** antes de subir (próxima seção).

---

## GUARDRAILS (não violar — o Claude segue, você confere)
- **Promo** sempre exclui `Compradores` + `Assinantes`. **Alerta** só p/ inscritos. **Mentoria** só p/ compradores do cupom.
- **Salário/vagas verdadeiros** (edital). Não confirmados → "previstas/solicitadas" + ⚠️.
- **Prova social** é histórica/da área — nunca inventar aprovado "deste concurso" em 1º edital.
- **Garantia = 7 dias.** **Acesso/atualização + SQ = 12 meses** (nunca "até a prova"/"permanente"). Data da prova pode ser citada normalmente.
- **Cupom** `#[SIGLA][%]` (ex.: `#ISSMANAUS20`).
- **Regionalização:** fiscal/federal alto salário → nacional; estadual/municipal → regional.
- **Não usar** o playbook das campanhas GRANDES (Black Friday, Semana Nacional, CNU sazonal).

---

## A COLA (prompts prontos para copiar)
1. **Iniciar:** "Leia a Base de Conhecimento Growth (00–07) e o exemplo ISS Manaus e use como base."
2. **Concepção:** "Vou lançar [CONCURSO], situação [X], prova [data], lançamento [data]–[data], oferta [Y]. Pesquise a situação no blog do Estratégia e gere a campanha completa."
3. **Escolher nome:** "Escolhi: [nome]. Oferta confirmada."
4. **Refinos:** peça aba por aba (programação/mentorias/oferta/anúncios/mídias/checklist).
5. **Copies:** "Escreva todas as copies espelhando meu histórico em [caminho], padrão MC, respeitando o template. Slides eu faço."
6. **Ajustes:** "Corrija [X] em toda a comunicação."

> Dúvidas do processo → Rodrigo (Head de Growth). Na dúvida de formato → abra o equivalente no piloto **ISS Manaus**.
