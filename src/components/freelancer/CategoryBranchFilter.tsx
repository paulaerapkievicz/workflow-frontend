import { useEffect, useState } from "react";
import panel from "@/styles/panel.module.scss";
import { getCategories, Category } from "@/src/services/categoryService";

export interface BranchOption {
  id: string;
  name: string;
}

interface Props {
  categoryId: string;
  onCategoryChange: (id: string) => void;
  branchId: string;
  onBranchChange: (id: string) => void;
  /** Lojas disponíveis — derivadas client-side dos itens já carregados (não existe listagem de filiais pro papel freelancer). */
  branches: BranchOption[];
}

/** Filtros de função + loja, reaproveitados no Dashboard, Meus Trabalhos, Relatório e Carteira do colaborador. */
export default function CategoryBranchFilter({ categoryId, onCategoryChange, branchId, onBranchChange, branches }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  return (
    <>
      <label className={panel.filterField}>
        <span>Função</span>
        <select value={categoryId} onChange={(e) => onCategoryChange(e.target.value)}>
          <option value="">Todas</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className={panel.filterField}>
        <span>Loja</span>
        <select value={branchId} onChange={(e) => onBranchChange(e.target.value)}>
          <option value="">Todas</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </label>
    </>
  );
}
