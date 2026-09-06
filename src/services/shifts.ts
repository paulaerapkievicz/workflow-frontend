// Turnos com janela livre — espelham src/helpers/shifts.ts do backend.
// O "período" (manhã/tarde/noite/madrugada) é só um rótulo/atalho, nunca limita o horário.

export type ShiftPeriod = "manha" | "tarde" | "noite" | "madrugada";

export interface ShiftBound {
  value: ShiftPeriod;
  label: string;
  start: string; // HH:MM (atalho de preenchimento)
  end: string; // HH:MM ("24:00" = meia-noite)
}

export const SHIFT_PERIODS: ShiftBound[] = [
  { value: "manha", label: "Manhã", start: "06:00", end: "12:00" },
  { value: "tarde", label: "Tarde", start: "12:00", end: "18:00" },
  { value: "noite", label: "Noite", start: "18:00", end: "24:00" },
  { value: "madrugada", label: "Madrugada", start: "00:00", end: "06:00" },
];

export const shiftBound = (period?: string | null): ShiftBound | undefined =>
  SHIFT_PERIODS.find((p) => p.value === period);

export const shiftLabel = (period?: string | null): string => shiftBound(period)?.label ?? "Turno";

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Período nominal a partir da hora (HH:MM ou ISO) — fuso de Brasília. */
export const shiftPeriodFromTime = (value: string): ShiftPeriod => {
  let h: number;
  if (/^\d{2}:\d{2}/.test(value)) {
    h = Number(value.slice(0, 2));
  } else {
    const hhmm = new Date(value).toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    h = Number(hhmm.slice(0, 2));
  }
  if (h < 6) return "madrugada";
  if (h < 12) return "manha";
  if (h < 18) return "tarde";
  return "noite";
};

/** Um turno da vaga: janela de horário livre + rótulo de período opcional. */
export interface ShiftInput {
  /** Chave estável no cliente (não vai para a API). */
  id: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  nominalPeriod?: ShiftPeriod | null;
}

let seq = 0;
const shiftId = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Novo turno (padrão 08:00–12:00) ou a partir de um período (preset).
 *  `nominalPeriod` fica nulo quando não é preset — aí o rótulo acompanha a hora de início. */
export const newShift = (period?: ShiftPeriod): ShiftInput => {
  const b = period ? shiftBound(period) : undefined;
  return {
    id: shiftId(),
    startTime: b?.start ?? "08:00",
    endTime: !b || b.end === "24:00" ? (b ? "00:00" : "12:00") : b.end,
    nominalPeriod: period ?? null,
  };
};

export const shiftFromWindow = (startTime: string, endTime: string): ShiftInput => ({
  id: shiftId(),
  startTime,
  endTime,
  nominalPeriod: shiftPeriodFromTime(startTime),
});

/** O turno termina depois da meia-noite (fim <= início). */
export const crossesMidnight = (s: { startTime: string; endTime: string }): boolean =>
  toMinutes(s.endTime) <= toMinutes(s.startTime);

/** Duração do turno em minutos (considerando virada de dia). */
export const shiftDurationMinutes = (s: { startTime: string; endTime: string }): number => {
  const start = toMinutes(s.startTime);
  let end = toMinutes(s.endTime);
  if (end <= start) end += 1440;
  return end - start;
};

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
};

/** Valida uma janela de turno: horas preenchidas, diferentes e no máximo 24h. */
export const validateShiftInput = (s: ShiftInput): string | null => {
  if (!/^\d{2}:\d{2}$/.test(s.startTime) || !/^\d{2}:\d{2}$/.test(s.endTime)) {
    return "informe o horário de início e de fim.";
  }
  if (s.startTime === s.endTime) return "o início e o fim do turno não podem ser iguais.";
  const dur = shiftDurationMinutes(s);
  if (dur <= 0) return "o horário de fim precisa ser depois do de início.";
  if (dur > 24 * 60) return "um turno não pode passar de 24 horas.";
  return null;
};

/** Valida a lista de turnos: cada janela + sem sobreposição + turno que vira o dia por último. */
export const validateShifts = (shifts: ShiftInput[]): string | null => {
  if (!shifts.length) return "adicione ao menos um turno.";
  for (const s of shifts) {
    const err = validateShiftInput(s);
    if (err) return `${shiftLabel(s.nominalPeriod)}: ${err}`;
  }
  const sorted = [...shifts].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  for (let i = 0; i < sorted.length; i++) {
    if (crossesMidnight(sorted[i]) && i !== sorted.length - 1) {
      return "um turno que vira o dia (fim depois da meia-noite) precisa ser o último.";
    }
    if (i > 0) {
      const prevEnd = toMinutes(sorted[i - 1].endTime);
      if (!crossesMidnight(sorted[i - 1]) && toMinutes(sorted[i].startTime) < prevEnd) {
        return "os turnos não podem se sobrepor no horário.";
      }
    }
  }
  return null;
};

/** Payload de turno para a API (só a janela + o período nominal escolhido). */
export const toShiftPayload = (s: ShiftInput) => ({
  startTime: s.startTime,
  endTime: s.endTime,
  nominalPeriod: s.nominalPeriod ?? shiftPeriodFromTime(s.startTime),
});
