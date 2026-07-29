"use client";

// Pagina de login por e-mail/senha via Supabase Auth.
// E um client component porque usa estado e chama o Supabase no navegador.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser, supabaseConfigurado } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setMensagem(null);

    if (!supabaseConfigurado) {
      setErro(
        "O Supabase ainda nao esta configurado. Preencha o arquivo .env.local (veja o README)."
      );
      return;
    }

    setCarregando(true);
    const supabase = getSupabaseBrowser();

    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });
        if (error) throw error;
        router.push("/campanhas");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
        });
        if (error) throw error;
        setMensagem(
          "Conta criada! Se a confirmacao por e-mail estiver ativa, confirme pelo link enviado antes de entrar."
        );
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha na autenticacao.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <h1>{modo === "entrar" ? "Entrar" : "Criar conta"}</h1>
      <p className="subtitulo">
        Use seu e-mail de trabalho e uma senha para acessar suas campanhas.
      </p>

      {!supabaseConfigurado && (
        <div className="aviso">
          Atencao: o Supabase ainda nao foi configurado. O login so funciona
          depois de preencher o <strong>.env.local</strong> (veja o README.md).
        </div>
      )}

      {erro && <div className="erro">{erro}</div>}
      {mensagem && <div className="aviso">{mensagem}</div>}

      <form className="card" onSubmit={onSubmit}>
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <label htmlFor="senha">Senha</label>
        <input
          id="senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          autoComplete={modo === "entrar" ? "current-password" : "new-password"}
        />

        <p style={{ marginTop: 16 }}>
          <button type="submit" disabled={carregando}>
            {carregando
              ? "Aguarde..."
              : modo === "entrar"
                ? "Entrar"
                : "Criar conta"}
          </button>
        </p>
      </form>

      <p className="rodape">
        {modo === "entrar" ? (
          <>
            Ainda nao tem conta?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setModo("criar");
              }}
            >
              Criar conta
            </a>
          </>
        ) : (
          <>
            Ja tem conta?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setModo("entrar");
              }}
            >
              Entrar
            </a>
          </>
        )}
      </p>
    </div>
  );
}
