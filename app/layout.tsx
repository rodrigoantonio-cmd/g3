// Layout raiz do App Router: envolve todas as paginas.

import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maquina de Lancamentos - Growth",
  description:
    "Gerador de campanhas de lancamento do time de Growth da Estrategia Concursos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="topo">
          <div className="barra">
            <Link href="/" className="marca">
              Maquina de Lancamentos
            </Link>
            <nav>
              <Link href="/campanhas">Campanhas</Link>
              <Link href="/campanhas/nova">Nova campanha</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
