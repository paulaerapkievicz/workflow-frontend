import api from "@/src/services/api";

export interface Supermarket {
  id: string;
  name: string;
  cnpj: string;
  address?: string;
  phone?: string | null;
  ownerId: string;
  owner?: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

// Buscar todos os supermercados
export const getSupermarkets = async (): Promise<Supermarket[]> => {
  const response = await api.get("/supermarkets");
  return response.data;
};

export interface CreateSupermarketAsAgencyInput {
  name: string;
  cnpj: string;
  address: string;
  phone?: string;
  email: string;
  password: string;
}

// A agência cadastra um supermercado (cria o usuário de acesso + o perfil)
export const createSupermarketAsAgency = async (
  payload: CreateSupermarketAsAgencyInput
): Promise<Supermarket> => (await api.post("/agency/supermarkets", payload)).data;

// Atualizar supermercado
export const updateSupermarket = async (
  id: string,
  patch: Partial<Pick<Supermarket, "name" | "cnpj" | "address" | "phone">>
): Promise<Supermarket> => (await api.put(`/supermarkets/${id}`, patch)).data;

// Excluir supermercado
export const deleteSupermarket = async (id: string): Promise<void> => {
  await api.delete(`/supermarkets/${id}`);
};

// ----- Equipe (gerentes de loja) -----
export interface SupermarketMember {
  id: string;
  supermarketId: string;
  userId: string;
  branchId?: string | null;
  canSubmitOrders: boolean;
  canApproveOrders: boolean;
  isOwner: boolean;
  memberUser?: { id: string; name: string; email: string } | null;
  memberBranch?: { id: string; name: string } | null;
}

export const getMembers = async (supermarketId: string): Promise<SupermarketMember[]> =>
  (await api.get(`/supermarkets/${supermarketId}/members`)).data;

export const addMember = async (
  supermarketId: string,
  payload: {
    name: string;
    email: string;
    password: string;
    branchId?: string | null;
    canSubmitOrders?: boolean;
    canApproveOrders?: boolean;
  }
): Promise<SupermarketMember> =>
  (await api.post(`/supermarkets/${supermarketId}/members`, payload)).data;

export const updateMember = async (
  id: string,
  patch: Partial<Pick<SupermarketMember, "branchId" | "canSubmitOrders" | "canApproveOrders">>
): Promise<SupermarketMember> => (await api.put(`/supermarket-members/${id}`, patch)).data;

export const deleteMember = async (id: string): Promise<void> => {
  await api.delete(`/supermarket-members/${id}`);
};
