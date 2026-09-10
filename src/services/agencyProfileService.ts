import api from "@/src/services/api";

export interface AgencyProfile {
  id: string;
  name: string;
  legalName: string | null;
  cnpj: string;
  address: string;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  profilePhotoUrl: string | null;
  active: boolean;
}

export type AgencyProfilePatch = Partial<
  Pick<AgencyProfile, "name" | "legalName" | "cnpj" | "address" | "phone" | "email">
>;

export const getAgencyProfile = async (): Promise<AgencyProfile> =>
  (await api.get("/agency/profile")).data;

export const updateAgencyProfile = async (patch: AgencyProfilePatch): Promise<AgencyProfile> =>
  (await api.put("/agency/profile", patch)).data;

const uploadImage = async (kind: "logo" | "photo", file: File): Promise<AgencyProfile> => {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(`/agency/profile/${kind}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const uploadAgencyLogo = (file: File) => uploadImage("logo", file);
export const uploadAgencyPhoto = (file: File) => uploadImage("photo", file);
