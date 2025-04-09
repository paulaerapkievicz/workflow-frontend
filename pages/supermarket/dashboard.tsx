import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Sidebar from "@/src/components/supermarket/Sidebar";
import styles from "@/styles/supermarketDashboard.module.scss";

export default function SupermarketDashboard() {
  const router = useRouter();

  // Simulações de dados (substituir depois por API real)
  const [metrics, setMetrics] = useState({
    vagasAbertas: 12,
    vagasEmExecucao: 7,
    faturamento: 8500,
    filiais: 3,
  });

  useEffect(() => {
    // Futuro: buscar métricas da API
    // fetch("/api/supermarket/metrics").then(...)

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
              <h2>{metrics.vagasAbertas}</h2>
              <p>Vagas Abertas</p>
            </div>

            <div className={styles.card}>
              <h2>{metrics.vagasEmExecucao}</h2>
              <p>Vagas em Execução</p>
            </div>

            <div className={styles.card}>
              <h2>R$ {metrics.faturamento.toLocaleString("pt-BR")}</h2>
              <p>Faturamento Total</p>
            </div>

            <div className={styles.card}>
              <h2>{metrics.filiais}</h2>
              <p>Filiais Ativas</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
