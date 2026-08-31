import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "@/styles/Header.module.scss";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/src/hooks/useAuth";

const ROLE_HOME: Record<string, string> = {
  admin: "/",
  supermarket: "/supermarket/dashboard",
  agency: "/agency/dashboard",
  freelancer: "/freelancer/dashboard",
};

const Header = () => {
  const router = useRouter();
  const { authenticated, role, user, loading, logout } = useAuth();

  // Nas telas internas (painéis) o cabeçalho lateral já dá o contexto — mantemos o topo enxuto.
  const onPanel = /^\/(supermarket|agency|freelancer|admin)(\/|$)/.test(router.pathname);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <Image src="/logoWorkflow.png" alt="WorkFlow" width={30} height={30} priority />
          <span className={styles.wordmark}>WorkFlow</span>
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
          ) : (
            <>
              <Link href="/login" className={styles.navLink}>Entrar</Link>
              <Link href="/register" className={styles.cta}>Criar conta</Link>
            </>
          )}
          <span className={styles.themeWrap}><ThemeToggle /></span>
        </nav>
      </div>
    </header>
  );
};

export default Header;
