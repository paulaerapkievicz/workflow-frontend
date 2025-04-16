import api from "@/src/services/api";

export interface Agency {
  id: string;
  name: string;
  cnpj: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// Buscar todas as agências
export const getAgencies = async (): Promise<Agency[]> => {
  const response = await api.get("/agencies");
  return response.data;
};

// Buscar uma agência por ID
export const getAgencyById = async (id: string): Promise<Agency> => {
  const response = await api.get(`/agencies/${id}`);
  return response.data;
};

// Criar uma nova agência
export const createAgency = async (agency: Omit<Agency, "id" | "createdAt" | "updatedAt">): Promise<Agency> => {
  const response = await api.post("/agencies", agency);
  return response.data;
};

// Atualizar agência
export const updateAgency = async (id: string, agency: Partial<Agency>): Promise<Agency> => {
  const response = await api.put(`/agencies/${id}`, agency);
  return response.data;
};

// Excluir agência
export const deleteAgency = async (id: string): Promise<void> => {
  await api.delete(`/agencies/${id}`);
};
