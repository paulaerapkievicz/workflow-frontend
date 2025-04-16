import api from "@/src/services/api";

export interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Buscar todas as categorias
export const getCategories = async (): Promise<Category[]> => {
  const response = await api.get("/categories");
  return response.data;
};

// Criar nova categoria
export const createCategory = async (category: Omit<Category, "id" | "createdAt" | "updatedAt">): Promise<Category> => {
  const response = await api.post("/categories", category);
  return response.data;
};

// Atualizar categoria
export const updateCategory = async (category: Category): Promise<Category> => {
  const response = await api.put(`/categories/${category.id}`, category);
  return response.data;
};

// Excluir categoria
export const deleteCategory = async (id: number): Promise<void> => {
  await api.delete(`/categories/${id}`);
};
