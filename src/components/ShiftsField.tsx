import { useMemo } from "react";
import styles from "@/styles/shiftsField.module.scss";
import {
  SHIFT_PERIODS,
  ShiftInput,
  ShiftPeriod,
  newShift,
  crossesMidnight,
  shiftDurationMinutes,
  formatDuration,
  validateShifts,
  shiftPeriodFromTime,
} from "@/src/services/shifts";

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

interface Props {
  value: ShiftInput[];
  onChange: (shifts: ShiftInput[]) => void;
  disabled?: boolean;
  /** Mostra a mensagem de validação embaixo (default: true). */
  showError?: boolean;
}

/**
 * Editor de turnos com janela de horário livre: um ou mais turnos por vaga, cada um
 * com início/fim arbitrários (pode virar o dia), rótulo de período opcional e
 * intervalo/lacuna entre turnos. Substitui o antigo seletor de períodos fixos.
 */
export default function ShiftsField({ value, onChange, disabled, showError = true }: Props) {
  const patch = (id: string, p: Partial<ShiftInput>) =>
    onChange(value.map((s) => (s.id === id ? { ...s, ...p } : s)));

  const remove = (id: string) => onChange(value.filter((s) => s.id !== id));
  const add = (period?: ShiftPeriod) => onChange([...value, newShift(period)]);

  const error = useMemo(() => validateShifts(value), [value]);

  const sorted = useMemo(
    () => [...value].sort((a, b) => toMin(a.startTime) - toMin(b.startTime)),
    [value]
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.presets}>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", alignSelf: "center" }}>
          Atalhos:
        </span>
        {SHIFT_PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={styles.preset}
            disabled={disabled}
            onClick={() => add(p.value)}
          >
            + {p.label}
          </button>
        ))}
      </div>

      {value.map((s, idx) => {
        const wraps = crossesMidnight(s);
        const dur = shiftDurationMinutes(s);
        return (
          <div key={s.id} className={styles.row} style={{ position: "relative" }}>
            <div className={styles.field}>
              <label>Período</label>
              <select
                value={s.custom ? "custom" : s.nominalPeriod ?? shiftPeriodFromTime(s.startTime)}
                disabled={disabled}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "custom") patch(s.id, { custom: true });
                  else patch(s.id, { custom: false, label: null, nominalPeriod: v as ShiftPeriod });
                }}
              >
                {SHIFT_PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
                <option value="custom">Personalizado…</option>
              </select>
              {s.custom && (
                <input
                  type="text"
                  value={s.label ?? ""}
                  disabled={disabled}
                  maxLength={40}
                  placeholder={`Turno ${idx + 1}`}
                  onChange={(e) => patch(s.id, { label: e.target.value })}
                />
              )}
            </div>
            <div className={styles.field}>
              <label>Início</label>
              <input
                type="time"
                value={s.startTime}
                disabled={disabled}
                onChange={(e) => patch(s.id, { startTime: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Fim</label>
              <input
                type="time"
                value={s.endTime}
                disabled={disabled}
                onChange={(e) => patch(s.id, { endTime: e.target.value })}
              />
            </div>
            <div className={styles.meta}>
              <span>{formatDuration(dur)}</span>
              {wraps && <span className={styles.midnight}>vira o dia ↴</span>}
            </div>
            <button
              type="button"
              className={styles.remove}
              disabled={disabled || value.length <= 1}
              title="Remover turno"
              onClick={() => remove(s.id)}
            >
              ✕
            </button>
          </div>
        );
      })}

      <button type="button" className={styles.add} disabled={disabled} onClick={() => add()}>
        + Adicionar turno
      </button>

      {sorted.length > 1 && (
        <div className={styles.timeline}>
          {sorted.map((s, i) => {
            const gap =
              i > 0 && !crossesMidnight(sorted[i - 1])
                ? toMin(s.startTime) - toMin(sorted[i - 1].endTime)
                : 0;
            return (
              <span key={s.id} style={{ display: "contents" }}>
                {gap > 0 && <span className={styles.gap}>· intervalo {formatDuration(gap)} ·</span>}
                <span className={styles.block}>
                  {s.startTime}–{s.endTime}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {showError && error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
