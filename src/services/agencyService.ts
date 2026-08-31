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
  createdAt: string;
  updatedAt: string;
}

export interface AgencyFreelancer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  skills?: string | null;
  agencyId: string | null;
  availableBalance: number;
}

export const getAgencies = async (): Promise<Agency[]> => (await api.get("/agencies")).data;

export const getAgencyById = async (id: string): Promise<Agency> =>
  (await api.get(`/agencies/${id}`)).data;

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
