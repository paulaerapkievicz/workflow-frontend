import api from "@/src/services/api";

export interface JobPhoto {
  id: string;
  jobId: string;
  freelancerId: string;
  url: string;
  caption?: string | null;
  createdAt: string;
}

export const getJobPhotos = async (jobId: string): Promise<JobPhoto[]> =>
  (await api.get(`/jobs/${jobId}/photos`)).data;

export const uploadJobPhoto = async (
  jobId: string,
  file: File,
  caption?: string
): Promise<JobPhoto> => {
  const form = new FormData();
  form.append("photo", file);
  if (caption) form.append("caption", caption);
  const { data } = await api.post(`/jobs/${jobId}/photos`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

// Monta a URL absoluta da imagem servida pelo backend.
export const photoUrl = (url: string) =>
  url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_BASEURL || "http://localhost:3333"}${url}`;
