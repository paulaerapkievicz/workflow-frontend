import Head from "next/head";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import Link from "next/link";
import Header from "@/src/components/Header";
import styles from "../styles/index.module.scss";

export default function HomePage() {
  useEffect(() => {
    AOS.init();
  }, []);

  return (
    <>
      <Head>
        <title>WorkFlow - Gestão Inteligente de Vagas e Pagamentos</title>
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <meta
          property="og:title"
          content="WorkFlow - Plataforma de Gestão de Vagas e Pagamentos"
        />
        <meta
          name="description"
          content="Gerencie vagas, pagamentos e operações do seu supermercado de forma eficiente com o WorkFlow."
        />
      </Head>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero} data-aos="fade-up">
          <h1>Gerencie vagas e pagamentos da sua rede de supermercados</h1>
          <p>
            Controle a abertura de vagas, acompanhe pagamentos para agências e
            monitore a gestão de suas filiais de forma simples.
          </p>
        </section>

        <section className={styles.cards} data-aos="fade-up" data-aos-delay="200">
          {/* Card 1: Supermercado */}
          <div className={styles.card}>
            <h3>Supermercado</h3>
            <p>
              Gerencie vagas, controle pagamentos para agências e acompanhe a
              performance das suas filiais.
            </p>
            <Link href="/login/supermarket">
              <button className={styles.button}>Entrar</button>
            </Link>
          </div>

          {/* Card 2: Agência */}
          <div className={styles.card}>
            <h3>Agência</h3>
            <p>
              Receba vagas dos supermercados, gerencie freelancers e distribua
              trabalhos de forma eficiente.
            </p>
            <Link href="/login/agency">
              <button className={styles.button}>Entrar</button>
            </Link>
          </div>

          {/* Card 3: Freelancer */}
          <div className={styles.card}>
            <h3>Freelancer</h3>
            <p>
              Acesse sua conta, visualize vagas disponíveis e gerencie seus
              pagamentos.
            </p>
            <Link href="/login/freelancer">
              <button className={styles.button}>Entrar</button>
            </Link>
          </div>
        </section>

        <footer className={styles.footer}>
          <p>
            &copy; {new Date().getFullYear()} WorkFlow. Todos os direitos
            reservados.
          </p>
        </footer>
      </main>
    </>
  );
}
