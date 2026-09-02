import api from "@/src/services/api";

export const SHIRT_SIZES = ["PP", "P", "M", "G", "GG", "XGG"] as const;

export type UniformStatus =
  | "pending_payment"
  | "paid"
  | "shipped"
  | "delivered"
  | "photo_submitted"
  | "approved"
  | "rejected";

export const UNIFORM_STATUS_LABELS: Record<UniformStatus, string> = {
  pending_payment: "Aguardando pagamento",
  paid: "Pago — aguardando envio",
  shipped: "Enviado",
  delivered: "Recebido — envie a selfie",
  photo_submitted: "Selfie em análise",
  approved: "Aprovado",
  rejected: "Selfie recusada",
};

export interface FreelancerContract {
  id: string;
  freelancerId: string;
  completedAt?: string | null;
  [key: string]: unknown;
}

export interface UniformOrder {
  id: string;
  freelancerId: string;
  shirtSize: string;
  amount: number;
  status: UniformStatus;
  paymentUrl?: string | null;
  trackingCode?: string | null;
  selfiePhotoUrl?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  freelancerName?: string | null;
}

export const getContract = async (): Promise<FreelancerContract | null> =>
  (await api.get("/freelancer/contract")).data;

export const saveContract = async (data: Record<string, unknown>): Promise<FreelancerContract> =>
  (await api.put("/freelancer/contract", data)).data;

export const getUniform = async (): Promise<UniformOrder | null> =>
  (await api.get("/freelancer/uniform")).data;

export const requestUniform = async (shirtSize: string): Promise<UniformOrder> =>
  (await api.post("/freelancer/uniform", { shirtSize })).data;

export const syncUniformPayment = async (id: string): Promise<UniformOrder> =>
  (await api.post(`/freelancer/uniform/${id}/sync`)).data;

export const confirmUniformReceived = async (id: string): Promise<UniformOrder> =>
  (await api.post(`/freelancer/uniform/${id}/received`)).data;

export const submitUniformSelfie = async (id: string, file: File): Promise<UniformOrder> => {
  const fd = new FormData();
  fd.append("photo", file);
  return (await api.post(`/freelancer/uniform/${id}/selfie`, fd)).data;
};

// ----- Agência -----
export const getAgencyUniforms = async (): Promise<UniformOrder[]> =>
  (await api.get("/agency/uniforms")).data;

export const shipUniform = async (id: string, trackingCode?: string): Promise<UniformOrder> =>
  (await api.post(`/agency/uniforms/${id}/ship`, { trackingCode })).data;

export const reviewUniform = async (
  id: string,
  approved: boolean,
  reason?: string
): Promise<UniformOrder> =>
  (await api.post(`/agency/uniforms/${id}/review`, { approved, reason })).data;
