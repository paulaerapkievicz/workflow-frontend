import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import PanelPage from "@/src/components/panel/PanelPage";
import JobCarousel from "@/src/components/freelancer/JobCarousel";
import panel from "@/styles/panel.module.scss";
import styles from "@/styles/dashboard.module.scss";
import {
  getJobs, getAvailableJobs, acceptJob, checkIn, checkOut, readGeolocation, Job,
  currentShift, nextPendingShift, sortShifts,
} from "@/src/services/jobService";
import { getJobPhotos, uploadJobPhoto } from "@/src/services/jobPhotoService";
import { distanceInMeters } from "@/src/lib/distance";
import { fmtTime, fmtDate, isoDateBR } from "@/src/lib/datetime";
import { useAuth } from "@/src/hooks/useAuth";

interface AffiliatedAgency {
  requireCheckoutPhoto?: boolean;
}

const errText = (err: unknown) =>
  axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : err instanceof Error ? err.message : "Erro.";

function Home() {
  const { profile } = useAuth();
  const requirePhoto = ((profile as { affiliatedAgency?: AffiliatedAgency } | null)?.affiliatedAgency)?.requireCheckoutPhoto ?? true;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoCount, setPhotoCount] = useState(0);
  const [checkoutFile, setCheckoutFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nearby, setNearby] = useState<Job[]>([]);
  const [me, setMe] = useState<{ latitude: number; longitude: number } | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setJobs(await getJobs());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const todayStr = isoDateBR(new Date());
  const isToday = (j: Job) => isoDateBR(j.startTime) === todayStr;

  const focusJob =
    jobs.find((j) => j.status === "in_progress") ??
    jobs
      .filter((j) => j.status === "accepted")
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] ??
    null;

  useEffect(() => {
    setCheckoutFile(null);
    if (!focusJob || focusJob.status !== "in_progress") { setPhotoCount(0); return; }
    getJobPhotos(focusJob.id).then((p) => setPhotoCount(p.length)).catch(() => setPhotoCount(0));
  }, [focusJob?.id, focusJob?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (focusJob) return;
    getAvailableJobs().then(setNearby).catch(() => {});
    readGeolocation().then((geo) => setMe({ latitude: geo.latitude, longitude: geo.longitude })).catch(() => {});
  }, [focusJob]);

  const geoAction = async (fn: (geo: Awaited<ReturnType<typeof readGeolocation>>) => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      const geo = await readGeolocation();
      await fn(geo);
      await load();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const attachPhoto = async () => {
    if (!focusJob || !checkoutFile) return;
    setError(null);
    setBusy(true);
    try {
      await uploadJobPhoto(focusJob.id, checkoutFile);
      setPhotoCount((c) => c + 1);
      setCheckoutFile(null);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const accept = async (id: string) => {
    setError(null);
    setAcceptingId(id);
    try {
      await acceptJob(id);
      await load();
    } catch (err) {
      setError(errText(err));
    } finally {
      setAcceptingId(null);
    }
  };

  const distanceOf = (j: Job): number | null => {
    if (!me || j.jobBranch?.latitude == null || j.jobBranch?.longitude == null) return null;
    return distanceInMeters(me.latitude, me.longitude, Number(j.jobBranch.latitude), Number(j.jobBranch.longitude));
  };

  const sortedNearby = me
    ? [...nearby].sort((a, b) => {
        const da = distanceOf(a);
        const db = distanceOf(b);
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      })
    : nearby;

  const renderFocusCard = () => {
    if (!focusJob) return null;

    const local = `${focusJob.jobSupermarket?.name ?? "—"}${focusJob.jobBranch?.name ? ` — ${focusJob.jobBranch.name}` : ""}`;

    if (focusJob.status === "in_progress") {
      const cur = currentShift(focusJob);
      if (cur) {
        const needsPhoto = requirePhoto && photoCount === 0;
        return (
          <div className={styles.highlightCardDark}>
            <h3>Turno em andamento</h3>
            <p>{focusJob.jobCategory?.name ?? "Vaga"} no {local}</p>
            {needsPhoto ? (
              <>
                <p>Anexe uma foto pra liberar o check-out.</p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setCheckoutFile(e.target.files?.[0] ?? null)}
                  />
                  <button className={styles.darkCardBtn} disabled={!checkoutFile || busy} onClick={attachPhoto}>
                    {busy ? "Anexando…" : "Anexar foto"}
                  </button>
                </div>
              </>
            ) : (
              <button className={styles.darkCardBtn} disabled={busy} onClick={() => geoAction((geo) => checkOut(focusJob.id, geo))}>
                {busy ? "Localizando…" : "Check-out"}
              </button>
            )}
          </div>
        );
      }

      const nxt = nextPendingShift(focusJob);
      if (nxt) {
        return (
          <div className={styles.highlightCardDark}>
            <h3>Próximo turno, {fmtTime(nxt.startTime)} às {fmtTime(nxt.endTime)}</h3>
            <p>{focusJob.jobCategory?.name ?? "Vaga"} no {local}</p>
            <button className={styles.darkCardBtn} disabled={busy} onClick={() => geoAction((geo) => checkIn(focusJob.id, geo))}>
              {busy ? "Localizando…" : "Check-in"}
            </button>
          </div>
        );
      }

      return (
        <div className={styles.highlightCardDark}>
          <h3>Turnos concluídos</h3>
          <Link href="/freelancer/jobs" className={styles.darkCardBtn}>Ver detalhes</Link>
        </div>
      );
    }

    // accepted, ainda não iniciada — mostra só o próximo turno, não todos.
    const nxt = nextPendingShift(focusJob) ?? sortShifts(focusJob.shifts)[0];
    return (
      <div className={styles.highlightCardDark}>
        <h3>{isToday(focusJob) ? "Hoje" : fmtDate(focusJob.startTime)}{nxt ? `, ${fmtTime(nxt.startTime)} às ${fmtTime(nxt.endTime)}` : ""}</h3>
        <p>{focusJob.jobCategory?.name ?? "Vaga"} no {local}</p>
        <button className={styles.darkCardBtn} disabled={busy} onClick={() => geoAction((geo) => checkIn(focusJob.id, geo))}>
          {busy ? "Localizando…" : "Check-in"}
        </button>
      </div>
    );
  };

  return (
    <PanelPage title="Home | Colaborador" heading="Olá!" sidebar={<Sidebar />}>
      {error && <p className={panel.error}>{error}</p>}

      {loading ? (
        <p className={panel.muted}>Carregando…</p>
      ) : focusJob ? (
        renderFocusCard()
      ) : (
        <div className={styles.highlightCard}>
          <h3>Vagas próximas à sua região</h3>
          {sortedNearby.length === 0 ? (
            <p className={panel.muted}>Nenhuma vaga disponível no momento.</p>
          ) : (
            <JobCarousel jobs={sortedNearby.slice(0, 8)} distanceOf={distanceOf} acceptingId={acceptingId} onAccept={accept} />
          )}
          <Link href="/freelancer" className={panel.linkBtn}>Ver todas as vagas</Link>
        </div>
      )}
    </PanelPage>
  );
}

export default function Page() {
  return (
    <RequireAuth role="freelancer" enforceOnboarding>
      <Home />
    </RequireAuth>
  );
}
