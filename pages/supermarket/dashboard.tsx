import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Sidebar from "@/src/components/supermarket/Sidebar";
import styles from "@/styles/supermarketDashboard.module.scss";

export default function SupermarketDashboard() {
  const router = useRouter();

  useEffect(() => {
    // Se necessário, verificar login no futuro
  }, []);

  return (
    <>
      <Head>
        <title>Dashboard | Supermercado</title>
      </Head>
      <main className={styles.dashboardContainer}>
        <Sidebar />
        <section className={styles.content}>
          <header className={styles.header}>
            <h1>Bem-vindo ao Painel do Supermercado</h1>
            <p>Gerencie suas vagas, pagamentos e filiais</p>
          </header>

          <div className={styles.cards}>
            <div className={styles.card}>
              <h2>12</h2>
              <p>Vagas abertas</p>
            </div>
            <div className={styles.card}>
              <h2>R$ 8.500</h2>
              <p>Pagamentos pendentes</p>
            </div>
            <div className={styles.card}>
              <h2>5</h2>
              <p>Freelancers Favoritos</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
