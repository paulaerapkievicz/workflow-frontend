import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/supermarket/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import {
  getBillingSummary, payClosing, BillingSummary, BillingJob,
  hoursFromMin, money, monthName, CLOSING_STATUS_LABELS,
} from "@/src/services/billingService";
import { shiftLabel } from "@/src/services/shifts";

type GroupKey = "categoryName" | "branchName" | "referenceMonth" | "orderId";

const hrs = (n: number) => `${n.toFixed(1).replace(".", ",")} h`;

/** Agrupa vagas por uma chave e soma os indicadores. */
function pivot(jobs: BillingJob[], key: GroupKey, labelOf: (j: BillingJob) => string) {
  const map = new Map<string, { label: string; count: number; contractedMin: number; workedMin: number; amount: number }>();
  for (const j of jobs) {
    const k = String(j[key] ?? "—");
    if (!map.has(k)) map.set(k, { label: labelOf(j), count: 0, contractedMin: 0, workedMin: 0, amount: 0 });
    const row = map.get(k)!;
    row.count += 1;
    row.contractedMin += j.contractedMinutes;
    row.workedMin += j.workedMinutes;
    row.amount += j.amount;
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

function BillingPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [branchId, setBranchId] = useState("");
  const [month, setMonth] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [orderId, setOrderId] = useState("");

  const load = async () => {
    setLoading(true);
    try { setSummary(await getBillingSummary()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const jobs = useMemo(() => summary?.jobs ?? [], [summary]);

  const months = useMemo(
    () => [...new Set(jobs.map((j) => j.referenceMonth).filter(Boolean))].sort().reverse() as string[],
    [jobs]
  );
  const cats = useMemo(() => {
    const m = new Map<string, string>();
    jobs.forEach((j) => m.set(j.categoryId, j.categoryName));
    return [...m.entries()];
  }, [jobs]);
  const ordersOpts = useMemo(() => {
    const m = new Map<string, string>();
    jobs.forEach((j) => {
      if (j.orderId) m.set(j.orderId, `${j.branchName} · ${j.orderCreatedAt ? new Date(j.orderCreatedAt).toLocaleDateString("pt-BR") : ""}`);
    });
    return [...m.entries()];
  }, [jobs]);

  const filtered = useMemo(
    () =>
      jobs.filter(
        (j) =>
          (!branchId || j.branchId === branchId) &&
          (!month || j.referenceMonth === month) &&
          (!categoryId || j.categoryId === categoryId) &&
          (!orderId || j.orderId === orderId)
      ),
    [jobs, branchId, month, categoryId, orderId]
  );

  const kpi = useMemo(() => ({
    jobs: filtered.length,
    contracted: hoursFromMin(filtered.reduce((a, j) => a + j.contractedMinutes, 0)),
    worked: hoursFromMin(filtered.reduce((a, j) => a + j.workedMinutes, 0)),
    amount: filtered.reduce((a, j) => a + j.amount, 0),
  }), [filtered]);

  const invoices = (summary?.invoices ?? []).filter((i) => !branchId || i.branchId === branchId || i.branchId == null);

  const pay = async (id: string) => {
    setBusy(id);
    try { await payClosing(id); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
    finally { setBusy(null); }
  };

  const clearFilters = () => { setBranchId(""); setMonth(""); setCategoryId(""); setOrderId(""); };
  const anyFilter = branchId || month || categoryId || orderId;

  return (
    <>
      <Head><title>Faturamento | Supermercado</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Faturamento</h1></header>

          {loading || !summary ? (
            <p>Carregando…</p>
          ) : (
            <>
              <div className={panel.filterBar}>
                <label className={panel.filterField}>
                  <span>Escopo</span>
                  <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                    <option value="">Todas as lojas</option>
                    {summary.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </label>
                <label className={panel.filterField}>
                  <span>Mês</span>
                  <select value={month} onChange={(e) => setMonth(e.target.value)}>
                    <option value="">Todos</option>
                    {months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
                  </select>
                </label>
                <label className={panel.filterField}>
                  <span>Função</span>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">Todas</option>
                    {cats.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                </label>
                <label className={panel.filterField}>
                  <span>Pedido</span>
                  <select value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                    <option value="">Todos</option>
                    {ordersOpts.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </label>
                {anyFilter && <button className={panel.ghostBtn} onClick={clearFilters}>Limpar</button>}
              </div>

              <div className={panel.cards}>
                <div className={panel.card}><h2>{kpi.jobs}</h2><p>Vagas concluídas</p></div>
                <div className={panel.card}><h2>{hrs(kpi.contracted)}</h2><p>Horas contratadas</p></div>
                <div className={panel.card}><h2>{hrs(kpi.worked)}</h2><p>Horas trabalhadas</p></div>
                <div className={panel.card}><h2>{money(kpi.amount)}</h2><p>Valor total</p></div>
                <div className={panel.card}><h2>{money(summary.totals.openInvoicesAmount)}</h2><p>Faturas a pagar</p></div>
              </div>

              <Breakdown title="Por função" rows={pivot(filtered, "categoryName", (j) => j.categoryName)} />
              <Breakdown title="Por loja" rows={pivot(filtered, "branchName", (j) => j.branchName)} />
              <Breakdown title="Por mês" rows={pivot(filtered, "referenceMonth", (j) => monthName(j.referenceMonth))} />
              <Breakdown
                title="Por pedido"
                rows={pivot(filtered, "orderId", (j) => `${j.branchName} · ${j.orderCreatedAt ? new Date(j.orderCreatedAt).toLocaleDateString("pt-BR") : "—"}`)}
              />

              <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>Fechamentos mensais</h2>
              <div style={{ overflowX: "auto" }}>
                <table className={panel.table}>
                  <thead><tr><th>Mês</th><th>Agência</th><th>Escopo</th><th>Vagas</th><th>Horas trab.</th><th>Valor</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {invoices.map((c) => (
                      <tr key={c.id}>
                        <td>{monthName(c.referenceMonth)}</td>
                        <td>{c.agencyName ?? "—"}</td>
                        <td>{c.branchName ?? "Todas as lojas"}</td>
                        <td>{c.totalJobs}</td>
                        <td>{hrs(hoursFromMin(c.workedMinutes))}</td>
                        <td>{money(c.totalAmount)}</td>
                        <td><span className={panel.badge}>{CLOSING_STATUS_LABELS[c.status]}</span></td>
                        <td>{c.status === "pending" && (
                          <button className={panel.primaryBtn} disabled={busy === c.id} onClick={() => pay(c.id)}>
                            {busy === c.id ? "…" : "Pagar fatura"}
                          </button>
                        )}</td>
                      </tr>
                    ))}
                    {invoices.length === 0 && <tr><td colSpan={8} className={panel.muted}>Nenhum fechamento recebido.</td></tr>}
                  </tbody>
                </table>
              </div>

              <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>Detalhe das vagas ({filtered.length})</h2>
              <div style={{ overflowX: "auto" }}>
                <table className={panel.table}>
                  <thead><tr><th>Data</th><th>Vaga</th><th>Loja</th><th>Função</th><th>Turno</th><th>Colaborador</th><th>Horas</th><th>Valor</th></tr></thead>
                  <tbody>
                    {filtered.slice(0, 200).map((j) => (
                      <tr key={j.jobId}>
                        <td>{j.completedAt ? new Date(j.completedAt).toLocaleDateString("pt-BR") : "—"}</td>
                        <td>{j.title}</td>
                        <td>{j.branchName}</td>
                        <td>{j.categoryName}</td>
                        <td>{shiftLabel(j.shiftPeriod)}</td>
                        <td>{j.freelancerName ?? "—"}</td>
                        <td>{hrs(hoursFromMin(j.workedMinutes))}</td>
                        <td>{money(j.amount)}</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan={8} className={panel.muted}>Nenhuma vaga no filtro.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { label: string; count: number; contractedMin: number; workedMin: number; amount: number }[] }) {
  if (rows.length <= 1) return null;
  return (
    <div className={panel.card} style={{ marginBottom: "0.75rem" }}>
      <div className={panel.tableToolbar}><strong>{title}</strong></div>
      <div style={{ overflowX: "auto" }}>
        <table className={panel.table}>
          <thead><tr><th>{title.replace("Por ", "")}</th><th>Vagas</th><th>Horas contratadas</th><th>Horas trabalhadas</th><th>Valor</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td>{r.count}</td>
                <td>{hrs(hoursFromMin(r.contractedMin))}</td>
                <td>{hrs(hoursFromMin(r.workedMin))}</td>
                <td>{money(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth role="supermarket">
      <BillingPage />
    </RequireAuth>
  );
}
