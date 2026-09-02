import { useState } from "react";
import axios from "axios";
import Modal from "@/src/components/common/Modal";
import panel from "@/styles/panel.module.scss";
import { Job, updateJobAsAgency } from "@/src/services/jobService";
import { Category } from "@/src/services/categoryService";
import { AgencySettings } from "@/src/services/agencySettingsService";
import {
  SHIFT_PERIODS, shiftLabel, shiftTimeRange, makeShiftInput, validateShiftInput,
  shiftPeriodFromTime, ShiftInput, ShiftPeriod,
} from "@/src/services/shifts";

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
const shiftSortIndex = (p: ShiftPeriod) => SHIFT_PERIODS.findIndex((x) => x.value === p);

interface Props {
  job: Job;
  categories: Category[];
  settings: AgencySettings | null;
  onClose: () => void;
  onSaved: () => void;
}

/** A agência gerencia a vaga: função/turno/título (enquanto pendente) + overrides de configuração. */
export default function JobManageModal({ job, categories, settings, onClose, onSaved }: Props) {
  const pending = job.status === "pending";
  const [title, setTitle] = useState(job.title);
  const [categoryId, setCategoryId] = useState(job.categoryId);
  const [date, setDate] = useState(job.startTime.slice(0, 10));
  const [shifts, setShifts] = useState<ShiftInput[]>(() => {
    const s = [...(job.shifts ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((x) => ({
        shiftPeriod: shiftPeriodFromTime(x.startTime),
        startTime: hhmm(x.startTime),
        endTime: hhmm(x.endTime),
      }));
    return s.length ? s : [makeShiftInput((job.shiftPeriod as ShiftPeriod) ?? "manha")];
  });

  const [checkinRadius, setCheckinRadius] = useState(job.checkinRadius?.toString() ?? "");
  const [cancelWindow, setCancelWindow] = useState(job.cancellationWindowMinutes?.toString() ?? "");
  const [reqPhoto, setReqPhoto] = useState<"" | "sim" | "nao">(
    job.requireCheckoutPhoto == null ? "" : job.requireCheckoutPhoto ? "sim" : "nao"
  );
  const [reviewEnabled, setReviewEnabled] = useState<"" | "sim" | "nao">(
    job.reviewEnabled == null ? "" : job.reviewEnabled ? "sim" : "nao"
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleShift = (period: ShiftPeriod) =>
    setShifts((cur) => {
      const has = cur.some((s) => s.shiftPeriod === period);
      return has
        ? cur.filter((s) => s.shiftPeriod !== period)
        : [...cur, makeShiftInput(period)].sort(
            (a, b) => shiftSortIndex(a.shiftPeriod) - shiftSortIndex(b.shiftPeriod)
          );
    });
  const updateShiftTime = (period: ShiftPeriod, patch: Partial<ShiftInput>) =>
    setShifts((cur) => cur.map((s) => (s.shiftPeriod === period ? { ...s, ...patch } : s)));

  const save = async () => {
    setError(null);
    const payload: Record<string, unknown> = {
      checkinRadius: checkinRadius === "" ? null : Number(checkinRadius),
      cancellationWindowMinutes: cancelWindow === "" ? null : Number(cancelWindow),
      requireCheckoutPhoto: reqPhoto === "" ? null : reqPhoto === "sim",
      reviewEnabled: reviewEnabled === "" ? null : reviewEnabled === "sim",
    };
    if (pending) {
      if (!shifts.length) return setError("Selecione ao menos um turno.");
      for (const s of shifts) {
        const err = validateShiftInput(s);
        if (err) return setError(`${shiftLabel(s.shiftPeriod)}: ${err}`);
      }
      payload.title = title.trim() || undefined;
      payload.categoryId = categoryId;
      payload.date = date;
      payload.shifts = shifts;
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

  return (
    <Modal title={`Gerenciar vaga — ${job.title}`} onClose={onClose}>
      <div className={panel.form}>
        {pending ? (
          <>
            <label>Função</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label>Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
            <label>Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <label>Turnos da vaga (um ou mais)</label>
            <div className={panel.shiftRow}>
              {SHIFT_PERIODS.map((p) => (
                <label key={p.value} style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={shifts.some((s) => s.shiftPeriod === p.value)}
                    onChange={() => toggleShift(p.value)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
            {shifts.map((s) => {
              const range = shiftTimeRange(s.shiftPeriod);
              return (
                <div key={s.shiftPeriod} className={panel.shiftRow}>
                  <span style={{ minWidth: 72, fontWeight: 600 }}>{shiftLabel(s.shiftPeriod)}</span>
                  <div style={{ flex: 1 }}>
                    <label>Início</label>
                    <input type="time" value={s.startTime} min={range.min} max={range.max}
                      onChange={(e) => updateShiftTime(s.shiftPeriod, { startTime: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Fim</label>
                    <input type="time" value={s.endTime} min={range.min} max={range.max}
                      onChange={(e) => updateShiftTime(s.shiftPeriod, { endTime: e.target.value })} />
                  </div>
                </div>
              );
            })}
            <hr style={{ width: "100%", borderColor: "var(--border)" }} />
          </>
        ) : (
          <p className={panel.muted}>Vaga já aceita — só a configuração operacional pode ser ajustada.</p>
        )}

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

        {error && <p className={panel.error}>{error}</p>}
        <button className={panel.primaryBtn} onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}
