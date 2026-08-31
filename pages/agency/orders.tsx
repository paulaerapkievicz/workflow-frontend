import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/agency/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import panel from "@/styles/panel.module.scss";
import { getOrders, Order, ORDER_STATUS_LABELS, orderProgress } from "@/src/services/orderService";
import { formatShifts, minutesToHours } from "@/src/services/jobService";

function AgencyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [detail, setDetail] = useState<Order | null>(null);

  useEffect(() => {
    getOrders().then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const rows = useMemo(
    () => (onlyOpen ? orders.filter((o) => ["open", "in_progress"].includes(o.status)) : orders),
    [orders, onlyOpen]
  );

  return (
    <>
      <Head><title>Pedidos | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Pedidos dos supermercados</h1></header>
          <p className={panel.muted}>Acompanhe a demanda de vagas e quantas já foram preenchidas pela sua rede.</p>

          <label className={panel.toggleRow}>
            <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
            Mostrar apenas pedidos abertos / em andamento
          </label>

          {loading ? (
            <p>Carregando…</p>
          ) : (
            <table className={panel.table}>
              <thead>
                <tr><th>Data</th><th>Supermercado</th><th>Filial</th><th>Vagas</th><th>Preenchidas</th><th>Concluídas</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const p = orderProgress(o);
                  return (
                    <tr key={o.id}>
                      <td>{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                      <td>{o.orderSupermarket?.name ?? "—"}</td>
                      <td>{o.orderBranch?.name ?? "—"}</td>
                      <td>{p.total}</td>
                      <td>{p.filled}</td>
                      <td>{p.done}</td>
                      <td><span className={panel.badge}>{ORDER_STATUS_LABELS[o.status]}</span></td>
                      <td><button className={panel.ghostBtn} onClick={() => setDetail(o)}>Ver vagas</button></td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={8}>Nenhum pedido.</td></tr>}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {detail && (
        <Modal title={`Pedido — ${detail.orderSupermarket?.name ?? ""}`} onClose={() => setDetail(null)}>
          <table className={panel.table}>
            <thead><tr><th>Vaga</th><th>Função</th><th>Turnos</th><th>Horas</th><th>Freelancer</th><th>Status</th></tr></thead>
            <tbody>
              {(detail.orderJobs ?? []).map((j) => (
                <tr key={j.id}>
                  <td>{j.title}</td>
                  <td>{j.jobCategory?.name ?? "—"}</td>
                  <td>{formatShifts(j.shifts)}</td>
                  <td>{minutesToHours(j.contractedMinutes)}</td>
                  <td>{j.assignedFreelancer?.name ?? "—"}</td>
                  <td><StatusBadge status={j.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
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
