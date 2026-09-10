import api from "@/src/services/api";

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";
export type AlertType =
  | "shift_unfilled_soon"
  | "shift_unfilled_started"
  | "late_checkin"
  | "no_show"
  | "early_checkout"
  | "missing_checkout"
  | "break_overrun"
  | "break_not_resumed"
  | "shift_missed"
  | "late_withdrawal"
  | "partial_completion"
  | "overtime_hold"
  | "no_show_confirmed";

export interface JobAlert {
  id: string;
  jobId: string;
  jobShiftId: string | null;
  freelancerId: string | null;
  type: AlertType;
  typeLabel: string;
  resolutionHint: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  context: Record<string, unknown>;
  audience: string[];
  detectedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionCode: string | null;
  resolutionNote: string | null;
  job: {
    id: string;
    title: string;
    status: string;
    startTime: string;
    endTime: string;
    branchId: string;
    branchName: string | null;
  } | null;
  freelancer: {
    id: string;
    name: string;
    phone: string | null;
    profilePhotoUrl: string | null;
  } | null;
  shift: { id: string; startTime: string; endTime: string; position: number } | null;
}

export interface AlertSummary {
  open: number;
  critical: number;
  byType: Record<string, number>;
}

export interface AlertQuery {
  status?: "open" | "acknowledged" | "resolved" | "all";
  severity?: AlertSeverity;
  type?: AlertType;
}

/** Rótulo curto em pt-BR de cada tipo (fallback caso o backend não mande `typeLabel`). */
export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  shift_unfilled_soon: "Vaga sem colaborador",
  shift_unfilled_started: "Vaga descoberta (turno começou)",
  late_checkin: "Atraso no check-in",
  no_show: "Falta (sem check-in)",
  early_checkout: "Saída antecipada",
  missing_checkout: "Turno sem check-out",
  break_overrun: "Pausa acima do limite",
  break_not_resumed: "Pausa não retomada",
  shift_missed: "Turno perdido",
  late_withdrawal: "Desistência de última hora",
  partial_completion: "Cumprimento parcial",
  overtime_hold: "Hora extra retida",
  no_show_confirmed: "Falta confirmada",
};

export const listAlerts = async (query: AlertQuery = {}): Promise<JobAlert[]> =>
  (await api.get("/alerts", { params: query })).data;

export const getAlertsSummary = async (): Promise<AlertSummary> =>
  (await api.get("/alerts/summary")).data;

export const acknowledgeAlert = async (id: string): Promise<JobAlert> =>
  (await api.post(`/alerts/${id}/acknowledge`)).data;

export const resolveAlert = async (
  id: string,
  body: { code?: "acted" | "dismissed"; note?: string } = {}
): Promise<JobAlert> => (await api.post(`/alerts/${id}/resolve`, body)).data;
