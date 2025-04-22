// pages/supermarket/payments.tsx
import { useEffect, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/supermarket/Sidebar";
import Modal from "@/src/components/common/Modal";
import styles from "@/styles/supermarketJobs.module.scss";
import { getPayments, updatePayment, Payment } from "@/src/services/paymentService";
import { getJobs, Job } from "@/src/services/jobService";

interface FormData {
  id?: string;
  status: Payment["status"];
  payment_date: string;
}

export default function SupermarketPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: "", startDate: "", endDate: "", branch: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [paymentsData, jobsData] = await Promise.all([getPayments(), getJobs()]);
      setPayments(paymentsData);
      setJobs(jobsData);
      setError(null);
    } catch {
      setError("Erro ao carregar dados de pagamentos ou vagas.");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (payment: Payment) => {
    setSelectedPayment({
      id: payment.id,
      status: payment.status,
      payment_date: payment.payment_date?.split("T")[0] || new Date().toISOString().split("T")[0],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedPayment(null);
    setIsModalOpen(false);
  };

  const savePayment = async () => {
    if (!selectedPayment || !selectedPayment.id) return;

    const existing = payments.find((p) => p.id === selectedPayment.id);
    if (!existing) return alert("Pagamento não encontrado.");

    const updated: Payment = {
      ...existing,
      status: selectedPayment.status,
      payment_date: `${selectedPayment.payment_date}T00:00:00.000Z`,
      updatedAt: new Date().toISOString(),
    };

    try {
      await updatePayment(updated);
      await loadData();
      closeModal();
    } catch {
      alert("Erro ao atualizar pagamento.");
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const job = jobs.find(j => j.id === payment.job_id);
    return (
      (!filters.status || payment.status === filters.status) &&
      (!filters.startDate || (payment.payment_date && new Date(payment.payment_date) >= new Date(filters.startDate))) &&
      (!filters.endDate || (payment.payment_date && new Date(payment.payment_date) <= new Date(filters.endDate))) &&
      (!filters.branch || job?.branchId === filters.branch)
    );
  });

  const getJobDetails = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    return job
      ? `Filial: ${job.branchId} | ${new Date(job.startTime).toLocaleDateString()}`
      : "Vaga não encontrada";
  };

  const uniqueBranches = Array.from(new Set(jobs.map(j => j.branchId)));

  return (
    <>
      <Head><title>Pagamentos | Supermercado</title></Head>
      <main className={styles.jobsContainer}>
        <Sidebar />
        <section className={styles.content}>
          <header className={styles.header}>
            <h1>Pagamentos</h1>
          </header>

          <div className={styles.filters}>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Status</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="canceled">Cancelado</option>
            </select>

            <div className={styles.dateRangeFilter}>
              <label>Período:</label>
              <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
              <span>até</span>
              <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
            </div>

            <select value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })}>
              <option value="">Todas as Filiais</option>
              {uniqueBranches.map(branch => (
                <option key={branch} value={branch}>Filial {branch}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p>Carregando pagamentos...</p>
          ) : error ? (
            <p>{error}</p>
          ) : filteredPayments.length === 0 ? (
            <p>Nenhum pagamento encontrado com os filtros atuais.</p>
          ) : (
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
                {filteredPayments.map(payment => (
                  <tr key={payment.id}>
                    <td>{getJobDetails(payment.job_id)}</td>
                    <td>R$ {Number(payment.amount).toFixed(2)}</td>
                    <td>{payment.status === "pending" ? "Pendente" : payment.status === "paid" ? "Pago" : "Cancelado"}</td>
                    <td>{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : "-"}</td>
                    <td>
                      <button className={styles.editBtn} onClick={() => openModal(payment)}>
                        {payment.status === "pending" ? "Confirmar Pagamento" : "Editar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {isModalOpen && selectedPayment && (
        <Modal onClose={closeModal} title="Editar Pagamento">
          <div className={styles.modalContent}>
            <label>Status:</label>
            <select
              value={selectedPayment.status}
              onChange={(e) => setSelectedPayment({ ...selectedPayment, status: e.target.value as Payment["status"] })}
            >
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="canceled">Cancelado</option>
            </select>

            <label>Data de Pagamento:</label>
            <input
              type="date"
              value={selectedPayment.payment_date}
              onChange={(e) => setSelectedPayment({ ...selectedPayment, payment_date: e.target.value })}
            />

            <button className={styles.saveBtn} onClick={savePayment}>
              Salvar Alterações
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
