import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import styles from "@/styles/login.module.scss";

export default function SupermarketLogin() {
  const router = useRouter();

  useEffect(() => {
    AOS.init();
  }, []);

  return (
    <>
      <Head>
        <title>Supermercado | WorkFlow</title>
      </Head>
      <main className={styles.loginContainer}>
        <section className={styles.loginBox} data-aos="fade-up">
          <h1 className={styles.title}>Acesso para Supermercados</h1>
          <p className={styles.subtitle}>Gerencie suas vagas e pagamentos</p>

          <button
            className={styles.loginButton}
            onClick={() => router.push("/supermarket/dashboard")}
          >
            Entrar no Painel
          </button>

          <Link href="/">
            <p className={styles.backLink}>← Voltar para Home</p>
          </Link>
        </section>
      </main>
    </>
  );
}
