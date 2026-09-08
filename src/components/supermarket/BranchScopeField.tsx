import type { Branch } from "@/src/services/branchService";

interface Props {
  branches: Branch[];
  /** [] = rede toda; com itens = restrito a essas filiais. */
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * Escopo de filial de um gerente: "rede toda" ou um conjunto de filiais.
 * Marcar "Rede toda" limpa a seleção; marcar filiais desmarca "Rede toda".
 */
export default function BranchScopeField({ branches, value, onChange }: Props) {
  const all = value.length === 0;
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="checkbox" checked={all} onChange={() => onChange([])} />
        Rede toda
      </label>
      {branches.map((b) => (
        <label key={b.id} style={{ display: "flex", gap: 6, alignItems: "center", paddingLeft: 16 }}>
          <input type="checkbox" checked={value.includes(b.id)} onChange={() => toggle(b.id)} />
          {b.name}
        </label>
      ))}
    </div>
  );
}
