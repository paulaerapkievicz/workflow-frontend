import { useEffect, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/supermarket/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import { getJobs, Job } from "@/src/services/jobService";
import { getMyInvoices, Invoice } from "@/src/services/paymentService";

function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    getJobs().then(setJobs).catch(() => {});
    getMyInvoices().then(setInvoices).catch(() => {});
  }, []);

  const open = jobs.filter((j) => j.status === "pending").length;
  const running = jobs.filter((j) => ["accepted", "in_progress"].includes(j.status)).length;
  const completed = jobs.filter((j) => j.status === "completed").length;
  const invoicesToPay = invoices.filter((i) => i.status === "pending").length;
  const paidTotal = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.totalAmount), 0);

  return (
    <>
      <Head><title>Dashboard | Supermercado</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>Painel do Supermercado</h1>
          </header>
          <div className={panel.cards}>
            <div className={panel.card}><h2>{open}</h2><p>Vagas disponíveis</p></div>
            <div className={panel.card}><h2>{running}</h2><p>Em andamento</p></div>
            <div className={panel.card}><h2>{completed}</h2><p>Concluídas</p></div>
            <div className={panel.card}><h2>{invoicesToPay}</h2><p>Faturas a pagar</p></div>
            <div className={panel.card}><h2>R$ {paidTotal.toFixed(2)}</h2><p>Total pago às agências</p></div>
          </div>
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="supermarket">
      <Dashboard />
    </RequireAuth>
  );
}
