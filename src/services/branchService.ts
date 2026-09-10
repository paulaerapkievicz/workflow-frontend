import api from "@/src/services/api";

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geocodedAt?: string | null;
  geocodeQuery?: string | null;
  supermarketId: string;
  /** approved = pode receber pedidos; pending = aguardando a agência aprovar o atendimento. */
  serviceStatus: "approved" | "pending";
  /** Dados cadastrais próprios da filial (vazio = herda da matriz). */
  legalName?: string | null;
  cnpj?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  profilePhotoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BranchInput {
  name: string;
  address: string;
  phone?: string;
  supermarketId?: string;
  latitude?: number | null;
  longitude?: number | null;
  regeocode?: boolean;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export const getBranches = async (): Promise<Branch[]> => (await api.get("/branches")).data;

export const getBranchesBySupermarket = async (supermarketId: string): Promise<Branch[]> => {
  const all = await getBranches();
  return all.filter((b) => b.supermarketId === supermarketId);
};

export const createBranch = async (branch: BranchInput): Promise<Branch> =>
  (await api.post("/branches", branch)).data;

export const updateBranch = async (id: string, branch: Partial<BranchInput>): Promise<Branch> =>
  (await api.put(`/branches/${id}`, branch)).data;

export const deleteBranch = async (id: string): Promise<void> => {
  await api.delete(`/branches/${id}`);
};

/** Agência aprova o atendimento de uma filial cadastrada pelo próprio supermercado. */
export const approveBranch = async (id: string): Promise<Branch> =>
  (await api.post(`/branches/${id}/approve`)).data;

/** Busca as coordenadas de um endereço (prévia, não salva). */
export const geocodeAddress = async (address: string): Promise<GeocodeResult> =>
  (await api.post("/branches/geocode", { address })).data;

export const branchHasLocation = (b: Branch): boolean =>
  b.latitude != null && b.longitude != null;
