import { useEffect, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/supermarket/Sidebar";
import Modal from "@/src/components/common/Modal";
import styles from "@/styles/supermarketJobs.module.scss";
import { getPayments, createPayment, updatePayment, deletePayment, Payment } from "@/src/services/paymentService";
import { getJobs, Job } from "@/src/services/jobService";

interface FormData {
  id?: string;
  jobId: string;
  amount: number;
  status: string;
  paymentDate: string;
}

export default function SupermarketPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    jobId: "",
    amount: 0,
    status: "pending",
    paymentDate: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: "", date: "" });

  useEffect(() => {
    loadPayments();
    loadJobs();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await getPayments();
      setPayments(data);
      setError(null);
    } catch {
      setError("Erro ao carregar pagamentos");
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    try {
      const data = await getJobs();
      setJobs(data);
    } catch {
      console.error("Erro ao carregar vagas");
    }
  };

  const openModal = (payment?: Payment) => {
    setIsEditing(!!payment);
    if (payment) {
      setFormData({
        id: String(payment.id),
        jobId: payment.jobId,
        amount: payment.amount,
        status: payment.status,
        paymentDate: payment.paymentDate.split("T")[0]
      });
    } else {
      setFormData({
        jobId: "",
        amount: 0,
        status: "pending",
        paymentDate: ""
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const savePayment = async () => {
    try {
      const payload = {
        jobId: formData.jobId,
        amount: formData.amount,
        status: formData.status,
        paymentDate: `${formData.paymentDate}T00:00:00`
      };

      if (isEditing && formData.id) {
        await updatePayment({ ...(payload as any), id: formData.id });
      } else {
        await createPayment(payload as Omit<Payment, "id">);
      }
      closeModal();
      loadPayments();
    } catch {
      alert("Erro ao salvar pagamento");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir?")) {
      try {
        await deletePayment(Number(id));
        loadPayments();
      } catch {
        alert("Erro ao excluir pagamento");
      }
    }
  };

  const filteredPayments = payments.filter(payment => {
    return (
      (!filters.status || payment.status === filters.status) &&
      (!filters.date || payment.paymentDate.startsWith(filters.date))
    );
  });

  const getJobInfo = (id: string) => {
    const job = jobs.find(job => job.id === id);
    return job ? `${job.categoryId} | ${new Date(job.startTime).toLocaleDateString()}` : "Job não encontrado";
  };

  return (
    <>
      <Head><title>Pagamentos | Supermercado</title></Head>
      <main className={styles.jobsContainer}>
        <Sidebar />
        <section className={styles.content}>
          <header className={styles.header}>
            <h1>Gerenciar Pagamentos</h1>
            <button className={styles.createJobBtn} onClick={() => openModal()}>Novo Pagamento</button>
          </header>

          <div className={styles.filters}>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Filtrar por Status</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
          </div>

          {loading ? <p>Carregando...</p> : error ? <p>{error}</p> : (
            <table className={styles.jobsTable}>
              <thead>
                <tr>
                  <th>Vaga</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Data de Pagamento</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{getJobInfo(payment.jobId)}</td>
                    <td>R$ {payment.amount.toFixed(2)}</td>
                    <td>{payment.status}</td>
                    <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                    <td>
                      <button className={styles.editBtn} onClick={() => openModal(payment)}>Editar</button>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(payment.id)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {isModalOpen && (
        <Modal onClose={closeModal} title={isEditing ? "Editar Pagamento" : "Novo Pagamento"}>
          <div className={styles.modalContent}>
            <label>Vaga</label>
            <select value={formData.jobId} onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}>
              <option value="">Selecione a Vaga</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>
                  {getJobInfo(job.id)}
                </option>
              ))}
            </select>

            <label>Valor</label>
            <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} />

            <label>Status</label>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="cancelled">Cancelado</option>
            </select>

            <label>Data de Pagamento</label>
            <input type="date" value={formData.paymentDate} onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })} />

            <button className={styles.saveBtn} onClick={savePayment}>
              {isEditing ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
