import { useEffect, useState } from "react";
import panel from "@/styles/panel.module.scss";

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  /** false para colunas que o usuário não pode esconder (ex: Ações) */
  toggleable?: boolean;
  defaultHidden?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** chave de persistência das colunas visíveis no localStorage */
  storageKey: string;
  empty?: string;
}

function loadHidden(key: string, fallback: string[]): Set<string> {
  if (typeof window === "undefined") return new Set(fallback);
  try {
    const raw = localStorage.getItem(`cols:${key}`);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return new Set(fallback);
}

export default function DataTable<T>({ columns, rows, rowKey, storageKey, empty }: Props<T>) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [chooserOpen, setChooserOpen] = useState(false);

  useEffect(() => {
    setHidden(loadHidden(storageKey, columns.filter((c) => c.defaultHidden).map((c) => c.key)));
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(`cols:${storageKey}`, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const visible = columns.filter((c) => !hidden.has(c.key));

  return (
    <div className={panel.tableWrap}>
      <div className={panel.tableToolbar}>
        <span className={panel.muted}>{rows.length} {rows.length === 1 ? "registro" : "registros"}</span>
        <button type="button" className={panel.ghostBtn} onClick={() => setChooserOpen((v) => !v)}>
          Colunas ▾
        </button>
        {chooserOpen && (
          <div className={panel.colChooser}>
            {columns.filter((c) => c.toggleable !== false).map((c) => (
              <label key={c.key}>
                <input type="checkbox" checked={!hidden.has(c.key)} onChange={() => toggle(c.key)} />
                {c.label}
              </label>
            ))}
          </div>
        )}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className={panel.table}>
          <thead>
            <tr>{visible.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {visible.map((c) => <td key={c.key}>{c.render(row)}</td>)}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={visible.length}>{empty ?? "Nada para mostrar."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
