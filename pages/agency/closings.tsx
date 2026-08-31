import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import { getOrders } from "@/src/services/orderService";
import {
  getClosings, previewClosing, createClosing, MonthlyClosing, ClosingPreview,
  CLOSING_STATUS_LABELS,
} from "@/src/services/billingService";

const hrs = (min: number) => `${(min / 60).toFixed(1).replace(".", ",")} h`;
const money = (v: number) => `R$ ${Number(v).toFixed(2)}`;
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (ref: string | null) => {
  if (!ref) return "—";
  const [y, m] = ref.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

function ClosingsPage() {
  const [supermarkets, setSupermarkets] = useState<{ id: string; name: string }[]>([]);
  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [supermarketId, setSupermarketId] = useState("");
  const [referenceMonth, setReferenceMonth] = useState(thisMonth());
  const [preview, setPreview] = useState<ClosingPreview | null>(null);
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [orders, c] = await Promise.all([getOrders(), getClosings()]);
    const map = new Map<string, string>();
    orders.forEach((o) => o.orderSupermarket && map.set(o.orderSupermarket.id, o.orderSupermarket.name));
    setSupermarkets([...map.entries()].map(([id, name]) => ({ id, name })));
    setClosings(c);
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const canClose = useMemo(
    () => !!supermarketId && /^\d{4}-\d{2}$/.test(referenceMonth),
    [supermarketId, referenceMonth]
  );

  const doPreview = async () => {
    setMsg(null);
    setPreview(null);
    if (!canClose) return;
    try {
      setPreview(await previewClosing(supermarketId, referenceMonth));
    } catch (err) {
      setMsg({ type: "error", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    }
  };

  const doClose = async () => {
    setMsg(null);
    setBusy(true);
    try {
      await createClosing(supermarketId, referenceMonth);
      setMsg({ type: "success", text: "Fechamento gerado. A fatura foi enviada ao supermercado." });
      setPreview(null);
      await load();
    } catch (err) {
      setMsg({ type: "error", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head><title>Fechamentos | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Fechamento mensal</h1></header>
          <p className={panel.muted}>
            Consolide as vagas concluídas do mês em uma única fatura para o supermercado. O pagamento é feito no fechamento.
          </p>

          <div className={panel.card} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className={panel.filterField}>
              <label>Supermercado</label>
              <select value={supermarketId} onChange={(e) => { setSupermarketId(e.target.value); setPreview(null); }}>
                <option value="">Selecione…</option>
                {supermarkets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className={panel.filterField}>
              <label>Mês de referência</label>
              <input type="month" value={referenceMonth} onChange={(e) => { setReferenceMonth(e.target.value); setPreview(null); }} />
            </div>
            <button className={panel.ghostBtn} onClick={doPreview} disabled={!canClose}>Ver prévia</button>
            {msg && <p className={msg.type === "error" ? panel.error : panel.success} style={{ width: "100%" }}>{msg.text}</p>}
          </div>

          {preview && (
            <div className={panel.card}>
              <div className={panel.tableToolbar}>
                <strong>Prévia — {monthLabel(referenceMonth)}</strong>
                <span className={panel.muted}>
                  {preview.totals.totalJobs} vagas · {hrs(preview.totals.workedMinutes)} trabalhadas · {money(preview.totals.totalAmount)}
                </span>
              </div>
              <table className={panel.table}>
                <thead><tr><th>Vaga</th><th>Horas trab.</th><th>Valor</th></tr></thead>
                <tbody>
                  {preview.jobs.map((j) => (
                    <tr key={j.id}>
                      <td>{j.title}</td>
                      <td>{j.workedMinutes != null ? hrs(j.workedMinutes) : "—"}</td>
                      <td>{money(Number(j.grossAmount ?? 0))}</td>
                    </tr>
                  ))}
                  {preview.jobs.length === 0 && <tr><td colSpan={3}>Nenhuma vaga concluída não faturada neste período.</td></tr>}
                </tbody>
              </table>
              <button className={panel.primaryBtn} onClick={doClose} disabled={busy || preview.jobs.length === 0}>
                {busy ? "Fechando…" : "Fechar o mês e faturar"}
              </button>
            </div>
          )}

          <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>Fechamentos gerados</h2>
          <table className={panel.table}>
            <thead><tr><th>Mês</th><th>Supermercado</th><th>Vagas</th><th>Horas trab.</th><th>Valor</th><th>Status</th></tr></thead>
            <tbody>
              {closings.map((c) => (
                <tr key={c.id}>
                  <td>{monthLabel(c.referenceMonth)}</td>
                  <td>{c.invoiceSupermarket?.name ?? "—"}</td>
                  <td>{c.totalJobs ?? "—"}</td>
                  <td>{c.workedMinutes != null ? hrs(c.workedMinutes) : "—"}</td>
                  <td>{money(c.totalAmount)}</td>
                  <td><span className={panel.badge}>{CLOSING_STATUS_LABELS[c.status]}</span></td>
                </tr>
              ))}
              {closings.length === 0 && <tr><td colSpan={6}>Nenhum fechamento ainda.</td></tr>}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="agency">
      <ClosingsPage />
    </RequireAuth>
  );
}
