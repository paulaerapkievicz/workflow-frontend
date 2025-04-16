import { useEffect, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/supermarket/Sidebar";
import Modal from "@/src/components/common/Modal";
import styles from "@/styles/supermarketJobs.module.scss";
import { getJobs, createJob, updateJob, deleteJob, Job } from "@/src/services/jobService";
import { getBranches, Branch } from "@/src/services/branchService";
import { getCategories, Category } from "@/src/services/categoryService";

interface ShiftTime {
  start: string;
  end: string;
}

interface FormData {
  id?: string;
  supermarketId: string;
  branchId: string;
  categoryId: string;
  date: string;
  shifts: ShiftTime[];
}

export default function SupermarketJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    supermarketId: "",
    branchId: "",
    categoryId: "",
    date: "",
    shifts: [{ start: "08:00", end: "12:00" }]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ branchId: "", categoryId: "", date: "" });

  useEffect(() => {
    loadJobs();
    loadBranches();
    loadCategories();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await getJobs();
      setJobs(data);
      setError(null);
    } catch {
      setError("Erro ao carregar vagas");
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const data = await getBranches();
      setBranches(data);
    } catch {
      console.error("Erro ao carregar filiais");
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch {
      console.error("Erro ao carregar categorias");
    }
  };

  const openModal = (job?: Job) => {
    setIsEditing(!!job);
    if (job) {
      setFormData({
        id: String(job.id),
        supermarketId: job.supermarketId,
        branchId: job.branchId,
        categoryId: job.categoryId,
        date: job.startTime.split("T")[0],
        shifts: jobs
          .filter(j => j.date === job.startTime.split("T")[0] && j.branchId === job.branchId && j.categoryId === job.categoryId)
          .map(j => ({
            start: j.startTime.split("T")[1].substring(0,5),
            end: j.endTime.split("T")[1].substring(0,5)
          }))
      });
    } else {
      setFormData({
        supermarketId: "",
        branchId: "",
        categoryId: "",
        date: "",
        shifts: [{ start: "08:00", end: "12:00" }]
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const saveJob = async () => {
    try {
      for (const shift of formData.shifts) {
        const payload = {
          supermarketId: formData.supermarketId,
          branchId: formData.branchId,
          categoryId: formData.categoryId,
          startTime: `${formData.date}T${shift.start}:00`,
          endTime: `${formData.date}T${shift.end}:00`
        };

        if (isEditing && formData.id) {
          await updateJob({ ...(payload as any), id: formData.id });
        } else {
          await createJob(payload as Omit<Job, "id">);
        }
      }
      closeModal();
      loadJobs();
    } catch {
      alert("Erro ao salvar vaga");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir?")) {
      try {
        await deleteJob(Number(id));
        loadJobs();
      } catch {
        alert("Erro ao excluir vaga");
      }
    }
  };

  const filteredJobs = jobs.filter(job => {
    return (
      (!filters.branchId || job.branchId === filters.branchId) &&
      (!filters.categoryId || job.categoryId === filters.categoryId) &&
      (!filters.date || job.startTime.startsWith(filters.date))
    );
  });

  const getBranchName = (id: string) => branches.find(branch => branch.id === id)?.name || "Filial não encontrada";
  const getCategoryName = (id: string) => categories.find(category => category.id === id)?.name || "Categoria não encontrada";

  return (
    <>
      <Head><title>Vagas | Supermercado</title></Head>
      <main className={styles.jobsContainer}>
        <Sidebar />
        <section className={styles.content}>
          <header className={styles.header}>
            <h1>Gerenciar Vagas</h1>
            <button className={styles.createJobBtn} onClick={() => openModal()}>Criar Nova Vaga</button>
          </header>

          <div className={styles.filters}>
            <select value={filters.branchId} onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}>
              <option value="">Filtrar por Filial</option>
              {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <select value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}>
              <option value="">Filtrar por Categoria</option>
              {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
          </div>

          {loading ? <p>Carregando...</p> : error ? <p>{error}</p> : (
            <table className={styles.jobsTable}>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Filial</th>
                  <th>Data</th>
                  <th>Horário</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr key={job.id}>
                    <td>{getCategoryName(job.categoryId)}</td>
                    <td>{getBranchName(job.branchId)}</td>
                    <td>{new Date(job.startTime).toLocaleDateString()}</td>
                    <td>{new Date(job.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(job.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <button className={styles.editBtn} onClick={() => openModal(job)}>Editar</button>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(job.id)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {isModalOpen && (
        <Modal onClose={closeModal} title={isEditing ? "Editar Vaga" : "Criar Nova Vaga"}>
          <div className={styles.modalContent}>
            <label>Filial</label>
            <select value={formData.branchId} onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}>
              <option value="">Selecione a Filial</option>
              {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>

            <label>Categoria</label>
            <select value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}>
              <option value="">Selecione a Categoria</option>
              {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>

            <label>Data da Atuação</label>
            <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />

            <label>Turnos</label>
            {formData.shifts.map((shift, index) => (
              <div key={index} className={styles.shiftRow}>
                <input type="time" value={shift.start} onChange={(e) => {
                  const newShifts = [...formData.shifts];
                  newShifts[index].start = e.target.value;
                  setFormData({ ...formData, shifts: newShifts });
                }} />
                <input type="time" value={shift.end} onChange={(e) => {
                  const newShifts = [...formData.shifts];
                  newShifts[index].end = e.target.value;
                  setFormData({ ...formData, shifts: newShifts });
                }} />
                {formData.shifts.length > 1 && (
                  <button type="button" onClick={() => {
                    const newShifts = formData.shifts.filter((_, i) => i !== index);
                    setFormData({ ...formData, shifts: newShifts });
                  }}>Remover</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setFormData({ ...formData, shifts: [...formData.shifts, { start: "", end: "" }] })}>+ Adicionar Turno</button>

            <button className={styles.saveBtn} onClick={saveJob}>
              {isEditing ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
