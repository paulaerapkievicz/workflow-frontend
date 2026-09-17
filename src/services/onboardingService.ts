import api from "@/src/services/api";

export const SHIRT_SIZES = ["PP", "P", "M", "G", "GG", "XGG"] as const;

export type UniformStatus = "pending_payment" | "paid" | "shipped" | "delivered";

export const UNIFORM_STATUS_LABELS: Record<UniformStatus, string> = {
  pending_payment: "Aguardando pagamento",
  paid: "Pago — aguardando envio",
  shipped: "Enviado",
  delivered: "Recebido",
};

export type PhotoStatus = "none" | "pending" | "approved" | "rejected";

/** Sem "cnpj" — chave Pix do onboarding é pessoal, não pode representar uma empresa. */
export const FREELANCER_PIX_KEY_TYPES = ["cpf", "email", "telefone", "aleatoria"] as const;
export type FreelancerPixKeyType = (typeof FREELANCER_PIX_KEY_TYPES)[number];
export const PIX_KEY_TYPE_LABELS: Record<FreelancerPixKeyType, string> = {
  cpf: "CPF",
  email: "E-mail",
  telefone: "Telefone",
  aleatoria: "Aleatória",
};

export const PHOTO_STATUS_LABELS: Record<PhotoStatus, string> = {
  none: "Nenhuma foto enviada",
  pending: "Em análise",
  approved: "Aprovada",
  rejected: "Recusada",
};

export interface FreelancerPhotoReview {
  id: string;
  name: string;
  profilePhotoUrl: string | null;
  profilePhotoStatus: PhotoStatus;
  profilePhotoRejectionReason: string | null;
  profilePhotoSubmittedAt: string | null;
  profilePhotoReviewedAt: string | null;
}

export interface FreelancerContract {
  id: string;
  freelancerId: string;
  completedAt?: string | null;
  /** Preenchido quando a agência conferiu os dados e confirmou — libera a assinatura do contrato. */
  approvedAt?: string | null;
  approvedBy?: string | null;
  [key: string]: unknown;
}

/** Colaborador com o perfil contratual completo aguardando a agência revisar e aprovar. */
export interface OnboardingReviewRow {
  id: string;
  name: string;
  email: string;
  completedAt: string;
}

export interface UniformOrder {
  id: string;
  freelancerId: string;
  shirtSize: string;
  amount: number;
  status: UniformStatus;
  paymentUrl?: string | null;
  trackingCode?: string | null;
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

// ----- Agência -----
export const getAgencyUniforms = async (): Promise<UniformOrder[]> =>
  (await api.get("/agency/uniforms")).data;

/** Baixa manual — usada quando o pagamento pelo app está desligado pra colaboradores. */
export const markUniformPaid = async (id: string): Promise<UniformOrder> =>
  (await api.post(`/agency/uniforms/${id}/mark-paid`)).data;

export const shipUniform = async (id: string, trackingCode?: string): Promise<UniformOrder> =>
  (await api.post(`/agency/uniforms/${id}/ship`, { trackingCode })).data;

/** Fila de revisão dos dados do onboarding (perfil contratual completo aguardando aprovação). */
export const getOnboardingReviews = async (): Promise<OnboardingReviewRow[]> =>
  (await api.get("/agency/onboarding-reviews")).data;

/** Dados completos do onboarding de um colaborador — só a agência dele enxerga. */
export const getFreelancerContractForAgency = async (freelancerId: string): Promise<FreelancerContract | null> =>
  (await api.get(`/agency/freelancers/${freelancerId}/contract`)).data;

/** A agência confere os dados e confirma — libera a seção no perfil e a etapa do contrato. */
export const approveOnboarding = async (freelancerId: string): Promise<FreelancerContract> =>
  (await api.post(`/agency/freelancers/${freelancerId}/onboarding/approve`)).data;

// ----- Foto de perfil (onboarding) -----
export const getAgencyPhotoReviews = async (): Promise<FreelancerPhotoReview[]> =>
  (await api.get("/agency/photo-reviews")).data;

export const reviewFreelancerPhoto = async (
  freelancerId: string,
  approved: boolean,
  reason?: string
): Promise<FreelancerPhotoReview> =>
  (await api.post(`/freelancers/${freelancerId}/photo-review`, { approved, reason })).data;
