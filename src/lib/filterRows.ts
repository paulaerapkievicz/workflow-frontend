// Filtro genérico client-side para as tabelas de Vagas e Pagamentos.
import { isoDateBR } from "@/src/lib/datetime";

export interface RowFilter {
  status?: string;
  freelancer?: string;
  branch?: string;
  title?: string;
  category?: string;
  date?: string; // YYYY-MM-DD
}

export interface FilterableRow {
  status?: string | null;
  freelancerName?: string | null;
  branchName?: string | null;
  title?: string | null;
  categoryName?: string | null;
  date?: string | null; // ISO
}

const norm = (v?: string | null) => (v ?? "").toLowerCase().trim();

export function matchesFilter(row: FilterableRow, f: RowFilter): boolean {
  if (f.status && row.status !== f.status) return false;
  if (f.freelancer && !norm(row.freelancerName).includes(norm(f.freelancer))) return false;
  if (f.branch && !norm(row.branchName).includes(norm(f.branch))) return false;
  if (f.title && !norm(row.title).includes(norm(f.title))) return false;
  if (f.category && !norm(row.categoryName).includes(norm(f.category))) return false;
  if (f.date && isoDateBR(row.date) !== f.date) return false;
  return true;
}

export const EMPTY_FILTER: RowFilter = {};
