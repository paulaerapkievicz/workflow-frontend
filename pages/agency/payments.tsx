import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import RequirePermission from "@/src/components/RequirePermission";
import StatusBadge from "@/src/components/StatusBadge";
import DataTable, { Column } from "@/src/components/DataTable";
import FilterBar, { FilterFieldDef } from "@/src/components/FilterBar";
import DateRangeQuickFilter from "@/src/components/DateRangeQuickFilter";
import panel from "@/styles/panel.module.scss";
import { getMyPayments, Payment } from "@/src/services/paymentService";
import {
  getJobs, reviewDelivery, getPendingSettlementJobs, releaseJobPayment, minutesToHours,
  formatShifts, formatActualPunches, Job,
} from "@/src/services/jobService";
import { getAgencySettings } from "@/src/services/agencySettingsService";
import WithdrawForm from "@/src/components/WithdrawForm";
import { useAuth } from "@/src/hooks/useAuth";
import { matchesFilter, RowFilter } from "@/src/lib/filterRows";
import { useDateRangeFilter } from "@/src/hooks/useDateRangeFilter";
import { inDateRange, resolveDateBounds } from "@/src/lib/dateRange";
import { fmtDate, fmtWindow } from "@/src/lib/datetime";
import { buildCsv, downloadCsv } from "@/src/lib/csv";
import {
  getAgencyMembers, registerAgencyMemberPayment, AgencyMember, PAY_TYPE_LABELS,
  getMemberJobCredits, releaseMemberJobCredit, cancelMemberJobCredit, LeaderJobCredit,
} from "@/src/services/agencyMemberService";

/** R$/hora efetivo do colaborador na vaga, calculado a partir do que foi liquidado (histórico correto mesmo se o valor/hora mudou depois). */
const effectiveHourlyRate = (p: Payment): number | null => {
  const minutes = p.paymentJob?.workedMinutes;
  const amount = p.freelancerAmount;
  if (!minutes || amount == null) return null;
  return amount / (minutes / 60);
};

/** Janela solicitada (turnos da vaga) — cai para o horário geral quando os turnos não vieram. */
const scheduledWindow = (p: Payment): string => {
  if (p.paymentJob?.shifts?.length) return formatShifts(p.paymentJob.shifts);
  if (p.paymentJob?.startTime && p.paymentJob?.endTime) {
    return fmtWindow(p.paymentJob.startTime, p.paymentJob.endTime);
  }
  return "—";
};

const money = (v: number) => v.toFixed(2).replace(".", ",");

