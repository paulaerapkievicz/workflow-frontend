import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/supermarket/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import BranchScopeField from "@/src/components/supermarket/BranchScopeField";
import TeamRolesManager from "@/src/components/TeamRolesManager";
import FormField from "@/src/components/FormField";
import { isValidEmail } from "@/src/lib/validators";
import panel from "@/styles/panel.module.scss";
import {
  getMembers, addMember, updateMember, deleteMember, SupermarketMember,
} from "@/src/services/supermarketService";
import { getTeamRoles, TeamRole } from "@/src/services/teamRoleService";
import { getBranchesBySupermarket, Branch } from "@/src/services/branchService";
import { useAuth } from "@/src/hooks/useAuth";
import type { SupermarketMembership } from "@/src/services/authService";

const emptyForm = {
  name: "", email: "", password: "", branchIds: [] as string[], teamRoleId: "",
  canSubmitOrders: true, canApproveOrders: false, canViewInvoices: false, canPayInvoices: false,
};

function TeamPage() {
  const { profile } = useAuth();
  const supermarketId = (profile as { id?: string } | null)?.id ?? "";
  const membership = (profile as { membership?: SupermarketMembership } | null)?.membership ?? null;
  const isOwner = membership?.isOwner ?? false;

  const [members, setMembers] = useState<SupermarketMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState<string | null>(null);
  const [scopeOf, setScopeOf] = useState<SupermarketMember | null>(null);
  const [scopeDraft, setScopeDraft] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!supermarketId) return;
    const [m, b, r] = await Promise.all([
      getMembers(supermarketId),
      getBranchesBySupermarket(supermarketId),
      getTeamRoles().catch(() => []),
    ]);
    setMembers(m);
    setBranches(b);
    setRoles(r);
  }, [supermarketId]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const save = async () => {
    setError(null);
    if (!isValidEmail(form.email)) {
      setError("Informe um e-mail válido para o gerente.");
      return;
    }
    try {
      await addMember(supermarketId, {
        name: form.name,
        email: form.email,
        password: form.password,
        branchIds: form.branchIds,
        teamRoleId: form.teamRoleId || null,
        canSubmitOrders: form.canSubmitOrders,
        canApproveOrders: form.canApproveOrders,
        canViewInvoices: form.canViewInvoices,
        canPayInvoices: form.canPayInvoices,
      });
      setOpen(false);
      setForm({ ...emptyForm });
      await load();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  const patch = async (m: SupermarketMember, p: Parameters<typeof updateMember>[1]) => {
    try { await updateMember(m.id, p); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  // Ver/pagar são coerentes: ligar "paga" liga "vê"; desligar "vê" desliga "paga".
  const setView = (m: SupermarketMember, on: boolean) =>
    patch(m, on ? { canViewInvoices: true } : { canViewInvoices: false, canPayInvoices: false });
  const setPay = (m: SupermarketMember, on: boolean) =>
    patch(m, on ? { canViewInvoices: true, canPayInvoices: true } : { canPayInvoices: false });

  const openScope = (m: SupermarketMember) => { setScopeOf(m); setScopeDraft(m.branchIds ?? []); };
  const saveScope = async () => {
    if (!scopeOf) return;
    await patch(scopeOf, { branchIds: scopeDraft });
    setScopeOf(null);
  };

  const remove = async (m: SupermarketMember) => {
    if (!confirm(`Remover ${m.memberUser?.name ?? "este gerente"}?`)) return;
    try { await deleteMember(m.id); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  const scopeLabel = (m: SupermarketMember) => {
    if (m.isOwner || !m.branchIds?.length) return "Rede toda";
    if (m.memberBranches?.length) return m.memberBranches.map((b) => b.name).join(", ");
    return `${m.branchIds.length} loja(s)`;
  };

  return (
    <>
      <Head><title>Equipe | Supermercado</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>Equipe da rede</h1>
            {isOwner && (
              <div style={{ display: "flex", gap: 8 }}>
                <button className={panel.ghostBtn} onClick={() => setRolesOpen(true)}>Cargos</button>
                <button className={panel.primaryBtn} onClick={() => { setError(null); setForm({ ...emptyForm }); setOpen(true); }}>
                  Adicionar gerente
                </button>
              </div>
            )}
          </header>
          <p className={panel.muted}>
            Um gerente pode responder pela <strong>rede toda</strong> ou por <strong>uma ou mais
            filiais</strong>. Pedidos de quem não tem permissão de aprovação ficam
            <strong> aguardando aprovação</strong> de um aprovador da rede. <strong>Vê faturas</strong>
            libera o acesso ao Faturamento; <strong>Paga faturas</strong> permite, além de ver, pagar
            e contestar o fechamento mensal — quem vê não necessariamente paga. O responsável pela
            rede sempre vê e paga.
          </p>

          {!isOwner ? (
            <p className={panel.muted}>Somente o responsável pela rede gerencia a equipe.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className={panel.table}>
                <thead><tr>
                  <th>Nome</th><th>Cargo</th><th>E-mail</th><th>Lojas</th><th>Solicita</th><th>Aprova</th>
                  <th>Vê faturas</th><th>Paga faturas</th><th>Ações</th>
                </tr></thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>{m.memberUser?.name ?? "—"}</td>
                      <td>
                        <select
                          value={m.teamRoleId ?? ""}
                          onChange={(e) => patch(m, { teamRoleId: e.target.value || null })}
                        >
                          <option value="">— sem cargo —</option>
                          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </td>
                      <td>{m.memberUser?.email ?? "—"}</td>
                      <td>
                        {scopeLabel(m)}
                        {!m.isOwner && (
                          <button className={panel.ghostBtn} style={{ marginLeft: 6 }} onClick={() => openScope(m)}>Editar</button>
                        )}
                      </td>
                      <td>
                        <input type="checkbox" disabled={m.isOwner} checked={m.canSubmitOrders}
                          onChange={(e) => patch(m, { canSubmitOrders: e.target.checked })} />
                      </td>
                      <td>
                        <input type="checkbox" disabled={m.isOwner} checked={m.canApproveOrders}
                          onChange={(e) => patch(m, { canApproveOrders: e.target.checked })} />
                      </td>
                      <td>
                        <input type="checkbox" disabled={m.isOwner} checked={m.isOwner || m.canViewInvoices}
                          onChange={(e) => setView(m, e.target.checked)} />
                      </td>
                      <td>
                        <input type="checkbox" disabled={m.isOwner} checked={m.isOwner || m.canPayInvoices}
                          onChange={(e) => setPay(m, e.target.checked)} />
                      </td>
                      <td>
                        {!m.isOwner && <button className={panel.secondaryBtn} onClick={() => remove(m)}>Remover</button>}
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 && <tr><td colSpan={9}>Nenhum membro.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {open && (
        <Modal title="Adicionar gerente" onClose={() => setOpen(false)}>
          <div className={panel.form}>
            <label>Nome</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FormField label="E-mail" kind="email" required value={form.email}
              onChange={(v) => setForm({ ...form, email: v })} />
            <label>Senha de acesso</label>
            <input type="password" minLength={4} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <label>Cargo na equipe</label>
            <select value={form.teamRoleId} onChange={(e) => setForm({ ...form, teamRoleId: e.target.value })}>
              <option value="">— sem cargo —</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <label>Lojas do gerente</label>
            <BranchScopeField branches={branches} value={form.branchIds} onChange={(branchIds) => setForm({ ...form, branchIds })} />
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={form.canSubmitOrders} onChange={(e) => setForm({ ...form, canSubmitOrders: e.target.checked })} />
              Pode solicitar vagas
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={form.canApproveOrders} onChange={(e) => setForm({ ...form, canApproveOrders: e.target.checked })} />
              Pode aprovar pedidos (envia direto ao pool)
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={form.canViewInvoices}
                onChange={(e) => setForm({ ...form, canViewInvoices: e.target.checked, canPayInvoices: e.target.checked ? form.canPayInvoices : false })} />
              Pode ver as faturas da rede
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={form.canPayInvoices}
                onChange={(e) => setForm({ ...form, canPayInvoices: e.target.checked, canViewInvoices: e.target.checked ? true : form.canViewInvoices })} />
              Pode pagar e contestar as faturas
            </label>
            {error && <p className={panel.error}>{error}</p>}
            <button className={panel.primaryBtn} onClick={save} disabled={!form.name || !form.email || !form.password}>Salvar</button>
          </div>
        </Modal>
      )}

      {rolesOpen && (
        <TeamRolesManager roles={roles} onClose={() => setRolesOpen(false)} onChange={load} />
      )}

      {scopeOf && (
        <Modal title={`Lojas de ${scopeOf.memberUser?.name ?? "gerente"}`} onClose={() => setScopeOf(null)}>
          <div className={panel.form}>
            <p className={panel.muted}>Sem nenhuma filial marcada, o gerente responde pela rede toda.</p>
            <BranchScopeField branches={branches} value={scopeDraft} onChange={setScopeDraft} />
            <button className={panel.primaryBtn} onClick={saveScope}>Salvar</button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="supermarket">
      <TeamPage />
    </RequireAuth>
  );
}
