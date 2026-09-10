import api from "@/src/services/api";

export type LeaderPayType = "hora" | "diaria" | "mensal" | "por_colaborador";

export const PAY_TYPE_LABELS: Record<LeaderPayType, string> = {
  hora: "Por hora",
  diaria: "Por diária",
  mensal: "Mensal",
  por_colaborador: "Por colaborador que trabalhou",
};

export type LeaderJobCreditStatus = "released" | "pending" | "canceled";

export const CREDIT_STATUS_LABELS: Record<LeaderJobCreditStatus, string> = {
  released: "Liberado",
  pending: "Aguardando a agência",
  canceled: "Não pago",
};

export interface LeaderJobCredit {
  id: string;
  agencyMemberId: string;
  leaderName: string | null;
  jobId: string;
  jobTitle: string | null;
  branchName: string | null;
  freelancerId: string | null;
  freelancerName: string | null;
  amount: number;
  status: LeaderJobCreditStatus;
  note: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export interface AgencyMemberPayment {
  id: string;
  amount: number;
  referenceMonth: string | null;
  note: string | null;
  createdAt: string;
}

export interface AgencyMember {
  id: string;
  agencyId: string;
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  payType: LeaderPayType | null;
  payAmount: number | null;
  availableBalance: number;
  teamRoleId?: string | null;
  teamRole?: { id: string; name: string; position: number } | null;
  scope: { freelancerIds: string[]; branchIds: string[] };
  payments: AgencyMemberPayment[];
  jobCredits: LeaderJobCredit[];
  creditsReleasedTotal: number;
  creditsPendingTotal: number;
}

export const getAgencyMembers = async (): Promise<AgencyMember[]> =>
  (await api.get("/agency/members")).data;

export const createAgencyMember = async (payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  payType: LeaderPayType;
  payAmount: number;
  teamRoleId?: string | null;
  freelancerIds?: string[];
  branchIds?: string[];
}): Promise<AgencyMember> => (await api.post("/agency/members", payload)).data;

export const updateAgencyMember = async (
  id: string,
  payload: { payType?: LeaderPayType; payAmount?: number; active?: boolean; teamRoleId?: string | null }
): Promise<AgencyMember> => (await api.put(`/agency/members/${id}`, payload)).data;

export const setAgencyMemberScope = async (
  id: string,
  scope: { freelancerIds: string[]; branchIds: string[] }
): Promise<AgencyMember> => (await api.put(`/agency/members/${id}/scope`, scope)).data;

export const deactivateAgencyMember = async (id: string): Promise<AgencyMember> =>
  (await api.delete(`/agency/members/${id}`)).data;

export const registerAgencyMemberPayment = async (
  id: string,
  payload: { amount: number; referenceMonth?: string | null; note?: string | null }
): Promise<AgencyMember> => (await api.post(`/agency/members/${id}/payments`, payload)).data;

export interface LeaderWallet {
  id: string;
  active: boolean;
  agencyName: string | null;
  payType: LeaderPayType | null;
  payAmount: number | null;
  availableBalance: number;
  payments: AgencyMemberPayment[];
  jobCredits: LeaderJobCredit[];
  creditsReleasedTotal: number;
  creditsPendingTotal: number;
}

export const getLeaderWallet = async (): Promise<LeaderWallet> =>
  (await api.get("/leader/wallet")).data;

export const getMemberJobCredits = async (
  status?: LeaderJobCreditStatus
): Promise<LeaderJobCredit[]> =>
  (await api.get("/agency/member-credits", { params: status ? { status } : {} })).data;

export const releaseMemberJobCredit = async (id: string): Promise<LeaderJobCredit> =>
  (await api.post(`/agency/member-credits/${id}/release`)).data;

export const cancelMemberJobCredit = async (
  id: string,
  note?: string
): Promise<LeaderJobCredit> =>
  (await api.post(`/agency/member-credits/${id}/cancel`, { note })).data;

/** Líder que responde por um colaborador: com ele no escopo (`explicit`) ou cobrindo a rede toda (`all`). */
export interface AssignedLeader {
  id: string;
  name: string;
  scope: "explicit" | "all";
}

export const getFreelancerLeaders = async (freelancerId: string): Promise<AssignedLeader[]> =>
  (await api.get(`/freelancers/${freelancerId}/leaders`)).data;
