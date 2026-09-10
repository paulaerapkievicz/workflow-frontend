import api from "@/src/services/api";

export interface AgencySettings {
  id: string;
  /** Raio máximo (m) do endereço da filial para aceitar o check-in. */
  checkinRadius: number;
  /** Antecedência mínima (min) para o freelancer cancelar sozinho. */
  cancellationWindowMinutes: number;
  requireCheckoutPhoto: boolean;
  reviewEnabled: boolean;
  /** Libera o recurso de pausa/intervalo no ponto (pode ser sobrescrito por vaga). */
  breaksEnabled: boolean;
  /** Limite de minutos de pausa por turno (null = sem limite; pode ser sobrescrito por vaga). */
  breakLimitMinutes: number | null;
  /** Antecedência máxima (min) para bater o check-in antes do início do turno. */
  checkinEarlyToleranceMinutes: number;
  /** Liga/desliga o controle de ocorrências das vagas (atraso, falta, saída antecipada…). */
  alertsEnabled: boolean;
  /** O supermercado-cliente recebe os alertas que afetam a entrega do serviço. */
  notifySupermarketOnAlerts: boolean;
  /** Atraso tolerado (min) no check-in antes de abrir o alerta. */
  lateCheckinToleranceMinutes: number;
  /** Acima deste atraso (min) o alerta de check-in vira crítico. */
  lateCheckinCriticalMinutes: number;
  /** Margem (min) de saída antecipada antes de abrir o alerta. */
  earlyCheckoutToleranceMinutes: number;
  /** Folga (min) após o fim do turno sem check-out antes de abrir o alerta. */
  missingCheckoutGraceMinutes: number;
  /** Antecedência (min) do aviso de vaga ainda sem colaborador. */
  unfilledAlertLeadMinutes: number;
  /** Abaixo desta antecedência (min) do início, uma desistência é "de última hora". */
  shortNoticeWithdrawalMinutes: number;
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
  patch: Partial<Omit<AgencySettings, "id" | "breakLimitMinutes">> & { breakLimitMinutes?: number | null }
): Promise<AgencySettings> => (await api.put("/agency/settings", patch)).data;
