import styles from "@/styles/alertDot.module.scss";
import type { UnfilledAlertTier } from "@/src/services/unfilledAlerts";

interface DotProps {
  color: string;
  label: string;
  blink?: boolean;
}

/** Bolinha colorida do tamanho de um "o". */
export function AlertDot({ color, label, blink }: DotProps) {
  return (
    <span
      className={`${styles.dot} ${blink ? styles.blink : ""}`}
      style={{ background: color }}
      title={label}
      aria-label={label}
      role="img"
    />
  );
}

/** Linha de bolinhas (uma por faixa disparada). */
export function AlertDots({ tiers }: { tiers: UnfilledAlertTier[] }) {
  if (!tiers.length) return null;
  return (
    <span className={styles.row}>
      {tiers.map((t) => (
        <AlertDot key={t.id} color={t.color} label={t.label} blink={t.blink} />
      ))}
    </span>
  );
}

export default AlertDot;
