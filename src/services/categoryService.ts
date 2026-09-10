import api from "@/src/services/api";

export interface Category {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Combos de cadastro/pedido — só funções ativas. */
export const getCategories = async (): Promise<Category[]> => {
  const response = await api.get("/categories");
  return response.data;
};

/** Tela de gestão da agência — lista completa, com inativas. */
export const getManagedCategories = async (): Promise<Category[]> => {
  const response = await api.get("/categories/manage");
  return response.data;
};

export const createCategory = async (data: { name: string }): Promise<Category> => {
  const response = await api.post("/categories", data);
  return response.data;
};

export const updateCategory = async (
  id: string,
  data: { name?: string; active?: boolean }
): Promise<Category> => {
  const response = await api.put(`/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`/categories/${id}`);
};
