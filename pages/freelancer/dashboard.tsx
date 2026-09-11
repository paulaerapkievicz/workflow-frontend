import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import styles from "@/styles/dashboard.module.scss";
import { getJobs, Job, formatShifts, minutesToHours } from "@/src/services/jobService";
import { getMyPayments, Payment } from "@/src/services/paymentService";
import { getFreelancerReputation, FreelancerReputation as Reputation } from "@/src/services/reviewService";
import FreelancerReputation from "@/src/components/FreelancerReputation";
import { useAuth } from "@/src/hooks/useAuth";

function Dashboard() {
  const { profile } = useAuth();
  const freelancerId = (profile as { id?: string } | null)?.id ?? "";
  const [jobs, setJobs] = useState<Job[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    getJobs().then(setJobs).catch(() => {});
    getMyPayments().then(setPayments).catch(() => {});
  }, []);

  useEffect(() => {
    if (freelancerId) getFreelancerReputation(freelancerId).then(setReputation).catch(() => {});
  }, [freelancerId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const balance = Number((profile as { availableBalance?: number } | null)?.availableBalance ?? 0);
  const active = jobs.filter((j) => ["accepted", "in_progress"].includes(j.status)).length;
  const currentJob = jobs.find((j) => j.status === "in_progress") ?? null;
  const nextJob = jobs
    .filter((j) => j.status === "accepted")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] ?? null;

  const monthKey = new Date().toISOString().slice(0, 7);
  const earnedMonth = payments
    .filter((p) => p.status === "settled" && (p.createdAt ?? "").slice(0, 7) === monthKey)
    .reduce((s, p) => s + Number(p.freelancerAmount ?? 0), 0);

  const openShift = currentJob
    ? [...(currentJob.shifts ?? [])].sort((a, b) => a.position - b.position).find((s) => s.status === "in_progress")
    : null;
  const elapsed = openShift?.checkInAt
    ? Math.max(0, Math.round((now - new Date(openShift.checkInAt).getTime()) / 60000))
    : null;

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
            <div className={panel.card}><h2>R$ {earnedMonth.toFixed(2)}</h2><p>Ganhos este mês</p></div>
          </div>

          <div className={styles.miniGrid}>
            {currentJob ? (
              <div className={styles.highlightCard}>
                <h3>Turno em andamento</h3>
                <p className={panel.muted}>
                  {currentJob.jobSupermarket?.name ?? "—"}{currentJob.jobBranch?.name ? ` — ${currentJob.jobBranch.name}` : ""}
                </p>
                <p className={panel.muted}>{formatShifts(currentJob.shifts)}</p>
                {elapsed != null && <strong>{Math.floor(elapsed / 60)}h{String(elapsed % 60).padStart(2, "0")} trabalhadas</strong>}
                <Link href="/freelancer/jobs" className={panel.linkBtn}>Ir para o ponto</Link>
              </div>
            ) : nextJob ? (
              <div className={styles.highlightCard}>
                <h3>Próxima vaga aceita</h3>
                <p className={panel.muted}>
                  {nextJob.jobSupermarket?.name ?? "—"}{nextJob.jobBranch?.name ? ` — ${nextJob.jobBranch.name}` : ""}
                </p>
                <p className={panel.muted}>{formatShifts(nextJob.shifts)} · {minutesToHours(nextJob.contractedMinutes)}</p>
                <Link href="/freelancer/jobs" className={panel.linkBtn}>Ver detalhes</Link>
              </div>
            ) : (
              <div className={styles.highlightCard}>
                <h3>Nenhuma vaga em andamento</h3>
                <p className={panel.muted}>Confira as vagas disponíveis pra você.</p>
                <Link href="/freelancer" className={panel.linkBtn}>Ver vagas disponíveis</Link>
              </div>
            )}

            {reputation && (
              <div className={styles.highlightCard}>
                <h3>Sua reputação</h3>
                <FreelancerReputation reputation={reputation} compact />
              </div>
            )}
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
