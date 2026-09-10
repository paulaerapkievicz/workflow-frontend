import { useState } from "react";
import axios from "axios";
import Modal from "@/src/components/common/Modal";
import panel from "@/styles/panel.module.scss";
import {
  Job, JobShift, updateJobAsAgency, correctJobTimesheet, TimesheetShiftPatch,
} from "@/src/services/jobService";
import { Category } from "@/src/services/categoryService";
import { AgencySettings } from "@/src/services/agencySettingsService";
import {
  shiftFromWindow, newShift, validateShifts, toShiftPayload, ShiftInput,
} from "@/src/services/shifts";
import ShiftsField from "@/src/components/ShiftsField";
import { fmtTime, isoDateBR, isoToLocalInput, localInputToISO } from "@/src/lib/datetime";

const SHIFT_STATUS: Record<string, string> = {
  pending: "Aguardando", in_progress: "Em andamento", done: "Concluído", missed: "Perdido",
};

interface Props {
  job: Job;
  categories: Category[];
  settings: AgencySettings | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Estado editável de uma linha de correção de ponto. */
interface TimesheetRow {
  shift: JobShift;
  startLocal: string;
  endLocal: string;
  checkInLocal: string;
  checkOutLocal: string;
  breaks: { startLocal: string; endLocal: string }[];
}

export default function JobManageModal({ job, categories, settings, onClose, onSaved }: Props) {
  const pending = job.status === "pending";
  const canReshape = pending || job.status === "accepted";
  const canFixTimesheet = ["accepted", "in_progress", "completed"].includes(job.status);
  const alreadySettled = job.status === "completed" && !!job.jobPayment;

  const [tab, setTab] = useState<"config" | "timesheet">(canReshape ? "config" : "timesheet");

  const [title, setTitle] = useState(job.title);
  const [categoryId, setCategoryId] = useState(job.categoryId);
  const [date, setDate] = useState(isoDateBR(job.startTime));
  const [shifts, setShifts] = useState<ShiftInput[]>(() => {
    const s = [...(job.shifts ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((x) => shiftFromWindow(fmtTime(x.startTime), fmtTime(x.endTime), { label: x.label, nominalPeriod: x.nominalPeriod }));
    return s.length ? s : [newShift()];
  });

  const [checkinRadius, setCheckinRadius] = useState(job.checkinRadius?.toString() ?? "");
  const [cancelWindow, setCancelWindow] = useState(job.cancellationWindowMinutes?.toString() ?? "");
  const triState = (v: boolean | null | undefined): "" | "sim" | "nao" =>
    v == null ? "" : v ? "sim" : "nao";
  const [reqPhoto, setReqPhoto] = useState(triState(job.requireCheckoutPhoto));
  const [reviewEnabled, setReviewEnabled] = useState(triState(job.reviewEnabled));
  const [breaks, setBreaks] = useState(triState(job.breaksEnabled));
  const [breakLimit, setBreakLimit] = useState(job.breakLimitMinutes?.toString() ?? "");
  const [earlyTolerance, setEarlyTolerance] = useState(job.checkinEarlyToleranceMinutes?.toString() ?? "");

  const [rows, setRows] = useState<TimesheetRow[]>(() =>
    [...(job.shifts ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        shift: s,
        startLocal: isoToLocalInput(s.startTime),
        endLocal: isoToLocalInput(s.endTime),
        checkInLocal: isoToLocalInput(s.checkInAt),
        checkOutLocal: isoToLocalInput(s.checkOutAt),
        breaks: (s.breaks ?? []).map((b) => ({
          startLocal: isoToLocalInput(b.startAt),
          endLocal: isoToLocalInput(b.endAt),
        })),
      }))
  );
  const [tsReason, setTsReason] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const configPayload = () => ({
    checkinRadius: checkinRadius === "" ? null : Number(checkinRadius),
    cancellationWindowMinutes: cancelWindow === "" ? null : Number(cancelWindow),
    requireCheckoutPhoto: reqPhoto === "" ? null : reqPhoto === "sim",
    reviewEnabled: reviewEnabled === "" ? null : reviewEnabled === "sim",
    breaksEnabled: breaks === "" ? null : breaks === "sim",
    breakLimitMinutes: breakLimit === "" ? null : Number(breakLimit),
    checkinEarlyToleranceMinutes: earlyTolerance === "" ? null : Number(earlyTolerance),
  });

  const saveConfig = async () => {
    setError(null);
    const payload: Record<string, unknown> = configPayload();
    if (canReshape) {
      const shiftError = validateShifts(shifts);
      if (shiftError) return setError(shiftError);
      if (pending) {
        payload.title = title.trim() || undefined;
        payload.categoryId = categoryId;
      }
      payload.date = date;
      payload.shifts = shifts.map(toShiftPayload);
    }
    setSaving(true);
    try {
      await updateJobAsAgency(job.id, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao salvar." : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (i: number, p: Partial<TimesheetRow>) =>
    setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  const updateBreak = (ri: number, bi: number, p: Partial<{ startLocal: string; endLocal: string }>) =>
    setRows((cur) =>
      cur.map((r, idx) =>
        idx === ri ? { ...r, breaks: r.breaks.map((b, j) => (j === bi ? { ...b, ...p } : b)) } : r
      )
    );
  const addBreak = (ri: number) =>
    updateRow(ri, { breaks: [...rows[ri].breaks, { startLocal: "", endLocal: "" }] });
  const removeBreak = (ri: number, bi: number) =>
    updateRow(ri, { breaks: rows[ri].breaks.filter((_, j) => j !== bi) });

  const saveTimesheet = async () => {
    setError(null);
    const patches: TimesheetShiftPatch[] = [];
    for (const r of rows) {
      if (r.shift.status === "pending") {
        const changed =
          r.startLocal !== isoToLocalInput(r.shift.startTime) ||
          r.endLocal !== isoToLocalInput(r.shift.endTime);
        if (changed) {
          if (!r.startLocal || !r.endLocal) return setError(`${r.shift.label}: informe início e fim do turno.`);
          patches.push({
            shiftId: r.shift.id,
            startTime: localInputToISO(r.startLocal),
            endTime: localInputToISO(r.endLocal),
          });
        }
      } else {
        const patch: TimesheetShiftPatch = { shiftId: r.shift.id };
        if (r.checkInLocal !== isoToLocalInput(r.shift.checkInAt)) patch.checkInAt = localInputToISO(r.checkInLocal);
        if (r.checkOutLocal !== isoToLocalInput(r.shift.checkOutAt)) patch.checkOutAt = localInputToISO(r.checkOutLocal);
        const origBreaks = (r.shift.breaks ?? []).map((b) => ({
          startLocal: isoToLocalInput(b.startAt),
          endLocal: isoToLocalInput(b.endAt),
        }));
        const breaksChanged = JSON.stringify(origBreaks) !== JSON.stringify(r.breaks);
        if (breaksChanged) {
          for (const b of r.breaks) {
            if (!b.startLocal || !b.endLocal) return setError(`${r.shift.label}: cada pausa precisa de início e fim.`);
          }
          patch.breaks = r.breaks.map((b) => ({
            startAt: localInputToISO(b.startLocal),
            endAt: localInputToISO(b.endLocal),
          }));
        }
        if (patch.checkInAt || patch.checkOutAt || patch.breaks) patches.push(patch);
      }
    }
    if (!patches.length) return setError("Nenhuma alteração de horário/ponto para salvar.");
    setSaving(true);
    try {
      await correctJobTimesheet(job.id, { reason: tsReason || undefined, shifts: patches });
      onSaved();
      onClose();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao corrigir." : "Erro ao corrigir.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Gerenciar vaga — ${job.title}`} onClose={onClose}>
      <div className={panel.form}>
        {canReshape && canFixTimesheet && (
          <div className={panel.filterBar} style={{ marginBottom: 4 }}>
            <button type="button" className={tab === "config" ? panel.primaryBtn : panel.ghostBtn}
              onClick={() => setTab("config")}>Turno e configuração</button>
            <button type="button" className={tab === "timesheet" ? panel.primaryBtn : panel.ghostBtn}
              onClick={() => setTab("timesheet")}>Corrigir horário e ponto</button>
          </div>
        )}

        {tab === "config" && (
          <>
            {pending && (
              <>
                <label>Função</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <label>Título</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} />
              </>
            )}

            {canReshape ? (
              <>
                <label>Data</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <label>Turnos da vaga</label>
                <ShiftsField value={shifts} onChange={setShifts} />
                {job.status === "accepted" && (
                  <p className={panel.muted}>
                    A vaga já foi aceita — remarcar o horário revalida a agenda do colaborador.
                  </p>
                )}
              </>
            ) : (
              <p className={panel.muted}>
                Turno e função só mudam com a vaga disponível. Use “Corrigir horário e ponto” para ajustes.
              </p>
            )}

            <hr style={{ width: "100%", borderColor: "var(--border)" }} />
            <strong>Configuração desta vaga</strong>
            <p className={panel.muted}>Deixe “Padrão” / em branco para usar a configuração geral da agência.</p>

            <label>Raio de check-in (m){settings ? ` — padrão ${settings.checkinRadius}` : ""}</label>
            <input type="number" min={20} max={5000} value={checkinRadius}
              placeholder={settings ? String(settings.checkinRadius) : "padrão"}
              onChange={(e) => setCheckinRadius(e.target.value)} />

            <label>Prazo de cancelamento (min){settings ? ` — padrão ${settings.cancellationWindowMinutes}` : ""}</label>
            <input type="number" min={0} max={10080} value={cancelWindow}
              placeholder={settings ? String(settings.cancellationWindowMinutes) : "padrão"}
              onChange={(e) => setCancelWindow(e.target.value)} />

            <label>
              Antecedência máxima do check-in (min)
              {settings ? ` — padrão ${settings.checkinEarlyToleranceMinutes}` : ""}
            </label>
            <input type="number" min={0} max={240} value={earlyTolerance}
              placeholder={settings ? String(settings.checkinEarlyToleranceMinutes) : "padrão"}
              onChange={(e) => setEarlyTolerance(e.target.value)} />

            <label>Foto no check-out</label>
            <select value={reqPhoto} onChange={(e) => setReqPhoto(e.target.value as "" | "sim" | "nao")}>
              <option value="">Padrão{settings ? ` (${settings.requireCheckoutPhoto ? "exige" : "não exige"})` : ""}</option>
              <option value="sim">Exigir</option>
              <option value="nao">Não exigir</option>
            </select>

            <label>Avaliação de entrega</label>
            <select value={reviewEnabled} onChange={(e) => setReviewEnabled(e.target.value as "" | "sim" | "nao")}>
              <option value="">Padrão{settings ? ` (${settings.reviewEnabled ? "ativa" : "inativa"})` : ""}</option>
              <option value="sim">Ativar</option>
              <option value="nao">Desativar</option>
            </select>

            <label>Pausa/intervalo no ponto</label>
            <select value={breaks} onChange={(e) => setBreaks(e.target.value as "" | "sim" | "nao")}>
              <option value="">Padrão{settings ? ` (${settings.breaksEnabled ? "permite" : "não permite"})` : ""}</option>
              <option value="sim">Permitir</option>
              <option value="nao">Não permitir</option>
            </select>

            <label>
              Limite de pausa por turno (min)
              {settings ? ` — padrão ${settings.breakLimitMinutes ?? "sem limite"}` : ""}
            </label>
            <input type="number" min={1} max={480} value={breakLimit}
              placeholder={settings?.breakLimitMinutes != null ? String(settings.breakLimitMinutes) : "sem limite"}
              onChange={(e) => setBreakLimit(e.target.value)} />

            {error && <p className={panel.error}>{error}</p>}
            <button className={panel.primaryBtn} onClick={saveConfig} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </>
        )}

        {tab === "timesheet" && (
          <>
            <p className={panel.muted}>
              Ajuste o horário de turnos ainda não iniciados ou corrija o check-in/check-out e as
              pausas dos turnos já trabalhados.
            </p>
            {alreadySettled && (
              <p className={panel.error}>
                Esta vaga já foi paga — a correção vai reajustar o pagamento e os saldos do
                colaborador e da agência pela diferença.
              </p>
            )}
            {rows.map((r, i) => (
              <div key={r.shift.id} className={panel.card} style={{ padding: "0.75rem" }}>
                <strong>
                  {r.shift.label || `Turno ${i + 1}`}{" "}
                  <span className={panel.badge}>{SHIFT_STATUS[r.shift.status ?? "pending"]}</span>
                </strong>
                {r.shift.status === "pending" ? (
                  <div className={panel.shiftRow} style={{ marginTop: 6 }}>
                    <div>
                      <label>Início</label>
                      <input type="datetime-local" value={r.startLocal}
                        onChange={(e) => updateRow(i, { startLocal: e.target.value })} />
                    </div>
                    <div>
                      <label>Fim</label>
                      <input type="datetime-local" value={r.endLocal}
                        onChange={(e) => updateRow(i, { endLocal: e.target.value })} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={panel.shiftRow} style={{ marginTop: 6 }}>
                      <div>
                        <label>Check-in</label>
                        <input type="datetime-local" value={r.checkInLocal}
                          onChange={(e) => updateRow(i, { checkInLocal: e.target.value })} />
                      </div>
                      <div>
                        <label>Check-out</label>
                        <input type="datetime-local" value={r.checkOutLocal}
                          onChange={(e) => updateRow(i, { checkOutLocal: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <label className={panel.muted}>Pausas</label>
                      {r.breaks.map((b, bi) => (
                        <div key={bi} className={panel.shiftRow}>
                          <input type="datetime-local" value={b.startLocal}
                            onChange={(e) => updateBreak(i, bi, { startLocal: e.target.value })} />
                          <input type="datetime-local" value={b.endLocal}
                            onChange={(e) => updateBreak(i, bi, { endLocal: e.target.value })} />
                          <button type="button" className={panel.secondaryBtn} onClick={() => removeBreak(i, bi)}>
                            Remover
                          </button>
                        </div>
                      ))}
                      <button type="button" className={panel.ghostBtn} onClick={() => addBreak(i)}>
                        + Pausa
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <label>Motivo da correção</label>
            <input value={tsReason} onChange={(e) => setTsReason(e.target.value)}
              placeholder="ex.: colaborador esqueceu de bater o ponto" />
            {error && <p className={panel.error}>{error}</p>}
            <button className={panel.primaryBtn} onClick={saveTimesheet} disabled={saving}>
              {saving ? "Salvando…" : "Salvar correção"}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
