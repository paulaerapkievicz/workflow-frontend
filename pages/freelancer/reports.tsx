import { Fragment, useEffect, useMemo, useState } from "react";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import PanelPage from "@/src/components/panel/PanelPage";
import DateRangeQuickFilter from "@/src/components/DateRangeQuickFilter";
import CollapsibleFilterBar from "@/src/components/panel/CollapsibleFilterBar";
import CategoryBranchFilter, { BranchOption } from "@/src/components/freelancer/CategoryBranchFilter";
import JobMovementsTable from "@/src/components/JobMovementsTable";
import { SkeletonCard, SkeletonStatGrid, SkeletonTableRows } from "@/src/components/common/Skeleton";
import panel from "@/styles/panel.module.scss";
import {
  getFreelancerReport, downloadFreelancerReportPdf, FreelancerReport,
} from "@/src/services/billingService";
import { getFreelancerReputation, FreelancerReputation as Reputation } from "@/src/services/reviewService";
import { getFreelancerLeaders, AssignedLeader } from "@/src/services/agencyMemberService";
import FreelancerReputation from "@/src/components/FreelancerReputation";
import { AssignedLeaders } from "@/src/components/FreelancerChip";
import { useAuth } from "@/src/hooks/useAuth";
import { useDateRangeFilter } from "@/src/hooks/useDateRangeFilter";
import { inDateRange, resolveDateBounds } from "@/src/lib/dateRange";
import { fmtDate } from "@/src/lib/datetime";

const hrs = (h: number) => `${h.toFixed(1).replace(".", ",")} h`;
const money = (v: number) => `R$ ${Number(v).toFixed(2)}`;

function ReportsPage() {
  const { profile } = useAuth();
  const [report, setReport] = useState<FreelancerReport | null>(null);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [leaders, setLeaders] = useState<AssignedLeader[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const [range, setRange] = useDateRangeFilter("freelancer-reports-daterange", { preset: "todas" });
  const [categoryId, setCategoryId] = useState("");
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    getFreelancerReport().then(setReport).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    getFreelancerReputation(profile.id).then(setReputation).catch(() => {});
    getFreelancerLeaders(profile.id).then(setLeaders).catch(() => {});
  }, [profile]);

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
        .filter((i) => !branchId || i.branchId === branchId),
    [report, range, categoryId, branchId]
  );

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      const { from, to } = resolveDateBounds(range);
      await downloadFreelancerReportPdf({ from, to, categoryId: categoryId || undefined, branchId: branchId || undefined });
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <PanelPage title="Relatório | Colaborador" heading="Relatório de trabalhos" sidebar={<Sidebar />}>
      {loading || !report ? (
        <>
          <SkeletonCard lines={2} />
          <SkeletonStatGrid count={4} />
          <SkeletonTableRows rows={4} />
        </>
      ) : (
        <>
          {reputation && (
            <div className={panel.card}>
              <div className={panel.tableToolbar}><strong>Minha reputação</strong></div>
              <FreelancerReputation reputation={reputation} compact />
              <AssignedLeaders leaders={leaders} />
            </div>
          )}

          <div className={panel.cards}>
            <div className={panel.card}><h2>{items.length}</h2><p>Trabalhos concluídos</p></div>
            <div className={panel.card}><h2>{hrs(items.reduce((a, i) => a + i.workedHours, 0))}</h2><p>Horas trabalhadas</p></div>
            <div className={panel.card}><h2>{money(items.reduce((a, i) => a + i.amount, 0))}</h2><p>Total recebido</p></div>
            <div className={panel.card}><h2>{money(report.totals.availableBalance)}</h2><p>Saldo na carteira</p></div>
          </div>

          <CollapsibleFilterBar>
            <DateRangeQuickFilter value={range} onChange={setRange} presets={["hoje", "semana", "mes", "custom", "todas"]} />
            <CategoryBranchFilter
              categoryId={categoryId} onCategoryChange={setCategoryId}
              branchId={branchId} onBranchChange={setBranchId}
              branches={branches}
            />
          </CollapsibleFilterBar>

          <div>
            <button className={panel.ghostBtn} onClick={downloadPdf} disabled={pdfBusy}>
              {pdfBusy ? "Baixando…" : "Baixar PDF"}
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className={panel.table}>
              <thead>
                <tr><th>Data</th><th>Vaga</th><th>Função</th><th>Local</th><th>Horas contr.</th><th>Horas trab.</th><th>Valor recebido</th><th></th></tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <Fragment key={i.jobId}>
                    <tr>
                      <td>{fmtDate(i.date)}</td>
                      <td>{i.title}</td>
                      <td>{i.categoryName ?? "—"}</td>
                      <td>{i.supermarketName ?? "—"}{i.branchName ? ` · ${i.branchName}` : ""}</td>
                      <td>{hrs(i.contractedHours)}</td>
                      <td>{hrs(i.workedHours)}</td>
                      <td>{money(i.amount)}</td>
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
                        <td colSpan={8}>
                          <JobMovementsTable shifts={i.shifts} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {items.length === 0 && <tr><td colSpan={8}>Nenhum trabalho concluído neste filtro.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PanelPage>
  );
}

export default function Page() {
  return (
    <RequireAuth role="freelancer" enforceOnboarding>
      <ReportsPage />
    </RequireAuth>
  );
}
