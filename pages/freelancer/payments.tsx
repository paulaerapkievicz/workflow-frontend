import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import WithdrawForm from "@/src/components/WithdrawForm";
import panel from "@/styles/panel.module.scss";
import { getMyPayments, Payment, PAYMENT_STATUS_LABELS } from "@/src/services/paymentService";
import {
  getMyWithdrawals, Withdrawal, WITHDRAWAL_STATUS_LABELS,
} from "@/src/services/withdrawalService";
import { useAuth } from "@/src/hooks/useAuth";

function FreelancerPayments() {
  const { profile, refresh } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  const balance = Number((profile as { availableBalance?: number } | null)?.availableBalance ?? 0);

  const load = useCallback(async () => {
    const [p, w] = await Promise.all([getMyPayments(), getMyWithdrawals()]);
    setPayments(p);
    setWithdrawals(w);
  }, []);

  useEffect(() => { load().catch(() => {}); }, [load]);

  return (
    <>
      <Head><title>Pagamentos | Colaborador</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Pagamentos</h1></header>

          <div className={panel.balanceCard}>
            <span className={panel.muted}>Saldo disponível para saque</span>
            <strong>R$ {balance.toFixed(2)}</strong>
            <WithdrawForm balance={balance} onDone={() => Promise.all([load(), refresh()])} />
          </div>

          <h2 style={{ fontSize: "1.1rem" }}>Meus recebíveis</h2>
          <div style={{ overflowX: "auto" }}>
            <table className={panel.table}>
              <thead><tr><th>Vaga</th><th>Filial</th><th>Meu valor</th><th>Status</th><th>Liberado em</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.paymentJob?.title ?? p.jobId.slice(0, 8)}</td>
                    <td>{p.paymentJob?.jobBranch?.name ?? "—"}</td>
                    <td>R$ {Number(p.freelancerAmount ?? 0).toFixed(2)}</td>
                    <td><StatusBadge family="payment" status={p.status} label={PAYMENT_STATUS_LABELS[p.status]} /></td>
                    <td>{p.releasedAt ? new Date(p.releasedAt).toLocaleDateString("pt-BR") : "—"}</td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={5}>Nada ainda.</td></tr>}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: "1.1rem" }}>Meus saques</h2>
          <div style={{ overflowX: "auto" }}>
            <table className={panel.table}>
              <thead><tr><th>Data</th><th>Valor</th><th>Chave Pix</th><th>Status</th></tr></thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td>{new Date(w.requestedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td>R$ {Number(w.amount).toFixed(2)}</td>
                    <td>{w.pixKey ?? "—"}</td>
                    <td><StatusBadge family="withdrawal" status={w.status} label={WITHDRAWAL_STATUS_LABELS[w.status]} /></td>
                  </tr>
                ))}
                {withdrawals.length === 0 && <tr><td colSpan={4}>Nenhum saque solicitado.</td></tr>}
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
