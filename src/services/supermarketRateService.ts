import api from "@/src/services/api";

/** Valor/hora que a agência cobra de um supermercado por função (opcionalmente por filial). */
export interface SupermarketCategoryRate {
  id: string;
  supermarketId: string;
  categoryId: string;
  branchId?: string | null;
  hourlyRate: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  rateCategory?: { id: string; name: string } | null;
  rateBranch?: { id: string; name: string } | null;
}

export interface SupermarketRateInput {
  categoryId: string;
  branchId?: string | null;
  hourlyRate: number;
  active?: boolean;
}

export const getSupermarketRates = async (
  supermarketId: string
): Promise<SupermarketCategoryRate[]> =>
  (await api.get(`/supermarkets/${supermarketId}/rates`)).data;

export const saveSupermarketRate = async (
  supermarketId: string,
  payload: SupermarketRateInput
): Promise<SupermarketCategoryRate> =>
  (await api.post(`/supermarkets/${supermarketId}/rates`, payload)).data;

export const updateSupermarketRate = async (
  supermarketId: string,
  rateId: string,
  payload: { hourlyRate?: number; active?: boolean }
): Promise<SupermarketCategoryRate> =>
  (await api.put(`/supermarkets/${supermarketId}/rates/${rateId}`, payload)).data;

export const deleteSupermarketRate = async (supermarketId: string, rateId: string): Promise<void> => {
  await api.delete(`/supermarkets/${supermarketId}/rates/${rateId}`);
};
