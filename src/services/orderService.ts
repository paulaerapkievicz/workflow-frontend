import api from "@/src/services/api";
import type { Job } from "@/src/services/jobService";

export type OrderStatus = "open" | "in_progress" | "completed" | "canceled";

export interface OrderItemShift {
  startTime: string;
  endTime: string;
  label?: string | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  categoryId: string;
  title: string;
  description?: string | null;
  quantity: number;
  photosRequired: boolean;
  agencyReviewEnabled: boolean;
  shifts: OrderItemShift[];
  itemCategory?: { id: string; name: string } | null;
}

export interface Order {
  id: string;
  supermarketId: string;
  branchId: string;
  status: OrderStatus;
  notes?: string | null;
  createdAt: string;
  items?: OrderItem[];
  orderJobs?: Job[];
  orderBranch?: { id: string; name: string } | null;
  orderSupermarket?: { id: string; name: string } | null;
}

export interface CreateOrderItemInput {
  categoryId: string;
  title: string;
  description?: string;
  quantity: number;
  photosRequired: boolean;
  agencyReviewEnabled: boolean;
  shifts: OrderItemShift[];
}

export interface CreateOrderInput {
  branchId: string;
  notes?: string;
  items: CreateOrderItemInput[];
}

export const getOrders = async (): Promise<Order[]> => (await api.get("/orders")).data;
export const getOrder = async (id: string): Promise<Order> => (await api.get(`/orders/${id}`)).data;
export const createOrder = async (input: CreateOrderInput): Promise<Order> =>
  (await api.post("/orders", input)).data;
export const cancelOrder = async (id: string): Promise<Order> =>
  (await api.post(`/orders/${id}/cancel`)).data;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  completed: "Concluído",
  canceled: "Cancelado",
};

export const orderProgress = (order: Order) => {
  const jobs = order.orderJobs ?? [];
  const total = jobs.filter((j) => j.status !== "canceled").length;
  const filled = jobs.filter((j) => ["accepted", "in_progress", "completed"].includes(j.status)).length;
  const done = jobs.filter((j) => j.status === "completed").length;
  return { total, filled, done };
};
