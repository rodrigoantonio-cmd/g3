# 02 — Estrutura do Funil Padrão (Lançamento Individual por Concurso)

> Base: aba `MODELO` / `MODELO FUNIL` da *Matriz Geral Growth* + análise das sequências reais de e-mail de lançamentos individuais (ISS SP em 90 dias, TJ SP em 100 dias, Reta Final TJ SC, MP PR, Detran DF de 0 a 100, MP MG 60 dias, TJ AL em 80 dias, Código da Aprovação BRB e outros).
> **Escopo:** lançamento **individual por concurso** (excluindo campanhas grandes: Black Friday, Semana Nacional, Nunca mais seja demitido, CNU sazonal).

---

## 1. Visão geral — o funil em 4 fases + pós-venda

Um lançamento individual dura tipicamente **7 a 12 dias** e segue sempre a mesma espinha dorsal:

```
CAPTAÇÃO ─────────► EVENTO AO VIVO ─────► VENDAS ──────────► PÓS-VENDA
(Convite)           (Alerta)              (Promo)            (Mentoria)
leads frios         leads captados        leads + área       compradores
+ Reminder VIP
```

Cada e-mail no funil é definido SEMPRE pelos mesmos campos (colunas do MODELO):

`Campanha | Copy(tipo) | Assunto | Pré-header | Base Disparada | Base Excluída | Data | Hora | [métricas]`

Tipos de e-mail (coluna **Copy**) — confirmados no MODELO (bloco MÉDIAS: GERAL, CONVITE, REMINDER, ALERTA, PROMO, MENTORIA):

| Tipo | Fase | Para quem | Função |
|---|---|---|---|
| **Convite** | Captação | bases frias de área/região | Levar o lead a se inscrever no evento/LP |
| **Reminder** | Captação | quem já se inscreveu (grupo VIP) | Lembrar do acesso/aula |
| **Alerta** | Evento ao vivo | leads captados na campanha | Avisar "NO AR / AO VIVO" das aulas |
| **Promo** | Vendas | leads captados + bases de área | Vender (oferta, desconto, urgência) |
| **Mentoria** | Pós-venda | compradores (cupom) | Entregar bônus/mentorias, reduzir reembolso |

---

## 2. Template padrão de e-mails (quantidades) ⭐

Este é o **padrão base** para replicar em todo lançamento individual. Ajuste conforme porte do concurso (ver seção 6).

| Fase | Tipo | Qtde padrão | Faixa observada |
|---|---|---|---|
| Captação | **Convite** | **6** | 4 – 8 |
| Captação | **Reminder** | **1** | 0 – 2 |
| Evento | **Alerta** | **3** | 2 – 4 |
| Vendas | **Promo** | **8** | 6 – 12 |
| Pós-venda | **Mentoria** | **3** | 3 – 4 |
| **TOTAL** | | **~21 e-mails** | 15 – 26 |

### Anúncios (bloco FACEADS do MODELO)
Mídia paga é rastreada em **dois momentos**, cada um com **criativos estáticos** e **vídeos**:

| Bloco | Objetivo | Métrica | Criativos padrão |
|---|---|---|---|
| **FACEADS — Captação** (`LD/DATA · INVESTIMENTO · LEADS · CPL`) | Gerar leads p/ o evento | CPL (custo por lead) | **3 estáticos + 2 vídeos** |
| **FACEADS — Vendas** (`VD/DATA · INVESTIMENTO · COMPRA · CPA`) | Converter em venda | CPA (custo por aquisição) | **2 estáticos + 1 vídeo** |

> Também há mídia orgânica/parcerias: **influenciadores** (rastreados por comentários, salvamentos, encaminhamentos) e **beamer/banner** no site.

### Páginas (bloco CAPTAÇÃO LEADS do MODELO)
- **Landing Page de captação** — testada em **2 variantes: LP LONGA e LP CURTA** (mede-se conversão de cada).
- **Página de vendas / checkout** — onde o cupom é aplicado (origem das bases de *carrinho abandonado* e *boletos*).
- **Página de obrigado/sucesso** — confirmação de inscrição no evento (redireciona p/ grupo VIP / YouTube).
- Fontes de leads rastreadas (`utm_source`): `LP, beamer, banner, instagram.com, facebook.com, google, youtube, salesforce, influencer, wpp`.

