import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/freelancer/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import panel from "@/styles/panel.module.scss";
import {
  getJobs, checkIn, checkOut, withdrawJob, readGeolocation, canFreelancerCancel,
  mapUrl, mapEmbedUrl, Job, JobShift, formatShifts, formatShiftPeriods, minutesToHours,
} from "@/src/services/jobService";
import { getJobPhotos, uploadJobPhoto, photoUrl, JobPhoto } from "@/src/services/jobPhotoService";
import { authService } from "@/src/services/authService";
import { useAuth } from "@/src/hooks/useAuth";
import OnboardingBanner from "@/src/components/freelancer/OnboardingBanner";

const SHIFT_STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando", in_progress: "Em andamento", done: "Concluído", missed: "Perdido",
};

const sortShifts = (shifts?: JobShift[]) => [...(shifts ?? [])].sort((a, b) => a.position - b.position);

type Period = "hoje" | "semana" | "mes" | "tudo";
const PERIOD_LABELS: Record<Period, string> = { hoje: "Hoje", semana: "Semana", mes: "Mês", tudo: "Tudo" };

/** A vaga cai no período escolhido? (baseado no início da vaga) */
const inPeriod = (iso: string, period: Period): boolean => {
  if (period === "tudo") return true;
  const d = new Date(iso);
  const now = new Date();
  if (period === "hoje") return d.toDateString() === now.toDateString();
  const days = period === "semana" ? 7 : 31;
  const start = new Date(now); start.setDate(now.getDate() - days);
  const end = new Date(now); end.setDate(now.getDate() + days);
  return d >= start && d <= end;
};

/** Prioridade de exibição: em andamento → aceita → concluída → cancelada. */
const STATUS_ORDER: Record<string, number> = {
  in_progress: 0, accepted: 1, completed: 2, pending: 3, canceled: 4,
};

interface AffiliatedAgency {
  cancellationWindowMinutes?: number;
  requireCheckoutPhoto?: boolean;
}

