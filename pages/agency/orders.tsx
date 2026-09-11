import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import RequirePermission from "@/src/components/RequirePermission";
import StatusBadge from "@/src/components/StatusBadge";
import panel from "@/styles/panel.module.scss";
import {
  getOrders, Order, ORDER_STATUS_LABELS, orderProgress, jobWasAbandoned, orderBranchNames,
  orderInDateRange, orderJobDateSpan,
} from "@/src/services/orderService";
import DateRangeQuickFilter from "@/src/components/DateRangeQuickFilter";
import { useDateRangeFilter } from "@/src/hooks/useDateRangeFilter";
import { inDateRange, dateRangeLabel } from "@/src/lib/dateRange";
import {
  formatShifts, formatShiftPeriods, minutesToHours, releaseJob, registerNoShow,
  forceCheckoutJob, agencyStartBreak, agencyEndBreak, hasOpenBreak,
  totalBreakMinutes, isExpiredUnfilled, closeUnfilledJob, closeExpiredUnfilled, Job,
} from "@/src/services/jobService";
import { fmtTime, fmtDateTime } from "@/src/lib/datetime";
import { getCategories, Category } from "@/src/services/categoryService";
import { getAgencySettings, AgencySettings } from "@/src/services/agencySettingsService";
import { getMyFreelancers, AgencyFreelancer } from "@/src/services/agencyService";
import { useAuth } from "@/src/hooks/useAuth";
import JobManageModal from "@/src/components/agency/JobManageModal";
import ReassignModal from "@/src/components/agency/ReassignModal";
import FreelancerChip, { FreelancerProfileBody } from "@/src/components/FreelancerChip";
import { AlertDot, AlertDots } from "@/src/components/AlertDot";
import { orderUnfilledTiers, jobUnfilledTier } from "@/src/services/unfilledAlerts";

const EVENT_LABELS: Record<string, string> = {
  "check-in": "Check-in", "check-out": "Check-out", "break-start": "Pausa",
  "break-end": "Retomada", "forced-checkout": "Ação da agência", withdrawn: "Saída/troca",
  "no-show": "Falta",
};

