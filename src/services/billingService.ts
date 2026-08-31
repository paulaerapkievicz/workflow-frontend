import api from "@/src/services/api";

export interface BillingCategoryLine {
  categoryId: string;
  categoryName: string;
  count: number;
  contractedHours: number;
  workedHours: number;
  amount: number;
}

export interface BillingMonth {
  referenceMonth: string;
  totalJobs: number;
  contractedHours: number;
  workedHours: number;
  totalAmount: number;
  byCategory: BillingCategoryLine[];
  invoices: { id: string; agencyName: string | null; totalAmount: number; status: string }[];
}

export interface BillingSummary {
  months: BillingMonth[];
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
  type: "job" | "monthly";
  referenceMonth: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  totalJobs: number | null;
  contractedMinutes: number | null;
  workedMinutes: number | null;
  totalAmount: number;
  status: "pending" | "paid" | "canceled";
  createdAt: string;
  invoiceSupermarket?: { id: string; name: string } | null;
  invoiceAgency?: { id: string; name: string } | null;
  invoiceJobs?: { id: string; title: string; grossAmount?: number | null }[];
}

export interface ClosingPreview {
  jobs: { id: string; title: string; grossAmount?: number | null; workedMinutes?: number | null }[];
  totals: {
    referenceMonth: string;
    totalJobs: number;
    contractedMinutes: number;
    workedMinutes: number;
    totalAmount: number;
  };
}

export interface FreelancerReport {
  items: {
    jobId: string;
    title: string;
    date: string | null;
    categoryName: string | null;
    branchName: string | null;
    supermarketName: string | null;
    contractedHours: number;
    workedHours: number;
    amount: number;
  }[];
  totals: {
    jobsCount: number;
    contractedHours: number;
    workedHours: number;
    earned: number;
    availableBalance: number;
  };
}

export const getBillingSummary = async (): Promise<BillingSummary> =>
  (await api.get("/billing/summary")).data;

export const getFreelancerReport = async (): Promise<FreelancerReport> =>
  (await api.get("/reports/freelancer")).data;

export const getClosings = async (): Promise<MonthlyClosing[]> =>
  (await api.get("/closings")).data;

export const previewClosing = async (
  supermarketId: string,
  referenceMonth: string
): Promise<ClosingPreview> =>
  (await api.get("/closings/preview", { params: { supermarketId, referenceMonth } })).data;

export const createClosing = async (
  supermarketId: string,
  referenceMonth: string
): Promise<MonthlyClosing> =>
  (await api.post("/closings", { supermarketId, referenceMonth })).data;

export const payClosing = async (id: string): Promise<MonthlyClosing> =>
  (await api.post(`/invoices/${id}/pay`)).data;

export const CLOSING_STATUS_LABELS: Record<MonthlyClosing["status"], string> = {
  pending: "A pagar",
  paid: "Paga",
  canceled: "Cancelada",
};
