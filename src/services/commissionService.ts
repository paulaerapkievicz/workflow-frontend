import api from "@/src/services/api";

export interface Commission {
  id: string;
  agency_id: string;
  job_id: string;
  commission_percentage: number;
  commission_amount: number;
  createdAt: string;
  updatedAt: string;
}

// Buscar todas as comissões
export const getCommissions = async (): Promise<Commission[]> => {
  const response = await api.get("/commissions");
  return response.data;
};

// Buscar comissão por ID
export const getCommissionById = async (id: string): Promise<Commission> => {
  const response = await api.get(`/commissions/${id}`);
  return response.data;
};

// Criar nova comissão
export const createCommission = async (commission: Omit<Commission, "id" | "createdAt" | "updatedAt">): Promise<Commission> => {
  const response = await api.post("/commissions", commission);
  return response.data;
};

// Atualizar comissão
export const updateCommission = async (commission: Commission): Promise<Commission> => {
  const response = await api.put(`/commissions/${commission.id}`, commission);
  return response.data;
};

// Excluir comissão
export const deleteCommission = async (id: string): Promise<void> => {
  await api.delete(`/commissions/${id}`);
};
