import api from "@/src/services/api";
import type { JobShift } from "@/src/services/jobService";

/** Uma vaga concluída — linha "crua" do faturamento (o front monta os cruzamentos). */
export interface BillingJob {
  jobId: string;
  title: string;
  completedAt: string | null;
  referenceMonth: string | null;
  branchId: string;
  branchName: string;
  categoryId: string;
  categoryName: string;
  shiftPeriod: string | null;
  orderId: string | null;
  orderCreatedAt: string | null;
  freelancerName: string | null;
  contractedMinutes: number;
  workedMinutes: number;
  amount: number;
  invoiceId: string | null;
}

export type PaymentProofStatus = "pending" | "approved" | "rejected";

export interface InvoiceAdjustment {
  id: string;
  invoiceId: string;
  description: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  agencyNote?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  adjustmentAuthor?: { id: string; name: string } | null;
}

export interface BillingInvoice {
  id: string;
  referenceMonth: string | null;
  agencyName: string | null;
  branchId: string | null;
  branchName: string | null;
  totalJobs: number;
  contractedMinutes: number;
  workedMinutes: number;
  totalAmount: number;
  /** Soma dos abatimentos já aprovados. */
  adjustmentsTotal: number;
  /** Valor líquido a pagar (`totalAmount - adjustmentsTotal`). */
  netAmount: number;
  /** Contestações ainda aguardando a agência. */
  pendingAdjustments: number;
  status: "pending" | "paid" | "canceled";
  paymentUrl?: string | null;
  paymentRef?: string | null;
  paidAt?: string | null;
  paymentProofUrl?: string | null;
  paymentProofStatus?: PaymentProofStatus | null;
  paymentProofNote?: string | null;
  paymentProofUploadedAt?: string | null;
  createdAt: string;
}

export interface BillingSummary {
  jobs: BillingJob[];
  branches: { id: string; name: string }[];
  invoices: BillingInvoice[];
  totals: {
    totalJobs: number;
    contractedHours: number;
    workedHours: number;
    totalAmount: number;
    openInvoicesAmount: number;
    paidInvoicesAmount: number;
  };
}

export interface MonthlyClosing {
  id: string;
  supermarketId: string;
  agencyId: string | null;
  branchId: string | null;
  type: "job" | "monthly";
  referenceMonth: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  totalJobs: number | null;
  contractedMinutes: number | null;
  workedMinutes: number | null;
  totalAmount: number;
  adjustmentsTotal?: number | null;
  status: "pending" | "paid" | "canceled";
  /** Link de pagamento do gateway (Mercado Pago) — presente quando o pagamento foi iniciado. */
  paymentUrl?: string | null;
  paymentRef?: string | null;
  paidAt?: string | null;
  paymentProofUrl?: string | null;
  paymentProofStatus?: PaymentProofStatus | null;
  paymentProofNote?: string | null;
  paymentProofUploadedAt?: string | null;
  createdAt: string;
  invoiceSupermarket?: { id: string; name: string } | null;
  invoiceAgency?: { id: string; name: string } | null;
  invoiceBranch?: { id: string; name: string } | null;
  invoiceJobs?: { id: string; title: string; grossAmount?: number | null }[];
  invoiceAdjustments?: InvoiceAdjustment[];
}

/** Valor líquido a pagar de um fechamento (total menos abatimentos aprovados). */
export const closingNetAmount = (c: Pick<MonthlyClosing, "totalAmount" | "adjustmentsTotal">) =>
  Number((Number(c.totalAmount) - Number(c.adjustmentsTotal ?? 0)).toFixed(2));

export interface ClosingPreview {
  jobs: {
    id: string;
    title: string;
    grossAmount?: number | null;
    workedMinutes?: number | null;
    jobBranch?: { id: string; name: string } | null;
  }[];
  totals: {
    referenceMonth: string;
    totalJobs: number;
    contractedMinutes: number;
    workedMinutes: number;
    totalAmount: number;
  };
}

export type FreelancerPaymentStatus = "received" | "awaiting" | "overdue";

export interface FreelancerReportItem {
  jobId: string;
  title: string;
  date: string | null;
  categoryId: string;
  categoryName: string | null;
  branchId: string;
  branchName: string | null;
  supermarketName: string | null;
  contractedHours: number;
  workedHours: number;
  amount: number;
  paymentStatus: FreelancerPaymentStatus | null;
  shifts: JobShift[];
}

export interface FreelancerReport {
  items: FreelancerReportItem[];
  totals: {
    jobsCount: number;
    contractedHours: number;
    workedHours: number;
    earned: number;
    availableBalance: number;
  };
}

export type FreelancerOutcome = "accepted" | "active" | "completed" | "abandoned" | "withdrawnEarly";

export interface FreelancerOutcomeItem {
  jobId: string;
  title: string;
  date: string;
  categoryId: string;
  categoryName: string | null;
  branchId: string;
  branchName: string | null;
  supermarketName: string | null;
  outcome: FreelancerOutcome;
}

export interface FreelancerOutcomes {
  counts: { accepted: number; active: number; completed: number; abandoned: number; withdrawnEarly: number };
  items: FreelancerOutcomeItem[];
}

export const FREELANCER_OUTCOME_LABELS: Record<FreelancerOutcome, string> = {
  accepted: "Aceito",
  active: "Ativo",
  completed: "Concluído",
  abandoned: "Abandono",
  withdrawnEarly: "Desistência",
};

export const PAYMENT_STATUS_FILTER_LABELS: Record<FreelancerPaymentStatus, string> = {
  received: "Recebido",
  awaiting: "A receber",
  overdue: "Atrasado",
};

