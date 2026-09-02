import { useEffect, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import { getJobs, Job } from "@/src/services/jobService";
import { getMyPayments, Payment } from "@/src/services/paymentService";
import { useAuth } from "@/src/hooks/useAuth";

function Dashboard() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    getJobs().then(setJobs).catch(() => {});
    getMyPayments().then(setPayments).catch(() => {});
  }, []);

  const balance = Number((profile as { availableBalance?: number } | null)?.availableBalance ?? 0);
  const active = jobs.filter((j) => ["accepted", "in_progress"].includes(j.status)).length;
  const earned = payments
    .filter((p) => p.status === "settled")
    .reduce((s, p) => s + Number(p.freelancerAmount ?? 0), 0);

  return (
    <>
      <Head><title>Dashboard | Colaborador</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Painel do Colaborador</h1></header>
          <div className={panel.cards}>
            <div className={panel.card}><h2>R$ {balance.toFixed(2)}</h2><p>Saldo disponível</p></div>
            <div className={panel.card}><h2>{active}</h2><p>Trabalhos ativos</p></div>
            <div className={panel.card}><h2>R$ {earned.toFixed(2)}</h2><p>Total recebido</p></div>
          </div>
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="freelancer">
      <Dashboard />
    </RequireAuth>
  );
}
