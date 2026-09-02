import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_BASEURL || "http://localhost:3333";

const api = axios.create({ baseURL });

// Anexa o token JWT salvo no login.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Em 401, limpa a sessão e manda para a home.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      const p = window.location.pathname;
      const onAuthPage = p.startsWith("/login") || p.startsWith("/register") || p === "/";
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
      localStorage.removeItem("profileId");
      if (!onAuthPage) window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
