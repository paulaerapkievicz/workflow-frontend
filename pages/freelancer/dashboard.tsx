import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import styles from "@/styles/dashboard.module.scss";
import { getJobs, getAvailableJobs, Job, formatShifts } from "@/src/services/jobService";
import { getMyPayments, Payment } from "@/src/services/paymentService";
import { getFreelancerReputation, FreelancerReputation as Reputation } from "@/src/services/reviewService";
import FreelancerReputation from "@/src/components/FreelancerReputation";
import { useAuth } from "@/src/hooks/useAuth";
import { fmtDate, fmtTime, isoDateBR } from "@/src/lib/datetime";

function Dashboard() {
  const { profile } = useAuth();
  const freelancerId = (profile as { id?: string } | null)?.id ?? "";
  const [jobs, setJobs] = useState<Job[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    getJobs().then(setJobs).catch(() => {});
    getMyPayments().then(setPayments).catch(() => {});
    getAvailableJobs().then((list) => setAvailableCount(list.length)).catch(() => {});
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

  const todayStr = isoDateBR(new Date());
  const isToday = (j: Job) => isoDateBR(j.startTime) === todayStr;

  // Turno de hoje ainda não iniciado — é o que dispara a notificação "Hoje, HH:MM às HH:MM…".
  const todaysJob = jobs
    .filter((j) => j.status === "accepted" && isToday(j))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] ?? null;

  // Sem nada hoje: ainda assim mostra a próxima vaga aceita (data futura), se houver.
  const nextJob = jobs
    .filter((j) => j.status === "accepted" && !isToday(j))
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
            ) : todaysJob ? (
              <div className={styles.highlightCard}>
                <h3>Hoje, {fmtTime(todaysJob.startTime)} às {fmtTime(todaysJob.endTime)}</h3>
                <p className={panel.muted}>
                  {todaysJob.jobCategory?.name ?? "Vaga"} no {todaysJob.jobSupermarket?.name ?? "—"}
                  {todaysJob.jobBranch?.name ? ` — ${todaysJob.jobBranch.name}` : ""}
                </p>
                <Link href="/freelancer/jobs" className={panel.linkBtn}>Ver vaga e fazer check-in</Link>
              </div>
            ) : (
              <div className={styles.highlightCard}>
                <h3>Você está livre hoje!</h3>
                <p className={panel.muted}>
                  {availableCount == null
                    ? "Confira as vagas disponíveis pra você."
                    : availableCount > 0
                    ? `Existem ${availableCount} vaga${availableCount === 1 ? "" : "s"} aberta${availableCount === 1 ? "" : "s"} na sua região.`
                    : "Nenhuma vaga aberta pra você no momento."}
                </p>
                {nextJob && (
                  <p className={panel.muted}>
                    Próxima vaga aceita: {fmtDate(nextJob.startTime)} · {formatShifts(nextJob.shifts)}
                  </p>
                )}
                <Link href="/freelancer" className={panel.linkBtn}>Ver vagas</Link>
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
