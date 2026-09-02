// Turnos fixos (espelham src/helpers/shifts.ts do backend).

export type ShiftPeriod = "manha" | "tarde" | "noite" | "madrugada";

export interface ShiftBound {
  value: ShiftPeriod;
  label: string;
  start: string; // HH:MM
  end: string; // HH:MM (24:00 = meia-noite)
}

export const SHIFT_PERIODS: ShiftBound[] = [
  { value: "manha", label: "Manhã", start: "06:00", end: "12:00" },
  { value: "tarde", label: "Tarde", start: "12:00", end: "18:00" },
  { value: "noite", label: "Noite", start: "18:00", end: "24:00" },
  { value: "madrugada", label: "Madrugada", start: "00:00", end: "06:00" },
];

export const shiftBound = (period?: string | null): ShiftBound | undefined =>
  SHIFT_PERIODS.find((p) => p.value === period);

export const shiftLabel = (period?: string | null): string => shiftBound(period)?.label ?? "—";

/** Um turno escolhido para uma vaga: o turno + a janela de horário dentro dele. */
export interface ShiftInput {
  shiftPeriod: ShiftPeriod;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

/** Limites de hora (min/max) para os <input type="time"> conforme o turno. */
export const shiftTimeRange = (period: ShiftPeriod): { min: string; max: string } => {
  const b = shiftBound(period);
  return {
    min: b?.start ?? "00:00",
    max: !b || b.end === "24:00" ? "23:59" : b.end,
  };
};

/** Turno recém-marcado começa cobrindo a janela inteira. */
export const makeShiftInput = (period: ShiftPeriod): ShiftInput => {
  const { min, max } = shiftTimeRange(period);
  return { shiftPeriod: period, startTime: min, endTime: max };
};

/** Deduz o turno a partir da hora de início (as janelas dos turnos não se sobrepõem). */
export const shiftPeriodFromTime = (iso: string): ShiftPeriod => {
  const h = new Date(iso).getHours();
  if (h < 6) return "madrugada";
  if (h < 12) return "manha";
  if (h < 18) return "tarde";
  return "noite";
};

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Valida uma janela de turno: horas dentro do turno e início antes do término. */
export const validateShiftInput = (s: ShiftInput): string | null => {
  const b = shiftBound(s.shiftPeriod);
  if (!b) return "turno inválido.";
  if (!s.startTime || !s.endTime) return "informe início e fim.";
  const boundStart = toMinutes(b.start);
  const boundEnd = b.end === "24:00" ? 1440 : toMinutes(b.end);
  const start = toMinutes(s.startTime);
  let end = toMinutes(s.endTime);
  if (s.shiftPeriod === "noite" && end === 0) end = 1440;
  const boundLabel = b.end === "24:00" ? "24:00" : b.end;
  if (start < boundStart || end > boundEnd) return `horário fora do turno (${b.start}–${boundLabel}).`;
  if (start >= end) return "o horário de início deve ser menor que o de término.";
  return null;
};
