import api from "@/src/services/api";
import { shiftLabel } from "@/src/services/shifts";
import type { ShiftInput, ShiftPeriod } from "@/src/services/shifts";
import { fmtTime } from "@/src/lib/datetime";

export type JobStatus = "pending" | "accepted" | "in_progress" | "completed" | "canceled";

export type JobShiftStatus = "pending" | "in_progress" | "done" | "missed";

export interface JobShiftBreak {
  id: string;
  jobShiftId: string;
  startAt: string;
  endAt?: string | null;
  startedBy?: "freelancer" | "agency";
}

export interface JobShift {
  id: string;
  jobId: string;
  position: number;
  startTime: string;
  endTime: string;
  label?: string | null;
  /** Período nominal (manhã/tarde/noite/madrugada) — só rótulo. */
  nominalPeriod?: string | null;
  status?: JobShiftStatus;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  workedMinutes?: number | null;
  /** Intervalo (min) não remunerado desse turno. */
  breakMinutes?: number | null;
  breaks?: JobShiftBreak[];
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
  /** Vaga concluída com hora extra acima da tolerância — pagamento aguardando liberação da agência. */
  settlementHold?: boolean;
  settlementApprovedAt?: string | null;
  orderId?: string | null;
  /** Overrides de configuração por vaga — null = usa o padrão da agência. */
  checkinRadius?: number | null;
  cancellationWindowMinutes?: number | null;
  requireCheckoutPhoto?: boolean | null;
  reviewEnabled?: boolean | null;
  breaksEnabled?: boolean | null;
  breakLimitMinutes?: number | null;
  checkinEarlyToleranceMinutes?: number | null;
  defaultBreakMinutes?: number | null;
  maxShiftHours?: number | string | null;
  maxJobHours?: number | string | null;
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
  assignedFreelancer?: {
    id: string;
    name: string;
    phone?: string | null;
    document?: string | null;
    profilePhotoUrl?: string | null;
  } | null;
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
  /** Avaliação da entrega feita pelo supermercado (cliente). */
  jobClientReview?: { id: string; rating: number; comment?: string | null } | null;
}

/** Turno enviado para a API (janela livre + período nominal). */
export interface ShiftPayload {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  nominalPeriod?: ShiftPeriod | null;
  label?: string | null;
  custom?: boolean;
  breakMinutes?: number;
  useDefaultBreak?: boolean;
}

/** Edição de uma vaga ainda disponível (não aceita). */
export interface UpdateJobInput {
  title?: string;
  categoryId?: string;
  date?: string; // YYYY-MM-DD
  /** Um ou mais turnos da vaga. */
  shifts?: (ShiftPayload | ShiftInput)[];
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
  breaksEnabled?: boolean | null;
  breakLimitMinutes?: number | null;
  checkinEarlyToleranceMinutes?: number | null;
  defaultBreakMinutes?: number | null;
  maxShiftHours?: number | null;
  maxJobHours?: number | null;
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

/** Agência/líder encerra uma vaga vencida que ficou sem colaborador. */
export const closeUnfilledJob = async (id: string): Promise<Job> =>
  (await api.post(`/agency/jobs/${id}/close-unfilled`)).data;

/** Fecha em lote as vagas vencidas sem colaborador (de um pedido ou de toda a rede). */
export const closeExpiredUnfilled = async (orderId?: string): Promise<{ closed: number }> =>
  (await api.post(`/agency/jobs/close-expired-unfilled`, orderId ? { orderId } : {})).data;

/** Agência encerra o turno em andamento no lugar do colaborador (sem exigir foto/geofence dele). */
export const forceCheckoutJob = async (id: string, reason: string): Promise<Job> =>
  (await api.post(`/jobs/${id}/force-checkout`, { reason })).data;

/** Agência troca o colaborador alocado na vaga. */
export const reassignJob = async (id: string, freelancerId: string, reason?: string): Promise<Job> =>
  (await api.post(`/jobs/${id}/reassign`, { freelancerId, reason })).data;

/** Vagas concluídas da rede com pagamento retido por hora extra. */
export const getPendingSettlementJobs = async (): Promise<Job[]> =>
  (await api.get("/agency/pending-settlement")).data;

/** Agência libera o pagamento de uma vaga retida (opcionalmente só o tempo contratado). */
export const releaseJobPayment = async (id: string, capToContracted = false): Promise<Job> =>
  (await api.post(`/jobs/${id}/release-payment`, { capToContracted })).data;

export const reviewDelivery = async (
  id: string,
  payload: { rating: number; comment?: string; approved: boolean }
) => (await api.post(`/jobs/${id}/review`, payload)).data;

export const getJobReview = async (id: string) => (await api.get(`/jobs/${id}/review`)).data;

export const checkIn = async (id: string, geo: Geo) =>
  (await api.post(`/jobs/${id}/logs/checkin`, geo)).data;
export const checkOut = async (id: string, geo: Geo) =>
  (await api.post(`/jobs/${id}/logs/checkout`, geo)).data;

/** Freelancer pausa / retoma o ponto (intervalo escolhido por ele). */
export const startBreak = async (id: string, geo: Geo) =>
  (await api.post(`/jobs/${id}/logs/break-start`, geo)).data;
export const endBreak = async (id: string, geo: Geo) =>
  (await api.post(`/jobs/${id}/logs/break-end`, geo)).data;

/** Agência pausa / retoma o ponto no lugar do colaborador. */
export const agencyStartBreak = async (id: string) =>
  (await api.post(`/agency/jobs/${id}/break-start`)).data;
export const agencyEndBreak = async (id: string) =>
  (await api.post(`/agency/jobs/${id}/break-end`)).data;

/** Correção manual de horário/ponto pela agência. */
export interface TimesheetShiftPatch {
  shiftId: string;
  startTime?: string; // ISO — turno ainda pendente
  endTime?: string; // ISO
  checkInAt?: string; // ISO — turno iniciado
  checkOutAt?: string; // ISO
  breaks?: { startAt: string; endAt: string }[];
}
export const correctJobTimesheet = async (
  id: string,
  payload: { reason?: string; shifts: TimesheetShiftPatch[] }
): Promise<Job> => (await api.put(`/agency/jobs/${id}/timesheet`, payload)).data;

/** Duração total de pausa (minutos) dos turnos de uma vaga. */
export const totalBreakMinutes = (shifts?: JobShift[] | null): number =>
  (shifts ?? []).reduce(
    (acc, s) =>
      acc +
      (s.breaks ?? []).reduce(
        (a, b) =>
          b.endAt ? a + Math.round((new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 60000) : a,
        0
      ),
    0
  );

/** Há uma pausa aberta (sem fim) em algum turno da vaga? */
export const hasOpenBreak = (shifts?: JobShift[] | null): boolean =>
  (shifts ?? []).some((s) => (s.breaks ?? []).some((b) => !b.endAt));

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

/** Vaga ainda disponível (pendente, sem colaborador) cuja data de execução já passou. */
export const isExpiredUnfilled = (
  j: Pick<Job, "status" | "freelancerId" | "startTime"> & { assignedFreelancer?: unknown | null }
): boolean => {
  if (!["pending", "awaiting_approval"].includes(j.status)) return false;
  if (j.freelancerId || j.assignedFreelancer) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(j.startTime).getTime() < startOfToday.getTime();
};

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
