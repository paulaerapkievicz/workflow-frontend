import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import panel from "@/styles/panel.module.scss";
import { getOrders } from "@/src/services/orderService";
import { getBranches, Branch } from "@/src/services/branchService";
import {
  getClosings, previewClosing, createClosing, downloadClosingPdf, markClosingPaid, MonthlyClosing, ClosingPreview,
  InvoiceAdjustment, getInvoiceAdjustments, approveInvoiceAdjustment, rejectInvoiceAdjustment,
  revertInvoiceAdjustment, ADJUSTMENT_STATUS_LABELS, closingNetAmount,
  CLOSING_STATUS_LABELS, monthName, money,
} from "@/src/services/billingService";

const hrs = (min: number | null | undefined) => (min == null ? "—" : `${(min / 60).toFixed(1).replace(".", ",")} h`);
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function ClosingsPage() {
  const [supermarkets, setSupermarkets] = useState<{ id: string; name: string }[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [closings, setClosings] = useState<MonthlyClosing[]>([]);

  const [supermarketId, setSupermarketId] = useState("");
  const [branchId, setBranchId] = useState(""); // "" = toda a matriz
  const [referenceMonth, setReferenceMonth] = useState(thisMonth());
  const [preview, setPreview] = useState<ClosingPreview | null>(null);
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);

  const [adjClosing, setAdjClosing] = useState<MonthlyClosing | null>(null);
  const [adjustments, setAdjustments] = useState<InvoiceAdjustment[]>([]);
  const [adjBusy, setAdjBusy] = useState(false);
  const [adjError, setAdjError] = useState<string | null>(null);

  const load = async () => {
    const [orders, br, c] = await Promise.all([getOrders(), getBranches(), getClosings()]);
    const map = new Map<string, string>();
    orders.forEach((o) => o.orderSupermarket && map.set(o.orderSupermarket.id, o.orderSupermarket.name));
    setSupermarkets([...map.entries()].map(([id, name]) => ({ id, name })));
    setBranches(br);
    setClosings(c);
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const myBranches = useMemo(
    () => branches.filter((b) => b.supermarketId === supermarketId),
    [branches, supermarketId]
  );
  const canClose = useMemo(
    () => !!supermarketId && /^\d{4}-\d{2}$/.test(referenceMonth),
    [supermarketId, referenceMonth]
  );

  const resetPreview = () => setPreview(null);

  const doPreview = async () => {
    setMsg(null);
    setPreview(null);
    if (!canClose) return;
    try {
      setPreview(await previewClosing(supermarketId, referenceMonth, branchId || null));
    } catch (err) {
      setMsg({ type: "error", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    }
  };

  const doClose = async () => {
    setMsg(null);
    setBusy(true);
    try {
      await createClosing(supermarketId, referenceMonth, branchId || null);
      setMsg({ type: "success", text: "Fechamento gerado. A fatura foi enviada ao supermercado." });
      setPreview(null);
      await load();
    } catch (err) {
      setMsg({ type: "error", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    } finally {
      setBusy(false);
    }
  };

  const scopeLabel = branchId
    ? myBranches.find((b) => b.id === branchId)?.name ?? "filial"
    : "toda a matriz (todas as filiais)";

  const pendingCount = (c: MonthlyClosing) =>
    (c.invoiceAdjustments ?? []).filter((a) => a.status === "pending").length;

  const openAdjustments = async (c: MonthlyClosing) => {
    setAdjClosing(c);
    setAdjustments([]);
    setAdjError(null);
    try { setAdjustments(await getInvoiceAdjustments(c.id)); } catch { setAdjustments([]); }
  };

  const runAdjustment = async (fn: () => Promise<unknown>) => {
    if (!adjClosing) return;
    setAdjBusy(true);
    setAdjError(null);
    try {
      await fn();
      const [list] = await Promise.all([getInvoiceAdjustments(adjClosing.id), load()]);
      setAdjustments(list);
    } catch (err) {
      setAdjError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    } finally {
      setAdjBusy(false);
    }
  };

  const baixarPdf = async (c: MonthlyClosing) => {
    setPdfBusyId(c.id);
    try { await downloadClosingPdf(c.id, c.referenceMonth); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao baixar PDF." : "Erro ao baixar PDF."); }
    finally { setPdfBusyId(null); }
  };

  const [markPaidBusyId, setMarkPaidBusyId] = useState<string | null>(null);
  const markPaid = async (c: MonthlyClosing) => {
    if (!confirm(`Marcar a fatura de ${c.invoiceSupermarket?.name ?? "—"} (${monthName(c.referenceMonth)}) como paga? Use só depois de receber o valor por fora.`)) return;
    setMarkPaidBusyId(c.id);
    try { await markClosingPaid(c.id); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
    finally { setMarkPaidBusyId(null); }
  };

  return (
    <>
      <Head><title>Fechamentos | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Fechamento mensal</h1></header>
          <p className={panel.muted}>
            Consolide as vagas concluídas do mês em uma fatura. Feche <strong>toda a matriz</strong> de uma vez
            ou <strong>uma loja por vez</strong>. O pagamento ao supermercado é feito no fechamento.
          </p>

          <div className={panel.card} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <label className={panel.filterField}>
              <span>Supermercado (matriz)</span>
              <select value={supermarketId} onChange={(e) => { setSupermarketId(e.target.value); setBranchId(""); resetPreview(); }}>
                <option value="">Selecione…</option>
                {supermarkets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className={panel.filterField}>
              <span>Escopo</span>
              <select value={branchId} onChange={(e) => { setBranchId(e.target.value); resetPreview(); }} disabled={!supermarketId}>
                <option value="">Toda a matriz</option>
                {myBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className={panel.filterField}>
              <span>Mês de referência</span>
              <input type="month" value={referenceMonth} onChange={(e) => { setReferenceMonth(e.target.value); resetPreview(); }} />
            </label>
            <button className={panel.ghostBtn} onClick={doPreview} disabled={!canClose}>Ver prévia</button>
            {msg && <p className={msg.type === "error" ? panel.error : panel.success} style={{ width: "100%" }}>{msg.text}</p>}
          </div>

          {preview && (
            <div className={panel.card}>
              <div className={panel.tableToolbar}>
                <strong>Prévia — {monthName(referenceMonth)} · {scopeLabel}</strong>
                <span className={panel.muted}>
                  {preview.totals.totalJobs} vagas · {hrs(preview.totals.workedMinutes)} trabalhadas · {money(preview.totals.totalAmount)}
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className={panel.table}>
                  <thead><tr><th>Vaga</th><th>Loja</th><th>Horas trab.</th><th>Valor</th></tr></thead>
                  <tbody>
                    {preview.jobs.map((j) => (
                      <tr key={j.id}>
                        <td>{j.title}</td>
                        <td>{j.jobBranch?.name ?? "—"}</td>
                        <td>{hrs(j.workedMinutes)}</td>
                        <td>{money(Number(j.grossAmount ?? 0))}</td>
                      </tr>
                    ))}
                    {preview.jobs.length === 0 && <tr><td colSpan={4} className={panel.muted}>Nenhuma vaga concluída não faturada neste período.</td></tr>}
                  </tbody>
                </table>
              </div>
              <button className={panel.primaryBtn} onClick={doClose} disabled={busy || preview.jobs.length === 0}>
                {busy ? "Fechando…" : "Fechar e faturar"}
              </button>
            </div>
          )}

          <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>Fechamentos gerados</h2>
          <div style={{ overflowX: "auto" }}>
            <table className={panel.table}>
              <thead><tr><th>Mês</th><th>Supermercado</th><th>Escopo</th><th>Vagas</th><th>Horas trab.</th><th>Valor</th><th>Abatim.</th><th>A pagar</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {closings.map((c) => {
                  const pend = pendingCount(c);
                  const adjTotal = Number(c.adjustmentsTotal ?? 0);
                  return (
                  <tr key={c.id}>
                    <td>{monthName(c.referenceMonth)}</td>
                    <td>{c.invoiceSupermarket?.name ?? "—"}</td>
                    <td>{c.invoiceBranch?.name ?? "Toda a matriz"}</td>
                    <td>{c.totalJobs ?? "—"}</td>
                    <td>{hrs(c.workedMinutes)}</td>
                    <td>{money(c.totalAmount)}</td>
                    <td>{adjTotal > 0 ? `- ${money(adjTotal)}` : "—"}</td>
                    <td><strong>{money(closingNetAmount(c))}</strong></td>
                    <td><StatusBadge family="closing" status={c.status} label={CLOSING_STATUS_LABELS[c.status]} /></td>
                    <td>
                      <button className={panel.ghostBtn} onClick={() => openAdjustments(c)}>
                        Contestações{pend ? ` (${pend})` : ""}
                      </button>
                      <button className={panel.ghostBtn} disabled={pdfBusyId === c.id} onClick={() => baixarPdf(c)}>
                        {pdfBusyId === c.id ? "Baixando…" : "Baixar PDF"}
                      </button>
                      {c.status === "pending" && (
                        <button
                          className={panel.ghostBtn}
                          disabled={markPaidBusyId === c.id}
                          title="Use quando o pagamento pelo app está desligado e você já recebeu por fora."
                          onClick={() => markPaid(c)}
                        >
                          {markPaidBusyId === c.id ? "…" : "Marcar como paga"}
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
                {closings.length === 0 && <tr><td colSpan={10} className={panel.muted}>Nenhum fechamento ainda.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {adjClosing && (
        <Modal title={`Contestações — ${monthName(adjClosing.referenceMonth)} · ${adjClosing.invoiceSupermarket?.name ?? ""}`} onClose={() => setAdjClosing(null)}>
          <p className={panel.muted}>
            O supermercado lançou estes abatimentos. Aprovar reduz o valor a receber deste fechamento
            e o débito sai do saldo da agência. Recusar mantém o valor cheio.
          </p>
          {adjError && <p className={panel.error}>{adjError}</p>}
          <table className={panel.table}>
            <thead><tr><th>Descrição</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {adjustments.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.description}
                    {a.status === "rejected" && a.agencyNote && (
                      <div className={panel.muted} style={{ fontSize: "0.8rem" }}>Motivo: {a.agencyNote}</div>
                    )}
                  </td>
                  <td>- {money(a.amount)}</td>
                  <td><StatusBadge family="adjustment" status={a.status} label={ADJUSTMENT_STATUS_LABELS[a.status]} /></td>
                  <td>
                    {a.status === "pending" && (
                      <>
                        <button className={panel.primaryBtn} disabled={adjBusy}
                          onClick={() => runAdjustment(() => approveInvoiceAdjustment(adjClosing.id, a.id))}>
                          Aprovar
                        </button>
                        <button className={panel.secondaryBtn} disabled={adjBusy}
                          onClick={() => {
                            const note = window.prompt("Motivo da recusa:");
                            if (note && note.trim()) runAdjustment(() => rejectInvoiceAdjustment(adjClosing.id, a.id, note.trim()));
                          }}>
                          Recusar
                        </button>
                      </>
                    )}
                    {a.status === "approved" && adjClosing.status === "pending" && (
                      <button className={panel.secondaryBtn} disabled={adjBusy}
                        onClick={() => runAdjustment(() => revertInvoiceAdjustment(adjClosing.id, a.id))}>
                        Reverter
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {adjustments.length === 0 && <tr><td colSpan={4} className={panel.muted}>Nenhuma contestação neste fechamento.</td></tr>}
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
      <ClosingsPage />
    </RequireAuth>
  );
}
