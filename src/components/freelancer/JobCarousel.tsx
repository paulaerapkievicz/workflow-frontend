import panel from "@/styles/panel.module.scss";
import app from "@/styles/freelancerApp.module.scss";
import { Job, formatShiftPeriods, formatShifts } from "@/src/services/jobService";
import { formatDistance } from "@/src/lib/distance";
import { fmtDate } from "@/src/lib/datetime";

interface Props {
  jobs: Job[];
  distanceOf?: (job: Job) => number | null;
  acceptingId: string | null;
  onAccept: (jobId: string) => void;
}

/** Carrossel horizontal compacto de vagas próximas — usado na Home quando o colaborador está livre. */
export default function JobCarousel({ jobs, distanceOf, acceptingId, onAccept }: Props) {
  return (
    <div className={app.carousel}>
      {jobs.map((j) => {
        const d = distanceOf?.(j) ?? null;
        return (
          <div key={j.id} className={`${app.card} ${app.carouselCard}`}>
            <div className={app.cardTop}>
              <div>
                <p className={app.cardTitle}>{j.title}</p>
                <p className={app.cardMeta}>
                  {j.jobSupermarket?.name ?? "—"}
                  {j.jobBranch?.name ? ` — ${j.jobBranch.name}` : ""}
                </p>
              </div>
              {d != null && <span className={app.distanceTag}>{formatDistance(d)}</span>}
            </div>
            <p className={app.cardMeta}>
              {j.jobCategory?.name ?? "—"} · {fmtDate(j.startTime)}
            </p>
            <p className={app.cardMeta}>{formatShiftPeriods(j)} · {formatShifts(j.shifts)}</p>
            <div className={app.cardFooter}>
              <button
                className={panel.primaryBtn}
                disabled={acceptingId === j.id}
                onClick={() => onAccept(j.id)}
              >
                {acceptingId === j.id ? "Aceitando…" : "Aceitar"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
