import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/supermarket/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import panel from "@/styles/panel.module.scss";
import {
  getBillingSummary, payClosing, syncClosingPayment, downloadClosingPdf, BillingSummary, BillingJob,
  BillingInvoice, InvoiceAdjustment,
  getInvoiceAdjustments, createInvoiceAdjustment, deleteInvoiceAdjustment,
  ADJUSTMENT_STATUS_LABELS,
  hoursFromMin, money, monthName, CLOSING_STATUS_LABELS,
} from "@/src/services/billingService";
import { shiftLabel } from "@/src/services/shifts";
import { useAuth } from "@/src/hooks/useAuth";
import type { SupermarketMembership } from "@/src/services/authService";

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
  const { profile, loading: authLoading } = useAuth();
  const membership = (profile as { membership?: SupermarketMembership } | null)?.membership ?? null;
  const canViewInvoices = membership ? membership.isOwner || membership.canViewInvoices : true;
  const canPayInvoices = membership ? membership.isOwner || membership.canPayInvoices : true;
  const appPaymentEnabled =
    (profile as { clientAgency?: { appPaymentEnabledForSupermarkets?: boolean } | null; appPaymentEnabled?: boolean } | null)
      ?.clientAgency?.appPaymentEnabledForSupermarkets === true &&
    (profile as { appPaymentEnabled?: boolean } | null)?.appPaymentEnabled === true;

  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);

  const [branchId, setBranchId] = useState("");
  const [month, setMonth] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [payMsg, setPayMsg] = useState<string | null>(null);

  const [adjInvoice, setAdjInvoice] = useState<BillingInvoice | null>(null);
  const [adjustments, setAdjustments] = useState<InvoiceAdjustment[]>([]);
  const [adjForm, setAdjForm] = useState({ description: "", amount: "" });
  const [adjBusy, setAdjBusy] = useState(false);
  const [adjError, setAdjError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setSummary(await getBillingSummary()); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (authLoading || !canViewInvoices) return;
    (async () => {
      // De volta do checkout do Mercado Pago: confirma as faturas que já têm pagamento iniciado.
      if (typeof window !== "undefined" && /[?&]fatura=/.test(window.location.search)) {
        try {
          const s = await getBillingSummary();
          await Promise.all(
            (s.invoices ?? [])
              .filter((i) => i.status === "pending" && i.paymentRef)
              .map((i) => syncClosingPayment(i.id).catch(() => {}))
          );
        } catch { /* ignora */ }
        window.history.replaceState(null, "", window.location.pathname);
      }
      await load().catch(() => {});
    })();
  }, [authLoading, canViewInvoices]);

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
    setPayMsg(null);
    try {
      const inv = await payClosing(id);
      if (inv.paymentUrl) {
        window.open(inv.paymentUrl, "_blank", "noopener");
        setPayMsg(
          "Abrimos o pagamento do Mercado Pago numa nova aba. Depois de pagar, volte aqui e clique em “Já paguei — atualizar”."
        );
      }
      await load();
    } catch (err) {
      alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    } finally {
      setBusy(null);
    }
  };

  const syncPay = async (id: string) => {
    setBusy(id);
    setPayMsg(null);
    try {
      const inv = await syncClosingPayment(id);
      if (inv.status !== "paid") {
        setPayMsg("Ainda não recebemos a confirmação do pagamento. Se você já pagou, aguarde alguns instantes e tente de novo.");
      }
      await load();
    } catch (err) {
      alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    } finally {
      setBusy(null);
    }
  };

  const baixarPdf = async (id: string, referenceMonth: string | null) => {
    setPdfBusyId(id);
    try { await downloadClosingPdf(id, referenceMonth); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao baixar PDF." : "Erro ao baixar PDF."); }
    finally { setPdfBusyId(null); }
  };

  const openAdjustments = async (inv: BillingInvoice) => {
    setAdjInvoice(inv);
    setAdjustments([]);
    setAdjForm({ description: "", amount: "" });
    setAdjError(null);
    try { setAdjustments(await getInvoiceAdjustments(inv.id)); } catch { setAdjustments([]); }
  };

  const refreshAdjustments = async (invoiceId: string) => {
    const [list] = await Promise.all([getInvoiceAdjustments(invoiceId), load()]);
    setAdjustments(list);
  };

  const addAdjustment = async () => {
    if (!adjInvoice) return;
    const amount = Number(adjForm.amount.replace(",", "."));
    if (!adjForm.description.trim()) return setAdjError("Descreva o abatimento.");
    if (!(amount > 0)) return setAdjError("Informe um valor maior que zero.");
    setAdjBusy(true);
    setAdjError(null);
    try {
      await createInvoiceAdjustment(adjInvoice.id, { description: adjForm.description.trim(), amount });
      setAdjForm({ description: "", amount: "" });
      await refreshAdjustments(adjInvoice.id);
    } catch (err) {
      setAdjError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    } finally {
      setAdjBusy(false);
    }
  };

  const removeAdjustment = async (adjustmentId: string) => {
    if (!adjInvoice) return;
    setAdjBusy(true);
    setAdjError(null);
    try {
      await deleteInvoiceAdjustment(adjInvoice.id, adjustmentId);
      await refreshAdjustments(adjInvoice.id);
    } catch (err) {
      setAdjError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    } finally {
      setAdjBusy(false);
    }
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

          {!authLoading && !canViewInvoices ? (
            <p className={panel.muted}>
              Você não tem permissão para ver as faturas da rede. Fale com o responsável pelo
              supermercado ou com a agência para liberar o acesso.
            </p>
          ) : loading || !summary ? (
            <p>Carregando…</p>
          ) : (
            <>
              {!canPayInvoices && (
                <p className={panel.muted}>
                  Você pode consultar as faturas, mas não pagá-las nem contestá-las.
                </p>
              )}
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
              {payMsg && <p className={panel.muted} style={{ marginBottom: "0.5rem" }}>{payMsg}</p>}
              <div style={{ overflowX: "auto" }}>
                <table className={panel.table}>
                  <thead><tr><th>Mês</th><th>Agência</th><th>Escopo</th><th>Vagas</th><th>Horas trab.</th><th>Valor</th><th>Abatimentos</th><th>A pagar</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {invoices.map((c) => {
                      const blockPay = c.pendingAdjustments > 0;
                      return (
                      <tr key={c.id}>
                        <td>{monthName(c.referenceMonth)}</td>
                        <td>{c.agencyName ?? "—"}</td>
                        <td>{c.branchName ?? "Todas as lojas"}</td>
                        <td>{c.totalJobs}</td>
                        <td>{hrs(hoursFromMin(c.workedMinutes))}</td>
                        <td>{money(c.totalAmount)}</td>
                        <td>{c.adjustmentsTotal > 0 ? `- ${money(c.adjustmentsTotal)}` : "—"}</td>
                        <td><strong>{money(c.netAmount)}</strong></td>
                        <td><StatusBadge family="closing" status={c.status} label={CLOSING_STATUS_LABELS[c.status]} /></td>
                        <td>
                          {c.status === "pending" && canPayInvoices && (
                            <button className={panel.ghostBtn} onClick={() => openAdjustments(c)}>
                              Contestar
                            </button>
                          )}
                          {c.status === "pending" && canPayInvoices && appPaymentEnabled && !c.paymentUrl && (
                            <button
                              className={panel.primaryBtn}
                              disabled={busy === c.id || blockPay}
                              title={blockPay ? "Aguarde a agência resolver as contestações pendentes." : undefined}
                              onClick={() => pay(c.id)}
                            >
                              {busy === c.id ? "…" : "Pagar fatura"}
                            </button>
                          )}
                          {c.status === "pending" && canPayInvoices && c.paymentUrl && (
                            <>
                              <a className={panel.primaryBtn} href={c.paymentUrl} target="_blank" rel="noopener noreferrer">
                                Abrir pagamento
                              </a>
                              <button className={panel.secondaryBtn} disabled={busy === c.id} onClick={() => syncPay(c.id)}>
                                {busy === c.id ? "…" : "Já paguei — atualizar"}
                              </button>
                            </>
                          )}
                          {c.status === "pending" && canPayInvoices && !appPaymentEnabled && !c.paymentUrl && (
                            <p className={panel.muted} style={{ margin: 0 }}>
                              Combine o pagamento com a agência — ela confirma manualmente.
                            </p>
                          )}
                          <button className={panel.ghostBtn} disabled={pdfBusyId === c.id} onClick={() => baixarPdf(c.id, c.referenceMonth)}>
                            {pdfBusyId === c.id ? "Baixando…" : "Baixar PDF"}
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                    {invoices.length === 0 && <tr><td colSpan={10} className={panel.muted}>Nenhum fechamento recebido.</td></tr>}
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

      {adjInvoice && (() => {
        const live = (summary?.invoices ?? []).find((i) => i.id === adjInvoice.id) ?? adjInvoice;
        return (
          <Modal title={`Contestar fechamento — ${monthName(live.referenceMonth)}`} onClose={() => setAdjInvoice(null)}>
            <p className={panel.muted}>
              Lance aqui os valores a abater deste fechamento (ex.: quebra de caixa). A agência aprova
              ou recusa cada item. Você paga o valor líquido depois que tudo for resolvido.
            </p>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "0.5rem 0" }}>
              <span>Valor bruto: <strong>{money(live.totalAmount)}</strong></span>
              <span>Abatimentos aprovados: <strong>- {money(live.adjustmentsTotal)}</strong></span>
              <span>Valor líquido: <strong>{money(live.netAmount)}</strong></span>
            </div>

            <table className={panel.table}>
              <thead><tr><th>Descrição</th><th>Valor</th><th>Status</th><th></th></tr></thead>
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
                        <button className={panel.secondaryBtn} disabled={adjBusy} onClick={() => removeAdjustment(a.id)}>
                          Remover
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {adjustments.length === 0 && <tr><td colSpan={4} className={panel.muted}>Nenhuma contestação lançada.</td></tr>}
              </tbody>
            </table>

            {live.status === "pending" && (
              <div className={panel.form} style={{ marginTop: "0.75rem" }}>
                <label>Descrição do abatimento</label>
                <input
                  value={adjForm.description}
                  onChange={(e) => setAdjForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Ex.: Quebra de caixa 12/03"
                />
                <label>Valor (R$)</label>
                <input
                  type="number" min="0.01" step="0.01"
                  value={adjForm.amount}
                  onChange={(e) => setAdjForm((s) => ({ ...s, amount: e.target.value }))}
                />
                {adjError && <p className={panel.error}>{adjError}</p>}
                <button className={panel.primaryBtn} disabled={adjBusy} onClick={addAdjustment}>
                  {adjBusy ? "Salvando…" : "Adicionar contestação"}
                </button>
              </div>
            )}
          </Modal>
        );
      })()}
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
