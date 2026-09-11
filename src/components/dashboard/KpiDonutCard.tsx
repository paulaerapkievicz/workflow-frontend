import panel from "@/styles/panel.module.scss";
import styles from "@/styles/dashboard.module.scss";
import DonutChart, { DonutSegment } from "@/src/components/DonutChart";

interface KpiDonutCardProps {
  title: string;
  problem: number;
  total: number;
  centerLabel: string;
  okLabel: string;
  problemLabel: string;
  /** Texto de ação abaixo do gráfico, ex.: "3 profissionais atrasados. Clique para resolver." */
  actionText: string;
  active?: DonutSegment | null;
  onSegmentClick?: (segment: DonutSegment) => void;
}

/** Card de KPI com rosca de 2 segmentos + legenda de ação, usado nos dashboards. */
export default function KpiDonutCard({
  title,
  problem,
  total,
  centerLabel,
  okLabel,
  problemLabel,
  actionText,
  active,
  onSegmentClick,
}: KpiDonutCardProps) {
  const isActive = !!active;
  return (
    <div className={`${panel.card} ${styles.kpiCard} ${isActive ? styles.kpiCardActive : ""}`}>
      <p className={styles.kpiTitle}>{title}</p>
      <div className={styles.kpiBody}>
        <DonutChart
          problem={problem}
          total={total}
          centerLabel={centerLabel}
          okLabel={okLabel}
          problemLabel={problemLabel}
          active={active}
          onSegmentClick={onSegmentClick}
        />
        <div className={styles.kpiLegend}>
          <span className={styles.legendDot} data-tone="ok" />
          {okLabel}
          <br />
          <span className={styles.legendDot} data-tone="problem" />
          {problemLabel}
        </div>
      </div>
      <p className={`${panel.muted} ${styles.kpiAction}`}>{actionText}</p>
    </div>
  );
}
