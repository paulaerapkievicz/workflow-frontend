import api from "@/src/services/api";

export interface Supermarket {
  id: string;
  name: string;
  cnpj: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// Buscar todos os supermercados
export const getSupermarkets = async (): Promise<Supermarket[]> => {
  const response = await api.get("/supermarkets");
  return response.data;
};

// Criar novo supermercado
export const createSupermarket = async (supermarket: Omit<Supermarket, "id" | "createdAt" | "updatedAt">): Promise<Supermarket> => {
  const response = await api.post("/supermarkets", supermarket);
  return response.data;
};

// Atualizar supermercado
export const updateSupermarket = async (supermarket: Supermarket): Promise<Supermarket> => {
  const response = await api.put(`/supermarkets/${supermarket.id}`, supermarket);
  return response.data;
};

// Excluir supermercado
export const deleteSupermarket = async (id: number): Promise<void> => {
  await api.delete(`/supermarkets/${id}`);
};
