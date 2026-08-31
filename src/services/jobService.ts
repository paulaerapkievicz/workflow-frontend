import api from "@/src/services/api";

export type JobStatus = "pending" | "accepted" | "in_progress" | "completed" | "canceled";

export type JobShiftStatus = "pending" | "in_progress" | "done";

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
  startTime: string;
  endTime: string;
  paymentAmount?: number | null;
  grossAmount?: number | null;
  contractedMinutes?: number | null;
  workedMinutes?: number | null;
  completedAt?: string | null;
  orderId?: string | null;
  photosRequired: boolean;
  agencyReviewEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  shifts?: JobShift[];
  jobBranch?: { id: string; name: string; address?: string } | null;
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

export interface ShiftInput {
  startTime: string;
  endTime: string;
  label?: string;
}

export interface CreateJobInput {
  branchId: string;
  categoryId: string;
  title: string;
  description?: string;
  quantity?: number;
  photosRequired: boolean;
  agencyReviewEnabled: boolean;
  shifts: ShiftInput[];
}

export const getJobs = async (): Promise<Job[]> => (await api.get("/jobs")).data;
export const getAvailableJobs = async (): Promise<Job[]> => (await api.get("/jobs/available")).data;
export const getJob = async (id: string): Promise<Job> => (await api.get(`/jobs/${id}`)).data;

export const createJob = async (input: CreateJobInput): Promise<Job> =>
  (await api.post("/jobs", input)).data;

export const updateJob = async (id: string, input: Partial<CreateJobInput>): Promise<Job> =>
  (await api.put(`/jobs/${id}`, input)).data;

export const deleteJob = async (id: string): Promise<void> => {
  await api.delete(`/jobs/${id}`);
};

export const cancelJob = async (id: string): Promise<Job> =>
  (await api.post(`/jobs/${id}/cancel`)).data;

export const acceptJob = async (id: string): Promise<Job> =>
  (await api.post(`/jobs/${id}/accept`)).data;

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
export const registerInterval = async (id: string, eventType: "break-start" | "break-end") =>
  (await api.post(`/jobs/${id}/logs/interval`, { eventType })).data;

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

export const STATUS_LABELS: Record<JobStatus, string> = {
  pending: "Disponível",
  accepted: "Aceita",
  in_progress: "Em andamento",
  completed: "Concluída",
  canceled: "Cancelada",
};

export const formatShifts = (shifts?: JobShift[] | null): string => {
  if (!shifts?.length) return "—";
  const hhmm = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return [...shifts]
    .sort((a, b) => a.position - b.position)
    .map((s) => `${hhmm(s.startTime)}–${hhmm(s.endTime)}`)
    .join(", ");
};
