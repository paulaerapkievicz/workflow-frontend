import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function getSupermarketDashboard() {
  try {
    const response = await axios.get(`${API_URL}/dashboard/supermarket`);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    throw error;
  }
}
