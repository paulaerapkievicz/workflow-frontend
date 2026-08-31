import api from "@/src/services/api";

export interface AgencyCategoryRate {
  id: string;
  agencyId: string;
  categoryId: string;
  hourlyRate: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  rateCategory?: { id: string; name: string } | null;
}

export const getMyRates = async (): Promise<AgencyCategoryRate[]> =>
  (await api.get("/agency/rates")).data;

export const saveRate = async (payload: {
  categoryId: string;
  hourlyRate: number;
  active?: boolean;
}): Promise<AgencyCategoryRate> => (await api.post("/agency/rates", payload)).data;

export const updateRate = async (
  id: string,
  payload: { hourlyRate?: number; active?: boolean }
): Promise<AgencyCategoryRate> => (await api.put(`/agency/rates/${id}`, payload)).data;

export const deleteRate = async (id: string): Promise<void> => {
  await api.delete(`/agency/rates/${id}`);
};
