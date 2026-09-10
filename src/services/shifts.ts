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
  /** Turno com nome personalizado — o `nominalPeriod` fica só como filtro derivado da hora. */
  custom?: boolean;
  /** Nome do turno quando `custom` (vazio = usa "Turno N" pela ordem). */
  label?: string | null;
  /** Intervalo (min) não remunerado desse turno — descontado das horas contratadas. */
  breakMinutes?: number;
  /** Quando true, usa o intervalo padrão da agência (o backend resolve o valor). */
  useDefaultBreak?: boolean;
}

/** Limites de jornada + intervalo padrão da agência (vindos de /auth/me). */
export interface LaborLimits {
  defaultBreakMinutes: number;
  maxShiftMinutes: number;
  maxJobMinutes: number;
}

/** Nome exibido de um turno da lista (personalizado, período ou "Turno N" pela ordem). */
export const shiftDisplayName = (s: ShiftInput, index: number): string => {
  if (s.custom) return (s.label ?? "").trim() || `Turno ${index + 1}`;
  return shiftLabel(s.nominalPeriod ?? shiftPeriodFromTime(s.startTime));
};

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

export const shiftFromWindow = (
  startTime: string,
  endTime: string,
  meta?: { label?: string | null; nominalPeriod?: string | null; breakMinutes?: number | null }
): ShiftInput => {
  const period = shiftBound(meta?.nominalPeriod)?.value ?? shiftPeriodFromTime(startTime);
  // Turno é "personalizado" quando o rótulo salvo não bate com o nome do período nominal.
  const custom = !!meta?.label && meta.label.trim() !== "" && meta.label.trim() !== shiftLabel(period);
  return {
    id: shiftId(),
    startTime,
    endTime,
    nominalPeriod: period,
    custom,
    label: custom ? (meta?.label ?? "").trim() : null,
    breakMinutes: Math.max(0, Math.trunc(Number(meta?.breakMinutes) || 0)),
  };
};

/** O turno termina depois da meia-noite (fim <= início). */
export const crossesMidnight = (s: { startTime: string; endTime: string }): boolean =>
  toMinutes(s.endTime) <= toMinutes(s.startTime);

/** Duração bruta do turno em minutos (considerando virada de dia). */
export const shiftDurationMinutes = (s: { startTime: string; endTime: string }): number => {
  const start = toMinutes(s.startTime);
  let end = toMinutes(s.endTime);
  if (end <= start) end += 1440;
  return end - start;
};

/** Intervalo efetivo do turno (usa o padrão da agência quando `useDefaultBreak`). */
export const shiftBreakMinutes = (s: ShiftInput, limits?: LaborLimits): number =>
  s.useDefaultBreak ? limits?.defaultBreakMinutes ?? 0 : Math.max(0, Math.trunc(Number(s.breakMinutes) || 0));

/** Duração líquida contratada do turno = janela − intervalo. */
export const shiftNetMinutes = (s: ShiftInput, limits?: LaborLimits): number =>
  Math.max(0, shiftDurationMinutes(s) - shiftBreakMinutes(s, limits));

/** Soma das durações líquidas de todos os turnos (o "contabilizador" da vaga). */
export const totalNetMinutes = (shifts: ShiftInput[], limits?: LaborLimits): number =>
  shifts.reduce((acc, s) => acc + shiftNetMinutes(s, limits), 0);

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
};

/** "6h 15min" a partir de minutos. */
const fmtMin = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h ${m}min` : `${h}h`;
};

/** Valida uma janela de turno: horas preenchidas, diferentes e no máximo 24h. */
export const validateShiftInput = (s: ShiftInput, limits?: LaborLimits): string | null => {
  if (!/^\d{2}:\d{2}$/.test(s.startTime) || !/^\d{2}:\d{2}$/.test(s.endTime)) {
    return "informe o horário de início e de fim.";
  }
  if (s.startTime === s.endTime) return "o início e o fim do turno não podem ser iguais.";
  const dur = shiftDurationMinutes(s);
  if (dur <= 0) return "o horário de fim precisa ser depois do de início.";
  if (dur > 24 * 60) return "um turno não pode passar de 24 horas.";
  const brk = shiftBreakMinutes(s, limits);
  if (brk >= dur) return "o intervalo não pode ser igual ou maior que a duração do turno.";
  if (limits && dur - brk > limits.maxShiftMinutes) {
    return `passa do limite de ${fmtMin(limits.maxShiftMinutes)} por turno da agência.`;
  }
  return null;
};

/** Valida a lista de turnos: cada janela + sem sobreposição + turno que vira o dia por último + tetos de jornada. */
export const validateShifts = (shifts: ShiftInput[], limits?: LaborLimits): string | null => {
  if (!shifts.length) return "adicione ao menos um turno.";
  for (const s of shifts) {
    const err = validateShiftInput(s, limits);
    if (err) {
      const name = s.custom ? (s.label ?? "").trim() || "Turno personalizado" : shiftLabel(s.nominalPeriod);
      return `${name}: ${err}`;
    }
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
  if (limits) {
    const total = totalNetMinutes(shifts, limits);
    if (total > limits.maxJobMinutes) {
      return `a soma dos turnos (${fmtMin(total)}) passa do limite de ${fmtMin(limits.maxJobMinutes)} por vaga da agência.`;
    }
  }
  return null;
};

/**
 * Payload de turno para a API: janela + período nominal (sempre derivável, serve de filtro) +
 * `label`. Turno personalizado sem nome digitado cai no padrão "Turno N" pela ordem (`index`).
 */
export const toShiftPayload = (s: ShiftInput, index = 0) => {
  const nominalPeriod =
    (!s.custom && s.nominalPeriod) || shiftPeriodFromTime(s.startTime);
  const label = s.custom
    ? (s.label ?? "").trim() || `Turno ${index + 1}`
    : (s.label ?? "").trim() || null;
  return {
    startTime: s.startTime,
    endTime: s.endTime,
    nominalPeriod,
    label,
    custom: !!s.custom,
    breakMinutes: s.useDefaultBreak ? undefined : Math.max(0, Math.trunc(Number(s.breakMinutes) || 0)),
    useDefaultBreak: s.useDefaultBreak || undefined,
  };
};
