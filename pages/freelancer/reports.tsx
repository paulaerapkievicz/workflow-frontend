import { useEffect, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import { getFreelancerReport, FreelancerReport } from "@/src/services/billingService";
import { getFreelancerReputation, FreelancerReputation as Reputation } from "@/src/services/reviewService";
import { getFreelancerLeaders, AssignedLeader } from "@/src/services/agencyMemberService";
import FreelancerReputation from "@/src/components/FreelancerReputation";
import { AssignedLeaders } from "@/src/components/FreelancerChip";
import { useAuth } from "@/src/hooks/useAuth";
import { fmtDate } from "@/src/lib/datetime";

const hrs = (h: number) => `${h.toFixed(1).replace(".", ",")} h`;
const money = (v: number) => `R$ ${Number(v).toFixed(2)}`;

function ReportsPage() {
  const { profile } = useAuth();
  const [report, setReport] = useState<FreelancerReport | null>(null);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [leaders, setLeaders] = useState<AssignedLeader[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFreelancerReport().then(setReport).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    getFreelancerReputation(profile.id).then(setReputation).catch(() => {});
    getFreelancerLeaders(profile.id).then(setLeaders).catch(() => {});
  }, [profile]);

  return (
    <>
      <Head><title>Relatório | Colaborador</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Relatório de trabalhos</h1></header>

          {loading || !report ? (
            <p>Carregando…</p>
          ) : (
            <>
              {reputation && (
                <div className={panel.card} style={{ marginBottom: "1rem" }}>
                  <div className={panel.tableToolbar}><strong>Minha reputação</strong></div>
                  <FreelancerReputation reputation={reputation} compact />
                  <AssignedLeaders leaders={leaders} />
                </div>
              )}

              <div className={panel.cards}>
                <div className={panel.card}><h2>{report.totals.jobsCount}</h2><p>Trabalhos concluídos</p></div>
                <div className={panel.card}><h2>{hrs(report.totals.workedHours)}</h2><p>Horas trabalhadas</p></div>
                <div className={panel.card}><h2>{money(report.totals.earned)}</h2><p>Total recebido</p></div>
                <div className={panel.card}><h2>{money(report.totals.availableBalance)}</h2><p>Saldo na carteira</p></div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className={panel.table} style={{ marginTop: "1rem" }}>
                  <thead>
                    <tr><th>Data</th><th>Vaga</th><th>Função</th><th>Local</th><th>Horas contr.</th><th>Horas trab.</th><th>Valor recebido</th></tr>
                  </thead>
                  <tbody>
                    {report.items.map((i) => (
                      <tr key={i.jobId}>
                        <td>{fmtDate(i.date)}</td>
                        <td>{i.title}</td>
                        <td>{i.categoryName ?? "—"}</td>
                        <td>{i.supermarketName ?? "—"}{i.branchName ? ` · ${i.branchName}` : ""}</td>
                        <td>{hrs(i.contractedHours)}</td>
                        <td>{hrs(i.workedHours)}</td>
                        <td>{money(i.amount)}</td>
                      </tr>
                    ))}
                    {report.items.length === 0 && <tr><td colSpan={7}>Nenhum trabalho concluído ainda.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="freelancer">
      <ReportsPage />
    </RequireAuth>
  );
}
