import api from "@/src/services/api";

export interface AgencySettings {
  id: string;
  /** Raio máximo (m) do endereço da filial para aceitar o check-in. */
  checkinRadius: number;
  /** Antecedência mínima (min) para o freelancer cancelar sozinho. */
  cancellationWindowMinutes: number;
  requireCheckoutPhoto: boolean;
  reviewEnabled: boolean;
  /** Exige onboarding (perfil contratual + uniforme aprovado) antes de aceitar vagas. */
  onboardingRequired: boolean;
  /** Preço do kit uniforme cobrado do colaborador. */
  uniformPrice: number;
  /** Permite que colaboradores se autocadastrem nesta agência (com aprovação depois). */
  allowSelfRegistration: boolean;
}

export const getAgencySettings = async (): Promise<AgencySettings> =>
  (await api.get("/agency/settings")).data;

export const updateAgencySettings = async (
  patch: Partial<Omit<AgencySettings, "id">>
): Promise<AgencySettings> => (await api.put("/agency/settings", patch)).data;
