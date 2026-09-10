import panel from "@/styles/panel.module.scss";
import {
  DateRange,
  DatePreset,
  DATE_PRESET_LABELS,
} from "@/src/lib/dateRange";

const DEFAULT_PRESETS: DatePreset[] = ["todas", "hoje", "amanha", "semana", "custom"];

interface Props {
  value: DateRange;
  onChange: (next: DateRange) => void;
  /** Atalhos exibidos, na ordem. Default: Todas / Hoje / Amanhã / Esta semana / Personalizado. */
  presets?: DatePreset[];
  /** Rótulo curto à esquerda dos botões. */
  label?: string;
}

/**
 * Filtro rápido de data ("Vagas Hoje") das telas de vaga/pedido. O recorte é
 * sempre pela data de execução do turno. Combine com `useDateRangeFilter` para
 * lembrar a última escolha (favorito por tela).
 */
export default function DateRangeQuickFilter({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  label = "Período",
}: Props) {
  const setPreset = (preset: DatePreset) =>
    onChange(preset === "custom" ? { ...value, preset } : { preset });

  return (
    <div className={panel.filterField} style={{ flex: "1 1 auto" }}>
      <span>{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            className={value.preset === p ? panel.primaryBtn : panel.ghostBtn}
            onClick={() => setPreset(p)}
          >
            {DATE_PRESET_LABELS[p]}
          </button>
        ))}
        {value.preset === "custom" && (
          <>
            <input
              type="date"
              aria-label="Data inicial"
              value={value.from ?? ""}
              max={value.to || undefined}
              onChange={(e) => onChange({ ...value, preset: "custom", from: e.target.value || undefined })}
            />
            <span className={panel.muted}>até</span>
            <input
              type="date"
              aria-label="Data final"
              value={value.to ?? ""}
              min={value.from || undefined}
              onChange={(e) => onChange({ ...value, preset: "custom", to: e.target.value || undefined })}
            />
          </>
        )}
      </div>
    </div>
  );
}
