import styles from "@/styles/dashboard.module.scss";
import panel from "@/styles/panel.module.scss";

export interface FeedEvent {
  id: string;
  timestamp: string;
  text: string;
  tone?: "ok" | "problem" | "neutral";
}

const fmt = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Timeline vertical dos últimos eventos de ponto da rede (mais recentes no topo). */
export default function LiveFeed({ events }: { events: FeedEvent[] }) {
  return (
    <div className={styles.feed}>
      {events.length === 0 ? (
        <p className={panel.muted}>Nenhuma movimentação de ponto ainda no período selecionado.</p>
      ) : (
        <ul className={styles.feedList}>
          {events.map((e) => (
            <li key={e.id} className={styles.feedItem} data-tone={e.tone ?? "neutral"}>
              <span className={styles.feedDot} />
              <span className={styles.feedTime}>{fmt(e.timestamp)}</span>
              <span className={styles.feedText}>{e.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
