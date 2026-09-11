import api from "@/src/services/api";

export interface Agency {
  id: string;
  name: string;
  cnpj: string;
  address?: string;
  phone?: string | null;
  ownerId: string;
  availableBalance: number;
  commissionPercentage: number;
  allowSelfRegistration?: boolean;
  active?: boolean;
  logoUrl?: string | null;
  whatsappNumber?: string | null;
  whatsappMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PendingFreelancer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  document?: string | null;
  skills?: string | null;
  createdAt: string;
}

export const getPendingFreelancers = async (): Promise<PendingFreelancer[]> =>
  (await api.get("/agency/pending-freelancers")).data;

export const approveFreelancer = async (id: string): Promise<unknown> =>
  (await api.post(`/agency/freelancers/${id}/approve`)).data;

export const rejectFreelancer = async (id: string): Promise<unknown> =>
  (await api.post(`/agency/freelancers/${id}/reject`)).data;

export interface AgencyFreelancer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  skills?: string | null;
  agencyId: string | null;
  availableBalance: number;
  profilePhotoUrl?: string | null;
}

export const getAgencies = async (): Promise<Agency[]> => (await api.get("/agencies")).data;

export const getAgencyById = async (id: string): Promise<Agency> =>
  (await api.get(`/agencies/${id}`)).data;

/** Dados públicos da landing da agência (/p/:id) — não exige login. */
export interface AgencyPublicLanding {
  id: string;
  name: string;
  logoUrl: string | null;
  whatsappNumber: string | null;
  whatsappMessage: string | null;
}

export const getAgencyPublicLanding = async (id: string): Promise<AgencyPublicLanding> =>
  (await api.get(`/agencies/${id}/public-landing`)).data;

// Freelancers da agência logada (a API devolve todos; filtramos pelo agencyId).
export const getMyFreelancers = async (agencyId: string): Promise<AgencyFreelancer[]> => {
  const all: AgencyFreelancer[] = (await api.get("/freelancers")).data;
  return all.filter((f) => f.agencyId === agencyId);
};

export const addFreelancer = async (payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  skills?: string;
}): Promise<AgencyFreelancer> => (await api.post("/agency/freelancers", payload)).data;
