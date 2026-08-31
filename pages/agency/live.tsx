import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/agency/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import { getLiveJobs, Job } from "@/src/services/jobService";

const elapsed = (since: string) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(since).getTime()) / 60000));
  const h = Math.floor(min / 60);
  return h > 0 ? `${h}h${String(min % 60).padStart(2, "0")}` : `${min}min`;
};

function LivePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setJobs(await getLiveJobs());
      setUpdatedAt(new Date());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <>
      <Head><title>Ao vivo | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>Freelancers trabalhando agora</h1>
            <button className={panel.ghostBtn} onClick={load}>Atualizar</button>
          </header>
          {updatedAt && <p className={panel.muted}>Atualizado às {updatedAt.toLocaleTimeString("pt-BR")}. Recarrega sozinho a cada 30s.</p>}

          {loading ? (
            <p>Carregando…</p>
          ) : jobs.length === 0 ? (
            <p className={panel.muted}>Ninguém da sua rede está em serviço no momento.</p>
          ) : (
            <table className={panel.table}>
              <thead>
                <tr><th>Freelancer</th><th>Vaga</th><th>Supermercado / Filial</th><th>Turno atual desde</th><th>Localização</th></tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const shift = [...(j.shifts ?? [])].sort((a, b) => a.position - b.position).find((s) => s.status === "in_progress");
                  const lastCheckin = [...(j.jobLogs ?? [])]
                    .filter((l) => l.eventType === "check-in")
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                  const coords = lastCheckin?.latitude != null && lastCheckin?.longitude != null
                    ? `${lastCheckin.latitude},${lastCheckin.longitude}` : null;
                  return (
                    <tr key={j.id}>
                      <td>{j.assignedFreelancer?.name ?? "—"}</td>
                      <td>{j.title}</td>
                      <td>{j.jobSupermarket?.name ?? "—"}{j.jobBranch?.name ? ` · ${j.jobBranch.name}` : ""}</td>
                      <td>{shift?.checkInAt ? `${elapsed(shift.checkInAt)} (${shift.label || "turno"})` : "—"}</td>
                      <td>
                        {coords ? (
                          <a href={`https://www.google.com/maps?q=${coords}`} target="_blank" rel="noreferrer">ver no mapa</a>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
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
    <RequireAuth role="agency">
      <LivePage />
    </RequireAuth>
  );
}
