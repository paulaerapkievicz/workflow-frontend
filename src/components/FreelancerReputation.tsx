import StarRating from "@/src/components/StarRating";
import { FreelancerReputation as Reputation } from "@/src/services/reviewService";

const authorLabel = (role?: string | null) =>
  role === "supermarket" ? "Cliente" : role === "agency" ? "Agência" : "—";

const hrs = (min: number) => `${(min / 60).toFixed(1).replace(".", ",")} h`;

const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

/** Reputação do colaborador: nota média + volume de trabalho + avaliações recentes. */
export default function FreelancerReputation({
  reputation,
  compact,
}: {
  reputation: Reputation | null | undefined;
  /** Esconde a lista de avaliações, mostrando só os indicadores. */
  compact?: boolean;
}) {
  if (!reputation) return null;
  const { ratingAvg, ratingCount, completedJobs, workedMinutes, reviews } = reputation;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
        <StarRating value={ratingAvg} count={ratingCount} size={20} />
        <span style={{ color: "var(--text-muted)" }}>·</span>
        <span>
          <strong>{hrs(workedMinutes)}</strong> trabalhadas
        </span>
        <span style={{ color: "var(--text-muted)" }}>·</span>
        <span>
          <strong>{completedJobs}</strong> {completedJobs === 1 ? "convocação concluída" : "convocações concluídas"}
        </span>
      </div>

      {!compact && reviews.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {reviews.map((r) => (
            <li
              key={r.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius, 8px)",
                padding: "8px 10px",
                background: "var(--surface-2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <StarRating value={r.rating} size={14} />
                <small style={{ color: "var(--text-muted)" }}>
                  {authorLabel(r.authorRole)} · {fmtDate(r.createdAt)}
                </small>
              </div>
              {r.comment && <p style={{ margin: "4px 0 0" }}>{r.comment}</p>}
              {(r.categoryName || r.branchName) && (
                <small style={{ color: "var(--text-muted)" }}>
                  {[r.categoryName, r.branchName].filter(Boolean).join(" · ")}
                </small>
              )}
            </li>
          ))}
        </ul>
      )}
      {!compact && reviews.length === 0 && (
        <p style={{ color: "var(--text-muted)", margin: 0 }}>Nenhuma avaliação ainda.</p>
      )}
    </div>
  );
}
