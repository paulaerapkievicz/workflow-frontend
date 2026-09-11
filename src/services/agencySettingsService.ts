import api from "@/src/services/api";
import type { StatusColors } from "@/src/services/statusColors";

/** Faixa de marcação de vaga sem colaborador (bolinha em Convocações). */
export interface UnfilledAlertTier {
  id: string;
  /** Dispara quando faltam <= isto (min) para o início — 0 = na hora ou depois. */
  minutesBefore: number;
  /** Cor da bolinha (#RGB ou #RRGGBB). */
  color: string;
  label: string;
  /** A bolinha pisca enquanto a vaga não é preenchida. */
  blink: boolean;
}

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
  /** Intervalo padrão (min) descontável de um turno da vaga. */
  defaultBreakMinutes: number;
  /** Teto de horas de um único turno (jornada legal). */
  maxShiftHours: number;
  /** Teto de horas somadas de todos os turnos de uma vaga (jornada legal). */
  maxJobHours: number;
  /** Cores dos 6 tons dos badges de status. */
  statusColors: StatusColors
  /** Ordem personalizada do menu lateral (lista de hrefs). null = ordem padrão. */
  sidebarOrder: string[] | null;
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
  /** Faixas das bolinhas de "vaga sem colaborador" na tela de Convocações (mais distante → mais urgente). */
  unfilledAlertTiers: UnfilledAlertTier[];
  /** Abaixo desta antecedência (min) do início, uma desistência é "de última hora". */
  shortNoticeWithdrawalMinutes: number;
  /** Exige onboarding (perfil contratual + uniforme aprovado) antes de aceitar vagas. */
  onboardingRequired: boolean;
  /** Preço do kit uniforme cobrado do colaborador. */
  uniformPrice: number;
  /** Permite que colaboradores se autocadastrem nesta agência (com aprovação depois). */
  allowSelfRegistration: boolean;
  /** Chave-mestra: libera o pagamento da fatura pelo app pros mercados-clientes (escolha por cliente em cada cadastro). */
  appPaymentEnabledForSupermarkets: boolean;
  /** Libera a compra do uniforme pelo app pros colaboradores (tudo ou nada). */
  appPaymentEnabledForFreelancers: boolean;
}

export const getAgencySettings = async (): Promise<AgencySettings> =>
  (await api.get("/agency/settings")).data;

export const updateAgencySettings = async (
  patch: Partial<Omit<AgencySettings, "id" | "breakLimitMinutes">> & { breakLimitMinutes?: number | null }
): Promise<AgencySettings> => (await api.put("/agency/settings", patch)).data;
