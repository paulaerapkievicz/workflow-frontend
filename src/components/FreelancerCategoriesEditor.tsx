import { useMemo, useState } from "react";
import panel from "@/styles/panel.module.scss";
import type { Category } from "@/src/services/categoryService";

interface Props {
  /** Funções ativas cadastradas pela agência (combo de seleção). */
  categories: Category[];
  /** IDs das funções já vinculadas ao colaborador. */
  addedIds: string[];
  /** Valor/hora digitado por função: { [categoryId]: "18.00" }. */
  rates: Record<string, string>;
  categoryName: (id: string) => string;
  onRateInput: (categoryId: string, value: string) => void;
  onAdd: (categoryId: string, value: string) => void | Promise<void>;
  onCommitRate: (categoryId: string, value: string) => void | Promise<void>;
  onRemove: (categoryId: string) => void | Promise<void>;
}

/**
 * Editor de funções do colaborador: combo com as funções ativas ainda não vinculadas
 * (escolhe a função + informa o valor/hora + Adicionar) e a lista das já vinculadas.
 */
export default function FreelancerCategoriesEditor({
  categories, addedIds, rates, categoryName, onRateInput, onAdd, onCommitRate, onRemove,
}: Props) {
  const [pick, setPick] = useState("");
  const [pickRate, setPickRate] = useState("");

  const available = useMemo(
    () => categories.filter((c) => c.active && !addedIds.includes(c.id)),
    [categories, addedIds]
  );

  const canAdd = !!pick && Number(pickRate) > 0;

  const add = async () => {
    if (!canAdd) return;
    await onAdd(pick, pickRate);
    setPick("");
    setPickRate("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap",
          padding: 10, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface-2)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "1 1 180px" }}>
          <label style={{ fontSize: "0.8rem" }}>Função</label>
          <select value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Selecione uma função…</option>
            {available.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, width: 120 }}>
          <label style={{ fontSize: "0.8rem" }}>Valor/hora (R$)</label>
          <input
            type="number" min="0.01" step="0.01" placeholder="R$/h"
            value={pickRate}
            onChange={(e) => setPickRate(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          />
        </div>
        <button type="button" className={panel.primaryBtn} disabled={!canAdd} onClick={add}>
          Adicionar
        </button>
        {available.length === 0 && (
          <span className={panel.muted} style={{ fontSize: "0.8rem", flexBasis: "100%" }}>
            {categories.length === 0
              ? "Nenhuma função ativa cadastrada. Cadastre em Funções."
              : "Todas as funções ativas já foram vinculadas."}
          </span>
        )}
      </div>

      {addedIds.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {addedIds.map((cid) => {
            const rateValue = rates[cid] ?? "";
            return (
              <div key={cid} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: "1 1 160px", minWidth: 120 }}>{categoryName(cid)}</span>
                <input
                  type="number" min="0.01" step="0.01" placeholder="R$/h"
                  style={{ width: 110 }}
                  value={rateValue}
                  onChange={(e) => onRateInput(cid, e.target.value)}
                  onBlur={(e) => onCommitRate(cid, e.target.value)}
                />
                <button type="button" className={panel.secondaryBtn} onClick={() => onRemove(cid)}>
                  Remover
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
