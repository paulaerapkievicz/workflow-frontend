import api from "@/src/services/api";
import { shiftLabel } from "@/src/services/shifts";
import type { ShiftInput, ShiftPeriod } from "@/src/services/shifts";
import { fmtTime } from "@/src/lib/datetime";

export type JobStatus = "pending" | "accepted" | "in_progress" | "completed" | "canceled";

export type JobShiftStatus = "pending" | "in_progress" | "done" | "missed";

export interface JobShift {
  id: string;
  jobId: string;
  position: number;
  startTime: string;
  endTime: string;
  label?: string | null;
  status?: JobShiftStatus;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  workedMinutes?: number | null;
}

export interface Geo {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface Job {
  id: string;
  supermarketId: string;
  branchId: string;
  categoryId: string;
  freelancerId?: string | null;
  title: string;
  description?: string | null;
  status: JobStatus;
  shiftPeriod?: ShiftPeriod | null;
  startTime: string;
  endTime: string;
  grossAmount?: number | null;
  contractedMinutes?: number | null;
  workedMinutes?: number | null;
  completedAt?: string | null;
  orderId?: string | null;
  /** Overrides de configuração por vaga — null = usa o padrão da agência. */
  checkinRadius?: number | null;
  cancellationWindowMinutes?: number | null;
  requireCheckoutPhoto?: boolean | null;
  reviewEnabled?: boolean | null;
  /** @deprecated agora é configuração da agência */
  photosRequired?: boolean;
  /** @deprecated agora é configuração da agência */
  agencyReviewEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  shifts?: JobShift[];
  jobBranch?: { id: string; name: string; address?: string; latitude?: number | null; longitude?: number | null } | null;
  jobCategory?: { id: string; name: string } | null;
  jobSupermarket?: { id: string; name: string } | null;
  assignedFreelancer?: { id: string; name: string } | null;
  jobPhotos?: { id: string; url: string; caption?: string | null }[];
  jobLogs?: {
    id: string;
    eventType: string;
    timestamp: string;
    reason?: string | null;
    jobShiftId?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }[];
  jobPayment?: { id: string; status: string } | null;
  jobReview?: { id: string; rating: number; comment?: string | null; approved?: boolean | null } | null;
}

/** Edição de uma vaga ainda disponível (não aceita). */
export interface UpdateJobInput {
  title?: string;
  categoryId?: string;
  date?: string; // YYYY-MM-DD
  /** Um ou mais turnos da vaga (formato novo). */
  shifts?: ShiftInput[];
  /** @deprecated use `shifts` — mantido para compatibilidade. */
  shiftPeriod?: ShiftPeriod;
  /** @deprecated use `shifts`. */
  startTime?: string; // HH:MM
  /** @deprecated use `shifts`. */
  endTime?: string; // HH:MM
}

export const getJobs = async (): Promise<Job[]> => (await api.get("/jobs")).data;
export const getAvailableJobs = async (): Promise<Job[]> => (await api.get("/jobs/available")).data;
export const getJob = async (id: string): Promise<Job> => (await api.get(`/jobs/${id}`)).data;

export const updateJob = async (id: string, input: UpdateJobInput): Promise<Job> =>
  (await api.put(`/jobs/${id}`, input)).data;

/** Configuração operacional por vaga (override do padrão da agência). `null` = usa o padrão. */
export interface JobConfigInput {
  checkinRadius?: number | null;
  cancellationWindowMinutes?: number | null;
  requireCheckoutPhoto?: boolean | null;
  reviewEnabled?: boolean | null;
}

/** Agência edita a vaga: função/turno/título (pendente) + overrides de configuração. */
export const updateJobAsAgency = async (
  id: string,
  input: UpdateJobInput & JobConfigInput
): Promise<Job> => (await api.put(`/agency/jobs/${id}`, input)).data;

export const deleteJob = async (id: string): Promise<void> => {
  await api.delete(`/jobs/${id}`);
};

/** Supermercado cancela uma vaga ainda disponível. */
export const cancelJob = async (id: string): Promise<Job> =>
  (await api.post(`/jobs/${id}/cancel`)).data;

export const acceptJob = async (id: string): Promise<Job> =>
  (await api.post(`/jobs/${id}/accept`)).data;

/** Freelancer desiste da vaga (dentro do prazo definido pela agência). */
export const withdrawJob = async (id: string, reason?: string): Promise<Job> =>
  (await api.post(`/jobs/${id}/withdraw`, { reason })).data;

/** Agência libera a vaga de um freelancer para repassar / reabrir. */
export const releaseJob = async (id: string, reason?: string): Promise<Job> =>
  (await api.post(`/jobs/${id}/release`, { reason })).data;

export const registerNoShow = async (id: string, reason: string): Promise<Job> =>
  (await api.post(`/jobs/${id}/no-show`, { reason })).data;

export const reviewDelivery = async (
  id: string,
  payload: { rating: number; comment?: string; approved: boolean }
) => (await api.post(`/jobs/${id}/review`, payload)).data;

export const getJobReview = async (id: string) => (await api.get(`/jobs/${id}/review`)).data;

export const checkIn = async (id: string, geo: Geo) =>
  (await api.post(`/jobs/${id}/logs/checkin`, geo)).data;
export const checkOut = async (id: string, geo: Geo) =>
  (await api.post(`/jobs/${id}/logs/checkout`, geo)).data;

/** Vagas em andamento da rede da agência (tempo real). */
export const getLiveJobs = async (): Promise<Job[]> => (await api.get("/jobs/live")).data;

/** Lê a posição atual do navegador (Promise). */
export const readGeolocation = (): Promise<Geo> =>
  new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Este dispositivo não suporta geolocalização."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Permita o acesso à localização para registrar o ponto."
              : "Não foi possível obter sua localização. Ative o GPS e tente de novo."
          )
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });

export const minutesToHours = (min?: number | null) =>
  min == null ? "—" : `${(min / 60).toFixed(1).replace(".", ",")} h`;

/** O freelancer ainda pode desistir sozinho? (até `windowMinutes` antes do início) */
export const canFreelancerCancel = (job: Job, windowMinutes: number): boolean => {
  if (job.status !== "accepted") return false;
  const window = job.cancellationWindowMinutes ?? windowMinutes;
  const deadline = new Date(job.startTime).getTime() - window * 60000;
  return Date.now() < deadline;
};

/** URL de um mapa (Google, sem chave) para um endereço. */
export const mapUrl = (address?: string | null) =>
  address ? `https://www.google.com/maps?q=${encodeURIComponent(address)}` : null;

export const mapEmbedUrl = (address?: string | null) =>
  address ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed` : null;

export const STATUS_LABELS: Record<JobStatus, string> = {
  pending: "Disponível",
  accepted: "Aceita",
  in_progress: "Em andamento",
  completed: "Concluída",
  canceled: "Cancelada",
};

export const formatShifts = (shifts?: JobShift[] | null): string => {
  if (!shifts?.length) return "—";
  return [...shifts]
    .sort((a, b) => a.position - b.position)
    .map((s) => `${fmtTime(s.startTime)}–${fmtTime(s.endTime)}`)
    .join(", ");
};

/** Nome(s) do(s) turno(s) de uma vaga — deriva dos turnos quando há mais de um. */
export const formatShiftPeriods = (job: {
  shiftPeriod?: ShiftPeriod | string | null;
  shifts?: JobShift[] | null;
}): string => {
  const fromShifts = [...(job.shifts ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((s) => s.label)
    .filter((l): l is string => !!l);
  if (fromShifts.length) return fromShifts.join(", ");
  return shiftLabel(job.shiftPeriod);
};
