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
  getJobs, getAvailableJobs, acceptJob, checkIn, checkOut, endBreak, readGeolocation, hasOpenBreak, Job, JobShift,
  currentShift, nextPendingShift, sortShifts,
} from "@/src/services/jobService";
import { getJobPhotos, uploadJobPhoto, photoUrl } from "@/src/services/jobPhotoService";
import { getFreelancerReputation, FreelancerReputation as Reputation } from "@/src/services/reviewService";
import { distanceInMeters } from "@/src/lib/distance";
import { fmtDate, fmtTime, isoDateBR } from "@/src/lib/datetime";
import { useAuth } from "@/src/hooks/useAuth";

interface AffiliatedAgency {
  requireCheckoutPhoto?: boolean;
}

const errText = (err: unknown) =>
  axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : err instanceof Error ? err.message : "Erro.";

const WEEKDAY_LABELS = ["Domingo", "Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado"];
const NEXT_WEEKDAY_LABELS = [
  "Próximo Domingo", "Próxima Segunda-Feira", "Próxima Terça-Feira", "Próxima Quarta-Feira",
  "Próxima Quinta-Feira", "Próxima Sexta-Feira", "Próximo Sábado",
];

/** "Hoje" / "Amanhã" / dia da semana (até 6 dias à frente) / "Próximo(a) <dia>" (semana seguinte)
 *  / "DD/MM/AAAA" daí em diante. */
const relativeDayLabel = (value: string): string => {
  const target = isoDateBR(value);
  const today = isoDateBR(new Date());
  if (target === today) return "Hoje";
  const targetDate = new Date(`${target}T00:00:00-03:00`);
  const diffDays = Math.round(
    (targetDate.getTime() - new Date(`${today}T00:00:00-03:00`).getTime()) / 86_400_000
  );
  if (diffDays === 1) return "Amanhã";
  if (diffDays > 1 && diffDays < 7) return WEEKDAY_LABELS[targetDate.getDay()];
  if (diffDays >= 7 && diffDays < 14) return NEXT_WEEKDAY_LABELS[targetDate.getDay()];
  return fmtDate(value);
};

/** "das HH:MM às HH:MM" do turno — o horário real, não o rótulo do período. */
const shiftWindow = (s: JobShift) => `das ${fmtTime(s.startTime)} às ${fmtTime(s.endTime)}`;

function Home() {
  const { profile } = useAuth();
  const requirePhoto = ((profile as { affiliatedAgency?: AffiliatedAgency } | null)?.affiliatedAgency)?.requireCheckoutPhoto ?? true;
  const profilePhotoUrl = (profile?.profilePhotoUrl as string | null | undefined) ?? null;
  const firstName = ((profile?.name as string | undefined) ?? "").split(" ")[0];

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [reputation, setReputation] = useState<Reputation | null>(null);
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

  useEffect(() => {
    if (profile?.id) getFreelancerReputation(profile.id).then(setReputation).catch(() => {});
  }, [profile?.id]);

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

  /** Cabeçalho + função + local — sempre igual, não importa a ação. */
  const focusHeader = (job: Job, shift: JobShift | undefined) => {
    const local = `${job.jobSupermarket?.name ?? "—"}${job.jobBranch?.name ? ` — ${job.jobBranch.name}` : ""}`;
    const dayLabel = relativeDayLabel(shift?.startTime ?? job.startTime);
    return (
      <>
        <p className={styles.focusHeadline}>{dayLabel}{shift ? `, ${shiftWindow(shift)}` : ""}</p>
        <p className={styles.focusTitle}>{job.jobCategory?.name ?? "Vaga"}</p>
        <p className={styles.focusLocal}>{local}</p>
      </>
    );
  };

  /** Card único de foco: mesma estrutura sempre — cabeçalho (dia + horário), função, local, botão. */
  const renderFocus = (job: Job, shift: JobShift | undefined, action: { label: string; onClick?: () => void; href?: string; disabled?: boolean }) => (
    <div className={styles.highlightCardDark}>
      {focusHeader(job, shift)}
      {action.href ? (
        <Link href={action.href} className={styles.focusActionBtn}>{action.label}</Link>
      ) : (
        <button className={styles.focusActionBtn} disabled={action.disabled} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );

  const renderFocusCard = () => {
    if (!focusJob) return null;

    if (focusJob.status === "in_progress") {
      const cur = currentShift(focusJob);
      if (cur) {
        if (hasOpenBreak(focusJob.shifts)) {
          return renderFocus(focusJob, cur, {
            label: busy ? "Localizando…" : "Retomar ponto",
            disabled: busy,
            onClick: () => geoAction((geo) => endBreak(focusJob.id, geo)),
          });
        }
        const needsPhoto = requirePhoto && photoCount === 0;
        if (needsPhoto) {
          return (
            <div className={styles.highlightCardDark}>
              {focusHeader(focusJob, cur)}
              <p className={styles.focusLocal}>Anexe uma foto pra liberar o check-out.</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setCheckoutFile(e.target.files?.[0] ?? null)}
                />
                <button className={styles.focusActionBtn} disabled={!checkoutFile || busy} onClick={attachPhoto}>
                  {busy ? "Anexando…" : "Anexar foto"}
                </button>
              </div>
            </div>
          );
        }
        return renderFocus(focusJob, cur, {
          label: busy ? "Localizando…" : "Check-out",
          disabled: busy,
          onClick: () => geoAction((geo) => checkOut(focusJob.id, geo)),
        });
      }

      const nxt = nextPendingShift(focusJob);
      if (nxt) {
        return renderFocus(focusJob, nxt, {
          label: busy ? "Localizando…" : "Check-in",
          disabled: busy,
          onClick: () => geoAction((geo) => checkIn(focusJob.id, geo)),
        });
      }

      return renderFocus(focusJob, undefined, { label: "Ver detalhes", href: "/freelancer/jobs" });
    }

    // accepted, ainda não iniciada — mostra só o próximo turno, não todos.
    const nxt = nextPendingShift(focusJob) ?? sortShifts(focusJob.shifts)[0];
    return renderFocus(focusJob, nxt, {
      label: busy ? "Localizando…" : "Check-in",
      disabled: busy,
      onClick: () => geoAction((geo) => checkIn(focusJob.id, geo)),
    });
  };

  return (
    <PanelPage
      title="Home | Colaborador"
      heading={
        <span className={styles.homeGreeting}>
          {profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl(profilePhotoUrl)} alt="" className={styles.homeAvatar} />
          ) : (
            <span className={styles.homeAvatarFallback} aria-hidden="true">
              {(firstName || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <span>
            <span className={styles.homeGreetingName}>Olá, {firstName || "colaborador"}</span>
            {reputation?.ratingAvg != null && reputation.ratingCount > 0 && (
              <span className={styles.homeRating}>
                <span className={styles.homeRatingStar}>★</span> {reputation.ratingAvg.toFixed(1).replace(".", ",")}
              </span>
            )}
          </span>
        </span>
      }
      sidebar={<Sidebar />}
    >
      {error && <p className={panel.error}>{error}</p>}

      <div className={styles.homeStage}>
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
      </div>
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
