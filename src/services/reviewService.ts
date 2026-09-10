import api from "@/src/services/api";

export interface Review {
  id: string;
  jobId: string;
  freelancerId: string;
  freelancerName?: string | null;
  rating: number;
  comment?: string | null;
  authorRole?: string | null;
  approved?: boolean | null;
  createdAt: string;
  jobTitle?: string | null;
  categoryName?: string | null;
  branchName?: string | null;
}

/** Linha da tela "Avaliações" da agência. */
export type AgencyReviewRow = Required<
  Pick<Review, "id" | "jobId" | "freelancerId" | "rating" | "createdAt">
> &
  Review;

export interface ReputationReview {
  id: string;
  rating: number;
  comment?: string | null;
  authorRole?: string | null;
  createdAt: string;
  jobTitle?: string | null;
  categoryName?: string | null;
  branchName?: string | null;
}

export interface FreelancerReputation {
  ratingAvg: number | null;
  ratingCount: number;
  completedJobs: number;
  workedMinutes: number;
  /** Só preenchido para agência/líder/admin; colaborador e supermercado recebem vazio. */
  reviews: ReputationReview[];
}

/** Todas as avaliações de um colaborador (agência/líder). */
export const getFreelancerReviews = async (freelancerId: string): Promise<Review[]> =>
  (await api.get(`/freelancers/${freelancerId}/reviews`)).data;

/** Avaliações de uma vaga (agência: todas; supermercado: só as que publicou). */
export const getJobReviews = async (jobId: string): Promise<Review[]> =>
  (await api.get(`/jobs/${jobId}/review`)).data;

/** Tela "Avaliações" da agência — todas as avaliações da rede, com filtro opcional. */
export const getAgencyReviews = async (
  params: { freelancerId?: string; jobId?: string } = {}
): Promise<AgencyReviewRow[]> =>
  (await api.get(`/agency/reviews`, { params })).data;

export const getFreelancerReputation = async (freelancerId: string): Promise<FreelancerReputation> =>
  (await api.get(`/freelancers/${freelancerId}/reputation`)).data;

/** Avaliação do colaborador pelo supermercado (cliente), numa vaga concluída. */
export const createSupermarketReview = async (
  jobId: string,
  payload: { rating: number; comment?: string }
): Promise<Review> =>
  (await api.post(`/jobs/${jobId}/review-by-supermarket`, payload)).data;
