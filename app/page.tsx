// Home: explica o app e leva para "Nova campanha" (acesso aberto, sem login).

import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <h1>Maquina de Lancamentos</h1>
      <p className="subtitulo">
        A ferramenta do time de Growth para criar campanhas de lancamento de
        concursos em poucos minutos.
      </p>

      <div className="card">
        <h2>Como funciona</h2>
        <ol className="limpa">
          <li>
            Cria uma campanha preenchendo um briefing simples (concurso,
            situacao, datas e oferta).
          </li>
          <li>
            O app usa o &quot;cerebro&quot; do time (nossos padroes de nome,
            funil e oferta) e a inteligencia da Claude para gerar as ideias de
            nome, o funil e um resumo.
          </li>
          <li>
            Voce salva a campanha e consulta o historico compartilhado do time
            quando quiser.
          </li>
        </ol>
      </div>

      <div className="card">
        <h2>Comece agora</h2>
        <p>
          <Link className="botao" href="/campanhas/nova">
            Criar nova campanha
          </Link>{" "}
          <Link className="botao botao-secundario" href="/campanhas">
            Ver campanhas do time
          </Link>
        </p>
        <p className="rodape">
          Ainda nao configurou o app? Veja o arquivo <strong>README.md</strong>{" "}
          na pasta do projeto com o passo a passo.
        </p>
      </div>
    </div>
  );
}
