import panel from "@/styles/panel.module.scss";
import { JobStatus, STATUS_LABELS } from "@/src/services/jobService";

const CLASS: Record<JobStatus, string> = {
  pending: panel.badgePending,
  accepted: panel.badgeProgress,
  in_progress: panel.badgeProgress,
  completed: panel.badgeDone,
  canceled: panel.badgeCanceled,
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  return <span className={`${panel.badge} ${CLASS[status] ?? ""}`}>{STATUS_LABELS[status] ?? status}</span>;
}
