// Formatação de data/hora — app single-fuso (Brasil). Sempre em America/Sao_Paulo,
// para o horário exibido não depender do fuso do navegador de quem abre.

const TZ = "America/Sao_Paulo";

/** "HH:MM" (24h) no fuso de Brasília. */
export const fmtTime = (v?: string | Date | null): string =>
  v
    ? new Date(v).toLocaleTimeString("pt-BR", {
        timeZone: TZ,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";

/** "DD/MM/AAAA" no fuso de Brasília. */
export const fmtDate = (v?: string | Date | null): string =>
  v ? new Date(v).toLocaleDateString("pt-BR", { timeZone: TZ }) : "—";

/** "DD/MM HH:MM" no fuso de Brasília. */
export const fmtDateTime = (v?: string | Date | null): string =>
  v
    ? new Date(v).toLocaleString("pt-BR", {
        timeZone: TZ,
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/** "AAAA-MM-DD" (para inputs date / comparações) no fuso de Brasília.
 *  Uma string que já é só data ("AAAA-MM-DD...") volta como está — sem conversão de fuso. */
export const isoDateBR = (v?: string | Date | null): string => {
  if (!v) return "";
  if (typeof v === "string") {
    const m = v.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/);
    if (m && !v.includes("T")) return m[1];
  }
  return new Date(v).toLocaleDateString("en-CA", { timeZone: TZ });
};

/** Janela "HH:MM–HH:MM". */
export const fmtWindow = (start?: string | Date | null, end?: string | Date | null): string =>
  `${fmtTime(start)}–${fmtTime(end)}`;

/** ISO → "AAAA-MM-DDTHH:MM" no fuso de Brasília (para <input type="datetime-local">). */
export const isoToLocalInput = (v?: string | Date | null): string => {
  if (!v) return "";
  const d = new Date(v);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hh = g("hour") === "24" ? "00" : g("hour");
  return `${g("year")}-${g("month")}-${g("day")}T${hh}:${g("minute")}`;
};

/** "AAAA-MM-DDTHH:MM" (horário de Brasília) → ISO UTC. */
export const localInputToISO = (v: string): string => {
  if (!v) return "";
  return new Date(`${v}:00-03:00`).toISOString();
};
