import panel from "@/styles/panel.module.scss";

export interface ShiftRow {
  start: string; // HH:MM
  end: string;
  label: string;
}

interface Props {
  date: string; // YYYY-MM-DD — data única da vaga
  onDateChange: (v: string) => void;
  shifts: ShiftRow[];
  onChange: (rows: ShiftRow[]) => void;
}

export default function ShiftsEditor({ date, onDateChange, shifts, onChange }: Props) {
  const update = (i: number, patch: Partial<ShiftRow>) =>
    onChange(shifts.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => onChange(shifts.filter((_, idx) => idx !== i));
  const add = () => onChange([...shifts, { start: "13:00", end: "17:00", label: "" }]);

  return (
    <div className={panel.form}>
      <label>Data da atuação</label>
      <input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />

      <label>Turnos</label>
      {shifts.map((s, i) => (
        <div key={i} className={panel.shiftRow}>
          <input
            type="text"
            placeholder="Rótulo (Manhã…)"
            value={s.label}
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <input type="time" value={s.start} onChange={(e) => update(i, { start: e.target.value })} />
          <span>até</span>
          <input type="time" value={s.end} onChange={(e) => update(i, { end: e.target.value })} />
          {shifts.length > 1 && (
            <button type="button" className={panel.secondaryBtn} onClick={() => remove(i)}>×</button>
          )}
        </div>
      ))}
      <button type="button" className={panel.ghostBtn} onClick={add}>+ Adicionar turno</button>
    </div>
  );
}
