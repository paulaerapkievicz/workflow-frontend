import { useState } from "react";
import axios from "axios";
import Modal from "@/src/components/common/Modal";
import panel from "@/styles/panel.module.scss";
import {
  TeamRole, createTeamRole, updateTeamRole, deleteTeamRole,
} from "@/src/services/teamRoleService";

interface Props {
  roles: TeamRole[];
  onClose: () => void;
  /** Recarrega a lista no pai depois de qualquer alteração. */
  onChange: () => Promise<void> | void;
  /** Agência gerenciando a lista de um supermercado-cliente. */
  supermarketId?: string;
}

/** Gerencia a lista de cargos (tags) da equipe: adicionar, renomear, remover. */
export default function TeamRolesManager({ roles, onClose, onChange, supermarketId }: Props) {
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scope = supermarketId ? { supermarketId } : undefined;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChange();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    run(async () => {
      await createTeamRole(name, scope);
      setNewName("");
    });
  };

  const rename = (r: TeamRole, name: string) => {
    if (!name.trim() || name.trim() === r.name) return;
    run(() => updateTeamRole(r.id, { name: name.trim() }, scope));
  };

  const remove = (r: TeamRole) => {
    if (!confirm(`Remover o cargo "${r.name}"? Quem estiver com ele fica sem cargo.`)) return;
    run(() => deleteTeamRole(r.id, scope));
  };

  return (
    <Modal title="Cargos da equipe" onClose={onClose}>
      <div className={panel.form}>
        <p className={panel.muted}>
          Tags que descrevem a responsabilidade de cada pessoa na equipe. Você define a lista;
          cada cadastro escolhe um cargo.
        </p>

        <div style={{ display: "flex", gap: 6 }}>
          <input
            placeholder="Novo cargo (ex.: Supervisor)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button className={panel.primaryBtn} onClick={add} disabled={busy || !newName.trim()}>
            Adicionar
          </button>
        </div>

        {error && <p className={panel.error}>{error}</p>}

        <div style={{ overflowX: "auto" }}>
          <table className={panel.table}>
            <thead><tr><th>Cargo</th><th>Ações</th></tr></thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      defaultValue={r.name}
                      disabled={busy}
                      onBlur={(e) => rename(r, e.target.value)}
                    />
                  </td>
                  <td>
                    <button className={panel.secondaryBtn} disabled={busy} onClick={() => remove(r)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && <tr><td colSpan={2} className={panel.muted}>Nenhum cargo cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
