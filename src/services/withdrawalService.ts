import api from "@/src/services/api";

export type WithdrawalStatus = "requested" | "paid" | "rejected";

export const PIX_KEY_TYPES = ["cpf", "cnpj", "email", "telefone", "aleatoria"] as const;
export type PixKeyType = (typeof PIX_KEY_TYPES)[number];

export const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  telefone: "Telefone",
  aleatoria: "Chave aleatória",
};

export interface Withdrawal {
  id: string;
  beneficiaryType: "freelancer" | "agency" | "leader";
  beneficiaryId: string;
  amount: number;
  status: WithdrawalStatus;
  pixKey?: string | null;
  pixKeyType?: PixKeyType | null;
  requestedAt: string;
  processedAt?: string | null;
}

export const getMyWithdrawals = async (): Promise<Withdrawal[]> =>
  (await api.get("/withdrawals/mine")).data;

export const requestWithdrawal = async (
  amount: number,
  pix: { pixKey: string; pixKeyType?: PixKeyType }
): Promise<Withdrawal> =>
  (await api.post("/withdrawals", { amount, pixKey: pix.pixKey, pixKeyType: pix.pixKeyType })).data;

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  requested: "Solicitado",
  paid: "Pago",
  rejected: "Rejeitado",
};
