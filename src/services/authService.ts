import api from "@/src/services/api";

export type Role = "admin" | "supermarket" | "freelancer" | "agency";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
}

export interface SupermarketMembership {
  supermarketId: string;
  branchId: string | null;
  canSubmitOrders: boolean;
  canApproveOrders: boolean;
  isOwner: boolean;
}

export interface AuthProfile {
  id: string;
  name?: string;
  /** Só para papel supermarket: permissões do usuário (dono ou gerente de loja). */
  membership?: SupermarketMembership | null;
  [key: string]: unknown;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  profile: AuthProfile | null;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: Exclude<Role, "admin">;
  profile?: {
    companyName?: string;
    cnpj?: string;
    address?: string;
    commissionPercentage?: number;
    agencyId?: string | null;
    skills?: string;
  };
}

function persist(data: AuthResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.user.role);
  localStorage.setItem("userId", data.user.id);
  if (data.profile?.id) localStorage.setItem("profileId", data.profile.id);
  else localStorage.removeItem("profileId");
}

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/register", payload);
    persist(data);
    return data;
  },

  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", credentials);
    persist(data);
    return data;
  },

  async me(): Promise<{ user: AuthUser; profile: AuthProfile | null }> {
    const { data } = await api.get("/auth/me");
    return data;
  },

  logout() {
    if (typeof window === "undefined") return;
    ["token", "role", "userId", "profileId"].forEach((k) => localStorage.removeItem(k));
  },

  getRole(): Role | null {
    if (typeof window === "undefined") return null;
    return (localStorage.getItem("role") as Role) || null;
  },

  getProfileId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("profileId");
  },
};
