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
import { getSupermarketRates, SupermarketCategoryRate } from "@/src/services/supermarketRateService";
import { getJobPhotos, photoUrl, JobPhoto } from "@/src/services/jobPhotoService";
import { getJobFreelancerProfile, JobFreelancerProfile } from "@/src/services/freelancerService";
import { createSupermarketReview } from "@/src/services/reviewService";
import StarRating from "@/src/components/StarRating";
import { useAuth } from "@/src/hooks/useAuth";
import { authService } from "@/src/services/authService";
import {
  shiftFromWindow, newShift, validateShifts, toShiftPayload, ShiftInput,
} from "@/src/services/shifts";
import ShiftsField from "@/src/components/ShiftsField";
import FreelancerChip, { FreelancerProfileBody } from "@/src/components/FreelancerChip";
import { matchesFilter, RowFilter } from "@/src/lib/filterRows";
import { fmtTime, fmtDate, isoDateBR } from "@/src/lib/datetime";

function JobsPage() {
  const { profile: authProfile } = useAuth();
  const reviewEnabled = !!authProfile?.clientAgency?.reviewEnabled;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rates, setRates] = useState<SupermarketCategoryRate[]>([]);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [photoJob, setPhotoJob] = useState<Job | null>(null);
  const [profileJob, setProfileJob] = useState<Job | null>(null);
  const [profile, setProfile] = useState<JobFreelancerProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RowFilter>({});

  const [reviewJob, setReviewJob] = useState<Job | null>(null);
  const [rv, setRv] = useState<{ rating: number; comment: string }>({ rating: 0, comment: "" });
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);

  const [editJob, setEditJob] = useState<Job | null>(null);
  const [form, setForm] = useState<{ title: string; categoryId: string; date: string; shifts: ShiftInput[] }>({
    title: "", categoryId: "", date: "", shifts: [],
  });
  const [editError, setEditError] = useState<string | null>(null);

  const hhmm = fmtTime;

  const load = async () => {
    setLoading(true);
    try {
      const supermarketId = authService.getProfileId() ?? "";
      const [j, b, c, r] = await Promise.all([
        getJobs(), getBranches(), getCategories(), getSupermarketRates(supermarketId),
      ]);
      setJobs(j);
      setBranches(b);
      setCategories(c);
      setRates(r);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? "—";
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  // Mesma regra do backend: só vale trocar para uma função com valor/hora já configurado
  // para esta filial (padrão da rede ou específico dela) — senão a vaga não aparece pra ninguém.
  const isCategoryPriced = (categoryId: string, branchId: string) =>
    rates.some((r) => r.categoryId === categoryId && r.active && (r.branchId == null || r.branchId === branchId));
  const unpricedWarning = (categoryId: string, branchId: string) =>
    categoryId && branchId && !isCategoryPriced(categoryId, branchId)
      ? `A função "${categoryName(categoryId)}" ainda não tem valor/hora configurado para ${branchName(branchId)}. Peça para a agência configurar em Supermercados → "Valores/hora" antes de trocar a função da vaga.`
      : null;

  const openEdit = (job: Job) => {
    const shifts: ShiftInput[] = [...(job.shifts ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((s) => shiftFromWindow(hhmm(s.startTime), hhmm(s.endTime), { label: s.label, nominalPeriod: s.nominalPeriod }));
    if (!shifts.length) shifts.push(newShift());
    setForm({
      title: job.title,
      categoryId: job.categoryId,
      date: isoDateBR(job.startTime),
      shifts,
    });
    setEditError(null);
    setEditJob(job);
  };

  const saveEdit = async () => {
    if (!editJob) return;
    setEditError(null);
    const shiftError = validateShifts(form.shifts);
    if (shiftError) return setEditError(shiftError);
    const rateWarning = unpricedWarning(form.categoryId, editJob.branchId);
    if (rateWarning) return setEditError(rateWarning);
    try {
      await updateJob(editJob.id, {
        title: form.title.trim() || undefined,
        categoryId: form.categoryId,
        date: form.date,
        shifts: form.shifts.map(toShiftPayload),
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

  const openReview = (job: Job) => {
    setReviewJob(job);
    setRv({ rating: 0, comment: "" });
    setReviewError(null);
  };

  const submitReview = async () => {
    if (!reviewJob) return;
    if (!(rv.rating >= 1 && rv.rating <= 5)) return setReviewError("Escolha uma nota de 1 a 5.");
    setReviewBusy(true);
    setReviewError(null);
    try {
      await createSupermarketReview(reviewJob.id, { rating: rv.rating, comment: rv.comment.trim() || undefined });
      setReviewJob(null);
      await load();
    } catch (err) {
      setReviewError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao avaliar." : "Erro ao avaliar.");
    } finally {
      setReviewBusy(false);
    }
  };

  const openPhotos = async (job: Job) => {
    setPhotoJob(job);
    try { setPhotos(await getJobPhotos(job.id)); } catch { setPhotos([]); }
  };

  const openProfile = async (job: Job) => {
    setProfileJob(job);
    setProfile(null);
    setProfileError(null);
    try {
      setProfile(await getJobFreelancerProfile(job.id));
    } catch (err) {
      setProfileError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao carregar perfil." : "Erro ao carregar perfil.");
    }
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
    {
      key: "freelancer",
      label: "Colaborador",
      render: (j) => <FreelancerChip freelancer={j.assignedFreelancer} onClick={() => openProfile(j)} />,
    },
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
          {j.status === "completed" && j.assignedFreelancer && reviewEnabled && (
            j.jobClientReview ? (
              <span className={panel.muted} title="Você já avaliou este colaborador nesta vaga">
                <StarRating value={j.jobClientReview.rating} size={13} />
              </span>
            ) : (
              <button className={panel.ghostBtn} onClick={() => openReview(j)}>Avaliar colaborador</button>
            )
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
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{editJob && !isCategoryPriced(c.id, editJob.branchId) ? " ⚠ sem valor/hora nesta filial" : ""}
                </option>
              ))}
            </select>
            <label>Título (descrição da vaga)</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <label>Data</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <label>Turnos da vaga (horário livre — um ou mais)</label>
            <ShiftsField
              value={form.shifts}
              onChange={(shifts) => setForm((f) => ({ ...f, shifts }))}
            />
            {editJob && unpricedWarning(form.categoryId, editJob.branchId) && (
              <p className={panel.error}>{unpricedWarning(form.categoryId, editJob.branchId)}</p>
            )}
            {editError && <p className={panel.error}>{editError}</p>}
            <button
              className={panel.primaryBtn}
              onClick={saveEdit}
              disabled={!!editJob && !!unpricedWarning(form.categoryId, editJob.branchId)}
            >
              Salvar
            </button>
          </div>
        </Modal>
      )}

      {reviewJob && (
        <Modal title={`Avaliar colaborador — ${reviewJob.assignedFreelancer?.name ?? ""}`} onClose={() => setReviewJob(null)}>
          <div className={panel.form}>
            <p className={panel.muted}>
              Sua nota entra na média de reputação do colaborador. A agência e outros supermercados
              da rede enxergam essa média.
            </p>
            <label>Nota</label>
            <StarRating value={rv.rating} onChange={(rating) => setRv((s) => ({ ...s, rating }))} size={26} />
            <label>Comentário (opcional)</label>
            <textarea
              value={rv.comment}
              onChange={(e) => setRv((s) => ({ ...s, comment: e.target.value }))}
              rows={3}
              placeholder="Como foi o atendimento?"
            />
            {reviewError && <p className={panel.error}>{reviewError}</p>}
            <button className={panel.primaryBtn} onClick={submitReview} disabled={reviewBusy}>
              {reviewBusy ? "Enviando…" : "Enviar avaliação"}
            </button>
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

      {profileJob && (
        <Modal title={`Colaborador — ${profileJob.title}`} onClose={() => setProfileJob(null)}>
          {profileError ? (
            <p className={panel.error}>{profileError}</p>
          ) : !profile ? (
            <p>Carregando…</p>
          ) : (
            <FreelancerProfileBody {...profile} />
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
