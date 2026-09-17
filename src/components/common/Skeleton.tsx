import panel from "@/styles/panel.module.scss";

const Bar = ({ width, height = 12, radius = 6 }: { width: string; height?: number; radius?: number }) => (
  <span className={panel.skeleton} style={{ display: "block", width, height, borderRadius: radius }} />
);

/** Bloco "pulsando" no formato de um `panel.card` — substitui o "Carregando…" em listas de cards. */
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className={panel.card} style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      <Bar width="55%" height={18} />
      {Array.from({ length: lines }).map((_, i) => (
        <Bar key={i} width={i === lines - 1 ? "35%" : "80%"} />
      ))}
    </div>
  );
}

/** Grade de stat-cards no lugar de `panel.cards` enquanto os números carregam. */
export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className={panel.cards}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={panel.card} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Bar width="45%" height={26} radius={8} />
          <Bar width="70%" />
        </div>
      ))}
    </div>
  );
}

/** Linhas retangulares no lugar de um `panel.table` enquanto os dados carregam. */
export function SkeletonTableRows({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Bar key={i} width="100%" height={46} radius={10} />
      ))}
    </div>
  );
}
