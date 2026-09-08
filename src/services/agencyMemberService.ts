import api from "@/src/services/api";

export type LeaderPayType = "hora" | "diaria" | "mensal";

export const PAY_TYPE_LABELS: Record<LeaderPayType, string> = {
  hora: "Por hora",
  diaria: "Por diária",
  mensal: "Mensal",
};

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
  scope: { freelancerIds: string[]; branchIds: string[] };
  payments: AgencyMemberPayment[];
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
  freelancerIds?: string[];
  branchIds?: string[];
}): Promise<AgencyMember> => (await api.post("/agency/members", payload)).data;

export const updateAgencyMember = async (
  id: string,
  payload: { payType?: LeaderPayType; payAmount?: number; active?: boolean }
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
}

export const getLeaderWallet = async (): Promise<LeaderWallet> =>
  (await api.get("/leader/wallet")).data;