function AgencyPayments() {
  const { profile, refresh } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [heldJobs, setHeldJobs] = useState<Job[]>([]);
  const [heldMsg, setHeldMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RowFilter>({});
  const [payrollRange, setPayrollRange] = useDateRangeFilter("agency-payroll");
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
    const [p, j, h, s, m, c] = await Promise.all([
      getMyPayments(), getJobs(), getPendingSettlementJobs().catch(() => []),
      getAgencySettings().catch(() => null),
      getAgencyMembers().catch(() => []),
      getMemberJobCredits("pending").catch(() => []),
    ]);
    setPayments(p);
    setJobs(j);
    setHeldJobs(h);
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
      payments
        .filter((p) =>
          matchesFilter(
            {
              status: p.status,
              freelancerName: p.paymentFreelancer?.name,
              branchName: p.paymentJob?.jobBranch?.name,
              title: p.paymentJob?.title,
              categoryName: p.paymentJob?.jobCategory?.name,
            },
            filter
          )
        )
        .filter((p) => inDateRange(p.paymentJob?.startTime, payrollRange)),
    [payments, filter, payrollRange]
  );

  const filterFields: FilterFieldDef[] = [
    { key: "title", label: "Vaga", type: "text" },
    { key: "freelancer", label: "Colaborador", type: "text" },
    { key: "branch", label: "Filial", type: "text" },
  ];

  const columns: Column<Payment>[] = [
    { key: "title", label: "Vaga", render: (p) => p.paymentJob?.title ?? p.jobId.slice(0, 8) },
    { key: "freelancer", label: "Colaborador", render: (p) => p.paymentFreelancer?.name ?? "—" },
    { key: "date", label: "Data", render: (p) => fmtDate(p.paymentJob?.startTime) },
    { key: "branch", label: "Filial trabalhada", render: (p) => p.paymentJob?.jobBranch?.name ?? "—" },
    { key: "requested", label: "Solicitado", render: (p) => scheduledWindow(p) },
    { key: "punches", label: "Checkin/Checkout", render: (p) => formatActualPunches(p.paymentJob?.shifts) },
    { key: "workedMinutes", label: "Horas trab.", render: (p) => minutesToHours(p.paymentJob?.workedMinutes) },
    {
      key: "hourlyRate",
      label: "Valor H",
      render: (p) => { const r = effectiveHourlyRate(p); return r != null ? `R$ ${money(r)}` : "—"; },
    },
    { key: "freelancerAmount", label: "Total a pagar", render: (p) => `R$ ${money(Number(p.freelancerAmount ?? 0))}` },
    { key: "pixKey", label: "Chave Pix", render: (p) => p.paymentFreelancer?.contract?.pixKey ?? "—" },
  ];

  interface PayrollSummaryRow {
    freelancerId: string;
    freelancerName: string;
    pixKey: string;
    jobsCount: number;
    workedMinutes: number;
    total: number;
  }

  const summaryRows = useMemo<PayrollSummaryRow[]>(() => {
    const map = new Map<string, PayrollSummaryRow>();
    for (const p of rows) {
      const id = p.freelancerId;
      const minutes = p.paymentJob?.workedMinutes ?? 0;
      const total = Number(p.freelancerAmount ?? 0);
      const existing = map.get(id);
      if (existing) {
        existing.jobsCount += 1;
        existing.workedMinutes += minutes;
        existing.total += total;
      } else {
        map.set(id, {
          freelancerId: id,
          freelancerName: p.paymentFreelancer?.name ?? "—",
          pixKey: p.paymentFreelancer?.contract?.pixKey ?? "—",
          jobsCount: 1,
          workedMinutes: minutes,
          total,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.freelancerName.localeCompare(b.freelancerName));
  }, [rows]);

  const payrollTotal = useMemo(() => summaryRows.reduce((acc, r) => acc + r.total, 0), [summaryRows]);

  const payrollFileSuffix = useMemo(() => {
    const { from, to } = resolveDateBounds(payrollRange);
    if (!from && !to) return "todas-as-datas";
    return `${from ?? "inicio"}_a_${to ?? "hoje"}`;
  }, [payrollRange]);

  const exportDetailedCsv = () => {
    const headers = [
      "Vaga", "Colaborador", "Data", "Filial Trabalhada", "Solicitado",
      "Checkin/Checkout", "Horas trab.", "Valor H", "Total a pagar", "Chave Pix",
    ];
    const csvRows = rows.map((p) => {
      const rate = effectiveHourlyRate(p);
      return [
        p.paymentJob?.title ?? p.jobId.slice(0, 8),
        p.paymentFreelancer?.name ?? "—",
        fmtDate(p.paymentJob?.startTime),
        p.paymentJob?.jobBranch?.name ?? "—",
        scheduledWindow(p),
        formatActualPunches(p.paymentJob?.shifts),
        minutesToHours(p.paymentJob?.workedMinutes),
        rate != null ? money(rate) : "—",
        money(Number(p.freelancerAmount ?? 0)),
        p.paymentFreelancer?.contract?.pixKey ?? "—",
      ];
    });
    downloadCsv(`pagamento-colaboradores-detalhado-${payrollFileSuffix}.csv`, buildCsv(headers, csvRows));
  };

  const exportSummaryCsv = () => {
    const headers = ["Colaborador", "Chave Pix", "Vagas", "Horas trab.", "Total a pagar"];
    const csvRows = summaryRows.map((r) => [
      r.freelancerName, r.pixKey, r.jobsCount, minutesToHours(r.workedMinutes), money(r.total),
    ]);
    downloadCsv(`pagamento-colaboradores-resumo-${payrollFileSuffix}.csv`, buildCsv(headers, csvRows));
  };

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

          <h2 style={{ fontSize: "1.1rem" }}>Pagamento aos colaboradores</h2>
          <DateRangeQuickFilter
            value={payrollRange}
            onChange={setPayrollRange}
            presets={["todas", "hoje", "semana", "mes", "custom"]}
            label="Dias a pagar"
          />
          <FilterBar fields={filterFields} value={filter} onChange={setFilter} />
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "0.5rem 0" }}>
            <button className={panel.ghostBtn} onClick={exportDetailedCsv} disabled={rows.length === 0}>
              Exportar detalhado (CSV)
            </button>
            <button className={panel.ghostBtn} onClick={exportSummaryCsv} disabled={summaryRows.length === 0}>
              Exportar resumo por colaborador (CSV)
            </button>
          </div>
          <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} storageKey="agency-payroll" empty="Nenhum pagamento no período selecionado." />

          {summaryRows.length > 0 && (
            <>
              <h3 style={{ fontSize: "1rem", marginTop: "1.25rem" }}>Resumo por colaborador (período selecionado)</h3>
              <div style={{ overflowX: "auto" }}>
                <table className={panel.table}>
                  <thead>
                    <tr><th>Colaborador</th><th>Chave Pix</th><th>Vagas</th><th>Horas trab.</th><th>Total a pagar</th></tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((r) => (
                      <tr key={r.freelancerId}>
                        <td>{r.freelancerName}</td>
                        <td>{r.pixKey}</td>
                        <td>{r.jobsCount}</td>
                        <td>{minutesToHours(r.workedMinutes)}</td>
                        <td>R$ {money(r.total)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={4} style={{ textAlign: "right", fontWeight: 600 }}>Total geral</td>
                      <td style={{ fontWeight: 600 }}>R$ {money(payrollTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

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
    <RequireAuth role={["agency", "partner"]}>
      <RequirePermission feature="financeiro">
        <AgencyPayments />
      </RequirePermission>
    </RequireAuth>
  );
}
