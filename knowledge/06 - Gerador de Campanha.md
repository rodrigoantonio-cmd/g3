# 06 — Gerador de Campanha (o "1 clique")

> Este é o **motor**. Quando o Head/Copywriter pedir uma campanha, o Claude segue estes passos usando os arquivos `01`–`05` como base de conhecimento. Objetivo: de um briefing curto → **nome + funil + planilha completa**.

---

## Input mínimo esperado do usuário
> "Vou lançar para o **[concurso]**, situação **[pré-edital / edital / reta final]**, prova/edital em **[data]**, início do lançamento em **[data]**."

Opcional: vagas, salário, região, porte, produto/cupom. Se faltar, o Claude **deduz e marca como suposição a confirmar**.

---

## Passo a passo do Claude

**1. Montar o briefing** (usar `03`).
Preencher os 5 blocos. Pesquisar/deduzir: cargo, banca, vagas, salário-teto, área, região. Marcar suposições com ⚠️.

**2. Definir abrangência e bases** (usar `04`).
- Fiscal/federal alto salário → **nacional** (bases de área).
- Estadual/municipal → **regional** (UF + vizinhas + área).
- Listar as bases exatas de Convite, Alerta, Promo, Mentoria.

**3. Gerar o nome** (usar `01`).
- Escolher arquétipo pela **situação** (tabela seção 4 do `01`).
- Produzir **5 opções** `Big Idea | Big Promise`, cada uma com ≥2 elementos numéricos.
- Recomendar 1 (a primeira) e sugerir o **cupom** `#[SIGLA]30`.
- Rodar o checklist de validação (seção 5 do `01`).

**4. Definir a oferta** (usar `04`).
- Produto principal (pacote) + upsell (assinatura), bônus padrão (Mentorias + SQ), cupom, lote/prazo (padrão: lote único, 8 dias), datas de início/fechamento.

**5. Dimensionar o funil** (usar `02`).
- Classificar porte **P/M/G** → definir quantidades de Convite/Reminder/Alerta/Promo/Mentoria e de anúncios.
- Montar o **cronograma dia a dia** (seção 3 do `02`) a partir da data de início.

**6. Escrever as peças** (usar `02` seção 5 para estilo).
- Preencher **Assunto + Pré-header** de cada e-mail no tom certo do tipo (Convite/Alerta/Promo/Mentoria).
- Definir **ângulos/headlines** dos anúncios (captação e vendas).
- Listar entregáveis de página/evento (LP longa+curta, vendas, obrigado, aula, slides, descrição YT, mentorias).

**7. Emitir a planilha** (usar `05`).
- Preencher todas as abas do template `05` com o que foi gerado.
- Preencher a aba de **Cronograma/Tarefas** com responsáveis e prazos relativos.
- Se pedido, **exportar em `.xlsx`**.

**8. Fechar com resumo executivo:** nome escolhido, oferta, nº de peças por tipo, datas-chave, projeção de ticket médio (faixa da `04`, como sanity-check).

---

## Regras de qualidade (não violar)
- **Nunca** vender para quem já comprou/assina: excluir `[Concurso]_Compradores` + `EC_ASSINANTES_TOTAL` em todo e-mail **Promo**.
- **Alerta** vai só para leads captados; **Mentoria** só para compradores do cupom.
- Salário e vagas devem ser **verdadeiros/plausíveis** — se não confirmados, escrever "previstas/solicitadas" e marcar ⚠️.
- Big Idea curta (≤5 palavras); Big Promise com ≥2 números.
- Ignorar o playbook de **campanhas grandes** (Black Friday, Semana Nacional, Nunca mais seja demitido, CNU sazonal) — este gerador é para **lançamento individual por concurso**.
- Sempre oferecer para o usuário **revisar o nome e a oferta** antes de expandir a planilha inteira (evita retrabalho).

---

## Formato da resposta (ordem)
1. **Briefing** resumido (com ⚠️ nas suposições).
2. **5 nomes** (Big Idea | Big Promise) + cupom sugerido + recomendação.
3. *(aguardar confirmação do nome/oferta OU seguir se o usuário pediu "campanha completa direto")*
4. **Funil dimensionado** (quantidades + cronograma).
5. **Planilha completa** (abas do `05`), + oferta de export `.xlsx`.

---

## Exemplo de chamada
> **Usuário:** "Lançamento TCE-SC, banca autorizada, edital previsto para outubro, começo o lançamento em 15/09."
>
> **Claude:** monta briefing (área Controle/Tribunais, regional SC+PR+RS, salário ~R$15k) → 5 nomes (recomenda *"Marco Zero TCE-SC | O plano para largar na frente na disputa por [X] vagas e conquistar até R$ 15 mil/mês"*, cupom `#TCESC30`) → dimensiona porte **M** (6 Convite / 1 Reminder / 3 Alerta / 8 Promo / 3 Mentoria; 5 criativos captação + 3 vendas) → cronograma D-5→D+15 → planilha completa das 5 abas.
