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
import {
  getJobs, reviewDelivery, getPendingSettlementJobs, releaseJobPayment, minutesToHours, Job,
} from "@/src/services/jobService";
import { getAgencySettings } from "@/src/services/agencySettingsService";
import {
  getMyWithdrawals, Withdrawal, WITHDRAWAL_STATUS_LABELS,
} from "@/src/services/withdrawalService";
import WithdrawForm from "@/src/components/WithdrawForm";
import { useAuth } from "@/src/hooks/useAuth";
import { matchesFilter, RowFilter } from "@/src/lib/filterRows";
import {
  getAgencyMembers, registerAgencyMemberPayment, AgencyMember, PAY_TYPE_LABELS,
  getMemberJobCredits, releaseMemberJobCredit, cancelMemberJobCredit, LeaderJobCredit,
} from "@/src/services/agencyMemberService";

function AgencyPayments() {
  const { profile, refresh } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [heldJobs, setHeldJobs] = useState<Job[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [heldMsg, setHeldMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RowFilter>({});
  const [reviewJob, setReviewJob] = useState<Job | null>(null);
  const [rv, setRv] = useState({ rating: 5, comment: "", approved: true });
  const [rvError, setRvError] = useState<string | null>(null);

  const [members, setMembers] = useState<AgencyMember[]>([]);
  const [payMember, setPayMember] = useState<AgencyMember | null>(null);
  const [leaderPay, setLeaderPay] = useState({ amount: "", referenceMonth: "", note: "" });
  const [leaderPayError, setLeaderPayError] = useState<string | null>(null);

  const [pendingCredits, setPendingCredits] = useState<LeaderJobCredit[]>([]);
  const [creditBusyId, setCreditBusyId] = useState<string | null>(null);
  const [creditMsg, setCreditMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const balance = Number((profile as { availableBalance?: number } | null)?.availableBalance ?? 0);

  const [reviewEnabled, setReviewEnabled] = useState(false);

  const load = useCallback(async () => {
    const [p, j, h, w, s, m, c] = await Promise.all([
      getMyPayments(), getJobs(), getPendingSettlementJobs().catch(() => []),
      getMyWithdrawals(), getAgencySettings().catch(() => null),
      getAgencyMembers().catch(() => []),
      getMemberJobCredits("pending").catch(() => []),
    ]);
    setPayments(p);
    setJobs(j);
    setHeldJobs(h);
    setWithdrawals(w);
    setReviewEnabled(s?.reviewEnabled ?? false);
    setMembers(m);
    setPendingCredits(c);
  }, []);

  const decideCredit = async (credit: LeaderJobCredit, action: "release" | "cancel") => {
    if (action === "cancel" && !confirm(`Não pagar o crédito de ${credit.leaderName ?? "líder"} pela vaga "${credit.jobTitle ?? ""}"?`)) return;
    setCreditMsg(null);
    setCreditBusyId(credit.id);
    try {
      if (action === "release") await releaseMemberJobCredit(credit.id);
      else await cancelMemberJobCredit(credit.id);
      await Promise.all([load(), refresh()]);
      setCreditMsg({
        type: "success",
        text: action === "release" ? "Crédito liberado para o líder." : "Crédito marcado como não pago.",
      });
    } catch (err) {
      setCreditMsg({
        type: "error",
        text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.",
      });
    } finally {
      setCreditBusyId(null);
    }
  };

  const openLeaderPay = (m: AgencyMember) => {
    setPayMember(m);
    const now = new Date();
    setLeaderPay({
      amount: m.payType === "mensal" && m.payAmount != null ? String(m.payAmount) : "",
      referenceMonth: m.payType === "mensal"
        ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
        : "",
      note: "",
    });
    setLeaderPayError(null);
  };

  const submitLeaderPay = async () => {
    if (!payMember) return;
    setLeaderPayError(null);
    const amount = Number(leaderPay.amount);
    if (!(amount > 0)) { setLeaderPayError("Informe um valor válido."); return; }
    try {
      await registerAgencyMemberPayment(payMember.id, {
        amount,
        referenceMonth: leaderPay.referenceMonth || null,
        note: leaderPay.note || null,
      });
      setPayMember(null);
      await Promise.all([load(), refresh()]);
    } catch (err) {
      setLeaderPayError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  const releaseHeld = async (job: Job, capToContracted: boolean) => {
    const label = capToContracted ? "pagar só o tempo contratado" : "pagar as horas trabalhadas";
    if (!confirm(`Liberar o pagamento da vaga "${job.title}" (${label})?`)) return;
    setHeldMsg(null);
    setReleasingId(job.id);
    try {
      await releaseJobPayment(job.id, capToContracted);
      await Promise.all([load(), refresh()]);
      setHeldMsg({ type: "success", text: `Pagamento da vaga "${job.title}" liberado.` });
    } catch (err) {
      setHeldMsg({
        type: "error",
        text: axios.isAxiosError(err)
          ? err.response?.data?.message ?? "Não foi possível liberar o pagamento."
          : "Não foi possível liberar o pagamento.",
      });
    } finally {
      setReleasingId(null);
    }
  };
  useEffect(() => { load().catch(() => {}); }, [load]);

  const pendingReviews = useMemo(
    () => (reviewEnabled ? jobs.filter((j) => j.status === "completed" && !j.jobReview) : []),
    [jobs, reviewEnabled]
  );


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
    { key: "freelancer", label: "Colaborador", type: "text" },
    { key: "branch", label: "Filial", type: "text" },
    { key: "date", label: "Data", type: "date" },
  ];

  const columns: Column<Payment>[] = [
    { key: "title", label: "Vaga", render: (p) => p.paymentJob?.title ?? p.jobId.slice(0, 8) },
    { key: "freelancer", label: "Colaborador", render: (p) => p.paymentFreelancer?.name ?? "—" },
    { key: "gross", label: "Valor pago pelo mercado", render: (p) => `R$ ${Number(p.grossAmount ?? 0).toFixed(2)}` },
    { key: "agencyAmount", label: "Fica com a agência", render: (p) => `R$ ${Number(p.agencyAmount ?? 0).toFixed(2)}` },
    { key: "freelancerAmount", label: "Valor do colaborador", render: (p) => `R$ ${Number(p.freelancerAmount ?? 0).toFixed(2)}` },
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
            <span className={panel.muted}>Saldo disponível</span>
            <strong>R$ {balance.toFixed(2)}</strong>
            <WithdrawForm balance={balance} onDone={() => Promise.all([load(), refresh()])} />
          </div>

          {(heldJobs.length > 0 || heldMsg) && (
            <>
              <h2 style={{ fontSize: "1.1rem" }}>Pagamentos aguardando liberação (hora extra)</h2>
              <p className={panel.muted}>
                Vagas concluídas com mais de 15 min acima do turno contratado. O pagamento ao
                colaborador só é liberado depois da sua aprovação.
              </p>
              {heldMsg && (
                <p className={heldMsg.type === "error" ? panel.error : panel.success}>{heldMsg.text}</p>
              )}
              {heldJobs.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table className={panel.table}>
                  <thead>
                    <tr><th>Vaga</th><th>Colaborador</th><th>Contratado</th><th>Trabalhado</th><th>Ações</th></tr>
                  </thead>
                  <tbody>
                    {heldJobs.map((j) => (
                      <tr key={j.id}>
                        <td>{j.title}</td>
                        <td>{j.assignedFreelancer?.name ?? "—"}</td>
                        <td>{minutesToHours(j.contractedMinutes)}</td>
                        <td>{minutesToHours(j.workedMinutes)}</td>
                        <td>
                          <button
                            className={panel.primaryBtn}
                            disabled={releasingId === j.id}
                            onClick={() => releaseHeld(j, false)}
                          >
                            Pagar horas trabalhadas
                          </button>
                          <button
                            className={panel.ghostBtn}
                            disabled={releasingId === j.id}
                            onClick={() => releaseHeld(j, true)}
                          >
                            Pagar só o contratado
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </>
          )}

          {pendingReviews.length > 0 && (
            <>
              <h2 style={{ fontSize: "1.1rem" }}>Avaliações pendentes</h2>
              <div style={{ overflowX: "auto" }}>
                <table className={panel.table}>
                  <thead><tr><th>Vaga</th><th>Colaborador</th><th>Status</th><th>Ação</th></tr></thead>
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
              </div>
            </>
          )}

          <h2 style={{ fontSize: "1.1rem" }}>Pagamentos dos colaboradores</h2>
          <FilterBar fields={filterFields} value={filter} onChange={setFilter} />
          <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} storageKey="agency-payments" empty="Nenhum pagamento ainda." />

          {(pendingCredits.length > 0 || creditMsg) && (
            <>
              <h2 style={{ fontSize: "1.1rem" }}>Créditos de líderes a revisar (por colaborador)</h2>
              <p className={panel.muted}>
                Vagas concluídas com desistência, falta ou troca de colaborador. O crédito do líder
                pago <strong>por colaborador que trabalhou</strong> só entra na carteira dele depois
                que você libera. Liberar <strong>debita o saldo da agência</strong>.
              </p>
              {creditMsg && (
                <p className={creditMsg.type === "error" ? panel.error : panel.success}>{creditMsg.text}</p>
              )}
              {pendingCredits.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table className={panel.table}>
                    <thead>
                      <tr><th>Líder</th><th>Colaborador</th><th>Vaga</th><th>Filial</th><th>Valor</th><th>Ações</th></tr>
                    </thead>
                    <tbody>
                      {pendingCredits.map((c) => (
                        <tr key={c.id}>
                          <td>{c.leaderName ?? "—"}</td>
                          <td>{c.freelancerName ?? "—"}</td>
                          <td>{c.jobTitle ?? "—"}</td>
                          <td>{c.branchName ?? "—"}</td>
                          <td>R$ {Number(c.amount).toFixed(2)}</td>
                          <td>
                            <button
                              className={panel.primaryBtn}
                              disabled={creditBusyId === c.id}
                              onClick={() => decideCredit(c, "release")}
                            >
                              Liberar
                            </button>
                            <button
                              className={panel.ghostBtn}
                              disabled={creditBusyId === c.id}
                              onClick={() => decideCredit(c, "cancel")}
                            >
                              Não pagar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {members.length > 0 && (
            <>
              <h2 style={{ fontSize: "1.1rem" }}>Pagamento a líderes</h2>
              <p className={panel.muted}>
                Registrar um pagamento credita a carteira do líder e <strong>debita o saldo da agência</strong>.
                Líderes pagos <strong>por colaborador que trabalhou</strong> recebem automaticamente a cada
                vaga concluída — use isto só para ajustes pontuais.
              </p>
              <div style={{ overflowX: "auto" }}>
                <table className={panel.table}>
                  <thead><tr><th>Líder</th><th>Combinado</th><th>Carteira</th><th>Ação</th></tr></thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id}>
                        <td>{m.name ?? "—"}{!m.active && <span className={`${panel.badge} ${panel.badgeCanceled}`} style={{ marginLeft: 6 }}>inativo</span>}</td>
                        <td>
                          {m.payType ? `${PAY_TYPE_LABELS[m.payType]} · R$ ${Number(m.payAmount ?? 0).toFixed(2)}` : "—"}
                          {m.payType === "por_colaborador" && (
                            <div className={panel.muted} style={{ fontSize: "0.78rem" }}>
                              recebido: R$ {Number(m.creditsReleasedTotal ?? 0).toFixed(2)}
                              {Number(m.creditsPendingTotal ?? 0) > 0 && ` · a revisar: R$ ${Number(m.creditsPendingTotal).toFixed(2)}`}
                            </div>
                          )}
                        </td>
                        <td>R$ {Number(m.availableBalance).toFixed(2)}</td>
                        <td><button className={panel.primaryBtn} onClick={() => openLeaderPay(m)}>Registrar pagamento</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

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

      {payMember && (
        <Modal title={`Pagar líder — ${payMember.name ?? ""}`} onClose={() => setPayMember(null)}>
          <div className={panel.form}>
            <p className={panel.muted}>
              O valor é creditado na carteira de {payMember.name ?? "o líder"} e debitado do saldo da agência.
            </p>
            <label>Valor (R$)</label>
            <input
              type="number" min="0.01" step="0.01"
              value={leaderPay.amount}
              onChange={(e) => setLeaderPay({ ...leaderPay, amount: e.target.value })}
            />
            <label>Mês de referência (AAAA-MM, opcional)</label>
            <input
              placeholder="2026-09"
              value={leaderPay.referenceMonth}
              onChange={(e) => setLeaderPay({ ...leaderPay, referenceMonth: e.target.value })}
            />
            <label>Observação (opcional)</label>
            <input value={leaderPay.note} onChange={(e) => setLeaderPay({ ...leaderPay, note: e.target.value })} />
            {leaderPayError && <p className={panel.error}>{leaderPayError}</p>}
            <button className={panel.primaryBtn} onClick={submitLeaderPay}>Registrar pagamento</button>
          </div>
        </Modal>
      )}

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
