import { useEffect, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/leader/Sidebar";
import RevokedNotice from "@/src/components/leader/RevokedNotice";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import api from "@/src/services/api";
import { getJobs, Job } from "@/src/services/jobService";
import { PAY_TYPE_LABELS, LeaderPayType } from "@/src/services/agencyMemberService";
import { useAuth } from "@/src/hooks/useAuth";

interface LeaderProfile {
  active?: boolean;
  agencyName?: string | null;
  payType?: LeaderPayType | null;
  payAmount?: number | null;
  availableBalance?: number;
}

function LeaderDashboard() {
  const { profile } = useAuth();
  const p = (profile ?? {}) as LeaderProfile;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [freelancerCount, setFreelancerCount] = useState(0);
  const [toApprove, setToApprove] = useState(0);

  useEffect(() => {
    getJobs().then(setJobs).catch(() => {});
    api.get("/freelancers").then((r) => setFreelancerCount(r.data.length)).catch(() => {});
    api.get("/agency/pending-counts").then((r) => setToApprove(r.data.registrationsToApprove ?? 0)).catch(() => {});
  }, []);

  if (p.active === false) return <RevokedNotice />;

  const open = jobs.filter((j) => j.status === "pending").length;
  const active = jobs.filter((j) => ["accepted", "in_progress"].includes(j.status)).length;

  return (
    <>
      <Head><title>Dashboard | Líder</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <div>
              <h1>Painel do Líder</h1>
              <p className={panel.muted}>
                {p.agencyName ?? "Sua agência"}
                {p.payType ? ` · pagamento: ${PAY_TYPE_LABELS[p.payType]} — R$ ${Number(p.payAmount ?? 0).toFixed(2)}` : ""}
              </p>
            </div>
          </header>
          <div className={panel.cards}>
            <div className={panel.card}><h2>{open}</h2><p>Vagas em aberto</p></div>
            <div className={panel.card}><h2>{active}</h2><p>Vagas em andamento</p></div>
            <div className={panel.card}><h2>{freelancerCount}</h2><p>Colaboradores no meu grupo</p></div>
            <div className={panel.card}><h2>{toApprove}</h2><p>Cadastros a aprovar</p></div>
          </div>
          <p className={panel.muted} style={{ marginTop: "1rem" }}>
            Você gerencia vagas e colaboradores. Faturamento, fechamentos e valores que a agência cobra
            dos supermercados ficam com o responsável pela agência.
          </p>
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="leader">
      <LeaderDashboard />
    </RequireAuth>
  );
}
