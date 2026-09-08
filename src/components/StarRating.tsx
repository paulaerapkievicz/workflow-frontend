import { useState } from "react";

interface Props {
  /** Nota atual (0–5). Em modo leitura aceita decimais (ex.: 4,3). */
  value: number | null | undefined;
  /** Se passado, vira seletor: chama com a nota escolhida (1–5). */
  onChange?: (rating: number) => void;
  size?: number;
  /** Mostra "(n)" ao lado, em modo leitura. */
  count?: number | null;
}

const FULL = "★";
const EMPTY = "☆";

/** Estrelas de avaliação — leitura (com meia-estrela aproximada) ou seleção 1–5. */
export default function StarRating({ value, onChange, size = 18, count }: Props) {
  const [hover, setHover] = useState(0);
  const rating = Number(value ?? 0);

  if (onChange) {
    return (
      <span role="radiogroup" aria-label="Nota" style={{ display: "inline-flex", gap: 2 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontSize: size,
              lineHeight: 1,
              color: (hover || rating) >= n ? "#f5a623" : "var(--text-muted)",
            }}
          >
            {(hover || rating) >= n ? FULL : EMPTY}
          </button>
        ))}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      <span aria-hidden style={{ fontSize: size, lineHeight: 1, color: "#f5a623", letterSpacing: 1 }}>
        {[1, 2, 3, 4, 5].map((n) => (rating >= n - 0.5 ? FULL : EMPTY)).join("")}
      </span>
      <span style={{ fontSize: size * 0.8, color: "var(--text)" }}>
        {rating > 0 ? rating.toFixed(1).replace(".", ",") : "—"}
        {count != null && count > 0 ? ` (${count})` : ""}
      </span>
    </span>
  );
}
