import { useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import { getAvailableJobs, acceptJob, Job, formatShifts, minutesToHours } from "@/src/services/jobService";

function AvailableJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setJobs(await getAvailableJobs());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const accept = async (id: string) => {
    setError(null);
    try {
      await acceptJob(id);
      await load();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao aceitar." : "Erro ao aceitar.");
    }
  };

  return (
    <>
      <Head><title>Vagas disponíveis | Freelancer</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Vagas disponíveis</h1></header>
          {error && <p className={panel.error}>{error}</p>}
          {loading ? (
            <p>Carregando…</p>
          ) : (
            <table className={panel.table}>
              <thead>
                <tr><th>Título</th><th>Supermercado</th><th>Filial</th><th>Função</th><th>Data</th><th>Turnos</th><th>Horas</th><th></th></tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td>{j.title}</td>
                    <td>{j.jobSupermarket?.name ?? "—"}</td>
                    <td>{j.jobBranch?.name ?? "—"}</td>
                    <td>{j.jobCategory?.name ?? "—"}</td>
                    <td>{new Date(j.startTime).toLocaleDateString("pt-BR")}</td>
                    <td>{formatShifts(j.shifts)}</td>
                    <td>{minutesToHours(j.contractedMinutes)}</td>
                    <td><button className={panel.primaryBtn} onClick={() => accept(j.id)}>Aceitar</button></td>
                  </tr>
                ))}
                {jobs.length === 0 && <tr><td colSpan={8}>Nenhuma vaga disponível no momento.</td></tr>}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="freelancer">
      <AvailableJobs />
    </RequireAuth>
  );
}
