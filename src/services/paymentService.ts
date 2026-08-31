import api from "@/src/services/api";

export type PaymentStatus = "settled" | "canceled";

export interface Payment {
  id: string;
  jobId: string;
  freelancerId: string;
  // valores opcionais: a API só devolve os que o papel pode ver (carteira opaca)
  amount?: number;
  grossAmount?: number;
  agencyAmount?: number;
  freelancerAmount?: number;
  status: PaymentStatus;
  paidAt?: string | null;
  releasedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  paymentJob?: {
    id: string;
    title: string;
    status: string;
    jobBranch?: { id: string; name: string } | null;
    jobCategory?: { id: string; name: string } | null;
  } | null;
  paymentFreelancer?: { id: string; name: string } | null;
}

export interface Invoice {
  id: string;
  supermarketId: string;
  jobId?: string | null;
  paymentId?: string | null;
  totalAmount: number;
  status: "pending" | "paid" | "canceled";
  createdAt: string;
  invoiceJob?: { id: string; title: string } | null;
}

export const getMyPayments = async (): Promise<Payment[]> =>
  (await api.get("/payments/mine")).data;

export const getMyInvoices = async (): Promise<Invoice[]> =>
  (await api.get("/invoices/mine")).data;

export const payInvoice = async (id: string): Promise<Invoice> =>
  (await api.post(`/invoices/${id}/pay`)).data;

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  settled: "Liberado",
  canceled: "Cancelado",
};

export const INVOICE_STATUS_LABELS: Record<Invoice["status"], string> = {
  pending: "A pagar",
  paid: "Paga",
  canceled: "Cancelada",
};
