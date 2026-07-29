// Tipos compartilhados pelo app (front-end e back-end).

// Situacao do lancamento. Vem do "gatilho" da noticia (ver knowledge/03).
export type Situacao = "pre-edital" | "edital publicado" | "reta final";

// Briefing = o formulario que o usuario preenche para gerar a campanha.
export interface Briefing {
  concurso: string; // nome do concurso, ex.: "TCE-SC"
  orgao: string; // orgao, ex.: "Tribunal de Contas do Estado de SC"
  situacao: Situacao; // fase do lancamento
  banca: string; // banca organizadora, ex.: "FGV", "Cebraspe"
  vagas: string; // vagas (texto livre; pode ser "2.000 previstas")
  salario: string; // salario, ex.: "ate R$ 15 mil/mes"
  dataInicioCarrinho: string; // inicio do carrinho/promo (YYYY-MM-DD)
  dataFimCarrinho: string; // fim do carrinho/promo (YYYY-MM-DD)
  descontoPercent: string; // % de desconto, ex.: "30"
  cupom: string; // cupom, ex.: "#TCESC30"
  observacoes: string; // observacoes livres do usuario
}

// Resultado da geracao devolvido pela rota /api/generate.
export interface GenerateResult {
  bigIdeas: string[]; // opcoes de nome/big idea da campanha
  funil: string; // descricao do funil dimensionado (texto)
  resumo: string; // resumo executivo da campanha
  aviso?: string; // aviso opcional (ex.: chave da Anthropic ausente -> stub)
}

// Campanha estruturada (JSON) devolvida pela geracao na Fase 3.
// A partir dela o app monta e baixa a planilha .xlsx.
export interface CampanhaEstruturada {
  bigIdeas: string[]; // 5 opcoes (Big Idea | Big Promise)
  nomeEscolhido: string; // default = bigIdeas[0]
  resumo: string;
  capa: {
    campanha: string;
    concurso: string;
    orgao: string;
    situacao: string;
    banca: string;
    vagas: string;
    salario: string;
    escolaridade: string;
    carrinho: string;
    cupom: string;
    oferta: string;
    abrangencia: string;
  };
  disparos: {
    fase: "Captação" | "Ao vivo" | "Vendas";
    peca: string;
    data: string;
    hora: string;
    base: string;
    excluir: string;
    assunto: string;
    preHeader: string;
  }[];
  anuncios: {
    objetivo: "Captação" | "Vendas";
    formato: string;
    angulo: string;
    publico: string;
  }[];
  oferta: {
    periodo: string;
    produtos: string;
    promocao: string;
    bonus: string;
    cupom: string;
  }[];
  programacao: {
    data: string;
    hora: string;
    professor: string;
    evento: string;
    conteudo: string;
  }[];
  mentorias: {
    data: string;
    hora: string;
    professor: string;
    tema: string;
  }[];
  whatsappGrupos: {
    data: string;
    hora: string;
    fase: string;
    assunto: string;
    mensagem: string;
  }[];
}

// Campanha salva no Supabase (tabela "campaigns").
export interface Campaign {
  id: string;
  user_id: string;
  nome: string;
  concurso: string;
  status: string;
  created_at: string;
}
