import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/supermarket/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import DataTable, { Column } from "@/src/components/DataTable";
import FilterBar, { FilterFieldDef } from "@/src/components/FilterBar";
import panel from "@/styles/panel.module.scss";
import { getJobs, Job, formatShifts, STATUS_LABELS, minutesToHours } from "@/src/services/jobService";
import { getBranches, Branch } from "@/src/services/branchService";
import { getCategories, Category } from "@/src/services/categoryService";
import { getJobPhotos, photoUrl, JobPhoto } from "@/src/services/jobPhotoService";
import { matchesFilter, RowFilter } from "@/src/lib/filterRows";

const money = (v?: number | null) => (v == null ? "—" : `R$ ${Number(v).toFixed(2)}`);

function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [photoJob, setPhotoJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RowFilter>({});

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
    { key: "freelancer", label: "Freelancer", type: "text" },
    { key: "branch", label: "Filial", type: "text" },
    { key: "category", label: "Função", type: "text" },
    { key: "date", label: "Data", type: "date" },
  ];

  const columns: Column<Job>[] = [
    { key: "title", label: "Título", render: (j) => j.title },
    { key: "branch", label: "Filial", render: (j) => j.jobBranch?.name ?? branchName(j.branchId) },
    { key: "category", label: "Função", render: (j) => j.jobCategory?.name ?? categoryName(j.categoryId) },
    { key: "date", label: "Data", render: (j) => new Date(j.startTime).toLocaleDateString("pt-BR") },
    { key: "shifts", label: "Turnos", render: (j) => formatShifts(j.shifts) },
    { key: "contracted", label: "Horas contratadas", render: (j) => minutesToHours(j.contractedMinutes) },
    { key: "worked", label: "Horas trabalhadas", render: (j) => minutesToHours(j.workedMinutes), defaultHidden: true },
    { key: "value", label: "Valor", render: (j) => money(j.grossAmount) },
    { key: "freelancer", label: "Freelancer", render: (j) => j.assignedFreelancer?.name ?? "—" },
    { key: "status", label: "Status", render: (j) => <StatusBadge status={j.status} /> },
    {
      key: "actions",
      label: "Ações",
      toggleable: false,
      render: (j) =>
        ["in_progress", "completed"].includes(j.status) ? (
          <button className={panel.ghostBtn} onClick={() => openPhotos(j)}>Fotos</button>
        ) : null,
    },
  ];

  return (
    <>
      <Head><title>Vagas | Supermercado</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Vagas</h1></header>
          <p className={panel.muted}>As vagas são geradas a partir dos seus pedidos. O valor é calculado por hora trabalhada, conforme a tabela da agência.</p>
          <FilterBar fields={filterFields} value={filter} onChange={setFilter} />
          {loading ? (
            <p>Carregando…</p>
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(j) => j.id}
              storageKey="supermarket-jobs"
              empty="Nenhuma vaga. Crie um pedido."
            />
          )}
        </section>
      </main>

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
