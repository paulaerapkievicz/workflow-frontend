import panel from "@/styles/panel.module.scss";
import { JobShift, minutesToHours } from "@/src/services/jobService";
import { fmtTime } from "@/src/lib/datetime";

const SHIFT_STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando", in_progress: "Em andamento", done: "Concluído", missed: "Perdido",
};

const sortShifts = (shifts?: JobShift[] | null) => [...(shifts ?? [])].sort((a, b) => a.position - b.position);

/** Turnos + pausas de uma vaga — check-in/out, horas trabalhadas, intervalos. Compartilhado entre Meus Trabalhos, Relatório e Carteira. */
export default function JobMovementsTable({ shifts }: { shifts?: JobShift[] | null }) {
  const sorted = sortShifts(shifts);
  if (!sorted.length) return <p className={panel.muted}>Sem turnos registrados.</p>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table className={panel.table} style={{ marginTop: "0.5rem" }}>
        <thead>
          <tr><th>Turno</th><th>Horário</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Trabalhado</th></tr>
        </thead>
        <tbody>
          {sorted.flatMap((s, i) => [
            <tr key={s.id}>
              <td>{s.label || `Turno ${i + 1}`}</td>
              <td>{fmtTime(s.startTime)}–{fmtTime(s.endTime)}</td>
              <td>{fmtTime(s.checkInAt)}</td>
              <td>{fmtTime(s.checkOutAt)}</td>
              <td><span className={panel.badge}>{SHIFT_STATUS_LABELS[s.status ?? "pending"]}</span></td>
              <td>{minutesToHours(s.workedMinutes)}</td>
            </tr>,
            ...(s.breaks ?? []).map((b) => (
              <tr key={b.id} className={panel.muted}>
                <td style={{ paddingLeft: "1.5rem" }}>↳ pausa</td>
                <td colSpan={2}>{fmtTime(b.startAt)} → {b.endAt ? fmtTime(b.endAt) : "em aberto"}</td>
                <td colSpan={3}>
                  {b.endAt
                    ? `− ${minutesToHours(Math.round((new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 60000))}`
                    : "em pausa"}
                </td>
              </tr>
            )),
          ])}
        </tbody>
      </table>
    </div>
  );
}
