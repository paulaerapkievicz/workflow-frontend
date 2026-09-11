import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import styles from "@/styles/dashboard.module.scss";
import {
  getJobs, Job, JobStatus, STATUS_LABELS, formatShifts, isExpiredUnfilled,
  releaseJob, registerNoShow, closeUnfilledJob,
} from "@/src/services/jobService";
import { getMyFreelancers, AgencyFreelancer } from "@/src/services/agencyService";
import { getCategories, Category } from "@/src/services/categoryService";
import { getAgencySettings, AgencySettings } from "@/src/services/agencySettingsService";
import { listAlerts, JobAlert } from "@/src/services/alertService";
import { usePendingCounts } from "@/src/hooks/usePendingCounts";
import { useAuth } from "@/src/hooks/useAuth";
import DateRangeQuickFilter from "@/src/components/DateRangeQuickFilter";
import { useDateRangeFilter } from "@/src/hooks/useDateRangeFilter";
import { inDateRange } from "@/src/lib/dateRange";
import KpiDonutCard from "@/src/components/dashboard/KpiDonutCard";
import LiveFeed, { FeedEvent } from "@/src/components/dashboard/LiveFeed";
import FreelancerChip from "@/src/components/FreelancerChip";
import ReassignModal from "@/src/components/agency/ReassignModal";
import JobManageModal from "@/src/components/agency/JobManageModal";
import { DonutSegment } from "@/src/components/DonutChart";

type Problem = "atraso" | "vaga" | null;

const LATE_OR_NO_SHOW: JobAlert["type"][] = ["late_checkin", "no_show"];

const EVENT_LABELS: Record<string, string> = {
  "check-in": "fez check-in",
  "check-out": "finalizou o turno",
  "break-start": "pausou o ponto",
  "break-end": "retomou o ponto",
  "forced-checkout": "teve o checkout forçado pela agência",
  withdrawn: "saiu da vaga",
  "no-show": "foi marcado como falta",
};

/** Bolinha de status da linha (verde = em loja, amarelo = aguardando, vermelho = ocorrência aberta). */
function StatusDot({ job, hasIssue }: { job: Job; hasIssue: boolean }) {
  const status = hasIssue ? "problem" : job.status === "in_progress" ? "ok" : "waiting";
  const title = hasIssue ? "Ocorrência aberta" : job.status === "in_progress" ? "Em loja" : STATUS_LABELS[job.status];
  return <span className={styles.statusDot} data-status={status} title={title} />;
}

function WhatsAppLink({ phone }: { phone?: string | null }) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return (
    <a
      className={styles.whatsappLink}
      href={`https://wa.me/${withCountry}`}
      target="_blank"
      rel="noreferrer"
      title="Chamar no WhatsApp"
      onClick={(e) => e.stopPropagation()}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.42 1.26 4.86L2 22l5.34-1.28a9.9 9.9 0 0 0 4.7 1.19h.01c5.5 0 9.96-4.46 9.96-9.96C22 6.46 17.54 2 12.04 2Zm5.8 14.13c-.24.68-1.4 1.3-1.93 1.36-.5.06-1.03.09-3.3-.7-2.78-.98-4.56-3.82-4.7-4-.14-.18-1.13-1.5-1.13-2.87s.72-2.03.98-2.3c.25-.28.55-.35.73-.35h.53c.17 0 .4-.06.62.48.24.58.8 2 .87 2.14.07.15.12.32.02.5-.1.19-.15.3-.3.46-.14.17-.3.37-.43.5-.14.14-.29.29-.13.57.17.28.75 1.23 1.6 2 1.1.98 2.03 1.28 2.32 1.42.28.14.45.12.62-.07.17-.2.72-.84.91-1.12.19-.28.38-.24.63-.14.26.1 1.64.77 1.92.91.28.14.47.21.53.33.07.12.07.68-.17 1.36Z" />
      </svg>
    </a>
  );
}

function AgencyDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const agencyId = (profile as { id?: string } | null)?.id ?? "";
  const pendingCounts = usePendingCounts("agency");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [freelancers, setFreelancers] = useState<AgencyFreelancer[]>([]);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [range, setRange] = useDateRangeFilter("agency-dashboard-daterange", { preset: "hoje" });
  const [supermarketFilter, setSupermarketFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "">("");
  const [activeProblem, setActiveProblem] = useState<Problem>(null);

  const [manageJob, setManageJob] = useState<Job | null>(null);
  const [reassignTarget, setReassignTarget] = useState<Job | null>(null);

  const load = useCallback(async () => {
    try {
      const [j, c] = await Promise.all([getJobs(), getCategories()]);
      setJobs(j);
      setCategories(c);
      try { setSettings(await getAgencySettings()); } catch { /* ignore */ }
      try { setAlerts(await listAlerts()); } catch { /* ignore */ }
      if (agencyId) { try { setFreelancers(await getMyFreelancers(agencyId)); } catch { /* ignore */ } }
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (jobId: string, fn: () => Promise<unknown>) => {
    setBusy(jobId);
    try { await fn(); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
    finally { setBusy(null); }
  };

  // ----- Filtros globais -----
  const supermarketOptions = useMemo(() => {
    const map = new Map<string, string>();
    jobs.forEach((j) => { if (j.jobSupermarket) map.set(j.jobSupermarket.id, j.jobSupermarket.name); });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [jobs]);

  const filteredJobs = useMemo(
    () =>
      jobs
        .filter((j) => inDateRange(j.startTime, range))
        .filter((j) => (supermarketFilter ? j.supermarketId === supermarketFilter : true))
        .filter((j) => (statusFilter ? j.status === statusFilter : true)),
    [jobs, range, supermarketFilter, statusFilter]
  );

  // ----- Ocorrências (atraso/falta) -----
  const problemJobIds = useMemo(() => {
    const ids = new Set<string>();
    alerts.forEach((a) => { if (LATE_OR_NO_SHOW.includes(a.type)) ids.add(a.jobId); });
    return ids;
  }, [alerts]);
  const anyAlertJobIds = useMemo(() => new Set(alerts.map((a) => a.jobId)), [alerts]);

  // ----- KPI 1: faturamento estimado -----
  const revenueJobs = useMemo(
    () => filteredJobs.filter((j) => j.status === "completed" && j.grossAmount != null),
    [filteredJobs]
  );
  const revenueTotal = revenueJobs.reduce((s, j) => s + Number(j.grossAmount ?? 0), 0);
  const revenueHours = revenueJobs.reduce((s, j) => s + Number(j.workedMinutes ?? 0), 0) / 60;

  // ----- KPI 2: status dos turnos -----
  const shiftStatusSet = useMemo(
    () => filteredJobs.filter((j) => ["accepted", "in_progress", "completed"].includes(j.status)),
    [filteredJobs]
  );
  const lateCount = shiftStatusSet.filter((j) => problemJobIds.has(j.id)).length;

  // ----- KPI 3: preenchimento de vagas -----
  const fillableSet = useMemo(
    () => filteredJobs.filter((j) => j.status !== "canceled"),
    [filteredJobs]
  );
  const unfilledCount = fillableSet.filter((j) => j.status === "pending" && !j.freelancerId).length;

  // ----- KPI 4: saúde da documentação (foto do cadastro — não é filtrável por período) -----
  const docsTotal = freelancers.length;
  const docsProblem = Math.min(
    docsTotal,
    pendingCounts.registrationsToApprove + pendingCounts.contractsPending
  );

  // ----- Tabela dinâmica -----
  const tableRows = useMemo(() => {
    if (activeProblem === "atraso") return shiftStatusSet.filter((j) => problemJobIds.has(j.id));
    if (activeProblem === "vaga") return fillableSet.filter((j) => j.status === "pending" && !j.freelancerId);
    return filteredJobs;
  }, [activeProblem, shiftStatusSet, fillableSet, filteredJobs, problemJobIds]);

  // ----- Feed ao vivo -----
  const feedEvents = useMemo<FeedEvent[]>(() => {
    const events: FeedEvent[] = [];
    jobs.forEach((j) => {
      (j.jobLogs ?? []).forEach((l) => {
        const label = EVENT_LABELS[l.eventType];
        if (!label) return;
        const who = j.assignedFreelancer?.name ?? "Alguém";
        const where = j.jobBranch?.name ? ` na ${j.jobBranch.name}` : "";
        events.push({
          id: l.id,
          timestamp: l.timestamp,
          text: `${who} ${label}${where}`,
          tone: l.eventType === "check-in" ? "ok" : l.eventType === "no-show" ? "problem" : "neutral",
        });
      });
    });
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 25);
  }, [jobs]);

  const clearProblem = () => setActiveProblem(null);

  return (
    <>
      <Head><title>Dashboard | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Central de Comando</h1></header>

          <div className={panel.filterBar}>
            <DateRangeQuickFilter value={range} onChange={setRange} label="Vagas em" />
            <label className={panel.filterField}>
              Cliente / Loja
              <select value={supermarketFilter} onChange={(e) => setSupermarketFilter(e.target.value)}>
                <option value="">Todos</option>
                {supermarketOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <label className={panel.filterField}>
              Status do turno
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as JobStatus | "")}>
                <option value="">Todos</option>
                {(Object.keys(STATUS_LABELS) as JobStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <p>Carregando…</p>
          ) : (
            <>
              <div className={styles.kpiRow}>
                <div className={`${panel.card} ${panel.balanceCard}`}>
                  <p className={styles.kpiTitle}>Faturamento estimado</p>
                  <strong>R$ {revenueTotal.toFixed(2)}</strong>
                  <p className={panel.muted}>Baseado em {revenueHours.toFixed(1)} horas auditadas no período</p>
                </div>

                <KpiDonutCard
                  title="Status dos turnos"
                  problem={lateCount}
                  total={shiftStatusSet.length}
                  centerLabel="atrasos/faltas"
                  okLabel="Check-in OK"
                  problemLabel="Atrasos/faltas"
                  active={activeProblem === "atraso" ? "problem" : null}
                  onSegmentClick={(seg: DonutSegment) =>
                    setActiveProblem((p) => (seg === "problem" ? (p === "atraso" ? null : "atraso") : null))
                  }
                  actionText={
                    lateCount > 0
                      ? `${lateCount} ${lateCount === 1 ? "profissional" : "profissionais"} com atraso/falta. Clique para resolver.`
                      : "Nenhum atraso ou falta no período."
                  }
                />

                <KpiDonutCard
                  title="Preenchimento de vagas"
                  problem={unfilledCount}
                  total={fillableSet.length}
                  centerLabel="sem colaborador"
                  okLabel="Alocadas"
                  problemLabel="Sem alocação"
                  active={activeProblem === "vaga" ? "problem" : null}
                  onSegmentClick={(seg: DonutSegment) =>
                    setActiveProblem((p) => (seg === "problem" ? (p === "vaga" ? null : "vaga") : null))
                  }
                  actionText={
                    unfilledCount > 0
                      ? `${unfilledCount} ${unfilledCount === 1 ? "vaga aguarda" : "vagas aguardam"} envio de equipe. Clique para alocar.`
                      : "Todas as vagas do período estão cobertas."
                  }
                />

                <KpiDonutCard
                  title="Saúde da documentação"
                  problem={docsProblem}
                  total={docsTotal}
                  centerLabel="bloqueados"
                  okLabel="Docs OK"
                  problemLabel="Pendentes"
                  actionText={
                    docsProblem > 0
                      ? `${docsProblem} ${docsProblem === 1 ? "colaborador" : "colaboradores"} com pendência. Clique para auditar.`
                      : "Cadastro e contratos em dia."
                  }
                  onSegmentClick={(seg: DonutSegment) => { if (seg === "problem") router.push("/agency/freelancers"); }}
                />
              </div>

              {activeProblem && (
                <span className={styles.activeFilterChip}>
                  Filtro: {activeProblem === "atraso" ? "atrasos/faltas" : "vagas sem colaborador"}
                  <button onClick={clearProblem} aria-label="Limpar filtro">✕</button>
                </span>
              )}

              <div className={styles.bodyGrid}>
                <div className={styles.feedCard}>
                  <h2>Monitoramento ao vivo</h2>
                  <LiveFeed events={feedEvents} />
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table className={panel.table}>
                    <thead>
                      <tr>
                        <th></th><th>Colaborador</th><th>Cliente / Loja</th><th>Função &amp; horário</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((j) => (
                        <tr key={j.id}>
                          <td><StatusDot job={j} hasIssue={anyAlertJobIds.has(j.id)} /></td>
                          <td>
                            <div className={styles.contactCell}>
                              <FreelancerChip freelancer={j.assignedFreelancer} />
                              <WhatsAppLink phone={j.assignedFreelancer?.phone} />
                            </div>
                          </td>
                          <td>{j.jobSupermarket?.name ?? "—"}{j.jobBranch?.name ? ` — ${j.jobBranch.name}` : ""}</td>
                          <td>{j.jobCategory?.name ?? "—"} ({formatShifts(j.shifts)})</td>
                          <td>
                            <details className={styles.actionMenu}>
                              <summary>⋯</summary>
                              <div className={styles.actionMenuList}>
                                {j.status !== "canceled" && (
                                  <button onClick={() => setManageJob(j)}>Ver detalhes</button>
                                )}
                                {["accepted", "in_progress"].includes(j.status) && (
                                  <>
                                    <button
                                      disabled={busy === j.id}
                                      onClick={() => confirm("Repor esta vaga no pool para outro colaborador?") && act(j.id, () => releaseJob(j.id))}
                                    >
                                      Repor vaga
                                    </button>
                                    <button disabled={busy === j.id} onClick={() => setReassignTarget(j)}>
                                      Trocar colaborador
                                    </button>
                                    <button
                                      className={styles.danger}
                                      disabled={busy === j.id}
                                      onClick={() => {
                                        const r = prompt("Motivo da falta (no-show)?");
                                        if (r) act(j.id, () => registerNoShow(j.id, r));
                                      }}
                                    >
                                      Marcar falta
                                    </button>
                                  </>
                                )}
                                {isExpiredUnfilled(j) && (
                                  <button
                                    className={styles.danger}
                                    disabled={busy === j.id}
                                    onClick={() => confirm("Fechar esta vaga vencida sem colaborador?") && act(j.id, () => closeUnfilledJob(j.id))}
                                  >
                                    Fechar vaga vencida
                                  </button>
                                )}
                              </div>
                            </details>
                          </td>
                        </tr>
                      ))}
                      {tableRows.length === 0 && (
                        <tr><td colSpan={5} className={panel.muted}>Nenhuma vaga neste filtro.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {manageJob && (
        <JobManageModal job={manageJob} categories={categories} settings={settings} onClose={() => setManageJob(null)} onSaved={load} />
      )}
      {reassignTarget && (
        <ReassignModal
          job={reassignTarget}
          freelancers={freelancers}
          onClose={() => setReassignTarget(null)}
          onReassigned={load}
        />
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role={["agency", "partner"]}>
      <AgencyDashboard />
    </RequireAuth>
  );
}