### Evento ao vivo / aulas
- **Aula(s) ao vivo** (webinário no YouTube) — plano de estudos, raio-X do edital, análise da banca, top assuntos que mais caem. Cada aula ganha um **Alerta** dedicado ("NO AR / AO VIVO").
- Lançamento individual: normalmente **1 a 3 aulas**. (Campanhas grandes têm dezenas — fora do escopo aqui.)
- **Mentorias** (pós-venda): 3 encontros ao vivo exclusivos para compradores.

---

## 3. Cadência dia a dia (cronograma-modelo de ~10 dias)

Referência real (ISS SP em 90 dias / TJ SC / TJ AL seguem este ritmo). Dia 0 = 1ª aula ao vivo / abertura de carrinho.

| Dia | Peça | Tipo | Base (quem recebe) |
|---|---|---|---|
| D-5 a D-1 | Convite 1–4 | Convite | Bases de **área** + **região** (frias) — exclui compradores e assinantes |
| D-1 | Reminder 1 | Reminder | Inscritos no evento (grupo VIP) |
| **D0** | Alerta 1 "🔴 AO VIVO" | Alerta | **Leads captados** na campanha (`[Campanha] - [mês] - [ano]`) |
| D0 | Promo 1 "Mentorias + SQ liberados 🔓" | Promo | Leads captados + base de área |
| D1 | Alerta 2 "NO AR I Raio-X do edital" | Alerta | Leads captados |
| D1–D2 | Promo 2–3 (prova social, "quanto custa ser aprovado") | Promo | Leads captados + área |
| D2 | Alerta 3 (última aula) | Alerta | Leads captados |
| D3–D5 | Promo 4–6 (oferta, bônus, "@fulano vai embora hoje") | Promo | Leads + área |
| D5 | Mentoria 1 "📅 Calendário das mentorias" | Mentoria | **Compradores** do cupom |
| D6 | Promo 7 "ATENÇÃO: seu prazo vai expirar ⌛" | Promo | Leads + área |
| **D7 (fim do lote/carrinho)** | Promo 8 "Última mensagem antes do encerramento" + "3..2..1.." | Promo | Leads + área |
| D7–D20 | Mentoria 2–3 (aulas ao vivo dos compradores) | Mentoria | Compradores |

**Horários mais usados:** convites/promos de manhã **~10h–12h**; alertas de aula no horário da live (**~18h50**) ou **7h30** (programação do dia); promos de fechamento **~20h–21h**.

---

## 4. Lógica de segmentação de bases (quem recebe cada e-mail) ⭐

Esta é a regra mais importante para não queimar base e não vender para quem já comprou.

### Convite (captação — bases FRIAS)
- **Disparar para:** base(s) de **área** do concurso + base(s) **regional** (se concurso estadual) + bases de **concursos afins**.
  - Exemplos de bases de área: `Fiscal_Area, Tribunais_Area, Policial_Area, Bancaria_Area, TI_Area, Administrativa_Area, Controle_Gestao_Area, Saude_Area, Educacao_Area, Previdenciaria/INSS`.
  - Bases regionais: `Sao_Paulo_, Rio_do_Janeiro_, Minas_Gerais_, Parana_, Santa_Catarina_, Rio_Grande_do_Sul_ …`
  - Bases de concursos afins (ex.: lançando ISS SP → também `RFB_Fiscal, SEFAZ-MG_Fiscal, SEFAZ-MT_Fiscal`).
- **Excluir SEMPRE:** `[Concurso]_Pacotes_Compradores` + `EC_ASSINANTES_TOTAL` + a própria base de leads já captados.

### Alerta (evento ao vivo)
- **Disparar para:** **base de leads captados na campanha** = `[Nome da Campanha] - [mês] - [ano]` ou `[Campanha] CLICK-[data]`.
- **Excluir:** nada (`-`). É comunicação de conteúdo, não de venda.

### Promo (vendas)
- **Disparar para:** **leads captados** + base de **área** (reforço).
- **Excluir SEMPRE:** `[Concurso]_Pacotes_Compradores` + `EC_ASSINANTES_TOTAL` (+ `ATIVOS_COMPRADORES`). Não vender para quem já é assinante/comprador.

