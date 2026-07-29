# 05 — Template da Planilha de Lançamento (Formato de Saída)

> É o **entregável final** que o Claude gera a cada campanha: uma planilha completa do funil. Estrutura espelha o `MODELO` da Matriz Geral Growth, organizada em abas/blocos. Pode ser entregue como Markdown (aqui) ou exportada em `.xlsx` a pedido.

---

## Cabeçalho da campanha (topo da planilha)
| Campo | Valor |
|---|---|
| Campanha (Big Idea \| Big Promise) | _[nome gerado]_ |
| Concurso / Órgão | _[…]_ |
| Situação | pré-edital / edital / reta final |
| Data de início | _[data]_ |
| Data de fechamento (fim do lote) | _[data]_ |
| Cupom | `#[SIGLA]30` |
| Oferta | Pacote + Assinatura · Bônus: Mentorias + SQ |
| Abrangência | Nacional / Regional (UFs) |
| Responsável (Copywriter) | _[nome]_ |

---

## ABA 1 — Disparos de E-mail  ⭐ (o núcleo)
Colunas: **Nº · Tipo (Copy) · Dia · Data · Hora · Assunto · Pré-header · Base Disparada · Base Excluída · Responsável**

| Nº | Tipo | Dia | Data | Hora | Assunto | Pré-header | Base Disparada | Base Excluída | Resp. |
|--|--|--|--|--|--|--|--|--|--|
| 1 | Convite | D-5 | | 12h | | | [Área] + [Região] | [Concurso]_Compradores; EC_ASSINANTES_TOTAL | |
| 2 | Convite | D-4 | | 12h | | | [Área] afins | idem | |
| 3 | Convite | D-3 | | 10h | | | [Região] | idem | |
| 4 | Convite | D-2 | | 12h | | | [Área] | idem | |
| 5 | Convite | D-1 | | 12h | | | Abert_15d | idem | |
| 6 | Reminder | D-1 | | 20h | | | Inscritos no evento (VIP) | - | |
| 7 | Alerta | D0 | | 18h50 | 🔴 AO VIVO... | | Leads captados na campanha | - | |
| 8 | Promo | D0 | | 20h | Mentorias + SQ liberados 🔓 | | Leads + [Área] | [Concurso]_Compradores; EC_ASSINANTES_TOTAL | |
| 9 | Alerta | D1 | | 18h50 | 🟢 NO AR I Raio-X do edital | | Leads captados | - | |
| 10 | Promo | D1 | | 12h | Quanto custa ser aprovado? | | Leads + [Área] | idem venda | |
| 11 | Promo | D2 | | 20h | Prova social / @aprovado usou isto | | Leads + [Área] | idem venda | |
| 12 | Alerta | D2 | | 18h50 | 🔴 LIVE >> última aula | | Leads captados | - | |
| 13 | Promo | D3 | | 12h | Bônus / oferta | | Leads + [Área] | idem venda | |
| 14 | Mentoria | D3 | | 13h | 📅 Calendário das mentorias | | Compradores do cupom | - | |
| 15 | Promo | D4 | | 20h | Vai perder? 30% OFF | | Leads + [Área] | idem venda | |
| 16 | Promo | D5 | | 10h | @fulano vai embora hoje 👋 | | Leads + [Área] | idem venda | |
| 17 | Promo | D6 | | 10h | ATENÇÃO: prazo vai expirar ⌛ | | Leads + [Área] | idem venda | |
| 18 | Promo | D7 | | 10h | Última chamada / 3..2..1.. | | Leads + [Área] | idem venda | |
| 19 | Promo | D7 | | 20h | Última mensagem antes do encerramento | | Leads + [Área] | idem venda | |
| 20 | Mentoria | D8 | | 19h | ESTAMOS AO VIVO — Mentoria 2 | | Compradores | - | |
| 21 | Mentoria | D15 | | 19h | Mentoria 3 de 3 | | Compradores | - | |

*(quantidades = template padrão da `02`; ajuste ao porte P/M/G)*

## ABA 2 — Anúncios (mídia paga)
Colunas: **Objetivo · Formato · Nº · Ângulo/Headline · Público-alvo · Observação**

| Objetivo | Formato | Nº | Ângulo / Headline | Público | Obs |
|--|--|--|--|--|--|
| Captação | Estático | 1 | Vagas + salário | Lookalike leads / [Área] | mede CPL |
| Captação | Estático | 2 | Prazo/urgência ("faltam X dias") | interesses do nicho | |
| Captação | Estático | 3 | Dor→sonho (estabilidade) | amplo regional/nacional | |
| Captação | Vídeo | 1 | Professor/aprovado falando do concurso | retarget site + frio | |
| Captação | Vídeo | 2 | Depoimento/prova social | Lookalike compradores | |
| Vendas | Estático | 1 | Oferta + cupom | Leads captados (retarget) | mede CPA |
| Vendas | Estático | 2 | Escassez (lote/prazo) | Leads captados | |
| Vendas | Vídeo | 1 | Bônus (mentorias + SQ) | Leads captados | |

## ABA 3 — Páginas & Evento
| Item | Descrição | Status/Resp. |
|--|--|--|
| Landing Page — LONGA | Captura de lead (vagas, salário, aula gratuita) | |
| Landing Page — CURTA | Variante de teste A/B | |
| Página de Vendas | Oferta + cupom + bônus + checkout | |
| Página de Obrigado/Sucesso | Confirma inscrição → grupo VIP / YouTube | |
| Aula(s) ao vivo | Tema(s): plano de estudos / raio-X edital / análise banca | |
| Descrição do YouTube | Título + descrição + links da(s) aula(s) | |
| Slides da aula | Roteiro: gancho → autoridade → conteúdo → oferta | |
| Mentorias (pós-venda) | 3 encontros — temas e datas | |

## ABA 4 — Oferta & Lotes
| Produto | Preço cheio | Cupom | Preço c/ desconto | Lote | Início | Fim |
|--|--|--|--|--|--|--|
| Pacote [Concurso] | | `#[SIGLA]30` | | Único | | |
| Assinatura Premium | | | | | | |

## ABA 5 — Cronograma / Tarefas (checklist do lançamento)
| Tarefa | Responsável | Prazo | Status |
|--|--|--|--|
| Briefing + pesquisa do concurso | | D-10 | |
| Nome + Big Idea/Promise aprovados | | D-9 | |
| Definição da oferta e cupom | | D-8 | |
| Copy das LPs (longa/curta) | | D-7 | |
| Criativos de captação (estáticos + vídeos) | | D-6 | |
| Subir campanha de mídia (captação) | | D-5 | |
| Escrever e-mails de Convite | | D-5 | |
| Roteiro + slides da aula ao vivo | | D-2 | |
| Página de vendas + checkout com cupom | | D-1 | |
| E-mails de Alerta + Promo | | D0 | |
| Criativos de vendas + subir mídia (vendas) | | D0 | |
| E-mails de Mentoria (pós-venda) | | D3 | |
| Acompanhamento diário (dashboard) | | D0→D8 | |
| Fechamento + relatório de resultados | | D+2 | |

---

### Observação sobre exportação
Quando você pedir uma campanha específica, posso gerar esta planilha já preenchida em **`.xlsx`** (uma aba por bloco), pronta para subir no Drive. Basta pedir "exporta em Excel".
