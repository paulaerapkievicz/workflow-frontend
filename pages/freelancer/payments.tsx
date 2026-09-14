import { Fragment, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import DateRangeQuickFilter from "@/src/components/DateRangeQuickFilter";
import CategoryBranchFilter, { BranchOption } from "@/src/components/freelancer/CategoryBranchFilter";
import JobMovementsTable from "@/src/components/JobMovementsTable";
import panel from "@/styles/panel.module.scss";
import {
  getFreelancerReport, FreelancerReport, FreelancerPaymentStatus, PAYMENT_STATUS_FILTER_LABELS,
} from "@/src/services/billingService";
import { useDateRangeFilter } from "@/src/hooks/useDateRangeFilter";
import { inDateRange } from "@/src/lib/dateRange";
import { fmtDate } from "@/src/lib/datetime";

const monthLabel = () => {
  const name = new Date().toLocaleDateString("pt-BR", { month: "long" });
  return name.charAt(0).toUpperCase() + name.slice(1);
};

function FreelancerPayments() {
  const [report, setReport] = useState<FreelancerReport | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [range, setRange] = useDateRangeFilter("freelancer-payments-daterange", { preset: "todas" });
  const [categoryId, setCategoryId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<FreelancerPaymentStatus | "">("");

  const load = async () => {
    setReport(await getFreelancerReport());
  };

  useEffect(() => { load().catch(() => {}); }, []);

  const monthKey = new Date().toISOString().slice(0, 7);
  const earnedMonth = (report?.items ?? [])
    .filter((i) => (i.date ?? "").slice(0, 7) === monthKey)
    .reduce((s, i) => s + Number(i.amount ?? 0), 0);

  const branches: BranchOption[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of report?.items ?? []) if (i.branchId && i.branchName) map.set(i.branchId, i.branchName);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [report]);

  const items = useMemo(
    () =>
      (report?.items ?? [])
        .filter((i) => inDateRange(i.date, range))
        .filter((i) => !categoryId || i.categoryId === categoryId)
        .filter((i) => !branchId || i.branchId === branchId)
        .filter((i) => !paymentStatus || i.paymentStatus === paymentStatus),
    [report, range, categoryId, branchId, paymentStatus]
  );

  return (
    <>
      <Head><title>Carteira | Colaborador</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Carteira</h1></header>

          <div className={panel.balanceCard}>
            <span className={panel.muted}>Ganhos Previstos [{monthLabel()}]</span>
            <strong>R$ {earnedMonth.toFixed(2)}</strong>
            <span className={panel.muted} style={{ fontSize: "0.8rem" }}>
              Baseado nas horas já trabalhadas e aprovadas. O pagamento é feito pela agência via Pix, no dia combinado.
            </span>
          </div>

          <h2 style={{ fontSize: "1.1rem" }}>Meus recebíveis</h2>

          <div className={panel.filterBar}>
            <DateRangeQuickFilter value={range} onChange={setRange} presets={["hoje", "semana", "mes", "custom", "todas"]} />
            <CategoryBranchFilter
              categoryId={categoryId} onCategoryChange={setCategoryId}
              branchId={branchId} onBranchChange={setBranchId}
              branches={branches}
            />
            <label className={panel.filterField}>
              <span>Situação</span>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as FreelancerPaymentStatus | "")}>
                <option value="">Todas</option>
                {Object.entries(PAYMENT_STATUS_FILTER_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className={panel.table}>
              <thead><tr><th>Vaga</th><th>Função</th><th>Filial</th><th>Data</th><th>Meu valor</th><th>Situação</th><th></th></tr></thead>
              <tbody>
                {items.map((i) => (
                  <Fragment key={i.jobId}>
                    <tr>
                      <td>{i.title}</td>
                      <td>{i.categoryName ?? "—"}</td>
                      <td>{i.branchName ?? "—"}</td>
                      <td>{fmtDate(i.date)}</td>
                      <td>R$ {Number(i.amount ?? 0).toFixed(2)}</td>
                      <td>
                        {i.paymentStatus && (
                          <StatusBadge
                            family="payment"
                            status={i.paymentStatus === "received" ? "settled" : "pending"}
                            label={PAYMENT_STATUS_FILTER_LABELS[i.paymentStatus]}
                          />
                        )}
                      </td>
                      <td>
                        <button
                          className={panel.ghostBtn}
                          onClick={() => setExpandedId((cur) => (cur === i.jobId ? null : i.jobId))}
                        >
                          {expandedId === i.jobId ? "Ocultar" : "Movimentações"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === i.jobId && (
                      <tr>
                        <td colSpan={7}>
                          <JobMovementsTable shifts={i.shifts} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {items.length === 0 && <tr><td colSpan={7}>Nada neste filtro.</td></tr>}
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
      <FreelancerPayments />
    </RequireAuth>
  );
}
