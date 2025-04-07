import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_BASEURL;

const api = axios.create({
  baseURL,
});

// // Interceptor para adicionar o token JWT
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem("token"); // Pegando do localStorage
//   if (token) {
//     config.   .Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

export default api;