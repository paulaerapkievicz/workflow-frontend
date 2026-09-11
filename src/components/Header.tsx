import Link from "next/link";
import { useRouter } from "next/router";
import styles from "@/styles/Header.module.scss";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/src/hooks/useAuth";
import { useSelfRegistrationOpen } from "@/src/hooks/useSelfRegistrationOpen";
import { proposalEmailLink } from "@/src/config/landingContact";

const ROLE_HOME: Record<string, string> = {
  admin: "/",
  supermarket: "/supermarket/dashboard",
  agency: "/agency/dashboard",
  freelancer: "/freelancer/dashboard",
};

const Header = () => {
  const router = useRouter();
  const { authenticated, role, user, loading, logout } = useAuth();
  const registrationOpen = useSelfRegistrationOpen();

  // Nas telas internas (painéis) o cabeçalho lateral já dá o contexto — mantemos o topo enxuto.
  const onPanel = /^\/(supermarket|agency|freelancer|admin)(\/|$)/.test(router.pathname);
  const onLandingRoot = router.pathname === "/" || router.pathname === "/p/[id]";

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Uma única imagem via background: tema claro = logo completo, tema escuro = só a marca "W". */}
        <Link href="/" className={styles.logo} aria-label="WorkFlow — Gente certa, na hora certa">
          <span className={styles.logoImg} role="img" aria-label="WorkFlow" />
        </Link>

        <nav className={styles.nav}>
          {loading ? null : authenticated && role ? (
            <>
              {!onPanel && (
                <Link href={ROLE_HOME[role] ?? "/"} className={styles.navLink}>Painel</Link>
              )}
              {user && <span className={styles.hi}>Olá, {user.name.split(" ")[0]}</span>}
              <button type="button" className={styles.logout} onClick={logout}>Sair</button>
            </>
          ) : onLandingRoot ? (
            <>
              <Link href="/login" className={styles.navLink}>Entrar no sistema</Link>
              <a href={proposalEmailLink("Quero uma proposta para o meu supermercado")} className={styles.cta}>
                Quero uma proposta
              </a>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.navLink}>Entrar</Link>
              {registrationOpen && (
                <Link href="/register" className={styles.cta}>Criar conta</Link>
              )}
            </>
          )}
          <span className={styles.themeWrap}><ThemeToggle /></span>
        </nav>
      </div>
    </header>
  );
};

export default Header;
