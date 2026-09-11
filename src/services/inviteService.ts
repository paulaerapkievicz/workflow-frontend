import api from "@/src/services/api";

export type InviteRole = "supermarket" | "freelancer" | "leader" | "partner";

export interface InvitePreview {
  agencyName: string | null;
  role: InviteRole;
  status: "pending" | "used" | "revoked";
}

export interface InviteExtras {
  /** Só para convite de líder: forma e valor de pagamento dele. */
  payType?: "hora" | "diaria" | "mensal" | "por_colaborador";
  payAmount?: number;
}

// A agência gera um convite — devolve o token pra montar o link (/invite/:token) e copiar.
export const createInvite = async (
  role: InviteRole,
  extras: InviteExtras = {}
): Promise<{ token: string; role: InviteRole }> =>
  (await api.post("/agency/invites", { role, ...extras })).data;

// Prévia pública do convite — usada pela página /invite/[token] antes de mostrar o formulário.
export const getInvite = async (token: string): Promise<InvitePreview> =>
  (await api.get(`/invites/${token}`)).data;
