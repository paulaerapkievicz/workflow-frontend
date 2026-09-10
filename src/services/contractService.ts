import api from "@/src/services/api";

export interface ContractTemplate {
  id: string;
  agencyId: string;
  title: string;
  bodyHtml: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MergeToken {
  token: string;
  label: string;
}

export interface ContractSignature {
  id: string;
  templateId: string | null;
  templateTitle: string;
  contentHash: string;
  signerName: string;
  signerCpf: string;
  signerEmail: string | null;
  signedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  status: "signed" | "revoked";
  hasDocument: boolean;
  freelancer?: { id: string; name: string; email: string } | null;
}

export interface FreelancerAgreement {
  hasTemplate: boolean;
  templateTitle: string | null;
  renderedHtml: string;
  missing: string[];
  onboardingApproved: boolean;
  contractComplete: boolean;
  signerName: string;
  signerCpf: string | null;
  signedCurrent: boolean;
  supersededSignature: boolean;
  canSign: boolean;
  blockedReason: string | null;
  acceptanceText: string;
  signature: ContractSignature | null;
}

export interface ContractVerification {
  id: string;
  status: string;
  agencyName: string | null;
  documentTitle: string;
  signerFirstName: string;
  signerCpfMasked: string;
  signedAt: string;
  contentHash: string;
}

const BASE = process.env.NEXT_PUBLIC_BASEURL || "http://localhost:3333";

// ---- Agência: modelos ----
export const listContractTemplates = async (): Promise<{ templates: ContractTemplate[]; tokens: MergeToken[] }> =>
  (await api.get("/agency/contract-templates")).data;

export const createContractTemplate = async (body: { title: string; bodyHtml: string }): Promise<ContractTemplate> =>
  (await api.post("/agency/contract-templates", body)).data;

export const updateContractTemplate = async (
  id: string,
  body: Partial<{ title: string; bodyHtml: string }>
): Promise<ContractTemplate> => (await api.put(`/agency/contract-templates/${id}`, body)).data;

export const activateContractTemplate = async (id: string): Promise<ContractTemplate> =>
  (await api.post(`/agency/contract-templates/${id}/activate`)).data;

export const deleteContractTemplate = async (id: string): Promise<{ message: string }> =>
  (await api.delete(`/agency/contract-templates/${id}`)).data;

export const previewContractTemplate = async (
  id: string,
  freelancerId?: string
): Promise<{ title: string; html: string; missing: string[] }> =>
  (await api.get(`/agency/contract-templates/${id}/preview`, { params: freelancerId ? { freelancerId } : {} })).data;

// ---- Agência: assinaturas ----
export const listContractSignatures = async (): Promise<ContractSignature[]> =>
  (await api.get("/agency/contract-signatures")).data;

export const agencySignatureDocumentUrl = (id: string) => `${BASE}/agency/contract-signatures/${id}/document`;

// ---- Colaborador ----
export const getMyAgreement = async (): Promise<FreelancerAgreement> =>
  (await api.get("/freelancer/contract/agreement")).data;

export const signMyContract = async (body: {
  accepted: boolean;
  signerName?: string;
  signerCpf?: string;
}): Promise<ContractSignature> => (await api.post("/freelancer/contract/sign", body)).data;

export const myContractDocumentUrl = () => `${BASE}/freelancer/contract/document`;

// ---- Público ----
export const verifyContract = async (id: string): Promise<ContractVerification> =>
  (await api.get(`/contracts/verify/${id}`)).data;

/**
 * Baixa um PDF protegido por JWT (não dá para usar link direto — o token vai no header).
 * Abre o blob numa nova aba.
 */
export const openProtectedPdf = async (url: string) => {
  const path = url.replace(BASE, "");
  const res = await api.get(path, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(res.data as Blob);
  window.open(blobUrl, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
};
