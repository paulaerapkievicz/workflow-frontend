import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import panel from "@/styles/panel.module.scss";
import {
  getOrders, Order, ORDER_STATUS_LABELS, orderProgress, jobWasAbandoned, orderBranchNames,
} from "@/src/services/orderService";
import { formatShifts, formatShiftPeriods, minutesToHours, releaseJob, registerNoShow, Job } from "@/src/services/jobService";
import { getCategories, Category } from "@/src/services/categoryService";
import { getAgencySettings, AgencySettings } from "@/src/services/agencySettingsService";
import JobManageModal from "@/src/components/agency/JobManageModal";

function AgencyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [manageJob, setManageJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, c] = await Promise.all([getOrders(), getCategories()]);
      setOrders(o);
      setCategories(c);
      try { setSettings(await getAgencySettings()); } catch { /* ignore */ }
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

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

  return (
    <>
      <Head><title>Pedidos | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Pedidos dos supermercados</h1></header>
          <p className={panel.muted}>
            Acompanhe a demanda, o preenchimento pela sua rede e libere/repasse vagas quando necessário.
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
                {(detail.orderJobs ?? []).map((j) => (
                  <tr key={j.id}>
                    <td>{j.title}{jobWasAbandoned(j) && <span className={`${panel.badge} ${panel.badgeCanceled}`} style={{ marginLeft: 6 }}>desistência</span>}</td>
                    <td>{j.jobBranch?.name ?? "—"}</td>
                    <td>{j.jobCategory?.name ?? "—"}</td>
                    <td>{formatShiftPeriods(j)}</td>
                    <td>{formatShifts(j.shifts)} · {minutesToHours(j.contractedMinutes)}</td>
                    <td>{j.assignedFreelancer?.name ?? "—"}</td>
                    <td><StatusBadge status={j.status} /></td>
                    <td>
                      {!["completed", "canceled"].includes(j.status) && (
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
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    <RequireAuth role="agency">
      <AgencyOrdersPage />
    </RequireAuth>
  );
}
