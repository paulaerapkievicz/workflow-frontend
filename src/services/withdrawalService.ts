import api from "@/src/services/api";

export type WithdrawalStatus = "requested" | "paid" | "rejected";

export interface Withdrawal {
  id: string;
  beneficiaryType: "freelancer" | "agency";
  beneficiaryId: string;
  amount: number;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string | null;
}

export const getMyWithdrawals = async (): Promise<Withdrawal[]> =>
  (await api.get("/withdrawals/mine")).data;

export const requestWithdrawal = async (amount: number): Promise<Withdrawal> =>
  (await api.post("/withdrawals", { amount })).data;

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  requested: "Solicitado",
  paid: "Pago",
  rejected: "Rejeitado",
};
