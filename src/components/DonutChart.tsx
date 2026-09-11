import type { KeyboardEvent } from "react";
import styles from "@/styles/donutChart.module.scss";

export type DonutSegment = "ok" | "problem";

interface DonutChartProps {
  /** Contagem do segmento "problema" (vermelho). */
  problem: number;
  /** Contagem total (problema + ok). */
  total: number;
  /** Número grande no centro (default: `problem`). */
  centerValue?: number;
  /** Rótulo pequeno abaixo do número central. */
  centerLabel?: string;
  /** Rótulo do segmento OK (tooltip/acessibilidade). */
  okLabel?: string;
  /** Rótulo do segmento problema (tooltip/acessibilidade). */
  problemLabel?: string;
  /** Segmento em destaque (filtro ativo). */
  active?: DonutSegment | null;
  onSegmentClick?: (segment: DonutSegment) => void;
  size?: number;
}

const R = 40;
const STROKE = 14;
const CIRC = 2 * Math.PI * R;
const GAP = 6; // comprimento do respiro entre os dois arcos, só quando ambos existem

/** Gráfico de rosca de 2 segmentos (ok/problema) — número no centro, fatias clicáveis. */
export default function DonutChart({
  problem,
  total,
  centerValue,
  centerLabel,
  okLabel = "OK",
  problemLabel = "Problema",
  active,
  onSegmentClick,
  size = 128,
}: DonutChartProps) {
  const safeTotal = Math.max(0, total);
  const safeProblem = Math.min(Math.max(0, problem), safeTotal);
  const ok = safeTotal - safeProblem;
  const hasBoth = safeProblem > 0 && ok > 0;
  const gap = hasBoth ? GAP : 0;

  const problemLen = safeTotal === 0 ? 0 : (safeProblem / safeTotal) * CIRC - gap / 2;
  const okLen = safeTotal === 0 ? 0 : (ok / safeTotal) * CIRC - gap / 2;

  const clickable = (seg: DonutSegment) => onSegmentClick && (seg === "problem" ? safeProblem > 0 : ok > 0);

  const handleClick = (seg: DonutSegment) => {
    if (clickable(seg)) onSegmentClick?.(seg);
  };

  const handleKey = (seg: DonutSegment) => (e: KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && clickable(seg)) {
      e.preventDefault();
      onSegmentClick?.(seg);
    }
  };

  return (
    <div className={styles.wrap} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className={styles.svg} role="img" aria-label={`${okLabel}: ${ok}. ${problemLabel}: ${safeProblem}.`}>
        {safeTotal === 0 ? (
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
        ) : (
          <g transform="rotate(-90 50 50)">
            {ok > 0 && (
              <circle
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={STROKE}
                strokeLinecap={hasBoth ? "round" : "butt"}
                strokeDasharray={`${Math.max(okLen, 0)} ${CIRC}`}
                strokeDashoffset={0}
                className={active === "ok" ? styles.segmentActive : styles.segment}
                onClick={() => handleClick("ok")}
                onKeyDown={handleKey("ok")}
                tabIndex={clickable("ok") ? 0 : -1}
                role={clickable("ok") ? "button" : undefined}
                style={{ cursor: clickable("ok") ? "pointer" : "default" }}
              >
                <title>{`${okLabel}: ${ok}`}</title>
              </circle>
            )}
            {safeProblem > 0 && (
              <circle
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke="var(--danger)"
                strokeWidth={STROKE}
                strokeLinecap={hasBoth ? "round" : "butt"}
                strokeDasharray={`${Math.max(problemLen, 0)} ${CIRC}`}
                strokeDashoffset={-(okLen + gap)}
                className={active === "problem" ? styles.segmentActive : styles.segment}
                onClick={() => handleClick("problem")}
                onKeyDown={handleKey("problem")}
                tabIndex={clickable("problem") ? 0 : -1}
                role={clickable("problem") ? "button" : undefined}
                style={{ cursor: clickable("problem") ? "pointer" : "default" }}
              >
                <title>{`${problemLabel}: ${safeProblem}`}</title>
              </circle>
            )}
          </g>
        )}
      </svg>
      <div className={styles.center}>
        <strong>{centerValue ?? safeProblem}</strong>
        {centerLabel && <span>{centerLabel}</span>}
      </div>
    </div>
  );
}
