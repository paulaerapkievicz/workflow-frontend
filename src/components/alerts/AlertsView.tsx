import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import panel from "@/styles/panel.module.scss";
import FreelancerChip from "@/src/components/FreelancerChip";
import {
  JobAlert,
  AlertSeverity,
  ALERT_TYPE_LABELS,
  listAlerts,
  acknowledgeAlert,
  resolveAlert,
} from "@/src/services/alertService";
import { registerNoShow, forceCheckoutJob, releaseJob } from "@/src/services/jobService";

type StatusFilter = "open" | "resolved" | "all";

const SEVERITY: Record<AlertSeverity, { label: string; color: string; bg: string }> = {
  critical: { label: "Crítico", color: "#b42318", bg: "rgba(180,35,24,0.12)" },
  warning: { label: "Atenção", color: "#b54708", bg: "rgba(181,71,8,0.12)" },
  info: { label: "Informativo", color: "#175cd3", bg: "rgba(23,92,211,0.12)" },
};

const elapsed = (since: string) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(since).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h${String(min % 60).padStart(2, "0")}`;
  return `${Math.floor(h / 24)}d`;
};

/** Ação rápida sugerida por tipo de ocorrência (só agência/líder). */
function quickAction(alert: JobAlert): { label: string; run: () => Promise<unknown> } | null {
  const jobId = alert.jobId;
  switch (alert.type) {
    case "no_show":
      return {
        label: "Registrar falta",
        run: async () => {
          const reason = window.prompt("Motivo da falta (bloqueia o colaborador por 7 dias):");
          if (!reason) throw new Error("cancelado");
          return registerNoShow(jobId, reason);
        },
      };
    case "missing_checkout":
    case "break_not_resumed":
      return {
        label: "Forçar checkout",
        run: async () => {
          const reason = window.prompt("Motivo do checkout forçado:");
          if (!reason) throw new Error("cancelado");
          return forceCheckoutJob(jobId, reason);
        },
      };
    case "late_checkin":
    case "shift_unfilled_started":
    case "shift_unfilled_soon":
      return {
        label: "Liberar / repassar vaga",
        run: async () => {
          if (!window.confirm("Liberar a vaga para reabrir/repassar a outro colaborador?"))
            throw new Error("cancelado");
          return releaseJob(jobId);
        },
      };
    default:
      return null;
  }
}

interface Props {
  /** supermarket = somente leitura. */
  role: "agency" | "leader" | "supermarket";
  /** Rota da tela onde a vaga é gerenciada (link "Abrir vaga"). */
  jobHref: (jobId: string) => string;
}

export default function AlertsView({ role, jobHref }: Props) {
  const readOnly = role === "supermarket";
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>("open");
  const [type, setType] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      setAlerts(await listAlerts({ status }));
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar as ocorrências.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const typesPresent = useMemo(
    () => [...new Set(alerts.map((a) => a.type))].sort(),
    [alerts]
  );
  const shown = useMemo(
    () => alerts.filter((a) => !type || a.type === type),
    [alerts, type]
  );
  const openCount = alerts.filter((a) => a.status !== "resolved").length;
  const criticalCount = alerts.filter((a) => a.status !== "resolved" && a.severity === "critical").length;

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      if (e instanceof Error && e.message === "cancelado") {
        /* usuário cancelou o prompt */
      } else {
        setError(e instanceof Error ? e.message : "Não foi possível concluir a ação.");
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <p className={panel.muted}>
        {openCount} em aberto{criticalCount > 0 ? ` · ${criticalCount} crítica(s)` : ""}
        {updatedAt ? ` · atualizado às ${updatedAt.toLocaleTimeString("pt-BR")} (recarrega a cada 60s)` : ""}
      </p>

      <div className={panel.filterBar}>
        <label className={panel.filterField}>
          <span>Situação</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="open">Em aberto</option>
            <option value="resolved">Resolvidas</option>
            <option value="all">Todas</option>
          </select>
        </label>
        <label className={panel.filterField}>
          <span>Tipo</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos</option>
            {typesPresent.map((t) => (
              <option key={t} value={t}>
                {ALERT_TYPE_LABELS[t as keyof typeof ALERT_TYPE_LABELS] ?? t}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={panel.ghostBtn} onClick={load}>
          Atualizar
        </button>
      </div>

      {error && <p style={{ color: "var(--danger, #b42318)" }}>{error}</p>}

      {loading ? (
        <p>Carregando…</p>
      ) : shown.length === 0 ? (
        <p className={panel.muted}>Nenhuma ocorrência {status === "open" ? "em aberto" : "encontrada"}. 🎉</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {shown.map((a) => {
            const sev = SEVERITY[a.severity];
            const qa = !readOnly && a.status !== "resolved" ? quickAction(a) : null;
            return (
              <div
                key={a.id}
                className={panel.card}
                style={{ borderLeft: `4px solid ${sev.color}`, opacity: a.status === "resolved" ? 0.6 : 1 }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                  <span
                    className={panel.badge}
                    style={{ background: sev.bg, color: sev.color }}
                  >
                    {sev.label}
                  </span>
                  <strong>{a.typeLabel || ALERT_TYPE_LABELS[a.type] || a.type}</strong>
                  <span className={panel.muted}>· detectado há {elapsed(a.detectedAt)}</span>
                  {a.status === "acknowledged" && <span className={panel.muted}>· reconhecido</span>}
                  {a.status === "resolved" && (
                    <span className={panel.muted}>
                      · resolvido{a.resolutionCode === "auto" ? " automaticamente" : a.resolvedBy ? ` pela ${a.resolvedBy === "agency" ? "agência" : a.resolvedBy}` : ""}
                    </span>
                  )}
                </div>

                <p style={{ margin: "0.5rem 0 0.25rem", fontWeight: 600 }}>{a.title}</p>
                <p style={{ margin: 0 }}>{a.message}</p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginTop: "0.5rem" }}>
                  {a.freelancer && <FreelancerChip freelancer={a.freelancer} />}
                  {a.job && (
                    <span className={panel.muted}>
                      {a.job.title}
                      {a.job.branchName ? ` · ${a.job.branchName}` : ""}
                    </span>
                  )}
                  <Link href={jobHref(a.jobId)} className={panel.ghostBtn}>
                    Abrir vaga
                  </Link>
                </div>

                {a.status !== "resolved" && a.resolutionHint && (
                  <p className={panel.muted} style={{ marginTop: "0.5rem" }}>
                    ↪ {a.resolutionHint}
                  </p>
                )}

                {a.status === "resolved" && a.resolutionNote && (
                  <p className={panel.muted} style={{ marginTop: "0.5rem" }}>Nota: {a.resolutionNote}</p>
                )}

                {!readOnly && a.status !== "resolved" && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
                    {qa && (
                      <button
                        className={panel.primaryBtn}
                        disabled={busyId === a.id}
                        onClick={() => act(a.id, qa.run)}
                      >
                        {qa.label}
                      </button>
                    )}
                    {a.status === "open" && (
                      <button
                        className={panel.ghostBtn}
                        disabled={busyId === a.id}
                        onClick={() => act(a.id, () => acknowledgeAlert(a.id))}
                      >
                        Reconhecer
                      </button>
                    )}
                    <button
                      className={panel.ghostBtn}
                      disabled={busyId === a.id}
                      onClick={() =>
                        act(a.id, async () => {
                          const note = window.prompt("Resolver esta ocorrência. Nota (opcional):", "");
                          if (note === null) throw new Error("cancelado");
                          return resolveAlert(a.id, { code: "acted", note: note || undefined });
                        })
                      }
                    >
                      Resolver
                    </button>
                    <button
                      className={panel.ghostBtn}
                      disabled={busyId === a.id}
                      onClick={() =>
                        act(a.id, async () => {
                          if (!window.confirm("Descartar esta ocorrência sem tratar?")) throw new Error("cancelado");
                          return resolveAlert(a.id, { code: "dismissed" });
                        })
                      }
                    >
                      Descartar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