### Mentoria (pós-venda)
- **Disparar para:** `Compradores - Cupom [CUPOM] entre [data] e [data]` (ou `Mentorias - [Campanha]`).
- **Excluir:** nada (`-`).

> **Regionalização na prática:** concurso estadual (TJ/MP/PC/Detran/SEFAZ estadual) → priorizar bases da **UF + UFs vizinhas**. Concurso federal/fiscal de alto salário → **bases de área nacionais** (o salário justifica falar para o Brasil todo).

---

## 5. Estilo de copy por tipo de e-mail (assuntos que funcionam)

Padrões reais extraídos dos assuntos — use como banco de fórmulas.

**Convite (curiosidade + vaga/salário):**
- "Não estude sem ver isto…👀" · "Você moraria em São Paulo por R$ 26 mil/mês?" · "R$ 6 mil por mês fácil!" · "[N] vagas 🥰" · "O concurso tá aí!" · "Quer mais de R$ 26 mil?" · "Este edital te interessa muito"

**Reminder (acesso/VIP):**
- "🎁 Acesso liberado" · "⚠️ NÃO fique de fora do Grupo VIP!" · "Amanhã é o grande dia!"

**Alerta (aula ao vivo — sempre com 🔴/🟢):**
- "🔴 AO VIVO | [tema]" · "🟢 NO AR I Raio-X do edital!" · "🔴 LIVE >> [tema]" · "[VAI COMEÇAR] Pronto para acelerar?" · "@prof.fulano está ao vivo..."

**Promo (oferta / prova social / urgência):**
- Liberação de bônus: "Mentorias + SQ liberados agora 🔓" · "🔓 [Liberado] Era isso que você queria, né?"
- Prova social: "Eles passaram usando isto aqui 🏅" · "@fulana usou isto..."
- Valor/objeção: "Quanto custa ser aprovado?" · "NÃO gaste com consultoria! ❌"
- Urgência/escassez: "ATENÇÃO: seu prazo vai expirar! ⌛" · "Você tem menos de 24h 🔥" · "Última mensagem antes do encerramento" · "⏰ 3..2..1.. você tem pouco tempo!" · "Vai acabar... 💔"

**Mentoria (entrega de bônus):**
- "Seu BÔNUS vem aí — Calendário das mentorias 📅" · "🔥 <Mentoria> Encontro 1 agora!" · "ESTAMOS AO VIVO — sua mentoria começou (encontro X de 3)"

---

## 6. Ajuste do porte por tamanho/relevância do concurso

| Porte | Exemplos | Convite | Alerta | Promo | Mentoria | Aulas ao vivo |
|---|---|---|---|---|---|---|
| **P** (regional pequeno, nicho) | Detran DF, MP MG 60d | 3–4 | 1–2 | 4–6 | 2–3 | 1 |
| **M** (estadual relevante) | ISS SP, TJ SC, TJ AL, MP PR | 5–6 | 2–3 | 7–9 | 3 | 1–2 |
| **G** (federal/fiscal de alto salário) | RFB, PF/PRF, AFT, SEFAZ, TCU | 6–8 | 3–4 | 9–12 | 3–4 | 2–3 |

> As campanhas **GRANDES** (Black Friday, Semana Nacional, Nunca mais seja demitido, CNU sazonal) têm estrutura própria (dezenas a 150+ aulas, múltiplos segmentos) e **não** seguem este template — estão fora do escopo deste repositório por decisão do time.

---

## 7. Blocos de acompanhamento (o que a planilha/matriz rastreia)

Toda campanha replica os blocos do MODELO para medir resultado:
1. **E-mails** — cada disparo com base, data, hora, envios, aberturas, cliques, unsub.
2. **MÉDIAS por tipo** — abertura e clique médios de Convite/Reminder/Alerta/Promo/Mentoria.
3. **Melhores/Piores** aberturas e cliques (Copy · % · Assunto · Base · Copywriter) — aprendizado.
4. **CAPTAÇÃO LEADS** — LP longa vs curta, leads por fonte (utm_source), views LP, % conversão.
5. **FACEADS** — captação (CPL) e vendas (CPA), criativos estáticos vs vídeos, melhor/pior desempenho.
6. **DASHBOARD vendas** — por lote: período, data, valor, quantidade, ticket médio; assinaturas.

→ O formato de saída da planilha gerada está em `05 - Template da Planilha de Lançamento.md`.