function MyJobs() {
  const freelancerId = authService.getProfileId();
  const { profile } = useAuth();
  const agency = ((profile as { affiliatedAgency?: AffiliatedAgency } | null)?.affiliatedAgency) ?? {};
  const cancelWindow = agency.cancellationWindowMinutes ?? 30;
  const requirePhoto = agency.requireCheckoutPhoto ?? true;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [period, setPeriod] = useState<Period>("semana");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [mapJobId, setMapJobId] = useState<string | null>(null);
  const [photoJob, setPhotoJob] = useState<Job | null>(null);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [photoCount, setPhotoCount] = useState<Record<string, number>>({});
  const [banner, setBanner] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [checkoutFile, setCheckoutFile] = useState<File | null>(null);
  const [attaching, setAttaching] = useState(false);

  const mine = useMemo(
    () => jobs.filter((j) => j.freelancerId && j.freelancerId === freelancerId),
    [jobs, freelancerId]
  );

  const visible = useMemo(
    () =>
      [...mine]
        .filter((j) => inPeriod(j.startTime, period))
        .sort((a, b) => {
          const s = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
          return s !== 0 ? s : new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        }),
    [mine, period]
  );

  const load = async () => {
    setLoading(true);
    try {
      const all = await getJobs();
      setJobs(all);
      const active = all.filter(
        (j) => j.freelancerId === freelancerId && ["accepted", "in_progress"].includes(j.status)
      );
      const counts: Record<string, number> = {};
      await Promise.all(
        active.map(async (j) => {
          try { counts[j.id] = (await getJobPhotos(j.id)).length; } catch { counts[j.id] = 0; }
        })
      );
      setPhotoCount(counts);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const errText = (err: unknown) =>
    axios.isAxiosError(err)
      ? err.response?.data?.message ?? "Erro."
      : err instanceof Error ? err.message : "Erro.";

  const geoAction = async (jobId: string, fn: (geo: Awaited<ReturnType<typeof readGeolocation>>) => Promise<unknown>) => {
    setBanner(null);
    setBusy(jobId);
    try {
      const geo = await readGeolocation();
      await fn(geo);
      await load();
    } catch (err) {
      setBanner({ type: "error", text: errText(err) });
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (jobId: string) => {
    if (!confirm("Confirmar desistência desta vaga? Ela voltará a ficar disponível.")) return;
    setBanner(null);
    setBusy(jobId);
    try {
      await withdrawJob(jobId);
      setBanner({ type: "success", text: "Vaga cancelada. Ela voltou para o pool." });
      await load();
    } catch (err) {
      setBanner({ type: "error", text: errText(err) });
    } finally {
      setBusy(null);
    }
  };

  const openPhotos = async (job: Job) => {
    setPhotoJob(job);
    setFile(null);
    setCaption("");
    try { setPhotos(await getJobPhotos(job.id)); } catch { setPhotos([]); }
  };

  const doUpload = async () => {
    if (!photoJob || !file) return;
    setUploading(true);
    try {
      await uploadJobPhoto(photoJob.id, file, caption || undefined);
      const next = await getJobPhotos(photoJob.id);
      setPhotos(next);
      setPhotoCount((c) => ({ ...c, [photoJob.id]: next.length }));
      setFile(null);
      setCaption("");
    } catch (err) {
      alert(errText(err));
    } finally {
      setUploading(false);
    }
  };

  const attachCheckoutPhoto = async (jobId: string) => {
    if (!checkoutFile) return;
    setAttaching(true);
    setBanner(null);
    try {
      await uploadJobPhoto(jobId, checkoutFile);
      const next = await getJobPhotos(jobId);
      setPhotoCount((c) => ({ ...c, [jobId]: next.length }));
      setCheckoutFile(null);
      setBanner({ type: "success", text: "Foto anexada. Você já pode fazer o check-out." });
    } catch (err) {
      setBanner({ type: "error", text: errText(err) });
    } finally {
      setAttaching(false);
    }
  };

  const hhmm = (iso?: string | null) => (iso ? iso.slice(11, 16) : "—");
  const currentShift = (j: Job) => sortShifts(j.shifts).find((s) => s.status === "in_progress");
  const nextPending = (j: Job) => sortShifts(j.shifts).find((s) => (s.status ?? "pending") === "pending");
  const allDone = (j: Job) => sortShifts(j.shifts).every((s) => s.status === "done");
  const mapJob = mine.find((j) => j.id === mapJobId) ?? null;

  return (
    <>
      <Head><title>Meus trabalhos | Colaborador</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Meus trabalhos</h1></header>
          <OnboardingBanner />
          <p className={panel.muted}>
            Check-in e check-out por turno usam a sua localização para comprovar a presença no local.
            Você pode desistir de uma vaga até {cancelWindow} min antes do início.
          </p>
          {banner && <p className={banner.type === "error" ? panel.error : panel.success}>{banner.text}</p>}

          <div className={panel.filterBar}>
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                className={p === period ? panel.primaryBtn : panel.ghostBtn}
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {loading ? (
            <p>Carregando…</p>
          ) : mine.length === 0 ? (
            <p className={panel.muted}>Você ainda não aceitou nenhuma vaga.</p>
          ) : visible.length === 0 ? (
            <p className={panel.muted}>Nenhuma vaga neste período.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {visible.map((j) => {
                const shifts = sortShifts(j.shifts);
                const cur = currentShift(j);
                const nxt = nextPending(j);
                const busyElsewhere = mine.some((other) => other.id !== j.id && currentShift(other));
                const isCanceled = j.status === "canceled";
                return (
                  <div key={j.id} className={panel.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <strong>{j.title}</strong>
                        <p className={panel.muted}>
                          {j.jobBranch?.name}{j.jobBranch?.address ? ` — ${j.jobBranch.address}` : ""}
                        </p>
                        <p className={panel.muted}>
                          {new Date(j.startTime).toLocaleDateString("pt-BR")} · {formatShiftPeriods(j)} · {formatShifts(j.shifts)}
                        </p>
                        {j.jobBranch?.address && (
                          <button className={panel.ghostBtn} style={{ marginTop: 4 }} onClick={() => setMapJobId(j.id)}>
                            📍 Ver no mapa
                          </button>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <StatusBadge status={j.status} />
                        {(j.status === "completed" || isCanceled) && j.grossAmount != null && (
                          <p className={panel.muted}>Valor: R$ {Number(j.grossAmount).toFixed(2)}</p>
                        )}
                      </div>
                    </div>

                    {isCanceled && (
                      <p className={`${panel.badge} ${panel.badgeCanceled}`} style={{ marginTop: "0.5rem" }}>
                        Cancelada pela agência — registro dos turnos já trabalhados.
                      </p>
                    )}

                    {shifts.length > 0 && (
                      <div style={{ overflowX: "auto" }}>
                        <table className={panel.table} style={{ marginTop: "0.5rem" }}>
                          <thead><tr><th>Turno</th><th>Horário</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Trabalhado</th></tr></thead>
                          <tbody>
                            {shifts.map((s, i) => (
                              <tr key={s.id}>
                                <td>{s.label || `Turno ${i + 1}`}</td>
                                <td>{s.startTime.slice(11, 16)}–{s.endTime.slice(11, 16)}</td>
                                <td>{hhmm(s.checkInAt)}</td>
                                <td>{hhmm(s.checkOutAt)}</td>
                                <td><span className={panel.badge}>{SHIFT_STATUS_LABELS[s.status ?? "pending"]}</span></td>
                                <td>{minutesToHours(s.workedMinutes)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {j.status === "in_progress" && cur && requirePhoto && (
                      <div style={{ marginTop: "0.5rem" }}>
                        {(photoCount[j.id] ?? 0) === 0 && (
                          <p className={panel.muted}>
                            Este trabalho exige foto de comprovação. Anexe a foto para concluir o check-out.
                          </p>
                        )}
                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => setCheckoutFile(e.target.files?.[0] ?? null)}
                          />
                          <button
                            className={panel.secondaryBtn}
                            disabled={!checkoutFile || attaching}
                            onClick={() => attachCheckoutPhoto(j.id)}
                          >
                            {attaching ? "Anexando…" : "Anexar foto"}
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                      {!isCanceled && ["accepted", "in_progress"].includes(j.status) && !cur && nxt && (
                        busyElsewhere ? (
                          <span className={panel.muted}>
                            Finalize o turno em andamento em outra vaga antes de iniciar este.
                          </span>
                        ) : (
                          <button
                            className={panel.primaryBtn}
                            disabled={busy === j.id}
                            onClick={() => geoAction(j.id, (geo) => checkIn(j.id, geo))}
                          >
                            {busy === j.id ? "Localizando…" : `Check-in${shifts.length > 1 ? ` (${nxt.label || "próximo turno"})` : ""}`}
                          </button>
                        )
                      )}

                      {j.status === "in_progress" && cur && (
                        <button
                          className={panel.primaryBtn}
                          disabled={busy === j.id}
                          onClick={() => geoAction(j.id, (geo) => checkOut(j.id, geo))}
                        >
                          {busy === j.id ? "Localizando…" : "Check-out"}
                        </button>
                      )}

                      {j.status === "in_progress" && !cur && allDone(j) && (
                        <span className={panel.muted}>Todos os turnos concluídos.</span>
                      )}

                      {j.status === "accepted" && (
                        canFreelancerCancel(j, cancelWindow) ? (
                          <button className={panel.secondaryBtn} disabled={busy === j.id} onClick={() => cancel(j.id)}>
                            Desistir da vaga
                          </button>
                        ) : (
                          <span className={panel.muted}>Fora do prazo — peça o cancelamento à agência.</span>
                        )
                      )}

                      {(isCanceled || ["accepted", "in_progress", "completed"].includes(j.status)) && (
                        <button className={panel.secondaryBtn} onClick={() => openPhotos(j)}>
                          Fotos ({photoCount[j.id] ?? j.jobPhotos?.length ?? 0})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {mapJob && (
        <Modal title={`Local — ${mapJob.jobBranch?.name ?? ""}`} onClose={() => setMapJobId(null)}>
          <div className={panel.form}>
            <p className={panel.muted}>{mapJob.jobBranch?.address}</p>
            <iframe
              title="mapa"
              src={mapEmbedUrl(mapJob.jobBranch?.address) ?? ""}
              style={{ width: "100%", height: 340, border: 0, borderRadius: 12 }}
              loading="lazy"
            />
            <a className={panel.primaryBtn} href={mapUrl(mapJob.jobBranch?.address) ?? "#"} target="_blank" rel="noreferrer">
              Abrir no Google Maps
            </a>
          </div>
        </Modal>
      )}

      {photoJob && (
        <Modal title={`Fotos — ${photoJob.title}`} onClose={() => setPhotoJob(null)}>
          <div className={panel.form}>
            {["accepted", "in_progress"].includes(photoJob.status) && (
              <>
                <label>Nova foto</label>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <label>Legenda (opcional)</label>
                <input value={caption} onChange={(e) => setCaption(e.target.value)} />
                <button className={panel.primaryBtn} onClick={doUpload} disabled={!file || uploading}>
                  {uploading ? "Enviando…" : "Enviar foto"}
                </button>
              </>
            )}

            {photos.length === 0 ? (
              <p className={panel.muted}>Nenhuma foto enviada.</p>
            ) : (
              <div className={panel.photoGrid}>
                {photos.map((p) => (
                  <figure key={p.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl(p.url)} alt={p.caption ?? "Foto"} />
                    {p.caption && <figcaption>{p.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="freelancer">
      <MyJobs />
    </RequireAuth>
  );
}
