import api from "@/src/services/api";

export interface Freelancer {
  id: string;
  name: string;
  email: string;
  phone: string;
  agencyId: string;
  createdAt: string;
  updatedAt: string;
}

// Buscar todos os freelancers
export const getAllFreelancers = async (): Promise<Freelancer[]> => {
  const response = await api.get("/freelancers");
  return response.data;
};

// Buscar freelancer por ID
export const getFreelancerById = async (id: string): Promise<Freelancer> => {
  const response = await api.get(`/freelancers/${id}`);
  return response.data;
};

// Criar freelancer
export const createFreelancer = async (freelancer: Omit<Freelancer, "id" | "createdAt" | "updatedAt">): Promise<Freelancer> => {
  const response = await api.post("/freelancers", freelancer);
  return response.data;
};

// Atualizar freelancer (campos de perfil — o backend ignora o resto)
export const updateFreelancer = async (
  id: string,
  data: Partial<{ name: string; email: string; phone: string; skills: string }>
): Promise<Freelancer> => {
  const response = await api.put(`/freelancers/${id}`, data);
  return response.data;
};

// Excluir freelancer
export const deleteFreelancer = async (id: string): Promise<void> => {
  await api.delete(`/freelancers/${id}`);
};

export interface FreelancerCategoryRow {
  id: string;
  freelancerId: string;
  categoryId: string;
  /** Valor/hora que o colaborador recebe nessa função (null = ainda não precificada). */
  hourlyRate?: number | string | null;
  category?: { id: string; name: string } | null;
}

// Listar categorias (funções) do freelancer
export const getFreelancerCategories = async (id: string): Promise<FreelancerCategoryRow[]> => {
  const response = await api.get(`/freelancers/${id}/categories`);
  return response.data;
};

// Adicionar categoria (função) ao freelancer — com o valor/hora que ele recebe nela
export const addCategoryToFreelancer = async (
  freelancerId: string,
  categoryId: string,
  hourlyRate?: number
): Promise<unknown> => {
  const response = await api.post(`/freelancers/${freelancerId}/categories`, { categoryId, hourlyRate });
  return response.data;
};

// Atualizar só o valor/hora de uma função já marcada
export const setFreelancerCategoryRate = async (
  freelancerId: string,
  categoryId: string,
  hourlyRate: number
): Promise<unknown> => {
  const response = await api.put(`/freelancers/${freelancerId}/categories/${categoryId}`, { hourlyRate });
  return response.data;
};

// Remover categoria do freelancer
export const removeCategoryFromFreelancer = async (freelancerId: string, categoryId: string): Promise<void> => {
  await api.delete(`/freelancers/${freelancerId}/categories/${categoryId}`);
};
