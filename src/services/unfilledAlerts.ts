import type { Job } from "@/src/services/jobService";
import type { Order } from "@/src/services/orderService";
import type { UnfilledAlertTier } from "@/src/services/agencySettingsService";

export type { UnfilledAlertTier };

/** A vaga ainda está disponível: pendente e sem ninguém alocado. */
export const jobIsUnfilled = (job: Job): boolean =>
  job.status === "pending" && !job.freelancerId && !job.assignedFreelancer;

/** Início mais cedo entre os turnos da vaga (fallback: `job.startTime`). */
export const jobEarliestStart = (job: Job): number => {
  const times = (job.shifts ?? [])
    .map((s) => new Date(s.startTime).getTime())
    .filter((t) => Number.isFinite(t));
  if (times.length) return Math.min(...times);
  return new Date(job.startTime).getTime();
};

/**
 * Faixa de alerta mais urgente já disparada para uma vaga não preenchida, ou `null`.
 * `tiers` deve vir ordenado da faixa mais distante (maior `minutesBefore`) para a mais urgente.
 */
export const jobUnfilledTier = (
  job: Job,
  tiers: UnfilledAlertTier[],
  now: number = Date.now()
): UnfilledAlertTier | null => {
  if (!jobIsUnfilled(job)) return null;
  const start = jobEarliestStart(job);
  if (!Number.isFinite(start)) return null;
  let hit: UnfilledAlertTier | null = null;
  for (const tier of tiers) {
    if (now >= start - tier.minutesBefore * 60_000) hit = tier; // a última que casa = a mais urgente
  }
  return hit;
};

/** Faixas distintas disparadas nas vagas de um pedido, da mais urgente para a mais distante. */
export const orderUnfilledTiers = (
  order: Order,
  tiers: UnfilledAlertTier[],
  now: number = Date.now()
): UnfilledAlertTier[] => {
  const byId = new Map<string, UnfilledAlertTier>();
  for (const job of order.orderJobs ?? []) {
    const tier = jobUnfilledTier(job, tiers, now);
    if (tier) byId.set(tier.id, tier);
  }
  return [...byId.values()].sort((a, b) => a.minutesBefore - b.minutesBefore);
};

/** Visão do supermercado: vaga sem colaborador cujo horário já começou. */
export const jobStartedUnfilled = (job: Job, now: number = Date.now()): boolean =>
  jobIsUnfilled(job) && now >= jobEarliestStart(job);

export const orderHasStartedUnfilled = (order: Order, now: number = Date.now()): boolean =>
  (order.orderJobs ?? []).some((j) => jobStartedUnfilled(j, now));
