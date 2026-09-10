// Cores dos 6 tons semânticos dos badges de status. A agência personaliza em
// /agency/settings; valem para os badges de vaga, pedido, fatura e pagamento em
// todas as áreas (agência, líder, colaborador, supermercado-cliente).

export type StatusTone =
  | "pending"
  | "progress"
  | "waiting"
  | "approved"
  | "done"
  | "canceled";

export interface ToneColor {
  bg: string;
  fg: string;
}

export type StatusColors = Record<StatusTone, ToneColor>;

export const STATUS_TONES: { tone: StatusTone; label: string }[] = [
  { tone: "pending", label: "Aguardando / disponível" },
  { tone: "progress", label: "Em andamento / aceita" },
  { tone: "waiting", label: "Aguardando aprovação" },
  { tone: "approved", label: "Aprovada / ativa" },
  { tone: "done", label: "Concluída / paga" },
  { tone: "canceled", label: "Cancelada / recusada" },
];

/** Paleta padrão — espelha os fallbacks de styles/panel.module.scss (tema claro). */
export const DEFAULT_STATUS_COLORS: StatusColors = {
  pending: { bg: "#fef3c7", fg: "#92400e" },
  progress: { bg: "#dbeafe", fg: "#1e40af" },
  waiting: { bg: "#fde68a", fg: "#92400e" },
  approved: { bg: "#ede9fe", fg: "#5b21b6" },
  done: { bg: "#dcfce7", fg: "#166534" },
  canceled: { bg: "#fee2e2", fg: "#991b1b" },
};

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function sanitizeStatusColors(raw: unknown): StatusColors {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, Partial<ToneColor>>;
  const out = {} as StatusColors;
  for (const { tone } of STATUS_TONES) {
    const def = DEFAULT_STATUS_COLORS[tone];
    const got = (input[tone] ?? {}) as Partial<ToneColor>;
    out[tone] = {
      bg: typeof got.bg === "string" && HEX.test(got.bg) ? got.bg : def.bg,
      fg: typeof got.fg === "string" && HEX.test(got.fg) ? got.fg : def.fg,
    };
  }
  return out;
}

/** CSS que define as vars `--badge-<tone>-bg/fg` no `:root`. */
export function statusColorsCss(colors: StatusColors): string {
  const lines = STATUS_TONES.flatMap(({ tone }) => [
    `--badge-${tone}-bg:${colors[tone].bg};`,
    `--badge-${tone}-fg:${colors[tone].fg};`,
  ]);
  return `:root{${lines.join("")}}`;
}
