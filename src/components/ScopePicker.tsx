import { useMemo, useState } from "react";
import styles from "@/styles/scopePicker.module.scss";

export interface ScopeItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface Props {
  items: ScopeItem[];
  /** [] = "tudo" (rede toda); com itens = restrito a esses ids. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Rótulo do modo irrestrito. */
  allLabel?: string;
  /** Mostra o campo de busca quando há muitos itens. */
  searchable?: boolean;
}

/**
 * Seletor de escopo em grade: "tudo" (nenhum selecionado) ou um conjunto de itens.
 * Aproveita a largura disponível quebrando os itens em colunas em vez de uma lista alta e estreita.
 */
export default function ScopePicker({
  items, value, onChange, allLabel = "Rede toda", searchable = true,
}: Props) {
  const [query, setQuery] = useState("");
  const all = value.length === 0;
  const showSearch = searchable && items.length > 8;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        (it.sublabel ?? "").toLowerCase().includes(q)
    );
  }, [items, query]);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <label className={styles.allToggle}>
          <input type="checkbox" checked={all} onChange={() => onChange([])} />
          {allLabel}
        </label>
        <span className={styles.count}>
          {all ? "sem restrição" : `${value.length} selecionado(s)`}
        </span>
        {showSearch && (
          <input
            className={styles.search}
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        <button
          type="button"
          className={styles.linkBtn}
          disabled={filtered.length === 0}
          onClick={() => onChange([...new Set([...value, ...filtered.map((it) => it.id)])])}
        >
          Selecionar todos
        </button>
        <button
          type="button"
          className={styles.linkBtn}
          disabled={all}
          onClick={() => onChange([])}
        >
          Limpar
        </button>
      </div>

      <div className={styles.grid}>
        {filtered.map((it) => (
          <label key={it.id} className={styles.option}>
            <input
              type="checkbox"
              checked={value.includes(it.id)}
              onChange={() => toggle(it.id)}
            />
            <span>
              {it.label}
              {it.sublabel ? <span className="sub"> · {it.sublabel}</span> : null}
            </span>
          </label>
        ))}
        {filtered.length === 0 && (
          <span className={styles.empty}>
            {items.length === 0 ? "Nada para selecionar." : "Nenhum resultado para a busca."}
          </span>
        )}
      </div>
    </div>
  );
}