/** Todas as movimentações da vaga: o que foi contratado × trabalhado, cada marcação e quem fez. */
function MovementLog({ job }: { job: Job }) {
  const shifts = [...(job.shifts ?? [])].sort((a, b) => a.position - b.position);
  const brkMin = totalBreakMinutes(job.shifts);
  const logs = [...(job.jobLogs ?? [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  return (
    <div style={{ fontSize: "0.85rem", padding: "0.5rem 0.25rem" }}>
      <p className={panel.muted} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span>
          Contratado {minutesToHours(job.contractedMinutes)} · Trabalhado {minutesToHours(job.workedMinutes)}
          {brkMin > 0 ? ` · Pausa ${minutesToHours(brkMin)}` : ""}
        </span>
        {job.assignedFreelancer?.name && <FreelancerChip freelancer={job.assignedFreelancer} />}
      </p>
      {shifts.map((s, i) => (
        <div key={s.id} style={{ marginBottom: 4 }}>
          <strong>{s.label || `Turno ${i + 1}`}</strong> {fmtTime(s.startTime)}–{fmtTime(s.endTime)}
          {" · "}entrada {fmtDateTime(s.checkInAt)} · saída {fmtDateTime(s.checkOutAt)}
          {" · "}{minutesToHours(s.workedMinutes)}
          {(s.breaks ?? []).map((b) => (
            <div key={b.id} className={panel.muted} style={{ marginLeft: 12 }}>
              pausa {fmtDateTime(b.startAt)} → {b.endAt ? fmtDateTime(b.endAt) : "em aberto"}
              {b.startedBy === "agency" ? " (agência)" : ""}
            </div>
          ))}
        </div>
      ))}
      {logs.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {logs.map((l) => (
            <div key={l.id} className={panel.muted}>
              {fmtDateTime(l.timestamp)} — {EVENT_LABELS[l.eventType] ?? l.eventType}
              {l.reason ? `: ${l.reason}` : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgencyOrdersPage() {
  const { profile } = useAuth();
  const agencyId = (profile as { id?: string } | null)?.id ?? "";
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [freelancers, setFreelancers] = useState<AgencyFreelancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [range, setRange] = useDateRangeFilter("agency-orders-daterange");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [manageJob, setManageJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const alertTiers = settings?.unfilledAlertTiers ?? [];

  const [profileFreelancer, setProfileFreelancer] = useState<NonNullable<Job["assignedFreelancer"]> | null>(null);
  const [reassignTarget, setReassignTarget] = useState<Job | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, c] = await Promise.all([getOrders(), getCategories()]);
      setOrders(o);
      setCategories(c);
      try { setSettings(await getAgencySettings()); } catch { /* ignore */ }
      if (agencyId) { try { setFreelancers(await getMyFreelancers(agencyId)); } catch { /* ignore */ } }
    } finally { setLoading(false); }
  }, [agencyId]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(
    () =>
      orders
        .filter((o) => (onlyOpen ? ["open", "in_progress"].includes(o.status) : true))
        .filter((o) => orderInDateRange(o, range)),
    [orders, onlyOpen, range]
  );
  const detail = orders.find((o) => o.id === detailId) ?? null;
  const detailJobs = useMemo(() => {
    const all = detail?.orderJobs ?? [];
    if (range.preset === "todas") return { shown: all, hidden: 0 };
    const shown = all.filter((j) => inDateRange(j.startTime, range));
    return { shown, hidden: all.length - shown.length };
  }, [detail, range]);

  const act = async (jobId: string, fn: () => Promise<unknown>) => {
    setBusy(jobId);
    try { await fn(); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
    finally { setBusy(null); }
  };

  const expiredUnfilledCount = useMemo(
    () => orders.reduce((acc, o) => acc + (o.orderJobs ?? []).filter(isExpiredUnfilled).length, 0),
    [orders]
  );
  const detailExpiredCount = (detail?.orderJobs ?? []).filter(isExpiredUnfilled).length;

  const closeExpired = async (orderId?: string) => {
    const scope = orderId ? "deste pedido" : "de toda a rede";
    if (!confirm(`Fechar todas as vagas vencidas sem colaborador ${scope}? Elas passam para "cancelada".`)) return;
    setBusy(orderId ?? "__all__");
    try {
      const { closed } = await closeExpiredUnfilled(orderId);
      await load();
      alert(closed ? `${closed} vaga(s) fechada(s).` : "Nenhuma vaga vencida para fechar.");
    } catch (err) {
      alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    } finally { setBusy(null); }
  };

  return (
    <>
      <Head><title>Convocações | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Convocações dos supermercados</h1></header>
          <p className={panel.muted}>
            Acompanhe a demanda, o preenchimento pela sua rede e libere/repasse vagas quando necessário.
          </p>

          <div className={panel.filterBar}>
            <DateRangeQuickFilter value={range} onChange={setRange} label="Vagas em" />
          </div>
          <label className={panel.toggleRow}>
            <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
            Mostrar apenas pedidos abertos / em andamento
          </label>

          {expiredUnfilledCount > 0 && (
            <p className={panel.muted} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>{expiredUnfilledCount} vaga(s) de dias anteriores seguem sem colaborador.</span>
              <button className={panel.secondaryBtn} disabled={busy === "__all__"} onClick={() => closeExpired()}>
                Fechar vagas vencidas não preenchidas
              </button>
            </p>
          )}

          {loading ? (
            <p>Carregando…</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className={panel.table}>
                <thead>
                  <tr><th>Vagas em</th><th>Criado em</th><th>Supermercado</th><th>Filial</th><th>Vagas</th><th>Preenchidas</th><th>Concluídas</th><th>Status</th><th>Atenção</th><th></th></tr>
                </thead>
                <tbody>
                  {rows.map((o) => {
                    const p = orderProgress(o);
                    const abandoned = (o.orderJobs ?? []).some(jobWasAbandoned);
                    return (
                      <tr key={o.id}>
                        <td>{orderJobDateSpan(o)}</td>
                        <td>{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                        <td>{o.orderSupermarket?.name ?? "—"}</td>
                        <td>{orderBranchNames(o)}</td>
                        <td>{p.total}</td>
                        <td>{p.filled}</td>
                        <td>{p.done}</td>
                        <td>
                          <StatusBadge family="order" status={o.status} label={ORDER_STATUS_LABELS[o.status]} />
                          {abandoned && <span className={`${panel.badge} ${panel.badgeCanceled}`} style={{ marginLeft: 6 }}>desistência</span>}
                        </td>
                        <td><AlertDots tiers={orderUnfilledTiers(o, alertTiers, now)} /></td>
                        <td><button className={panel.ghostBtn} onClick={() => setDetailId(o.id)}>Ver vagas</button></td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && <tr><td colSpan={10} className={panel.muted}>Nenhum pedido.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {detail && (
        <Modal title={`Pedido — ${detail.orderSupermarket?.name ?? ""}`} onClose={() => setDetailId(null)}>
          {detailExpiredCount > 0 && (
            <p className={panel.muted} style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>{detailExpiredCount} vaga(s) vencida(s) sem colaborador neste pedido.</span>
              <button className={panel.secondaryBtn} disabled={busy === detail.id} onClick={() => closeExpired(detail.id)}>
                Fechar vagas vencidas ({detailExpiredCount})
              </button>
            </p>
          )}
          {detailJobs.hidden > 0 && (
            <p className={panel.muted} style={{ marginBottom: "0.5rem" }}>
              Mostrando só as vagas de {dateRangeLabel(range)} — {detailJobs.hidden}{" "}
              {detailJobs.hidden === 1 ? "vaga oculta" : "vagas ocultas"} de outras datas.{" "}
              <button className={panel.ghostBtn} onClick={() => setRange({ preset: "todas" })}>ver todas</button>
            </p>
          )}
          <div style={{ overflowX: "auto" }}>
            <table className={panel.table}>
              <thead><tr><th>Vaga</th><th>Filial</th><th>Função</th><th>Turno</th><th>Horário</th><th>Colaborador</th><th>Status</th><th>Atenção</th><th>Ações</th></tr></thead>
              <tbody>
                {detailJobs.shown.flatMap((j) => [
                  <tr key={j.id}>
                    <td>{j.title}{jobWasAbandoned(j) && <span className={`${panel.badge} ${panel.badgeCanceled}`} style={{ marginLeft: 6 }}>desistência</span>}</td>
                    <td>{j.jobBranch?.name ?? "—"}</td>
                    <td>{j.jobCategory?.name ?? "—"}</td>
                    <td>{formatShiftPeriods(j)}</td>
                    <td>{formatShifts(j.shifts)} · {minutesToHours(j.contractedMinutes)}</td>
                    <td>
                      <FreelancerChip
                        freelancer={j.assignedFreelancer}
                        onClick={j.assignedFreelancer ? () => setProfileFreelancer(j.assignedFreelancer!) : undefined}
                      />
                    </td>
                    <td><StatusBadge status={j.status} /></td>
                    <td>
                      {(() => {
                        const tier = jobUnfilledTier(j, alertTiers, now);
                        return tier ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <AlertDot color={tier.color} label={tier.label} blink={tier.blink} />
                            <span className={panel.muted} style={{ fontSize: "0.8rem" }}>{tier.label}</span>
                          </span>
                        ) : <span className={panel.muted}>—</span>;
                      })()}
                    </td>
                    <td>
                      {j.status !== "canceled" && (
                        <button className={panel.ghostBtn} onClick={() => setManageJob(j)}>Gerenciar</button>
                      )}
                      {isExpiredUnfilled(j) && (
                        <button className={panel.secondaryBtn} disabled={busy === j.id}
                          onClick={() => confirm("Fechar esta vaga vencida sem colaborador?") && act(j.id, () => closeUnfilledJob(j.id))}>
                          Fechar vaga
                        </button>
                      )}
                      {["accepted", "in_progress"].includes(j.status) && (
                        <>
                          <button className={panel.secondaryBtn} disabled={busy === j.id}
                            onClick={() => confirm("Liberar esta vaga do colaborador para reabrir/repassar?") && act(j.id, () => releaseJob(j.id))}>
                            Liberar
                          </button>
                          <button className={panel.secondaryBtn} disabled={busy === j.id}
                            onClick={() => {
                              const r = prompt("Motivo da falta (no-show)?");
                              if (r) act(j.id, () => registerNoShow(j.id, r));
                            }}>
                            Falta
                          </button>
                          <button className={panel.ghostBtn} disabled={busy === j.id} onClick={() => setReassignTarget(j)}>
                            Trocar colaborador
                          </button>
                        </>
                      )}
                      {j.status === "in_progress" && (
                        <>
                          {(j.breaksEnabled ?? settings?.breaksEnabled) && (
                            hasOpenBreak(j.shifts) ? (
                              <button className={panel.secondaryBtn} disabled={busy === j.id}
                                onClick={() => act(j.id, () => agencyEndBreak(j.id))}>
                                Retomar ponto
                              </button>
                            ) : (
                              <button className={panel.secondaryBtn} disabled={busy === j.id}
                                onClick={() => act(j.id, () => agencyStartBreak(j.id))}>
                                Pausar ponto
                              </button>
                            )
                          )}
                          <button className={panel.secondaryBtn} disabled={busy === j.id}
                            onClick={() => {
                              const r = prompt("Motivo do checkout forçado (ex.: colaborador sem acesso ao app, esqueceu de bater o ponto)?");
                              if (r) act(j.id, () => forceCheckoutJob(j.id, r));
                            }}>
                            Forçar checkout
                          </button>
                        </>
                      )}
                    </td>
                  </tr>,
                  <tr key={`${j.id}-mov`}>
                    <td colSpan={9} style={{ background: "var(--surface-2)" }}>
                      <details>
                        <summary style={{ cursor: "pointer", fontSize: "0.85rem" }}>Movimentações</summary>
                        <MovementLog job={j} />
                      </details>
                    </td>
                  </tr>,
                ])}
                {detailJobs.shown.length === 0 && (
                  <tr><td colSpan={9} className={panel.muted}>Nenhuma vaga neste período.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {profileFreelancer && (
        <Modal title="Colaborador alocado" onClose={() => setProfileFreelancer(null)}>
          <FreelancerProfileBody
            name={profileFreelancer.name}
            phone={profileFreelancer.phone}
            profilePhotoUrl={profileFreelancer.profilePhotoUrl}
          />
        </Modal>
      )}

      {reassignTarget && (
        <ReassignModal
          job={reassignTarget}
          freelancers={freelancers}
          onClose={() => setReassignTarget(null)}
          onReassigned={load}
        />
      )}

      {manageJob && (
        <JobManageModal
          job={manageJob}
          categories={categories}
          settings={settings}
          onClose={() => setManageJob(null)}
          onSaved={load}
        />
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role={["agency", "partner"]}>
      <RequirePermission feature="vagas">
        <AgencyOrdersPage />
      </RequirePermission>
    </RequireAuth>
  );
}
