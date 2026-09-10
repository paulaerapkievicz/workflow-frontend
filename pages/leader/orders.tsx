import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/leader/Sidebar";
import RevokedNotice from "@/src/components/leader/RevokedNotice";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import panel from "@/styles/panel.module.scss";
import api from "@/src/services/api";
import {
  getOrders, Order, ORDER_STATUS_LABELS, orderProgress, jobWasAbandoned, orderBranchNames,
} from "@/src/services/orderService";
import {
  formatShifts, formatShiftPeriods, minutesToHours, releaseJob, registerNoShow,
  forceCheckoutJob, reassignJob, agencyStartBreak, agencyEndBreak, hasOpenBreak,
  totalBreakMinutes, Job,
} from "@/src/services/jobService";
import { fmtTime, fmtDateTime } from "@/src/lib/datetime";
import { getCategories, Category } from "@/src/services/categoryService";
import { getAgencySettings, AgencySettings } from "@/src/services/agencySettingsService";
import { AgencyFreelancer } from "@/src/services/agencyService";
import { useAuth } from "@/src/hooks/useAuth";
import JobManageModal from "@/src/components/agency/JobManageModal";
import FreelancerChip, { FreelancerProfileBody } from "@/src/components/FreelancerChip";

const EVENT_LABELS: Record<string, string> = {
  "check-in": "Check-in", "check-out": "Check-out", "break-start": "Pausa",
  "break-end": "Retomada", "forced-checkout": "Ação da agência", withdrawn: "Saída/troca",
  "no-show": "Falta",
};

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

function LeaderOrdersPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [freelancers, setFreelancers] = useState<AgencyFreelancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [manageJob, setManageJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [profileFreelancer, setProfileFreelancer] = useState<NonNullable<Job["assignedFreelancer"]> | null>(null);
  const [reassignTarget, setReassignTarget] = useState<Job | null>(null);
  const [reassignFreelancerId, setReassignFreelancerId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [reassignError, setReassignError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, c] = await Promise.all([getOrders(), getCategories()]);
      setOrders(o);
      setCategories(c);
      try { setSettings(await getAgencySettings()); } catch { /* ignore */ }
      try { setFreelancers((await api.get("/freelancers")).data as AgencyFreelancer[]); } catch { /* ignore */ }
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openReassign = (j: Job) => {
    setReassignTarget(j);
    setReassignFreelancerId("");
    setReassignReason("");
    setReassignError(null);
  };

  const confirmReassign = async () => {
    if (!reassignTarget || !reassignFreelancerId) return;
    setReassignError(null);
    try {
      await reassignJob(reassignTarget.id, reassignFreelancerId, reassignReason || undefined);
      setReassignTarget(null);
      await load();
    } catch (err) {
      setReassignError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao trocar colaborador." : "Erro ao trocar colaborador.");
    }
  };

  const rows = useMemo(
    () => (onlyOpen ? orders.filter((o) => ["open", "in_progress"].includes(o.status)) : orders),
    [orders, onlyOpen]
  );
  const detail = orders.find((o) => o.id === detailId) ?? null;

  const act = async (jobId: string, fn: () => Promise<unknown>) => {
    setBusy(jobId);
    try { await fn(); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
    finally { setBusy(null); }
  };

  if ((profile as { active?: boolean } | null)?.active === false) return <RevokedNotice />;

  return (
    <>
      <Head><title>Convocações | Líder</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Convocações dos supermercados</h1></header>
          <p className={panel.muted}>
            Acompanhe a demanda do seu grupo, o preenchimento pela rede e libere/repasse vagas quando necessário.
          </p>

          <label className={panel.toggleRow}>
            <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
            Mostrar apenas pedidos abertos / em andamento
          </label>

          {loading ? (
            <p>Carregando…</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className={panel.table}>
                <thead>
                  <tr><th>Data</th><th>Supermercado</th><th>Filial</th><th>Vagas</th><th>Preenchidas</th><th>Concluídas</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {rows.map((o) => {
                    const p = orderProgress(o);
                    const abandoned = (o.orderJobs ?? []).some(jobWasAbandoned);
                    return (
                      <tr key={o.id}>
                        <td>{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                        <td>{o.orderSupermarket?.name ?? "—"}</td>
                        <td>{orderBranchNames(o)}</td>
                        <td>{p.total}</td>
                        <td>{p.filled}</td>
                        <td>{p.done}</td>
                        <td>
                          <span className={panel.badge}>{ORDER_STATUS_LABELS[o.status]}</span>
                          {abandoned && <span className={`${panel.badge} ${panel.badgeCanceled}`} style={{ marginLeft: 6 }}>desistência</span>}
                        </td>
                        <td><button className={panel.ghostBtn} onClick={() => setDetailId(o.id)}>Ver vagas</button></td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && <tr><td colSpan={8} className={panel.muted}>Nenhum pedido.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {detail && (
        <Modal title={`Pedido — ${detail.orderSupermarket?.name ?? ""}`} onClose={() => setDetailId(null)}>
          <div style={{ overflowX: "auto" }}>
            <table className={panel.table}>
              <thead><tr><th>Vaga</th><th>Filial</th><th>Função</th><th>Turno</th><th>Horário</th><th>Colaborador</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {(detail.orderJobs ?? []).flatMap((j) => [
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
                      {j.status !== "canceled" && (
                        <button className={panel.ghostBtn} onClick={() => setManageJob(j)}>Gerenciar</button>
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
                          <button className={panel.ghostBtn} disabled={busy === j.id} onClick={() => openReassign(j)}>
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
                    <td colSpan={8} style={{ background: "var(--surface-2)" }}>
                      <details>
                        <summary style={{ cursor: "pointer", fontSize: "0.85rem" }}>Movimentações</summary>
                        <MovementLog job={j} />
                      </details>
                    </td>
                  </tr>,
                ])}
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
        <Modal title={`Trocar colaborador — ${reassignTarget.title}`} onClose={() => setReassignTarget(null)}>
          <div className={panel.form}>
            <p className={panel.muted}>
              Colaborador atual: <strong>{reassignTarget.assignedFreelancer?.name ?? "—"}</strong>.
              {" "}Se ele já tiver trabalhado parte do turno, essas horas ficam registradas pra ele e o
              restante vira uma vaga nova já atribuída ao novo colaborador escolhido.
            </p>
            <label>Novo colaborador</label>
            <select value={reassignFreelancerId} onChange={(e) => setReassignFreelancerId(e.target.value)}>
              <option value="">Selecione…</option>
              {freelancers
                .filter((f) => f.id !== reassignTarget.assignedFreelancer?.id)
                .map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <label>Motivo (opcional)</label>
            <input value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} />
            {reassignError && <p className={panel.error}>{reassignError}</p>}
            <button className={panel.primaryBtn} onClick={confirmReassign} disabled={!reassignFreelancerId}>
              Trocar
            </button>
          </div>
        </Modal>
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
    <RequireAuth role="leader">
      <LeaderOrdersPage />
    </RequireAuth>
  );
}
