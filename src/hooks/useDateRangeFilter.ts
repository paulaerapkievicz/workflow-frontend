import { useCallback, useState } from "react";
import { DateRange, DEFAULT_DATE_RANGE } from "@/src/lib/dateRange";

/**
 * Filtro de data "favorito" de uma tela: a última escolha do usuário fica
 * guardada em `localStorage` e volta na próxima visita. Mesmo padrão de
 * persistência do `DataTable` (chave prefixada + try/catch).
 */
export function useDateRangeFilter(
  storageKey: string,
  initial: DateRange = DEFAULT_DATE_RANGE
): [DateRange, (next: DateRange) => void] {
  const key = `daterange:${storageKey}`;

  const [range, setRange] = useState<DateRange>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as DateRange;
        if (parsed && typeof parsed.preset === "string") return parsed;
      }
    } catch {
      /* ignore */
    }
    return initial;
  });

  const update = useCallback(
    (next: DateRange) => {
      setRange(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [key]
  );

  return [range, update];
}
