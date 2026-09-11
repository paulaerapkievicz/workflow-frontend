import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Sidebar from "@/src/components/supermarket/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import styles from "@/styles/dashboard.module.scss";
import { getJobs, Job } from "@/src/services/jobService";
import { getBillingSummary, BillingSummary } from "@/src/services/billingService";
import { listAlerts, JobAlert } from "@/src/services/alertService";
import KpiDonutCard from "@/src/components/dashboard/KpiDonutCard";
import DateRangeQuickFilter from "@/src/components/DateRangeQuickFilter";
import { useDateRangeFilter } from "@/src/hooks/useDateRangeFilter";
import { inDateRange } from "@/src/lib/dateRange";

const currentMonth = () => new Date().toISOString().slice(0, 7);

function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [range, setRange] = useDateRangeFilter("supermarket-dashboard-daterange", { preset: "hoje" });

  useEffect(() => {
    getJobs().then(setJobs).catch(() => {});
    getBillingSummary().then(setBilling).catch(() => {});
    listAlerts().then(setAlerts).catch(() => {});
  }, []);

  const filtered = useMemo(() => jobs.filter((j) => inDateRange(j.startTime, range)), [jobs, range]);
  const open = filtered.filter((j) => j.status === "pending").length;
  const running = filtered.filter((j) => ["accepted", "in_progress"].includes(j.status)).length;
  const completed = filtered.filter((j) => j.status === "completed").length;

  const fillable = filtered.filter((j) => j.status !== "canceled");
  const unfilled = fillable.filter((j) => j.status === "pending" && !j.freelancerId).length;

  const month = currentMonth();
  const monthTotal = (billing?.jobs ?? [])
    .filter((j) => j.referenceMonth === month)
    .reduce((s, j) => s + Number(j.amount), 0);
  const pendingInvoices = (billing?.invoices ?? []).filter((i) => i.status === "pending");
  const pendingInvoicesTotal = pendingInvoices.reduce((s, i) => s + Number(i.totalAmount), 0);

  return (
    <>
      <Head><title>Dashboard | Supermercado</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>Painel do Supermercado</h1>
          </header>

          <div className={panel.filterBar}>
            <DateRangeQuickFilter value={range} onChange={setRange} label="Vagas em" />
          </div>

          <div className={styles.kpiRow}>
            <div className={`${panel.card} ${panel.balanceCard}`}>
              <p className={styles.kpiTitle}>Faturamento do mês</p>
              <strong>R$ {monthTotal.toFixed(2)}</strong>
              <p className={panel.muted}>
                {pendingInvoices.length > 0
                  ? `${pendingInvoices.length} fatura(s) pendente(s) · R$ ${pendingInvoicesTotal.toFixed(2)}`
                  : "Nenhuma fatura pendente."}
              </p>
            </div>

            <KpiDonutCard
              title="Cobertura de vagas"
              problem={unfilled}
              total={fillable.length}
              centerLabel="sem colaborador"
              okLabel="Preenchidas"
              problemLabel="Sem colaborador"
              actionText={
                unfilled > 0
                  ? `${unfilled} ${unfilled === 1 ? "vaga" : "vagas"} no período ainda sem colaborador.`
                  : "Todas as vagas do período estão cobertas."
              }
            />

            <div className={panel.card}><h2>{open}</h2><p>Vagas disponíveis</p></div>
            <div className={panel.card}><h2>{running}</h2><p>Em andamento</p></div>
            <div className={panel.card}><h2>{completed}</h2><p>Concluídas</p></div>
          </div>

          <div className={styles.feedCard} style={{ maxWidth: 640 }}>
            <h2>Ocorrências abertas</h2>
            {alerts.length === 0 ? (
              <p className={panel.muted}>Nenhuma ocorrência aberta no momento.</p>
            ) : (
              <ul className={styles.alertList}>
                {alerts.slice(0, 5).map((a) => (
                  <li key={a.id} className={styles.alertRow}>
                    <strong>{a.typeLabel}</strong> — {a.job?.title ?? "vaga"}
                  </li>
                ))}
              </ul>
            )}
            <Link href="/supermarket/jobs" className={panel.linkBtn}>Ver todas as vagas</Link>
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