export const getBillingSummary = async (): Promise<BillingSummary> =>
  (await api.get("/billing/summary")).data;

export const getFreelancerReport = async (): Promise<FreelancerReport> =>
  (await api.get("/reports/freelancer")).data;

export const getFreelancerOutcomes = async (): Promise<FreelancerOutcomes> =>
  (await api.get("/freelancer/outcomes")).data;

/** Baixa o PDF do relatório de trabalhos do colaborador, respeitando os filtros aplicados na tela. */
export const downloadFreelancerReportPdf = async (filters?: {
  from?: string; to?: string; categoryId?: string; branchId?: string;
}): Promise<void> => {
  const response = await api.get("/reports/freelancer/pdf", {
    params: filters, responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "relatorio-trabalhos.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const getClosings = async (): Promise<MonthlyClosing[]> =>
  (await api.get("/closings")).data;

export const previewClosing = async (
  supermarketId: string,
  referenceMonth: string,
  branchId?: string | null
): Promise<ClosingPreview> =>
  (await api.get("/closings/preview", {
    params: { supermarketId, referenceMonth, ...(branchId ? { branchId } : {}) },
  })).data;

export const createClosing = async (
  supermarketId: string,
  referenceMonth: string,
  branchId?: string | null
): Promise<MonthlyClosing> =>
  (await api.post("/closings", { supermarketId, referenceMonth, ...(branchId ? { branchId } : {}) })).data;

export const payClosing = async (id: string): Promise<MonthlyClosing> =>
  (await api.post(`/invoices/${id}/pay`)).data;

/** Confirma o pagamento da fatura consultando o gateway (usado ao voltar do checkout). */
export const syncClosingPayment = async (id: string): Promise<MonthlyClosing> =>
  (await api.post(`/invoices/${id}/sync-payment`)).data;

/** Baixa manual da agência — usada quando o pagamento pelo app está desligado (no geral ou pro cliente). */
export const markClosingPaid = async (id: string): Promise<MonthlyClosing> =>
  (await api.post(`/invoices/${id}/mark-paid`)).data;

// ---- Comprovante de pagamento manual (supermercado anexa, agência confere) ----
export const submitPaymentProof = async (invoiceId: string, file: File): Promise<MonthlyClosing> => {
  const form = new FormData();
  form.append("file", file);
  return (await api.post(`/invoices/${invoiceId}/payment-proof`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  })).data;
};

export const approvePaymentProof = async (invoiceId: string): Promise<MonthlyClosing> =>
  (await api.post(`/invoices/${invoiceId}/payment-proof/approve`)).data;

export const rejectPaymentProof = async (invoiceId: string, note: string): Promise<MonthlyClosing> =>
  (await api.post(`/invoices/${invoiceId}/payment-proof/reject`, { note })).data;

/** Resolve a URL de um arquivo enviado (`/uploads/...`) pro host absoluto da API. */
export const resolveUploadUrl = (url: string) =>
  url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_BASEURL || "http://localhost:3333"}${url}`;

export const PAYMENT_PROOF_STATUS_LABELS: Record<PaymentProofStatus, string> = {
  pending: "Comprovante em análise",
  approved: "Comprovante aprovado",
  rejected: "Comprovante recusado",
};

// Baixa o PDF do fechamento e aciona o download no navegador.
export const downloadClosingPdf = async (id: string, referenceMonth?: string | null): Promise<void> => {
  const response = await api.get(`/closings/${id}/pdf`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `fechamento-${referenceMonth ?? id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ---- Contestação / abatimento do fechamento ----
export const getInvoiceAdjustments = async (invoiceId: string): Promise<InvoiceAdjustment[]> =>
  (await api.get(`/invoices/${invoiceId}/adjustments`)).data;

export const createInvoiceAdjustment = async (
  invoiceId: string,
  payload: { description: string; amount: number }
): Promise<InvoiceAdjustment> =>
  (await api.post(`/invoices/${invoiceId}/adjustments`, payload)).data;

export const deleteInvoiceAdjustment = async (invoiceId: string, adjustmentId: string): Promise<void> => {
  await api.delete(`/invoices/${invoiceId}/adjustments/${adjustmentId}`);
};

export const approveInvoiceAdjustment = async (
  invoiceId: string,
  adjustmentId: string
): Promise<InvoiceAdjustment> =>
  (await api.post(`/invoices/${invoiceId}/adjustments/${adjustmentId}/approve`)).data;

export const rejectInvoiceAdjustment = async (
  invoiceId: string,
  adjustmentId: string,
  note: string
): Promise<InvoiceAdjustment> =>
  (await api.post(`/invoices/${invoiceId}/adjustments/${adjustmentId}/reject`, { note })).data;

export const revertInvoiceAdjustment = async (
  invoiceId: string,
  adjustmentId: string
): Promise<InvoiceAdjustment> =>
  (await api.post(`/invoices/${invoiceId}/adjustments/${adjustmentId}/revert`)).data;

export const ADJUSTMENT_STATUS_LABELS: Record<InvoiceAdjustment["status"], string> = {
  pending: "Aguardando agência",
  approved: "Aprovado",
  rejected: "Recusado",
};

export const CLOSING_STATUS_LABELS: Record<MonthlyClosing["status"], string> = {
  pending: "A pagar",
  paid: "Paga",
  canceled: "Cancelada",
};

// ---- helpers de agregação para o faturamento ----
export const hoursFromMin = (min: number) => Number((min / 60).toFixed(1));
export const money = (v: number) => `R$ ${Number(v).toFixed(2)}`;
export const monthName = (ref: string | null) => {
  if (!ref) return "—";
  const [y, m] = ref.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};
