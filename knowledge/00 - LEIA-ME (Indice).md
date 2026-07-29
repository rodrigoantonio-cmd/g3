# 🦉 Base de Conhecimento — Growth Estratégia Concursos

> **O que é:** o "cérebro" de lançamentos digitais do time de Growth, destilado da *Matriz Geral Growth* (240 campanhas, 2021–2026). Serve para o Claude **gerar uma campanha completa a partir de um briefing curto** — nome, funil, oferta e planilha.
>
> **Para quem:** Head de Growth + os 4 Copywriters. Cada Copywriter consegue conduzir um lançamento sozinho seguindo estes arquivos.
>
> **Escopo:** lançamentos **individuais por concurso** (ex.: TCE-SC, ISS SP, TJ RJ). Campanhas **grandes** (Black Friday, Semana Nacional, Nunca mais seja demitido, CNU sazonal) ficam **de fora** por decisão do time — têm playbook próprio.

---

## 🚀 Uso rápido (o "1 clique")

Peça assim ao Claude:
> "Vou lançar para o **[concurso]**, situação **[pré-edital / edital publicado / reta final]**, prova/edital em **[data]**, início em **[data]**."

O Claude entrega, nesta ordem:
1. **Briefing** do concurso (com ⚠️ nas suposições a confirmar)
2. **5 opções de nome** (Big Idea | Big Promise) + cupom sugerido + recomendação
3. **Funil dimensionado** (quantos e-mails/anúncios, cronograma dia a dia)
4. **Planilha completa** do lançamento (exportável em `.xlsx`)

Variações de pedido: *"só me dá 5 nomes para X"* · *"gera a campanha completa direto"* · *"exporta em Excel"*.

---

## 📚 Arquivos (ordem de leitura)

| Arquivo | Para quê |
|---|---|
| **01 - Framework de Nomes de Campanha** | Como criar o **nome** (Big Idea + Big Promise): arquétipos, fórmulas de promessa, mapa situação→nome. |
| **02 - Estrutura do Funil Padrão** | O **funil**: tipos e quantidades de e-mail, cadência dia a dia, segmentação de bases, anúncios, páginas. ⭐ |
| **03 - Template de Briefing** | O **levantamento inicial** (concurso, público, salário, vagas, região, motivação). |
| **04 - Oferta, Cupom, Lotes e Bases** | **Oferta**: produtos, bônus, padrão de cupom, lotes, ticket médio, vocabulário de bases e UTMs. |
| **05 - Template da Planilha de Lançamento** | O **formato de saída** — as abas da planilha entregável. |
| **06 - Gerador de Campanha** | O **motor**: passo a passo que o Claude segue para transformar briefing → campanha. |
| **07 - Como Rodar uma Campanha (Passo a Passo)** | **Tutorial** do fluxo completo, do zero, com o ISS Manaus como exemplo. **Comece por aqui.** |
| **08 - Canal WhatsApp de Grupo (Calendário e Estilo)** | O canal dos **grupos de WhatsApp**: calendário por fase + estilo de escrita + esqueletos. |
| `dados/historico_campanhas_completo.tsv` | As **240 campanhas** históricas (mês + nome completo). Fonte do framework de nomes. |
| `dados/links_planilhas_por_campanha.tsv` | Os **links reais** (coluna E) das planilhas individuais de cada campanha, para consulta/benchmark. |

---

## 🧭 Princípios que atravessam tudo
- **Big Idea vende o conceito; Big Promise entrega o número** (vagas + salário + prazo + prova social).
- **Regionalização:** fiscal/federal de alto salário → nacional; estadual/municipal → regional.
- **Nunca vender para quem já comprou/assina** (excluir compradores + `EC_ASSINANTES_TOTAL` nas Promos).
- **Funil = Convite → Alerta → Promo → Mentoria** (+ Reminder VIP). Canais: e-mail, **WhatsApp API** (broadcast) e **WhatsApp de grupo** (orgânico, ver arquivo 08).
- **Verdade nos números:** salário/vagas plausíveis; se não confirmados, "previstas/solicitadas" + ⚠️.
- **SQ é ferramenta, não bônus:** o Sistema de Questões já vem incluído nos Pacotes e nas Assinaturas (acesso 12 meses); o bônus típico são as **mentorias** (detalhe no arquivo 04).

---

## 🔗 Fontes
- *Matriz Geral Growth* (Google Sheets, 155 abas): aba `CAMPANHAS` (col B = nomes, col E = links dos escopos), abas `MODELO` / `MODELO FUNIL`, `BASES`, `RESULTADOS CAMPANHAS EM GERAL` e as abas de escopo por campanha.
- *Matriz Geral - New Growth* (versão mais recente do repositório).

_Última atualização: 28/07/2026._
