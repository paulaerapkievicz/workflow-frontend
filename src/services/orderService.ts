import api from "@/src/services/api";
import type { Job } from "@/src/services/jobService";
import type { ShiftInput, ShiftPeriod } from "@/src/services/shifts";

export type OrderStatus = "open" | "in_progress" | "completed" | "canceled";
export type OrderApprovalStatus = "approved" | "pending_approval" | "rejected";

export interface OrderItemShift {
  shiftPeriod?: ShiftPeriod | null;
  startTime: string;
  endTime: string;
  label?: string | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  categoryId: string;
  branchId?: string | null;
  title: string;
  quantity: number;
  shiftPeriod?: ShiftPeriod | null;
  shifts: OrderItemShift[];
  itemCategory?: { id: string; name: string } | null;
  itemBranch?: { id: string; name: string } | null;
}

export interface Order {
  id: string;
  supermarketId: string;
  branchId: string;
  status: OrderStatus;
  approvalStatus: OrderApprovalStatus;
  rejectionReason?: string | null;
  submittedByUserId?: string | null;
  notes?: string | null;
  createdAt: string;
  items?: OrderItem[];
  orderJobs?: Job[];
  orderBranch?: { id: string; name: string } | null;
  orderSupermarket?: { id: string; name: string } | null;
}

/**
 * O supermercado informa: função, quantidade, data e um ou mais turnos
 * (cada turno com sua janela de horário).
 */
export interface OrderItemInput {
  categoryId: string;
  branchId: string;
  quantity: number;
  date: string; // YYYY-MM-DD
  shifts: ShiftInput[];
  title?: string;
}

export interface CreateOrderInput {
  /** Legado — cada item carrega a própria filial. */
  branchId?: string;
  notes?: string;
  items: OrderItemInput[];
}

export const getOrders = async (): Promise<Order[]> => (await api.get("/orders")).data;
export const getOrder = async (id: string): Promise<Order> => (await api.get(`/orders/${id}`)).data;

export const createOrder = async (input: CreateOrderInput): Promise<Order> =>
  (await api.post("/orders", input)).data;

/** Adiciona novas vagas a um pedido já enviado. */
export const addOrderItems = async (orderId: string, items: OrderItemInput[]): Promise<Order> =>
  (await api.post(`/orders/${orderId}/items`, { items })).data;

export const cancelOrder = async (id: string): Promise<Order> =>
  (await api.post(`/orders/${id}/cancel`)).data;

/** Aprovador libera o pedido — as vagas entram no pool. */
export const approveOrder = async (id: string): Promise<Order> =>
  (await api.post(`/orders/${id}/approve`)).data;

/** Aprovador recusa o pedido. */
export const rejectOrder = async (id: string, reason?: string): Promise<Order> =>
  (await api.post(`/orders/${id}/reject`, { reason })).data;

export const ORDER_APPROVAL_LABELS: Record<OrderApprovalStatus, string> = {
  approved: "Aprovado",
  pending_approval: "Aguardando aprovação",
  rejected: "Recusado",
};

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

/** Lista (sem repetição) das filiais de um pedido — um pedido pode ter várias lojas. */
export const orderBranchNames = (order: Order): string => {
  const fromJobs = (order.orderJobs ?? []).map((j) => j.jobBranch?.name).filter(Boolean) as string[];
  const fromItems = (order.items ?? []).map((i) => i.itemBranch?.name).filter(Boolean) as string[];
  const names = Array.from(new Set([...fromJobs, ...fromItems]));
  return names.length ? names.join(", ") : order.orderBranch?.name ?? "—";
};

/** Vaga que voltou a ficar disponível depois que alguém desistiu. */
export const jobWasAbandoned = (job: Job): boolean =>
  job.status === "pending" && (job.jobLogs ?? []).some((l) => l.eventType === "withdrawn");
