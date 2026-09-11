import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/freelancer/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import SidebarIcon from "@/src/components/panel/SidebarIcon";
import panel from "@/styles/panel.module.scss";
import {
  getJobs, checkIn, checkOut, startBreak, endBreak, withdrawJob, readGeolocation, canFreelancerCancel,
  hasOpenBreak, mapUrl, mapEmbedUrl, Job, JobShift, formatShifts,
  formatShiftPeriods, minutesToHours, STATUS_LABELS,
} from "@/src/services/jobService";
import { getJobPhotos, uploadJobPhoto, photoUrl, JobPhoto } from "@/src/services/jobPhotoService";
import { authService } from "@/src/services/authService";
import { useAuth } from "@/src/hooks/useAuth";
import OnboardingBanner from "@/src/components/freelancer/OnboardingBanner";
import { fmtTime, fmtDate } from "@/src/lib/datetime";
import DateRangeQuickFilter from "@/src/components/DateRangeQuickFilter";
import { useDateRangeFilter } from "@/src/hooks/useDateRangeFilter";
import { inDateRange } from "@/src/lib/dateRange";

const SHIFT_STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando", in_progress: "Em andamento", done: "Concluído", missed: "Perdido",
};

const sortShifts = (shifts?: JobShift[]) => [...(shifts ?? [])].sort((a, b) => a.position - b.position);

/** Prioridade de exibição: em andamento → aceita → concluída → cancelada. */
const STATUS_ORDER: Record<string, number> = {
  in_progress: 0, accepted: 1, completed: 2, pending: 3, canceled: 4,
};

interface AffiliatedAgency {
  cancellationWindowMinutes?: number;
  requireCheckoutPhoto?: boolean;
  breaksEnabled?: boolean;
}

function MyJobs() {
  const freelancerId = authService.getProfileId();
  const { profile } = useAuth();
  const agency = ((profile as { affiliatedAgency?: AffiliatedAgency } | null)?.affiliatedAgency) ?? {};
  const cancelWindow = agency.cancellationWindowMinutes ?? 30;
  const requirePhoto = agency.requireCheckoutPhoto ?? true;
  const breaksAllowed = (j: Job) => j.breaksEnabled ?? agency.breaksEnabled ?? false;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [range, setRange] = useDateRangeFilter("freelancer-jobs-daterange", { preset: "semana" });
  const [statusFilter, setStatusFilter] = useState("");
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
        .filter((j) => inDateRange(j.startTime, range))
        .filter((j) => !statusFilter || j.status === statusFilter)
        .sort((a, b) => {
          const s = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
          return s !== 0 ? s : new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        }),
    [mine, range, statusFilter]
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

  const giveUp = async (jobId: string) => {
    if (
      !confirm(
        "Desistir da vaga agora? O turno atual será encerrado com as horas já trabalhadas (que você recebe normalmente) e o restante da vaga volta para o pool, para outro colaborador terminar."
      )
    )
      return;
    setBanner(null);
    setBusy(jobId);
    try {
      await withdrawJob(jobId);
      setBanner({
        type: "success",
        text: "Você saiu da vaga. As horas trabalhadas foram registradas e o restante voltou para o pool.",
      });
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
            <DateRangeQuickFilter
              value={range}
              onChange={setRange}
              presets={["hoje", "semana", "mes", "custom", "todas"]}
            />
            <label className={panel.filterField}>
              <span>Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Todos</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
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
                          {fmtDate(j.startTime)} · {formatShiftPeriods(j)} · {formatShifts(j.shifts)}
                        </p>
                        {j.jobBranch?.address && (
                          <button
                            className={panel.ghostBtn}
                            style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 6 }}
                            onClick={() => setMapJobId(j.id)}
                          >
                            <SidebarIcon name="pin" size={14} /> Ver no mapa
                          </button>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <StatusBadge status={j.status} />
                        {(j.status === "completed" || isCanceled) && j.grossAmount != null && (
                          <p className={panel.muted}>Valor: R$ {Number(j.grossAmount).toFixed(2)}</p>
                        )}
                        {j.status === "completed" && j.settlementHold && (
                          <p className={panel.muted}>
                            Pagamento em análise pela agência (horas acima do turno contratado).
                          </p>
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
                            {shifts.flatMap((s, i) => [
                              <tr key={s.id}>
                                <td>{s.label || `Turno ${i + 1}`}</td>
                                <td>{fmtTime(s.startTime)}–{fmtTime(s.endTime)}</td>
                                <td>{fmtTime(s.checkInAt)}</td>
                                <td>{fmtTime(s.checkOutAt)}</td>
                                <td><span className={panel.badge}>{SHIFT_STATUS_LABELS[s.status ?? "pending"]}</span></td>
                                <td>{minutesToHours(s.workedMinutes)}</td>
                              </tr>,
                              ...(s.breaks ?? []).map((b) => (
                                <tr key={b.id} className={panel.muted}>
                                  <td style={{ paddingLeft: "1.5rem" }}>↳ pausa</td>
                                  <td colSpan={2}>{fmtTime(b.startAt)} → {b.endAt ? fmtTime(b.endAt) : "em aberto"}</td>
                                  <td colSpan={3}>
                                    {b.endAt
                                      ? `− ${minutesToHours(Math.round((new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 60000))}`
                                      : "em pausa"}
                                  </td>
                                </tr>
                              )),
                            ])}
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

                      {j.status === "in_progress" && cur && breaksAllowed(j) && (
                        hasOpenBreak(j.shifts) ? (
                          <button
                            className={panel.secondaryBtn}
                            disabled={busy === j.id}
                            onClick={() => geoAction(j.id, (geo) => endBreak(j.id, geo))}
                          >
                            {busy === j.id ? "Localizando…" : "Retomar ponto"}
                          </button>
                        ) : (
                          <button
                            className={panel.secondaryBtn}
                            disabled={busy === j.id}
                            onClick={() => geoAction(j.id, (geo) => startBreak(j.id, geo))}
                          >
                            {busy === j.id ? "Localizando…" : "Pausar ponto"}
                          </button>
                        )
                      )}

                      {j.status === "in_progress" && cur && (
                        hasOpenBreak(j.shifts) ? (
                          <span className={panel.muted}>Retome o ponto antes de finalizar o turno.</span>
                        ) : (
                          <button
                            className={panel.primaryBtn}
                            disabled={busy === j.id}
                            onClick={() => geoAction(j.id, (geo) => checkOut(j.id, geo))}
                          >
                            {busy === j.id ? "Localizando…" : "Check-out"}
                          </button>
                        )
                      )}

                      {j.status === "in_progress" && !cur && allDone(j) && (
                        <span className={panel.muted}>Todos os turnos concluídos.</span>
                      )}

                      {j.status === "accepted" && (() => {
                        const withinWindow = canFreelancerCancel(j, cancelWindow);
                        return (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <button
                              className={panel.secondaryBtn}
                              disabled={!withinWindow || busy === j.id}
                              title={withinWindow ? undefined : "Fora do prazo — peça o cancelamento à agência."}
                              onClick={() => withinWindow && cancel(j.id)}
                            >
                              Desistir da vaga
                            </button>
                            {!withinWindow && (
                              <span className={panel.muted}>Fora do prazo — peça o cancelamento à agência.</span>
                            )}
                          </span>
                        );
                      })()}

                      {j.status === "in_progress" && !hasOpenBreak(j.shifts) && (
                        <button className={panel.secondaryBtn} disabled={busy === j.id} onClick={() => giveUp(j.id)}>
                          Desistir no meio do turno
                        </button>
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
