// Filtro rápido de data ("favorito") das telas de vaga/pedido — recorte pela data
// de execução do turno (job.startTime), sempre no fuso de Brasília.
import { isoDateBR } from "@/src/lib/datetime";

export type DatePreset = "todas" | "hoje" | "amanha" | "semana" | "mes" | "custom";

export interface DateRange {
  preset: DatePreset;
  /** YYYY-MM-DD — só usados quando preset === "custom" (qualquer lado pode faltar). */
  from?: string;
  to?: string;
}

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  todas: "Todas",
  hoje: "Hoje",
  amanha: "Amanhã",
  semana: "Esta semana",
  mes: "Este mês",
  custom: "Personalizado",
};

export const DEFAULT_DATE_RANGE: DateRange = { preset: "todas" };

/** "YYYY-MM-DD" de hoje no fuso de Brasília. */
const todayBR = (): string => isoDateBR(new Date());

/** Soma dias a uma data "YYYY-MM-DD" (aritmética em UTC para não escorregar de fuso). */
const addDays = (ymd: string, days: number): string => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};

/** Limites (inclusivos) do intervalo, como "YYYY-MM-DD". `{}` = sem recorte. */
export function resolveDateBounds(range: DateRange): { from?: string; to?: string } {
  const today = todayBR();
  switch (range.preset) {
    case "hoje":
      return { from: today, to: today };
    case "amanha": {
      const t = addDays(today, 1);
      return { from: t, to: t };
    }
    case "semana": {
      // Semana-calendário segunda–domingo que contém hoje.
      const [y, m, d] = today.split("-").map(Number);
      const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=dom … 6=sáb
      const toMonday = dow === 0 ? 6 : dow - 1;
      const from = addDays(today, -toMonday);
      return { from, to: addDays(from, 6) };
    }
    case "mes": {
      const [y, m] = today.split("-").map(Number);
      const from = `${y}-${String(m).padStart(2, "0")}-01`;
      const to = addDays(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`, -1);
      return { from, to };
    }
    case "custom":
      return { from: range.from || undefined, to: range.to || undefined };
    case "todas":
    default:
      return {};
  }
}

/** A data de execução (ISO) cai no intervalo escolhido? */
export function inDateRange(iso: string | null | undefined, range: DateRange): boolean {
  if (range.preset === "todas") return true;
  const { from, to } = resolveDateBounds(range);
  if (!from && !to) return true;
  const day = isoDateBR(iso);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

/** Rótulo curto do intervalo ativo (para avisos). "" quando preset === "todas". */
export function dateRangeLabel(range: DateRange): string {
  if (range.preset === "todas") return "";
  if (range.preset !== "custom") return DATE_PRESET_LABELS[range.preset].toLowerCase();
  const fmt = (ymd?: string) => {
    if (!ymd) return "…";
    const [, m, d] = ymd.split("-");
    return `${d}/${m}`;
  };
  const { from, to } = resolveDateBounds(range);
  if (from && to) return from === to ? fmt(from) : `${fmt(from)}–${fmt(to)}`;
  if (from) return `a partir de ${fmt(from)}`;
  if (to) return `até ${fmt(to)}`;
  return "";
}
