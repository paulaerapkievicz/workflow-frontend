import api from "@/src/services/api";
import type { AgencyPartnerFeature } from "@/src/services/authService";

export const AGENCY_PARTNER_FEATURES: AgencyPartnerFeature[] = [
  "vagas",
  "clientes",
  "colaboradores",
  "financeiro",
  "equipe",
  "configuracoes",
];

export const AGENCY_PARTNER_FEATURE_LABELS: Record<AgencyPartnerFeature, string> = {
  vagas: "Vagas e Convocações",
  clientes: "Gestão de Clientes",
  colaboradores: "Colaboradores",
  financeiro: "Financeiro (fechamentos, faturas, pagamentos)",
  equipe: "Equipe (líderes)",
  configuracoes: "Configurações",
};

export type AgencyPartnerPermissions = Record<AgencyPartnerFeature, boolean>;

export interface AgencyPartner {
  id: string;
  agencyId: string;
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  teamRoleId?: string | null;
  teamRole?: { id: string; name: string; position: number } | null;
  permissions: AgencyPartnerPermissions;
}

export const getAgencyPartners = async (): Promise<AgencyPartner[]> =>
  (await api.get("/agency/partners")).data;

export const createAgencyPartner = async (payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  teamRoleId?: string | null;
  permissions?: AgencyPartnerPermissions;
}): Promise<AgencyPartner> => (await api.post("/agency/partners", payload)).data;

export const updateAgencyPartner = async (
  id: string,
  payload: { active?: boolean; teamRoleId?: string | null; permissions?: AgencyPartnerPermissions }
): Promise<AgencyPartner> => (await api.put(`/agency/partners/${id}`, payload)).data;

export const deactivateAgencyPartner = async (id: string): Promise<AgencyPartner> =>
  (await api.delete(`/agency/partners/${id}`)).data;

export interface PasswordResetResult {
  /** E-mail de login (útil quando a agência usa o padrão nomesobrenome@workflow.com). */
  email: string;
  /** Senha nova — só aparece nesta resposta, repassar por fora (WhatsApp etc.). */
  password: string;
}

// Redefine a senha do sócio
export const resetAgencyPartnerPassword = async (id: string): Promise<PasswordResetResult> =>
  (await api.post(`/agency/partners/${id}/reset-password`)).data;
