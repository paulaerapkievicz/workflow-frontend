import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";
import s from "@/styles/auth.module.scss";
import { authService } from "@/src/services/authService";
import { useAuth } from "@/src/hooks/useAuth";

const ROLE_HOME: Record<string, string> = {
  admin: "/",
  supermarket: "/supermarket/dashboard",
  agency: "/agency/dashboard",
  freelancer: "/freelancer/dashboard",
};

export default function LoginPage() {
  const router = useRouter();
  const { authenticated, role, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && authenticated && role) router.replace(ROLE_HOME[role] ?? "/");
  }, [authLoading, authenticated, role, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await authService.login({ email, password });
      // Navegação completa: garante que o cabeçalho e os hooks reiniciem com a sessão nova.
      window.location.assign(ROLE_HOME[user.role] ?? "/");
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message ?? "Não foi possível entrar."
          : "Não foi possível entrar."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Entrar | WorkFlow</title></Head>
      <div className={s.page}>
        <aside className={s.brand}>
          <div className={s.brandInner}>
            <div className={s.brandMark}><span>W</span> WorkFlow</div>
            <h1 className={s.brandTitle}>Bem-vindo de volta</h1>
            <p className={s.brandText}>
              A plataforma que conecta supermercados, agências e freelancers — do pedido de vagas
              ao pagamento, com controle em tempo real.
            </p>
            <ul className={s.brandList}>
              <li><span className={s.check}>✓</span> Pedidos de vagas em poucos cliques</li>
              <li><span className={s.check}>✓</span> Check-in por geolocalização e comprovação por foto</li>
              <li><span className={s.check}>✓</span> Faturamento e fechamento mensal automáticos</li>
            </ul>
          </div>
        </aside>

        <section className={s.formSide}>
          <div className={s.card}>
            <div className={s.mobileMark}><span>W</span> WorkFlow</div>
            <h2 className={s.title}>Entrar</h2>
            <p className={s.subtitle}>Acesse a sua conta para continuar.</p>

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

              <div className={s.field}>
                <label htmlFor="password">Senha</label>
                <div className={s.passwordWrap}>
                  <input
                    id="password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Ocultar senha" : "Mostrar senha"}>
                    {show ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              <div className={s.formRow}>
                <label className={s.remember}>
                  <input type="checkbox" defaultChecked /> Manter conectado
                </label>
                <Link href="/forgot-password" className={s.link}>Esqueci minha senha</Link>
              </div>

              {error && <p className={s.error}>{error}</p>}

              <button className={s.submit} type="submit" disabled={loading}>
                {loading ? "Entrando…" : "Entrar"}
              </button>
            </form>

            <div className={s.divider}>ou</div>
            <p className={s.foot}>
              Ainda não tem conta? <Link href="/register" className={s.link}>Criar conta grátis</Link>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
