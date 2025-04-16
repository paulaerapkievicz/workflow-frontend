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

// Atualizar freelancer
export const updateFreelancer = async (id: string, data: Partial<Freelancer>): Promise<Freelancer> => {
  const response = await api.put(`/freelancers/${id}`, data);
  return response.data;
};

// Excluir freelancer
export const deleteFreelancer = async (id: string): Promise<void> => {
  await api.delete(`/freelancers/${id}`);
};

// Listar categorias do freelancer
export const getFreelancerCategories = async (id: string): Promise<any[]> => {
  const response = await api.get(`/freelancers/${id}/categories`);
  return response.data;
};

// Adicionar categoria ao freelancer
export const addCategoryToFreelancer = async (freelancerId: string, categoryId: string): Promise<any> => {
  const response = await api.post(`/freelancers/${freelancerId}/categories`, { categoryId });
  return response.data;
};

// Remover categoria do freelancer
export const removeCategoryFromFreelancer = async (freelancerId: string, categoryId: string): Promise<void> => {
  await api.delete(`/freelancers/${freelancerId}/categories/${categoryId}`);
};
