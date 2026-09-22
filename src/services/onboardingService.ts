import api from "@/src/services/api";

export const SHIRT_SIZES = ["PP", "P", "M", "G", "GG", "XGG"] as const;

/**
 * Funil único de onboarding (pipeline substitui o antigo gate por perfil+uniforme+foto
 * recomputado ao vivo): pré-cadastro -> triagem de documentos -> ASO -> geração do contrato ->
 * assinatura -> ativação final. Colaboradores que já existiam antes desse funil nascem 'active'.
 */
export const ONBOARDING_STATUSES = [
  "draft",
  "pending_docs_review",
  "pending_aso_upload",
  "pending_contract_generation",
  "pending_user_signature",
  "pending_final_activation",
  "active",
] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

/** Título de cada coluna da esteira da agência (as duas pontas do funil não entram na esteira). */
export const ONBOARDING_BOARD_COLUMNS: { status: OnboardingStatus; label: string }[] = [
  { status: "pending_docs_review", label: "Documentos em análise" },
  { status: "pending_aso_upload", label: "Aguardando ASO" },
  { status: "pending_contract_generation", label: "Pronto para liberar contrato" },
  { status: "pending_user_signature", label: "Aguardando assinatura" },
  { status: "pending_final_activation", label: "Pronto para ativar" },
];

export interface FreelancerOnboarding {
  status: OnboardingStatus;
  statusReason?: string | null;
  phaseMessage?: string | null;
  blocked?: boolean;
  registrationStatus?: "pending" | "approved" | "rejected";
  awaitingRegistration?: boolean;
  requireUniformPurchase?: boolean;
  requirePhotoApproval?: boolean;
  /** Ligado pela agência: mostra os dados do pré-cadastro (consulta) e o contrato assinado no perfil. */
  showFullProfile?: boolean;
  uniformStatus?: UniformStatus | null;
  photoStatus?: PhotoStatus;
  photoRejectionReason?: string | null;
  documentIdPhotoUrl?: string | null;
  addressProofPhotoUrl?: string | null;
  documentSelfiePhotoUrl?: string | null;
  asoDocumentUrl?: string | null;
}

export interface OnboardingBoardFreelancer {
  id: string;
  name: string;
  email: string;
  onboardingStatus: OnboardingStatus;
  onboardingStatusReason?: string | null;
  documentIdPhotoUrl?: string | null;
  addressProofPhotoUrl?: string | null;
  documentSelfiePhotoUrl?: string | null;
  asoDocumentUrl?: string | null;
  updatedAt: string;
}

export type OnboardingBoard = Record<string, OnboardingBoardFreelancer[]>;

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
  createdAt: string;
  freelancerName?: string | null;
}

export const getContract = async (): Promise<FreelancerContract | null> =>
  (await api.get("/freelancer/contract")).data;

export const saveContract = async (data: Record<string, unknown>): Promise<FreelancerContract> =>
  (await api.put("/freelancer/contract", data)).data;

export interface OnboardingDocumentPhotos {
  documentIdPhoto?: File | null;
  addressProofPhoto?: File | null;
  documentSelfiePhoto?: File | null;
}

/** Fase 1 (pré-cadastro): dados do perfil contratual + as 3 fotos de documento, num só envio. */
export const submitOnboardingDocuments = async (
  data: Record<string, unknown>,
  photos: OnboardingDocumentPhotos
): Promise<{ onboardingStatus: OnboardingStatus }> => {
  const form = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (value != null) form.append(key, String(value));
  }
  if (photos.documentIdPhoto) form.append("documentIdPhoto", photos.documentIdPhoto);
  if (photos.addressProofPhoto) form.append("addressProofPhoto", photos.addressProofPhoto);
  if (photos.documentSelfiePhoto) form.append("documentSelfiePhoto", photos.documentSelfiePhoto);
  const { data: result } = await api.put("/freelancer/onboarding/documents", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return result;
};

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

/** Dados completos do onboarding de um colaborador — só a agência dele enxerga. */
export const getFreelancerContractForAgency = async (freelancerId: string): Promise<FreelancerContract | null> =>
  (await api.get(`/agency/freelancers/${freelancerId}/contract`)).data;

/** Esteira da agência: colaboradores agrupados pelas 5 fases intermediárias do funil. */
export const getOnboardingBoard = async (): Promise<OnboardingBoard> =>
  (await api.get("/agency/onboarding-board")).data;

/** Fase 2: "Aprovar Documentos". */
export const approveOnboardingDocuments = async (freelancerId: string): Promise<OnboardingBoardFreelancer> =>
  (await api.post(`/agency/freelancers/${freelancerId}/onboarding/approve-documents`)).data;

/** Recusa a triagem e devolve o colaborador pro pré-cadastro, com o motivo. */
export const rejectOnboardingDocuments = async (
  freelancerId: string,
  reason: string
): Promise<OnboardingBoardFreelancer> =>
  (await api.post(`/agency/freelancers/${freelancerId}/onboarding/reject-documents`, { reason })).data;

/** Fase 3: anexa o PDF do ASO (exame admissional feito por telemedicina, fora do sistema). */
export const uploadOnboardingAso = async (freelancerId: string, file: File): Promise<OnboardingBoardFreelancer> => {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(`/agency/freelancers/${freelancerId}/onboarding/aso`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

/** Fase 4: "Liberar Contrato". */
export const releaseOnboardingContract = async (freelancerId: string): Promise<OnboardingBoardFreelancer> =>
  (await api.post(`/agency/freelancers/${freelancerId}/onboarding/release-contract`)).data;

/** Fase 6: "Ativar Colaborador". */
export const activateFreelancerOnboarding = async (freelancerId: string): Promise<OnboardingBoardFreelancer> =>
  (await api.post(`/agency/freelancers/${freelancerId}/onboarding/activate`)).data;

// ----- Foto de perfil (onboarding) -----
export const getAgencyPhotoReviews = async (): Promise<FreelancerPhotoReview[]> =>
  (await api.get("/agency/photo-reviews")).data;

export const reviewFreelancerPhoto = async (
  freelancerId: string,
  approved: boolean,
  reason?: string
): Promise<FreelancerPhotoReview> =>
  (await api.post(`/freelancers/${freelancerId}/photo-review`, { approved, reason })).data;
