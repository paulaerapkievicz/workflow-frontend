import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import DataTable, { Column } from "@/src/components/DataTable";
import FilterBar, { FilterFieldDef } from "@/src/components/FilterBar";
import panel from "@/styles/panel.module.scss";
import { getMyPayments, Payment, PAYMENT_STATUS_LABELS } from "@/src/services/paymentService";
import { getJobs, reviewDelivery, Job } from "@/src/services/jobService";
import {
  getMyWithdrawals, requestWithdrawal, Withdrawal, WITHDRAWAL_STATUS_LABELS,
} from "@/src/services/withdrawalService";
import { useAuth } from "@/src/hooks/useAuth";
import { matchesFilter, RowFilter } from "@/src/lib/filterRows";

function AgencyPayments() {
  const { profile, refresh } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [filter, setFilter] = useState<RowFilter>({});
  const [reviewJob, setReviewJob] = useState<Job | null>(null);
  const [rv, setRv] = useState({ rating: 5, comment: "", approved: true });
  const [rvError, setRvError] = useState<string | null>(null);

  const balance = Number((profile as { availableBalance?: number } | null)?.availableBalance ?? 0);

  const load = useCallback(async () => {
    const [p, j, w] = await Promise.all([getMyPayments(), getJobs(), getMyWithdrawals()]);
    setPayments(p);
    setJobs(j);
    setWithdrawals(w);
  }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const pendingReviews = useMemo(
    () => jobs.filter((j) => j.status === "completed" && j.agencyReviewEnabled && !j.jobReview),
    [jobs]
  );

  const submitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await requestWithdrawal(Number(amount));
      setAmount("");
      setMsg({ type: "success", text: "Saque solicitado." });
      await Promise.all([load(), refresh()]);
    } catch (err) {
      setMsg({ type: "error", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    }
  };

  const openReview = (job: Job) => {
    setReviewJob(job);
    setRv({ rating: 5, comment: "", approved: true });
    setRvError(null);
  };

  const submitReview = async () => {
    if (!reviewJob) return;
    setRvError(null);
    try {
      await reviewDelivery(reviewJob.id, { rating: rv.rating, comment: rv.comment || undefined, approved: rv.approved });
      setReviewJob(null);
      await load();
    } catch (err) {
      setRvError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  const rows = useMemo(
    () =>
      payments.filter((p) =>
        matchesFilter(
          {
            status: p.status,
            freelancerName: p.paymentFreelancer?.name,
            branchName: p.paymentJob?.jobBranch?.name,
            title: p.paymentJob?.title,
            categoryName: p.paymentJob?.jobCategory?.name,
            date: p.releasedAt ?? p.createdAt,
          },
          filter
        )
      ),
    [payments, filter]
  );

  const filterFields: FilterFieldDef[] = [
    { key: "title", label: "Vaga", type: "text" },
    { key: "freelancer", label: "Freelancer", type: "text" },
    { key: "branch", label: "Filial", type: "text" },
    { key: "date", label: "Data", type: "date" },
  ];

  const columns: Column<Payment>[] = [
    { key: "title", label: "Vaga", render: (p) => p.paymentJob?.title ?? p.jobId.slice(0, 8) },
    { key: "freelancer", label: "Freelancer", render: (p) => p.paymentFreelancer?.name ?? "—" },
    { key: "gross", label: "Valor pago pelo mercado", render: (p) => `R$ ${Number(p.grossAmount ?? 0).toFixed(2)}`, defaultHidden: true },
    { key: "commission", label: "Comissão", render: (p) => `R$ ${Number(p.agencyAmount ?? 0).toFixed(2)}` },
    { key: "freelancerAmount", label: "Valor do freelancer", render: (p) => `R$ ${Number(p.freelancerAmount ?? 0).toFixed(2)}` },
    { key: "status", label: "Status", render: (p) => <span className={panel.badge}>{PAYMENT_STATUS_LABELS[p.status]}</span> },
    { key: "date", label: "Liberado em", render: (p) => (p.releasedAt ? new Date(p.releasedAt).toLocaleDateString("pt-BR") : "—") },
  ];

  return (
    <>
      <Head><title>Pagamentos | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Pagamentos</h1></header>

          <div className={panel.balanceCard}>
            <span className={panel.muted}>Saldo de comissão disponível</span>
            <strong>R$ {balance.toFixed(2)}</strong>
            <form className={panel.form} onSubmit={submitWithdrawal}>
              <label>Valor do saque</label>
              <input type="number" min="0.01" step="0.01" max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} required />
              {msg && <p className={msg.type === "error" ? panel.error : panel.success}>{msg.text}</p>}
              <button className={panel.primaryBtn} type="submit" disabled={!amount || Number(amount) <= 0}>Solicitar saque</button>
            </form>
          </div>

          {pendingReviews.length > 0 && (
            <>
              <h2 style={{ fontSize: "1.1rem" }}>Avaliações pendentes</h2>
              <table className={panel.table}>
                <thead><tr><th>Vaga</th><th>Freelancer</th><th>Status</th><th>Ação</th></tr></thead>
                <tbody>
                  {pendingReviews.map((j) => (
                    <tr key={j.id}>
                      <td>{j.title}</td>
                      <td>{j.assignedFreelancer?.name ?? "—"}</td>
                      <td><StatusBadge status={j.status} /></td>
                      <td><button className={panel.primaryBtn} onClick={() => openReview(j)}>Avaliar entrega</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <h2 style={{ fontSize: "1.1rem" }}>Pagamentos dos freelancers</h2>
          <FilterBar fields={filterFields} value={filter} onChange={setFilter} />
          <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} storageKey="agency-payments" empty="Nenhum pagamento ainda." />

          <h2 style={{ fontSize: "1.1rem" }}>Meus saques</h2>
          <table className={panel.table}>
            <thead><tr><th>Data</th><th>Valor</th><th>Status</th></tr></thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.id}>
                  <td>{new Date(w.requestedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td>R$ {Number(w.amount).toFixed(2)}</td>
                  <td><span className={panel.badge}>{WITHDRAWAL_STATUS_LABELS[w.status]}</span></td>
                </tr>
              ))}
              {withdrawals.length === 0 && <tr><td colSpan={3}>Nenhum saque solicitado.</td></tr>}
            </tbody>
          </table>
        </section>
      </main>

      {reviewJob && (
        <Modal title={`Avaliar entrega — ${reviewJob.title}`} onClose={() => setReviewJob(null)}>
          <div className={panel.form}>
            <label className={panel.toggleRow}>
              <input type="checkbox" checked={rv.approved} onChange={(e) => setRv({ ...rv, approved: e.target.checked })} />
              Entrega aprovada
            </label>
            <label>Nota (1 a 5)</label>
            <select value={rv.rating} onChange={(e) => setRv({ ...rv, rating: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <label>{rv.approved ? "Comentário (opcional)" : "Motivo da rejeição"}</label>
            <textarea value={rv.comment} onChange={(e) => setRv({ ...rv, comment: e.target.value })} />
            {rvError && <p className={panel.error}>{rvError}</p>}
            <button className={panel.primaryBtn} onClick={submitReview}>Enviar avaliação</button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="agency">
      <AgencyPayments />
    </RequireAuth>
  );
}
