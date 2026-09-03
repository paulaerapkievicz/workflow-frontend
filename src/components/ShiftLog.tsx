import panel from "@/styles/panel.module.scss";
import { JobShift, minutesToHours } from "@/src/services/jobService";
import { fmtTime } from "@/src/lib/datetime";

export const SHIFT_STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando",
  in_progress: "Em andamento",
  done: "Concluído",
  missed: "Perdido",
};

/** Tabela de ponto de todos os turnos de uma vaga (check-in/out por turno). */
export default function ShiftLog({ shifts }: { shifts?: JobShift[] | null }) {
  const rows = [...(shifts ?? [])].sort((a, b) => a.position - b.position);
  if (!rows.length) return null;
  return (
    <div style={{ overflowX: "auto" }}>
      <table className={panel.table} style={{ marginTop: "0.5rem" }}>
        <thead>
          <tr>
            <th>Turno</th><th>Horário</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Trabalhado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s.id}>
              <td>{s.label || `Turno ${i + 1}`}</td>
              <td>{fmtTime(s.startTime)}–{fmtTime(s.endTime)}</td>
              <td>{fmtTime(s.checkInAt)}</td>
              <td>{fmtTime(s.checkOutAt)}</td>
              <td><span className={panel.badge}>{SHIFT_STATUS_LABELS[s.status ?? "pending"]}</span></td>
              <td>{minutesToHours(s.workedMinutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
