import api from "@/src/services/api";

export interface Payment {
  id: string;
  freelancer_id: string;
  job_id: string;
  amount: number;
  status: "pending" | "paid" | "canceled";
  payment_date?: string;
  createdAt: string;
  updatedAt: string;
}

// Buscar todos os pagamentos
export const getPayments = async (): Promise<Payment[]> => {
  const response = await api.get("/payments");
  return response.data;
};

// Buscar pagamento por ID
export const getPaymentById = async (id: string): Promise<Payment> => {
  const response = await api.get(`/payments/${id}`);
  return response.data;
};

// Criar novo pagamento
export const createPayment = async (payment: Omit<Payment, "id" | "createdAt" | "updatedAt">): Promise<Payment> => {
  const response = await api.post("/payments", payment);
  return response.data;
};

// Atualizar pagamento
export const updatePayment = async (payment: Payment): Promise<Payment> => {
  const response = await api.put(`/payments/${payment.id}`, payment);
  return response.data;
};

// Excluir pagamento
export const deletePayment = async (id: string): Promise<void> => {
  await api.delete(`/payments/${id}`);
};
