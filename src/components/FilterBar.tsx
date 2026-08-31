import panel from "@/styles/panel.module.scss";
import { RowFilter } from "@/src/lib/filterRows";

export interface FilterFieldDef {
  key: keyof RowFilter;
  label: string;
  type: "text" | "date" | "select";
  options?: { value: string; label: string }[];
}

interface Props {
  fields: FilterFieldDef[];
  value: RowFilter;
  onChange: (next: RowFilter) => void;
}

export default function FilterBar({ fields, value, onChange }: Props) {
  const set = (k: keyof RowFilter, v: string) => onChange({ ...value, [k]: v || undefined });
  const hasAny = Object.values(value).some(Boolean);

  return (
    <div className={panel.filterBar}>
      {fields.map((f) => (
        <label key={f.key} className={panel.filterField}>
          <span>{f.label}</span>
          {f.type === "select" ? (
            <select value={value[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}>
              <option value="">Todos</option>
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={f.type === "date" ? "date" : "text"}
              value={value[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.type === "text" ? "contém…" : undefined}
            />
          )}
        </label>
      ))}
      {hasAny && (
        <button type="button" className={panel.ghostBtn} onClick={() => onChange({})}>
          Limpar
        </button>
      )}
    </div>
  );
}
