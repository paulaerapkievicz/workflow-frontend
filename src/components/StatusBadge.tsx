import panel from "@/styles/panel.module.scss";
import { JobStatus, STATUS_LABELS } from "@/src/services/jobService";
import type { StatusTone } from "@/src/services/statusColors";

const TONE_CLASS: Record<StatusTone, string> = {
  pending: panel.badgePending,
  progress: panel.badgeProgress,
  waiting: panel.badgeWaiting,
  approved: panel.badgeApproved,
  done: panel.badgeDone,
  canceled: panel.badgeCanceled,
};

export type BadgeFamily =
  | "job"
  | "order"
  | "closing"
  | "payment"
  | "adjustment"
  | "withdrawal"
  | "credit";

/** Mapa status → tom semântico por família de badge. */
const FAMILY_TONE: Record<BadgeFamily, Record<string, StatusTone>> = {
  job: {
    pending: "pending",
    awaiting_approval: "waiting",
    accepted: "progress",
    in_progress: "progress",
    completed: "done",
    canceled: "canceled",
  },
  order: {
    open: "pending",
    in_progress: "progress",
    completed: "done",
    canceled: "canceled",
  },
  closing: {
    pending: "pending",
    open: "pending",
    paid: "done",
    canceled: "canceled",
  },
  payment: {
    settled: "done",
    pending: "pending",
    canceled: "canceled",
  },
  adjustment: {
    pending: "pending",
    approved: "approved",
    rejected: "canceled",
    reverted: "canceled",
  },
  withdrawal: {
    pending: "pending",
    processing: "progress",
    processed: "done",
    paid: "done",
    canceled: "canceled",
    rejected: "canceled",
  },
  credit: {
    pending: "pending",
    released: "done",
    canceled: "canceled",
  },
};

interface Props {
  status: string;
  /** Família do badge (default: "job"). */
  family?: BadgeFamily;
  /** Rótulo exibido — obrigatório fora de "job" (onde deriva de STATUS_LABELS). */
  label?: string;
}

export default function StatusBadge({ status, family = "job", label }: Props) {
  const tone = FAMILY_TONE[family]?.[status];
  const cls = tone ? TONE_CLASS[tone] : "";
  const text = label ?? (family === "job" ? STATUS_LABELS[status as JobStatus] ?? status : status);
  return <span className={`${panel.badge} ${cls}`}>{text}</span>;
}
