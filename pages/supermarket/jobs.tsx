import { useEffect, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/supermarket/Sidebar";
import Modal from "@/src/components/common/Modal";
import styles from "@/styles/supermarketJobs.module.scss";
import {
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  Job,
} from "@/src/services/jobService";

export default function SupermarketJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await getJobs();
      setJobs(data);
      setError(null);
    } catch (err) {
      setError("Erro ao carregar vagas");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (job?: Job) => {
    setIsEditing(!!job);
    setCurrentJob(
      job || {
        id: 0,
        title: "",
        status: "Aberta",
        description: "",
        startDate: "",
        endDate: "",
      }
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentJob(null);
  };

  const saveJob = async () => {
    if (!currentJob) return;

    try {
      if (isEditing) {
        await updateJob(currentJob);
      } else {
        await createJob({
          title: currentJob.title,
          status: currentJob.status,
          description: currentJob.description,
          startDate: currentJob.startDate,
          endDate: currentJob.endDate,
        });
      }
      closeModal();
      loadJobs();
    } catch {
      alert("Erro ao salvar vaga");
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir?")) {
      try {
        await deleteJob(id);
        loadJobs();
      } catch {
        alert("Erro ao excluir vaga");
      }
    }
  };

  return (
    <>
      <Head>
        <title>Vagas | Supermercado</title>
      </Head>
      <main className={styles.jobsContainer}>
        <Sidebar />
        <section className={styles.content}>
          <header className={styles.header}>
            <h1>Gerenciar Vagas</h1>
            <button className={styles.createJobBtn} onClick={() => openModal()}>
              Criar Nova Vaga
            </button>
          </header>

          {loading ? (
            <p>Carregando...</p>
          ) : error ? (
            <p>{error}</p>
          ) : (
            <table className={styles.jobsTable}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cargo</th>
                  <th>Status</th>
                  <th>Início</th>
                  <th>Término</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.id}</td>
                    <td>{job.title}</td>
                    <td>{job.status}</td>
                    <td>{job.startDate}</td>
                    <td>{job.endDate}</td>
                    <td>
                      <button
                        className={styles.editBtn}
                        onClick={() => openModal(job)}
                      >
                        Editar
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(job.id)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {isModalOpen && currentJob && (
        <Modal onClose={closeModal} title={isEditing ? "Editar Vaga" : "Criar Nova Vaga"}>
          <div className={styles.modalContent}>
            <label>Cargo</label>
            <input
              type="text"
              value={currentJob.title}
              onChange={(e) => setCurrentJob({ ...currentJob, title: e.target.value })}
              placeholder="Nome da vaga"
            />

            <label>Descrição</label>
            <textarea
              value={currentJob.description}
              onChange={(e) =>
                setCurrentJob({ ...currentJob, description: e.target.value })
              }
              placeholder="Descreva a vaga"
            />

            <label>Data de Início</label>
            <input
              type="date"
              value={currentJob.startDate}
              onChange={(e) => setCurrentJob({ ...currentJob, startDate: e.target.value })}
            />

            <label>Data de Término</label>
            <input
              type="date"
              value={currentJob.endDate}
              onChange={(e) => setCurrentJob({ ...currentJob, endDate: e.target.value })}
            />

            <label>Status</label>
            <select
              value={currentJob.status}
              onChange={(e) =>
                setCurrentJob({ ...currentJob, status: e.target.value })
              }
            >
              <option value="Aberta">Aberta</option>
              <option value="Preenchida">Preenchida</option>
            </select>

            <button className={styles.saveBtn} onClick={saveJob}>
              {isEditing ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
