import api from "@/src/services/api";
import type { JobShift } from "@/src/services/jobService";

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
    startTime?: string;
    endTime?: string;
    contractedMinutes?: number | null;
    workedMinutes?: number | null;
    jobBranch?: { id: string; name: string } | null;
    jobCategory?: { id: string; name: string } | null;
    /** Só vem preenchido no relatório de pagamento da agência (`listForAgency`). */
    shifts?: JobShift[];
  } | null;
  paymentFreelancer?: {
    id: string;
    name: string;
    /** Chave Pix do onboarding — só vem preenchida no relatório de pagamento da agência. */
    contract?: { pixKey?: string | null } | null;
  } | null;
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
