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

export const getFreelancerReviews = async (freelancerId: string): Promise<Review[]> =>
  (await api.get(`/freelancers/${freelancerId}/reviews`)).data;

export const getJobReview = async (jobId: string): Promise<Review | null> =>
  (await api.get(`/jobs/${jobId}/review`)).data;
