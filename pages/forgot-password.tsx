import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import s from "@/styles/auth.module.scss";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Sem envio de e-mail configurado no ambiente: confirmamos sem revelar se a conta existe.
    setSent(true);
  };

  return (
    <>
      <Head><title>Recuperar senha | WorkFlow</title></Head>
      <div className={s.page}>
        <aside className={s.brand}>
          <div className={s.brandInner}>
            <div className={s.brandMark}><span>W</span> WorkFlow</div>
            <h1 className={s.brandTitle}>Recuperar acesso</h1>
            <p className={s.brandText}>
              Informe o e-mail cadastrado e enviaremos as instruções para você criar uma nova senha.
            </p>
          </div>
        </aside>

        <section className={s.formSide}>
          <div className={s.card}>
            <div className={s.mobileMark}><span>W</span> WorkFlow</div>
            <h2 className={s.title}>Esqueci minha senha</h2>
            <p className={s.subtitle}>Vamos te ajudar a voltar para a sua conta.</p>

            {sent ? (
              <>
                <p className={s.success}>
                  Se houver uma conta associada a <strong>{email}</strong>, você receberá um e-mail
                  com as instruções para redefinir a senha. Verifique também a caixa de spam.
                </p>
                <div className={s.divider}>ou</div>
                <p className={s.foot}>
                  <Link href="/login" className={s.link}>Voltar para o login</Link>
                </p>
              </>
            ) : (
              <>
                <form className={s.form} onSubmit={handleSubmit}>
                  <div className={s.field}>
                    <label htmlFor="email">E-mail</label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button className={s.submit} type="submit">Enviar instruções</button>
                </form>

                <div className={s.divider}>ou</div>
                <p className={s.foot}>
                  Lembrou a senha? <Link href="/login" className={s.link}>Entrar</Link>
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
