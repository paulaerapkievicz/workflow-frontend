import api from "@/src/services/api";

export interface AdminAgency {
  id: string;
  name: string;
  legalName: string | null;
  cnpj: string;
  address: string;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  profilePhotoUrl: string | null;
  active: boolean;
  createdAt: string;
  owner?: { id: string; name: string; email: string } | null;
  freelancerCount?: number;
  supermarketCount?: number;
}

export interface CreateAgencyPayload {
  name: string;
  legalName?: string;
  cnpj: string;
  address: string;
  phone?: string;
  email?: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
  commissionPercentage?: number;
}

export const listAgencies = async (): Promise<AdminAgency[]> =>
  (await api.get("/platform/agencies")).data;

export const createAgency = async (
  payload: CreateAgencyPayload
): Promise<{ agency: AdminAgency; owner: { id: string; name: string; email: string } }> =>
  (await api.post("/platform/agencies", payload)).data;

export const updateAgency = async (
  id: string,
  patch: Partial<Pick<AdminAgency, "name" | "legalName" | "cnpj" | "address" | "phone" | "email" | "active">>
): Promise<AdminAgency> => (await api.put(`/platform/agencies/${id}`, patch)).data;
