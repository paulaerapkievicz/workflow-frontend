import api from "@/src/services/api";

export interface Job {
  id: string;
  supermarketId: string;
  branchId: string;
  categoryId: string;
  freelancerId?: string | null;
  status: 'pending' | 'accepted' | 'completed' | 'canceled';
  startTime: string; // string para facilitar manipulação de datas no front
  endTime: string;
  paymentAmount: number;
  createdAt: string;
  updatedAt: string;
}

// Buscar todas as vagas
export const getJobs = async (): Promise<Job[]> => {
  const response = await api.get("/jobs");
  return response.data;
};

// Criar nova vaga
export const createJob = async (job: Omit<Job, "id">): Promise<Job> => {
  const response = await api.post("/jobs", job);
  return response.data;
};

// Atualizar vaga
export const updateJob = async (job: Job): Promise<Job> => {
  const response = await api.put(`/jobs/${job.id}`, job);
  return response.data;
};

// Excluir vaga
export const deleteJob = async (id: number): Promise<void> => {
  await api.delete(`/jobs/${id}`);
};
