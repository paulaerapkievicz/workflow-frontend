import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import DateRangeQuickFilter from "@/src/components/DateRangeQuickFilter";
import CollapsibleFilterBar from "@/src/components/panel/CollapsibleFilterBar";
import CategoryBranchFilter, { BranchOption } from "@/src/components/freelancer/CategoryBranchFilter";
import panel from "@/styles/panel.module.scss";
import styles from "@/styles/dashboard.module.scss";
import { getJobs, getAvailableJobs, Job, formatShifts, minutesToHours } from "@/src/services/jobService";
import {
  getFreelancerReport, getFreelancerOutcomes, FreelancerReport, FreelancerOutcomes,
  FreelancerOutcome, FreelancerPaymentStatus, FREELANCER_OUTCOME_LABELS, PAYMENT_STATUS_FILTER_LABELS,
} from "@/src/services/billingService";
import { getFreelancerReputation, FreelancerReputation as Reputation } from "@/src/services/reviewService";
import FreelancerReputation from "@/src/components/FreelancerReputation";
import HelpHint from "@/src/components/HelpHint";
import { useAuth } from "@/src/hooks/useAuth";
import { useDateRangeFilter } from "@/src/hooks/useDateRangeFilter";
import { inDateRange, dateRangeLabel } from "@/src/lib/dateRange";
import { fmtDate, fmtTime, isoDateBR } from "@/src/lib/datetime";

const OUTCOME_TILES: FreelancerOutcome[] = ["accepted", "active", "completed", "withdrawnEarly", "abandoned"];

function Dashboard() {
  const { profile } = useAuth();
  const freelancerId = (profile as { id?: string } | null)?.id ?? "";
  const [jobs, setJobs] = useState<Job[]>([]);
  const [report, setReport] = useState<FreelancerReport | null>(null);
  const [outcomes, setOutcomes] = useState<FreelancerOutcomes | null>(null);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [range, setRange] = useDateRangeFilter("freelancer-dashboard-daterange", { preset: "mes" });
  const [categoryId, setCategoryId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<FreelancerPaymentStatus | "">("");
  const [outcomeFilter, setOutcomeFilter] = useState<FreelancerOutcome | "">("");

  useEffect(() => {
    getJobs().then(setJobs).catch(() => {});
    getFreelancerReport().then(setReport).catch(() => {});
    getFreelancerOutcomes().then(setOutcomes).catch(() => {});
    getAvailableJobs().then((list) => setAvailableCount(list.length)).catch(() => {});
  }, []);

  useEffect(() => {
    if (freelancerId) getFreelancerReputation(freelancerId).then(setReputation).catch(() => {});
  }, [freelancerId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

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

  const earnedInPeriod = (report?.items ?? [])
    .filter((i) => inDateRange(i.date, range))
    .reduce((s, i) => s + Number(i.amount ?? 0), 0);
  const periodLabel = range.preset === "todas" ? "todas as datas" : dateRangeLabel(range);

  const branches: BranchOption[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of report?.items ?? []) if (i.branchId && i.branchName) map.set(i.branchId, i.branchName);
    for (const i of outcomes?.items ?? []) if (i.branchId && i.branchName) map.set(i.branchId, i.branchName);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [report, outcomes]);

  const paymentStatusByJob = useMemo(() => {
    const map = new Map<string, FreelancerPaymentStatus | null>();
    for (const i of report?.items ?? []) map.set(i.jobId, i.paymentStatus);
    return map;
  }, [report]);

  const filteredOutcomeItems = useMemo(
    () =>
      (outcomes?.items ?? [])
        .filter((i) => inDateRange(i.date, range))
        .filter((i) => !categoryId || i.categoryId === categoryId)
        .filter((i) => !branchId || i.branchId === branchId),
    [outcomes, range, categoryId, branchId]
  );

  const counts = useMemo(() => {
    const c: Record<FreelancerOutcome, number> = {
      accepted: 0, active: 0, completed: 0, abandoned: 0, withdrawnEarly: 0,
    };
    for (const i of filteredOutcomeItems) c[i.outcome]++;
    return c;
  }, [filteredOutcomeItems]);

  const workedHours = useMemo(
    () =>
      (report?.items ?? [])
        .filter((i) => inDateRange(i.date, range))
        .filter((i) => !categoryId || i.categoryId === categoryId)
        .filter((i) => !branchId || i.branchId === branchId)
        .reduce((s, i) => s + i.workedHours, 0),
    [report, range, categoryId, branchId]
  );

  const rows = useMemo(
    () =>
      filteredOutcomeItems
        .filter((i) => !outcomeFilter || i.outcome === outcomeFilter)
        .filter((i) => !paymentStatus || paymentStatusByJob.get(i.jobId) === paymentStatus),
    [filteredOutcomeItems, outcomeFilter, paymentStatus, paymentStatusByJob]
  );

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

          <div className={panel.cards}>
            <div className={panel.card}><h2>{minutesToHours(Math.round(workedHours * 60))}</h2><p>Horas trabalhadas</p></div>
            <div className={panel.card} style={{ position: "relative" }}>
              <div style={{ position: "absolute", top: "0.9rem", right: "0.9rem" }}>
                <HelpHint
                  text={`Baseado nas horas já trabalhadas e aprovadas no período selecionado (${periodLabel}).`}
                />
              </div>
              <h2>R$ {earnedInPeriod.toFixed(2)}</h2>
              <p>Ganhos Previstos</p>
            </div>
          </div>

          <CollapsibleFilterBar>
            <DateRangeQuickFilter value={range} onChange={setRange} presets={["hoje", "semana", "mes", "custom", "todas"]} />
            <CategoryBranchFilter
              categoryId={categoryId} onCategoryChange={setCategoryId}
              branchId={branchId} onBranchChange={setBranchId}
              branches={branches}
            />
            <label className={panel.filterField}>
              <span>Situação do pagamento</span>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as FreelancerPaymentStatus | "")}>
                <option value="">Todas</option>
                {Object.entries(PAYMENT_STATUS_FILTER_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
          </CollapsibleFilterBar>

          <div className={panel.cards}>
            {OUTCOME_TILES.map((o) => (
              <button
                key={o}
                type="button"
                className={panel.card}
                style={{
                  cursor: "pointer",
                  textAlign: "left",
                  border: outcomeFilter === o ? "2px solid var(--primary)" : undefined,
                }}
                onClick={() => setOutcomeFilter((v) => (v === o ? "" : o))}
              >
                <h2>{counts[o]}</h2>
                <p>{FREELANCER_OUTCOME_LABELS[o]}</p>
              </button>
            ))}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className={panel.table}>
              <thead><tr><th>Data</th><th>Vaga</th><th>Função</th><th>Loja</th><th>Desfecho</th></tr></thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={`${i.jobId}-${i.outcome}`}>
                    <td>{fmtDate(i.date)}</td>
                    <td>{i.title}</td>
                    <td>{i.categoryName ?? "—"}</td>
                    <td>{i.supermarketName ?? "—"}{i.branchName ? ` · ${i.branchName}` : ""}</td>
                    <td>{FREELANCER_OUTCOME_LABELS[i.outcome]}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5}>Nada neste filtro.</td></tr>}
              </tbody>
            </table>
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
