import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/freelancer/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import panel from "@/styles/panel.module.scss";
import {
  getJobs, checkIn, checkOut, registerInterval, readGeolocation, Job, JobShift,
  formatShifts, minutesToHours,
} from "@/src/services/jobService";
import { getJobPhotos, uploadJobPhoto, photoUrl, JobPhoto } from "@/src/services/jobPhotoService";
import { authService } from "@/src/services/authService";

const SHIFT_LABELS: Record<string, string> = { pending: "Aguardando", in_progress: "Em andamento", done: "Concluído" };

const sortShifts = (shifts?: JobShift[]) => [...(shifts ?? [])].sort((a, b) => a.position - b.position);

function MyJobs() {
  const freelancerId = authService.getProfileId();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [photoJob, setPhotoJob] = useState<Job | null>(null);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [photoCount, setPhotoCount] = useState<Record<string, number>>({});
  const [banner, setBanner] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const mine = useMemo(
    () => jobs.filter((j) => j.freelancerId && j.freelancerId === freelancerId),
    [jobs, freelancerId]
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

  const geoAction = async (jobId: string, fn: (geo: Awaited<ReturnType<typeof readGeolocation>>) => Promise<unknown>) => {
    setBanner(null);
    setBusy(jobId);
    try {
      const geo = await readGeolocation();
      await fn(geo);
      await load();
    } catch (err) {
      const text = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Erro."
        : err instanceof Error ? err.message : "Erro.";
      setBanner({ type: "error", text });
    } finally {
      setBusy(null);
    }
  };

  const simpleAction = async (jobId: string, fn: () => Promise<unknown>) => {
    setBanner(null);
    setBusy(jobId);
    try {
      await fn();
      await load();
    } catch (err) {
      setBanner({
        type: "error",
        text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.",
      });
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
      alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro no upload." : "Erro no upload.");
    } finally {
      setUploading(false);
    }
  };

  const checkoutBlocked = (j: Job) => j.photosRequired && (photoCount[j.id] ?? 0) === 0;
  const currentShift = (j: Job) => sortShifts(j.shifts).find((s) => s.status === "in_progress");
  const nextPending = (j: Job) => sortShifts(j.shifts).find((s) => (s.status ?? "pending") === "pending");
  const allDone = (j: Job) => sortShifts(j.shifts).every((s) => s.status === "done");

  return (
    <>
      <Head><title>Meus trabalhos | Freelancer</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Meus trabalhos</h1></header>
          <p className={panel.muted}>
            O check-in e o check-out usam a sua localização para comprovar a presença no local do serviço.
          </p>
          {banner && <p className={banner.type === "error" ? panel.error : panel.success}>{banner.text}</p>}

          {loading ? (
            <p>Carregando…</p>
          ) : mine.length === 0 ? (
            <p className={panel.muted}>Você ainda não aceitou nenhuma vaga.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {mine.map((j) => {
                const shifts = sortShifts(j.shifts);
                const cur = currentShift(j);
                const nxt = nextPending(j);
                return (
                  <div key={j.id} className={panel.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <strong>{j.title}</strong>
                        <p className={panel.muted}>
                          {j.jobBranch?.name}{j.jobBranch?.address ? ` — ${j.jobBranch.address}` : ""}
                        </p>
                        <p className={panel.muted}>
                          {new Date(j.startTime).toLocaleDateString("pt-BR")} · Turnos: {formatShifts(j.shifts)}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <StatusBadge status={j.status} />
                        {j.status === "completed" && j.grossAmount != null && (
                          <p className={panel.muted}>Valor: R$ {Number(j.grossAmount).toFixed(2)}</p>
                        )}
                      </div>
                    </div>

                    {shifts.length > 0 && (
                      <table className={panel.table} style={{ marginTop: "0.5rem" }}>
                        <thead><tr><th>Turno</th><th>Horário</th><th>Status</th><th>Trabalhado</th></tr></thead>
                        <tbody>
                          {shifts.map((s, i) => (
                            <tr key={s.id}>
                              <td>{s.label || `Turno ${i + 1}`}</td>
                              <td>{s.startTime.slice(11, 16)}–{s.endTime.slice(11, 16)}</td>
                              <td><span className={panel.badge}>{SHIFT_LABELS[s.status ?? "pending"]}</span></td>
                              <td>{minutesToHours(s.workedMinutes)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {j.status === "in_progress" && checkoutBlocked(j) && cur && (
                      <p className={panel.error}>Anexe ao menos 1 foto de comprovação para fazer o check-out.</p>
                    )}

                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                      {["accepted", "in_progress"].includes(j.status) && !cur && nxt && (
                        <button
                          className={panel.primaryBtn}
                          disabled={busy === j.id}
                          onClick={() => geoAction(j.id, (geo) => checkIn(j.id, geo))}
                        >
                          {busy === j.id ? "Localizando…" : `Check-in ${shifts.length > 1 ? `(${nxt.label || "próximo turno"})` : ""}`}
                        </button>
                      )}

                      {j.status === "in_progress" && cur && (
                        <>
                          <button className={panel.ghostBtn} disabled={busy === j.id} onClick={() => simpleAction(j.id, () => registerInterval(j.id, "break-start"))}>Iniciar intervalo</button>
                          <button className={panel.ghostBtn} disabled={busy === j.id} onClick={() => simpleAction(j.id, () => registerInterval(j.id, "break-end"))}>Fim do intervalo</button>
                          <button
                            className={panel.primaryBtn}
                            disabled={busy === j.id || checkoutBlocked(j)}
                            onClick={() => geoAction(j.id, (geo) => checkOut(j.id, geo))}
                          >
                            {busy === j.id ? "Localizando…" : "Check-out"}
                          </button>
                        </>
                      )}

                      {j.status === "in_progress" && !cur && allDone(j) && (
                        <span className={panel.muted}>Todos os turnos concluídos.</span>
                      )}

                      {["accepted", "in_progress", "completed"].includes(j.status) && (
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
