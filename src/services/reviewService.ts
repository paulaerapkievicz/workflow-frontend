import api from "@/src/services/api";

export interface Review {
  id: string;
  jobId: string;
  freelancerId: string;
  rating: number;
  comment?: string | null;
  authorRole?: string | null;
  approved?: boolean | null;
  createdAt: string;
}

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
  reviews: ReputationReview[];
}

export const getFreelancerReviews = async (freelancerId: string): Promise<Review[]> =>
  (await api.get(`/freelancers/${freelancerId}/reviews`)).data;

export const getJobReviews = async (jobId: string): Promise<Review[]> =>
  (await api.get(`/jobs/${jobId}/review`)).data;

export const getFreelancerReputation = async (freelancerId: string): Promise<FreelancerReputation> =>
  (await api.get(`/freelancers/${freelancerId}/reputation`)).data;

/** Avaliação do colaborador pelo supermercado (cliente), numa vaga concluída. */
export const createSupermarketReview = async (
  jobId: string,
  payload: { rating: number; comment?: string }
): Promise<Review> =>
  (await api.post(`/jobs/${jobId}/review-by-supermarket`, payload)).data;
