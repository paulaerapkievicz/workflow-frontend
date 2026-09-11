import api from "@/src/services/api";

export interface SupermarketProfile {
  id: string;
  name: string;
  legalName: string | null;
  cnpj: string;
  address: string;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  profilePhotoUrl: string | null;
}

export interface BranchProfileFields {
  name: string;
  address: string;
  phone: string | null;
  legalName: string | null;
  cnpj: string | null;
  email: string | null;
  logoUrl: string | null;
  profilePhotoUrl: string | null;
}

export interface ResolvedBranchProfile extends BranchProfileFields {
  /** Campos que vieram da matriz (o valor próprio da filial está vazio). */
  inherited: string[];
}

type ProfilePatch = Partial<
  Pick<SupermarketProfile, "name" | "legalName" | "cnpj" | "address" | "phone" | "email">
>;

export const updateSupermarketProfile = async (
  id: string,
  patch: ProfilePatch
): Promise<SupermarketProfile> => (await api.put(`/supermarkets/${id}/profile`, patch)).data;

/** Ordem personalizada do menu lateral — só o responsável pela rede. */
export const updateSupermarketSidebarOrder = async (
  sidebarOrder: string[] | null
): Promise<{ sidebarOrder: string[] | null }> =>
  (await api.put("/supermarket/sidebar-order", { sidebarOrder })).data;

export const getBranchProfile = async (
  id: string
): Promise<{ branch: BranchProfileFields & { id: string }; profile: ResolvedBranchProfile }> =>
  (await api.get(`/branches/${id}/profile`)).data;

export const updateBranchProfile = async (
  id: string,
  patch: Partial<BranchProfileFields>
) => (await api.put(`/branches/${id}/profile`, patch)).data;

const uploadImage =
  (base: "supermarkets" | "branches") =>
  async (id: string, kind: "logo" | "photo", file: File) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post(`/${base}/${id}/profile/${kind}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  };

export const uploadSupermarketImage = uploadImage("supermarkets");
export const uploadBranchImage = uploadImage("branches");
