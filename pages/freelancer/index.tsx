import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import {
  getAvailableJobs, acceptJob, Job, formatShifts, formatShiftPeriods, minutesToHours, mapUrl, readGeolocation,
} from "@/src/services/jobService";
import { distanceInMeters, formatDistance } from "@/src/lib/distance";
import OnboardingBanner from "@/src/components/freelancer/OnboardingBanner";

function AvailableJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fnFilter, setFnFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [me, setMe] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [maxKm, setMaxKm] = useState("");

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

  const useMyLocation = async () => {
    setLocBusy(true);
    setError(null);
    try {
      const geo = await readGeolocation();
      setMe({ latitude: geo.latitude, longitude: geo.longitude });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível obter sua localização.");
    } finally {
      setLocBusy(false);
    }
  };

  const functions = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.jobCategory?.name).filter(Boolean))) as string[],
    [jobs]
  );
  const branchNames = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.jobBranch?.name).filter(Boolean))) as string[],
    [jobs]
  );

  const distanceOf = (j: Job): number | null => {
    if (!me || j.jobBranch?.latitude == null || j.jobBranch?.longitude == null) return null;
    return distanceInMeters(me.latitude, me.longitude, Number(j.jobBranch.latitude), Number(j.jobBranch.longitude));
  };

  const rows = useMemo(() => {
    const maxMeters = maxKm ? Number(maxKm) * 1000 : null;
    let list = jobs.filter((j) => {
      if (fnFilter && j.jobCategory?.name !== fnFilter) return false;
      if (branchFilter && j.jobBranch?.name !== branchFilter) return false;
      if (maxMeters != null) {
        const d = distanceOf(j);
        if (d == null || d > maxMeters) return false;
      }
      return true;
    });
    if (me) {
      list = [...list].sort((a, b) => {
        const da = distanceOf(a);
        const db = distanceOf(b);
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
    }
    return list;
  }, [jobs, fnFilter, branchFilter, me, maxKm]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Head><title>Vagas disponíveis | Colaborador</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Vagas disponíveis</h1></header>
          <OnboardingBanner />
          <p className={panel.muted}>
            Você vê apenas vagas das funções marcadas no seu perfil e cujo turno ainda não passou.
            Só pode aceitar uma vaga por período — sem horários sobrepostos.
          </p>
          {error && <p className={panel.error}>{error}</p>}

          <div className={panel.filterBar}>
            <label className={panel.filterField}>
              <span>Função</span>
              <select value={fnFilter} onChange={(e) => setFnFilter(e.target.value)}>
                <option value="">Todas</option>
                {functions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label className={panel.filterField}>
              <span>Loja</span>
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                <option value="">Todas</option>
                {branchNames.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className={panel.filterField}>
              <span>Até (km)</span>
              <input
                type="number"
                min={1}
                step={1}
                value={maxKm}
                onChange={(e) => setMaxKm(e.target.value)}
                placeholder="sem limite"
                disabled={!me}
              />
            </label>
            <button type="button" className={panel.ghostBtn} onClick={useMyLocation} disabled={locBusy}>
              {locBusy ? "Localizando…" : me ? "Atualizar minha localização" : "Ordenar pelas mais próximas"}
            </button>
            {(fnFilter || branchFilter || maxKm) && (
              <button
                type="button"
                className={panel.ghostBtn}
                onClick={() => { setFnFilter(""); setBranchFilter(""); setMaxKm(""); }}
              >
                Limpar
              </button>
            )}
          </div>

          {loading ? (
            <p>Carregando…</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className={panel.table}>
                <thead>
                  <tr>
                    <th>Título</th><th>Supermercado</th><th>Filial</th>
                    {me && <th>Distância</th>}
                    <th>Função</th><th>Data</th><th>Turno</th><th>Horário</th><th>Horas</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((j) => {
                    const d = distanceOf(j);
                    return (
                      <tr key={j.id}>
                        <td>{j.title}</td>
                        <td>{j.jobSupermarket?.name ?? "—"}</td>
                        <td>
                          {j.jobBranch?.name ?? "—"}
                          {j.jobBranch?.address && (
                            <> <a href={mapUrl(j.jobBranch.address) ?? "#"} target="_blank" rel="noreferrer">mapa</a></>
                          )}
                        </td>
                        {me && <td>{d == null ? "—" : formatDistance(d)}</td>}
                        <td>{j.jobCategory?.name ?? "—"}</td>
                        <td>{new Date(j.startTime).toLocaleDateString("pt-BR")}</td>
                        <td>{formatShiftPeriods(j)}</td>
                        <td>{formatShifts(j.shifts)}</td>
                        <td>{minutesToHours(j.contractedMinutes)}</td>
                        <td><button className={panel.primaryBtn} onClick={() => accept(j.id)}>Aceitar</button></td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={me ? 10 : 9} className={panel.muted}>Nenhuma vaga disponível no momento.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
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
