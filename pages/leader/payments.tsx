import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/leader/Sidebar";
import RevokedNotice from "@/src/components/leader/RevokedNotice";
import RequireAuth from "@/src/components/RequireAuth";
import WithdrawForm from "@/src/components/WithdrawForm";
import panel from "@/styles/panel.module.scss";
import {
  getMyWithdrawals, Withdrawal, WITHDRAWAL_STATUS_LABELS,
} from "@/src/services/withdrawalService";
import {
  getLeaderWallet, LeaderWallet, PAY_TYPE_LABELS, CREDIT_STATUS_LABELS,
} from "@/src/services/agencyMemberService";
import { useAuth } from "@/src/hooks/useAuth";

function LeaderPayments() {
  const { profile, refresh } = useAuth();
  const [wallet, setWallet] = useState<LeaderWallet | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  const load = useCallback(async () => {
    const [wl, w] = await Promise.all([getLeaderWallet(), getMyWithdrawals()]);
    setWallet(wl);
    setWithdrawals(w);
  }, []);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const balance = wallet?.availableBalance ?? 0;

  if ((profile as { active?: boolean } | null)?.active === false) return <RevokedNotice />;

  return (
    <>
      <Head><title>Minha carteira | Líder</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Minha carteira</h1></header>
          <p className={panel.muted}>
            {wallet?.payType
              ? `Pagamento combinado: ${PAY_TYPE_LABELS[wallet.payType]} — R$ ${Number(wallet.payAmount ?? 0).toFixed(2)}.`
              : "A agência ainda não definiu a sua forma de pagamento."}
            {wallet?.payType === "por_colaborador"
              ? " Você ganha esse valor por cada vaga que um colaborador do seu grupo conclui. Quando o colaborador cumpre a escala, o crédito entra sozinho; casos de desistência/falta ficam aguardando a agência liberar."
              : " Os créditos são lançados pela sua agência."}
          </p>

          <div className={panel.balanceCard}>
            <span className={panel.muted}>Saldo disponível para saque</span>
            <strong>R$ {balance.toFixed(2)}</strong>
            <WithdrawForm balance={balance} onDone={() => Promise.all([load(), refresh()])} />
          </div>

          {(wallet?.jobCredits?.length ?? 0) > 0 && (
            <>
              <h2 style={{ fontSize: "1.1rem" }}>Ganhos por colaborador que trabalhou</h2>
              <p className={panel.muted}>
                Liberado: R$ {Number(wallet?.creditsReleasedTotal ?? 0).toFixed(2)}
                {Number(wallet?.creditsPendingTotal ?? 0) > 0 &&
                  ` · aguardando a agência: R$ ${Number(wallet?.creditsPendingTotal).toFixed(2)}`}
              </p>
              <div style={{ overflowX: "auto" }}>
                <table className={panel.table}>
                  <thead><tr><th>Data</th><th>Vaga</th><th>Colaborador</th><th>Valor</th><th>Situação</th></tr></thead>
                  <tbody>
                    {(wallet?.jobCredits ?? []).map((c) => (
                      <tr key={c.id}>
                        <td>{new Date(c.createdAt).toLocaleDateString("pt-BR")}</td>
                        <td>{c.jobTitle ?? "—"}</td>
                        <td>{c.freelancerName ?? "—"}</td>
                        <td>R$ {Number(c.amount).toFixed(2)}</td>
                        <td><span className={panel.badge}>{CREDIT_STATUS_LABELS[c.status]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <h2 style={{ fontSize: "1.1rem" }}>Créditos recebidos da agência</h2>
          <div style={{ overflowX: "auto" }}>
            <table className={panel.table}>
              <thead><tr><th>Data</th><th>Referência</th><th>Observação</th><th>Valor</th></tr></thead>
              <tbody>
                {(wallet?.payments ?? []).map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td>{p.referenceMonth ?? "—"}</td>
                    <td>{p.note ?? "—"}</td>
                    <td>R$ {Number(p.amount).toFixed(2)}</td>
                  </tr>
                ))}
                {(wallet?.payments ?? []).length === 0 && <tr><td colSpan={4}>Nenhum crédito ainda.</td></tr>}
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
                    <td><span className={panel.badge}>{WITHDRAWAL_STATUS_LABELS[w.status]}</span></td>
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
    <RequireAuth role="leader">
      <LeaderPayments />
    </RequireAuth>
  );
}
