import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import PanelPage from "@/src/components/panel/PanelPage";
import panel from "@/styles/panel.module.scss";
import app from "@/styles/freelancerApp.module.scss";
import {
  getAvailableJobs, acceptJob, Job, formatShifts, formatShiftPeriods, minutesToHours, mapUrl, readGeolocation,
} from "@/src/services/jobService";
import { distanceInMeters, formatDistance } from "@/src/lib/distance";
import { fmtDate } from "@/src/lib/datetime";
import DateRangeQuickFilter from "@/src/components/DateRangeQuickFilter";
import CollapsibleFilterBar from "@/src/components/panel/CollapsibleFilterBar";
import HelpIcon from "@/src/components/common/HelpIcon";
import { SkeletonCard } from "@/src/components/common/Skeleton";
import { useDateRangeFilter } from "@/src/hooks/useDateRangeFilter";
import { inDateRange } from "@/src/lib/dateRange";

function AvailableJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const [fnFilter, setFnFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [superFilter, setSuperFilter] = useState("");
  const [range, setRange] = useDateRangeFilter("freelancer-available-daterange");
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
    setAcceptingId(id);
    try {
      await acceptJob(id);
      await load();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao aceitar." : "Erro ao aceitar.");
    } finally {
      setAcceptingId(null);
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
  const supermarketNames = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.jobSupermarket?.name).filter(Boolean))) as string[],
    [jobs]
  );

  const distanceOf = (j: Job): number | null => {
    if (!me || j.jobBranch?.latitude == null || j.jobBranch?.longitude == null) return null;
    return distanceInMeters(me.latitude, me.longitude, Number(j.jobBranch.latitude), Number(j.jobBranch.longitude));
  };

  const rows = useMemo(() => {
    const maxMeters = maxKm ? Number(maxKm) * 1000 : null;
    let list = jobs.filter((j) => {
      if (!inDateRange(j.startTime, range)) return false;
      if (fnFilter && j.jobCategory?.name !== fnFilter) return false;
      if (branchFilter && j.jobBranch?.name !== branchFilter) return false;
      if (superFilter && j.jobSupermarket?.name !== superFilter) return false;
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
  }, [jobs, fnFilter, branchFilter, superFilter, range, me, maxKm]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PanelPage
      title="Vagas disponíveis | Colaborador"
      heading={
        <>
          Vagas disponíveis
          <HelpIcon title="Como funciona esta lista">
            <p>Você vê apenas vagas das funções marcadas no seu perfil e cujo turno ainda não passou.</p>
            <p>Só é possível aceitar uma vaga por período — sem horários sobrepostos.</p>
          </HelpIcon>
        </>
      }
      sidebar={<Sidebar />}
    >
      {error && <p className={panel.error}>{error}</p>}

      <CollapsibleFilterBar>
        <DateRangeQuickFilter value={range} onChange={setRange} />
        <label className={panel.filterField}>
          <span>Supermercado</span>
          <select value={superFilter} onChange={(e) => setSuperFilter(e.target.value)}>
            <option value="">Todos</option>
            {supermarketNames.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
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
        {(fnFilter || branchFilter || superFilter || maxKm || range.preset !== "todas") && (
          <button
            type="button"
            className={panel.ghostBtn}
            onClick={() => {
              setFnFilter("");
              setBranchFilter("");
              setSuperFilter("");
              setMaxKm("");
              setRange({ preset: "todas" });
            }}
          >
            Limpar
          </button>
        )}
      </CollapsibleFilterBar>

      {loading ? (
        <div className={app.jobGrid}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : rows.length === 0 ? (
        <p className={app.emptyState}>Nenhuma vaga disponível no momento.</p>
      ) : (
        <div className={app.jobGrid}>
          {rows.map((j) => {
            const d = distanceOf(j);
            return (
              <div key={j.id} className={app.card}>
                <div className={app.cardTop}>
                  <div>
                    <p className={app.cardTitle}>{j.title}</p>
                    <p className={app.cardMeta}>
                      {j.jobSupermarket?.name ?? "—"}
                      {j.jobBranch?.name ? ` — ${j.jobBranch.name}` : ""}
                      {j.jobBranch?.address && (
                        <> · <a href={mapUrl(j.jobBranch.address) ?? "#"} target="_blank" rel="noreferrer">mapa</a></>
                      )}
                    </p>
                  </div>
                  {d != null && <span className={app.distanceTag}>{formatDistance(d)}</span>}
                </div>
                <p className={app.cardMeta}>
                  {j.jobCategory?.name ?? "—"} · {fmtDate(j.startTime)}
                </p>
                <p className={app.cardMeta}>
                  {formatShiftPeriods(j)} · {formatShifts(j.shifts)} · {minutesToHours(j.contractedMinutes)}
                </p>
                <div className={app.cardFooter}>
                  <button
                    className={panel.primaryBtn}
                    disabled={acceptingId === j.id}
                    onClick={() => accept(j.id)}
                  >
                    {acceptingId === j.id ? "Aceitando…" : "Aceitar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PanelPage>
  );
}

export default function Page() {
  return (
    <RequireAuth role="freelancer" enforceOnboarding>
      <AvailableJobs />
    </RequireAuth>
  );
}
