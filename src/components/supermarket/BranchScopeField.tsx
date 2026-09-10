import type { Branch } from "@/src/services/branchService";
import ScopePicker from "@/src/components/ScopePicker";

interface Props {
  branches: Branch[];
  /** [] = rede toda; com itens = restrito a essas filiais. */
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * Escopo de filial de um gerente: "rede toda" ou um conjunto de filiais.
 */
export default function BranchScopeField({ branches, value, onChange }: Props) {
  return (
    <ScopePicker
      items={branches.map((b) => ({ id: b.id, label: b.name }))}
      value={value}
      onChange={onChange}
      allLabel="Rede toda"
    />
  );
}
