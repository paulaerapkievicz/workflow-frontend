import api from "@/src/services/api";

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadius?: number | null;
  supermarketId: string;
  createdAt: string;
  updatedAt: string;
}

export const getBranches = async (): Promise<Branch[]> => (await api.get("/branches")).data;

export const getBranchesBySupermarket = async (supermarketId: string): Promise<Branch[]> => {
  const all = await getBranches();
  return all.filter((b) => b.supermarketId === supermarketId);
};

export const createBranch = async (
  branch: {
    name: string;
    address: string;
    phone?: string;
    supermarketId: string;
    latitude?: number | null;
    longitude?: number | null;
    geofenceRadius?: number | null;
  }
): Promise<Branch> => (await api.post("/branches", branch)).data;

export const updateBranch = async (
  id: string,
  branch: Partial<Branch>
): Promise<Branch> => (await api.put(`/branches/${id}`, branch)).data;

export const deleteBranch = async (id: string): Promise<void> => {
  await api.delete(`/branches/${id}`);
};
