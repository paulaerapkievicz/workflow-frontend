import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/supermarket/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import DataTable, { Column } from "@/src/components/DataTable";
import FilterBar, { FilterFieldDef } from "@/src/components/FilterBar";
import panel from "@/styles/panel.module.scss";
import {
  getJobs, updateJob, deleteJob, cancelJob, Job, formatShifts, formatShiftPeriods,
  STATUS_LABELS, minutesToHours,
} from "@/src/services/jobService";
import { getBranches, Branch } from "@/src/services/branchService";
import { getCategories, Category } from "@/src/services/categoryService";
import { getJobPhotos, photoUrl, JobPhoto } from "@/src/services/jobPhotoService";
import {
  SHIFT_PERIODS, shiftLabel, shiftTimeRange, makeShiftInput, validateShiftInput,
  shiftPeriodFromTime, ShiftInput, ShiftPeriod,
} from "@/src/services/shifts";
import { matchesFilter, RowFilter } from "@/src/lib/filterRows";
import { fmtTime, fmtDate, isoDateBR } from "@/src/lib/datetime";

function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [photoJob, setPhotoJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RowFilter>({});

  const [editJob, setEditJob] = useState<Job | null>(null);
  const [form, setForm] = useState<{ title: string; categoryId: string; date: string; shifts: ShiftInput[] }>({
    title: "", categoryId: "", date: "", shifts: [],
  });
  const [editError, setEditError] = useState<string | null>(null);

  const shiftSortIndex = (p: ShiftPeriod) => SHIFT_PERIODS.findIndex((x) => x.value === p);
  const hhmm = fmtTime;

  const load = async () => {
    setLoading(true);
    try {
      const [j, b, c] = await Promise.all([getJobs(), getBranches(), getCategories()]);
      setJobs(j);
      setBranches(b);
      setCategories(c);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? "—";
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  const openEdit = (job: Job) => {
    const shifts: ShiftInput[] = [...(job.shifts ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        shiftPeriod: shiftPeriodFromTime(s.startTime),
        startTime: hhmm(s.startTime),
        endTime: hhmm(s.endTime),
      }));
    if (!shifts.length) shifts.push(makeShiftInput((job.shiftPeriod as ShiftPeriod) ?? "manha"));
    setForm({
      title: job.title,
      categoryId: job.categoryId,
      date: isoDateBR(job.startTime),
      shifts,
    });
    setEditError(null);
    setEditJob(job);
  };

  const toggleShift = (period: ShiftPeriod) =>
    setForm((f) => {
      const has = f.shifts.some((s) => s.shiftPeriod === period);
      const shifts = has
        ? f.shifts.filter((s) => s.shiftPeriod !== period)
        : [...f.shifts, makeShiftInput(period)].sort(
            (a, b) => shiftSortIndex(a.shiftPeriod) - shiftSortIndex(b.shiftPeriod)
          );
      return { ...f, shifts };
    });

  const updateShiftTime = (period: ShiftPeriod, patch: Partial<ShiftInput>) =>
    setForm((f) => ({
      ...f,
      shifts: f.shifts.map((s) => (s.shiftPeriod === period ? { ...s, ...patch } : s)),
    }));

  const saveEdit = async () => {
    if (!editJob) return;
    setEditError(null);
    if (!form.shifts.length) return setEditError("Selecione ao menos um turno.");
    for (const s of form.shifts) {
      const err = validateShiftInput(s);
      if (err) return setEditError(`${shiftLabel(s.shiftPeriod)}: ${err}`);
    }
    try {
      await updateJob(editJob.id, {
        title: form.title.trim() || undefined,
        categoryId: form.categoryId,
        date: form.date,
        shifts: form.shifts,
      });
      setEditJob(null);
      await load();
    } catch (err) {
      setEditError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao salvar." : "Erro ao salvar.");
    }
  };

  const act = async (fn: () => Promise<unknown>) => {
    try { await fn(); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  const openPhotos = async (job: Job) => {
    setPhotoJob(job);
    try { setPhotos(await getJobPhotos(job.id)); } catch { setPhotos([]); }
  };

  const rows = useMemo(
    () =>
      jobs.filter((job) =>
        matchesFilter(
          {
            status: job.status,
            freelancerName: job.assignedFreelancer?.name,
            branchName: job.jobBranch?.name ?? branchName(job.branchId),
            title: job.title,
            categoryName: job.jobCategory?.name ?? categoryName(job.categoryId),
            date: job.startTime,
          },
          filter
        )
      ),
    [jobs, filter, branches, categories] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const filterFields: FilterFieldDef[] = [
    { key: "status", label: "Status", type: "select", options: Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })) },
    { key: "title", label: "Título", type: "text" },
    { key: "freelancer", label: "Colaborador", type: "text" },
    { key: "branch", label: "Filial", type: "text" },
    { key: "category", label: "Função", type: "text" },
    { key: "date", label: "Data", type: "date" },
  ];

  const columns: Column<Job>[] = [
    { key: "title", label: "Título", render: (j) => j.title },
    { key: "branch", label: "Filial", render: (j) => j.jobBranch?.name ?? branchName(j.branchId) },
    { key: "category", label: "Função", render: (j) => j.jobCategory?.name ?? categoryName(j.categoryId) },
    { key: "date", label: "Data", render: (j) => fmtDate(j.startTime) },
    { key: "shift", label: "Turno", render: (j) => formatShiftPeriods(j) },
    { key: "hours", label: "Horário", render: (j) => formatShifts(j.shifts) },
    { key: "contracted", label: "Horas contratadas", render: (j) => minutesToHours(j.contractedMinutes), defaultHidden: true },
    { key: "worked", label: "Horas trabalhadas", render: (j) => minutesToHours(j.workedMinutes), defaultHidden: true },
    { key: "freelancer", label: "Colaborador", render: (j) => j.assignedFreelancer?.name ?? "—" },
    { key: "status", label: "Status", render: (j) => <StatusBadge status={j.status} /> },
    {
      key: "actions",
      label: "Ações",
      toggleable: false,
      render: (j) => (
        <>
          {["in_progress", "completed"].includes(j.status) && (
            <button className={panel.ghostBtn} onClick={() => openPhotos(j)}>Fotos</button>
          )}
          {j.status === "pending" && (
            <>
              <button className={panel.ghostBtn} onClick={() => openEdit(j)}>Editar</button>
              <button className={panel.secondaryBtn} onClick={() => act(() => cancelJob(j.id))}>Cancelar</button>
              <button className={panel.secondaryBtn} onClick={() => confirm("Excluir esta vaga?") && act(() => deleteJob(j.id))}>Excluir</button>
            </>
          )}
        </>
      ),
    },
  ];

  return (
    <>
      <Head><title>Vagas | Supermercado</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Vagas</h1></header>
          <p className={panel.muted}>
            As vagas nascem dos seus pedidos. Enquanto não forem aceitas, podem ser editadas ou removidas —
            vagas já aceitas por colaboradores ficam bloqueadas.
          </p>
          <FilterBar fields={filterFields} value={filter} onChange={setFilter} />
          {loading ? (
            <p>Carregando…</p>
          ) : (
            <DataTable columns={columns} rows={rows} rowKey={(j) => j.id} storageKey="supermarket-jobs" empty="Nenhuma vaga. Crie um pedido." />
          )}
        </section>
      </main>

      {editJob && (
        <Modal title="Editar vaga" onClose={() => setEditJob(null)}>
          <div className={panel.form}>
            <label>Função</label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label>Título (descrição da vaga)</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <label>Data</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <label>Turnos da vaga (um ou mais)</label>
            <div className={panel.shiftRow}>
              {SHIFT_PERIODS.map((p) => (
                <label key={p.value} style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.shifts.some((s) => s.shiftPeriod === p.value)}
                    onChange={() => toggleShift(p.value)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
            {form.shifts.map((s) => {
              const range = shiftTimeRange(s.shiftPeriod);
              return (
                <div key={s.shiftPeriod} className={panel.shiftRow}>
                  <span style={{ minWidth: 72, fontWeight: 600 }}>{shiftLabel(s.shiftPeriod)}</span>
                  <div style={{ flex: 1 }}>
                    <label>Início</label>
                    <input type="time" value={s.startTime} min={range.min} max={range.max}
                      onChange={(e) => updateShiftTime(s.shiftPeriod, { startTime: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Fim</label>
                    <input type="time" value={s.endTime} min={range.min} max={range.max}
                      onChange={(e) => updateShiftTime(s.shiftPeriod, { endTime: e.target.value })} />
                  </div>
                </div>
              );
            })}
            {editError && <p className={panel.error}>{editError}</p>}
            <button className={panel.primaryBtn} onClick={saveEdit}>Salvar</button>
          </div>
        </Modal>
      )}

      {photoJob && (
        <Modal title={`Comprovações — ${photoJob.title}`} onClose={() => setPhotoJob(null)}>
          {photos.length === 0 ? (
            <p>Nenhuma foto enviada.</p>
          ) : (
            <div className={panel.photoGrid}>
              {photos.map((p) => (
                <figure key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(p.url)} alt={p.caption ?? "Comprovação"} />
                  {p.caption && <figcaption>{p.caption}</figcaption>}
                </figure>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="supermarket">
      <JobsPage />
    </RequireAuth>
  );
}
