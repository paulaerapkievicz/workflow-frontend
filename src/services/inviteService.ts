import api from "@/src/services/api";

export type InviteRole = "supermarket" | "freelancer" | "leader";

export interface InvitePreview {
  agencyName: string | null;
  role: InviteRole;
  status: "pending" | "used" | "revoked";
}

// A agência gera um convite — devolve o token pra montar o link (/invite/:token) e copiar.
export const createInvite = async (role: InviteRole): Promise<{ token: string; role: InviteRole }> =>
  (await api.post("/agency/invites", { role })).data;

// Prévia pública do convite — usada pela página /invite/[token] antes de mostrar o formulário.
export const getInvite = async (token: string): Promise<InvitePreview> =>
  (await api.get(`/invites/${token}`)).data;
