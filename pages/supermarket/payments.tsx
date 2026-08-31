import { useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/supermarket/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import {
  getBillingSummary, getClosings, payClosing, BillingSummary, MonthlyClosing,
  CLOSING_STATUS_LABELS,
} from "@/src/services/billingService";

const hrs = (h: number) => `${h.toFixed(1).replace(".", ",")} h`;
const money = (v: number) => `R$ ${Number(v).toFixed(2)}`;
const monthLabel = (ref: string) => {
  const [y, m] = ref.split("-");
  if (!y || !m) return ref;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

function BillingPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([getBillingSummary(), getClosings()]);
      setSummary(s);
      setClosings(c);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const pay = async (id: string) => {
    setBusy(id);
    try {
      await payClosing(id);
      await load();
    } catch (err) {
      alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    } finally {
      setBusy(null);
    }
  };

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
              <div className={panel.cards}>
                <div className={panel.card}><h2>{summary.totals.totalJobs}</h2><p>Vagas concluídas</p></div>
                <div className={panel.card}><h2>{hrs(summary.totals.contractedHours)}</h2><p>Horas contratadas</p></div>
                <div className={panel.card}><h2>{hrs(summary.totals.workedHours)}</h2><p>Horas trabalhadas</p></div>
                <div className={panel.card}><h2>{money(summary.totals.totalAmount)}</h2><p>Valor total</p></div>
                <div className={panel.card}><h2>{money(summary.totals.openInvoicesAmount)}</h2><p>Faturas a pagar</p></div>
              </div>

              <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>Fechamentos mensais</h2>
              <table className={panel.table}>
                <thead><tr><th>Mês</th><th>Agência</th><th>Vagas</th><th>Horas trab.</th><th>Valor</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {closings.map((c) => (
                    <tr key={c.id}>
                      <td>{c.referenceMonth ? monthLabel(c.referenceMonth) : "—"}</td>
                      <td>{c.invoiceAgency?.name ?? "—"}</td>
                      <td>{c.totalJobs ?? "—"}</td>
                      <td>{c.workedMinutes != null ? hrs(c.workedMinutes / 60) : "—"}</td>
                      <td>{money(c.totalAmount)}</td>
                      <td><span className={panel.badge}>{CLOSING_STATUS_LABELS[c.status]}</span></td>
                      <td>
                        {c.status === "pending" && (
                          <button className={panel.primaryBtn} disabled={busy === c.id} onClick={() => pay(c.id)}>
                            {busy === c.id ? "…" : "Pagar fatura"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {closings.length === 0 && <tr><td colSpan={7}>Nenhum fechamento recebido ainda.</td></tr>}
                </tbody>
              </table>

              <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>Histórico por mês e função</h2>
              {summary.months.length === 0 && <p className={panel.muted}>Ainda não há vagas concluídas.</p>}
              {summary.months.map((m) => (
                <div key={m.referenceMonth} className={panel.card} style={{ marginBottom: "1rem" }}>
                  <div className={panel.tableToolbar}>
                    <strong>{monthLabel(m.referenceMonth)}</strong>
                    <span className={panel.muted}>
                      {m.totalJobs} vagas · {hrs(m.contractedHours)} contratadas · {hrs(m.workedHours)} trabalhadas · {money(m.totalAmount)}
                    </span>
                  </div>
                  <table className={panel.table}>
                    <thead><tr><th>Função</th><th>Qtd.</th><th>Horas contratadas</th><th>Horas trabalhadas</th><th>Valor</th></tr></thead>
                    <tbody>
                      {m.byCategory.map((c) => (
                        <tr key={c.categoryId}>
                          <td>{c.categoryName}</td>
                          <td>{c.count}</td>
                          <td>{hrs(c.contractedHours)}</td>
                          <td>{hrs(c.workedHours)}</td>
                          <td>{money(c.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="supermarket">
      <BillingPage />
    </RequireAuth>
  );
}
