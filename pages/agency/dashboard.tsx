import { useEffect, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/agency/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import { getJobs, Job } from "@/src/services/jobService";
import { getMyFreelancers } from "@/src/services/agencyService";
import { getAgencySettings } from "@/src/services/agencySettingsService";
import { useAuth } from "@/src/hooks/useAuth";

function Dashboard() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [freelancerCount, setFreelancerCount] = useState(0);
  const [reviewEnabled, setReviewEnabled] = useState(false);

  useEffect(() => {
    getJobs().then(setJobs).catch(() => {});
    getAgencySettings().then((s) => setReviewEnabled(s.reviewEnabled)).catch(() => {});
    const agencyId = (profile as { id?: string } | null)?.id;
    if (agencyId) getMyFreelancers(agencyId).then((f) => setFreelancerCount(f.length)).catch(() => {});
  }, [profile]);

  const balance = Number((profile as { availableBalance?: number } | null)?.availableBalance ?? 0);
  const active = jobs.filter((j) => ["accepted", "in_progress"].includes(j.status)).length;
  const pendingReviews = reviewEnabled
    ? jobs.filter((j) => j.status === "completed" && !j.jobReview).length
    : 0;

  return (
    <>
      <Head><title>Dashboard | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Painel da Agência</h1></header>
          <div className={panel.cards}>
            <div className={panel.card}><h2>R$ {balance.toFixed(2)}</h2><p>Saldo de comissão</p></div>
            <div className={panel.card}><h2>{freelancerCount}</h2><p>Colaboradores</p></div>
            <div className={panel.card}><h2>{active}</h2><p>Vagas em andamento</p></div>
            <div className={panel.card}><h2>{pendingReviews}</h2><p>Avaliações pendentes</p></div>
          </div>
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="agency">
      <Dashboard />
    </RequireAuth>
  );
}
