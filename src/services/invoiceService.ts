import api from "@/src/services/api";

export interface Invoice {
  id: string;
  supermarketId: string;
  total_amount: number;
  status: "pending" | "paid" | "canceled";
  createdAt: string;
  updatedAt: string;
}

// Buscar todas as faturas
export const getInvoices = async (): Promise<Invoice[]> => {
  const response = await api.get("/invoices");
  return response.data;
};

// Buscar fatura por ID
export const getInvoiceById = async (id: string): Promise<Invoice> => {
  const response = await api.get(`/invoices/${id}`);
  return response.data;
};

// Criar nova fatura
export const createInvoice = async (invoice: Omit<Invoice, "id" | "createdAt" | "updatedAt">): Promise<Invoice> => {
  const response = await api.post("/invoices", invoice);
  return response.data;
};

// Atualizar status da fatura
export const updateInvoiceStatus = async (id: string, status: "pending" | "paid" | "canceled"): Promise<Invoice> => {
  const response = await api.patch(`/invoices/${id}/status`, { status });
  return response.data;
};

// Excluir fatura
export const deleteInvoice = async (id: string): Promise<void> => {
  await api.delete(`/invoices/${id}`);
};
