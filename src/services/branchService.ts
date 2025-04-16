import api from "@/src/services/api";

export interface Branch {
  id: string;
  name: string;
  address: string;
  supermarketId: string;
  createdAt: string;
  updatedAt: string;
}

// Buscar todas as filiais
export const getBranches = async (): Promise<Branch[]> => {
  const response = await api.get("/branches");
  return response.data;
};

// Criar uma nova filial
export const createBranch = async (branch: Omit<Branch, "id" | "createdAt" | "updatedAt">): Promise<Branch> => {
  const response = await api.post("/branches", branch);
  return response.data;
};

// Atualizar filial
export const updateBranch = async (branch: Branch): Promise<Branch> => {
  const response = await api.put(`/branches/${branch.id}`, branch);
  return response.data;
};

// Excluir filial
export const deleteBranch = async (id: number): Promise<void> => {
  await api.delete(`/branches/${id}`);
};
