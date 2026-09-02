import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/supermarket/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import {
  getMembers, addMember, updateMember, deleteMember, SupermarketMember,
} from "@/src/services/supermarketService";
import { getBranchesBySupermarket, Branch } from "@/src/services/branchService";
import { useAuth } from "@/src/hooks/useAuth";
import type { SupermarketMembership } from "@/src/services/authService";

function TeamPage() {
  const { profile } = useAuth();
  const supermarketId = (profile as { id?: string } | null)?.id ?? "";
  const membership = (profile as { membership?: SupermarketMembership } | null)?.membership ?? null;
  const isOwner = membership?.isOwner ?? false;

  const [members, setMembers] = useState<SupermarketMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", branchId: "", canSubmitOrders: true, canApproveOrders: false,
  });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supermarketId) return;
    const [m, b] = await Promise.all([getMembers(supermarketId), getBranchesBySupermarket(supermarketId)]);
    setMembers(m);
    setBranches(b);
  }, [supermarketId]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const save = async () => {
    setError(null);
    try {
      await addMember(supermarketId, {
        name: form.name,
        email: form.email,
        password: form.password,
        branchId: form.branchId || null,
        canSubmitOrders: form.canSubmitOrders,
        canApproveOrders: form.canApproveOrders,
      });
      setOpen(false);
      setForm({ name: "", email: "", password: "", branchId: "", canSubmitOrders: true, canApproveOrders: false });
      await load();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  const patch = async (m: SupermarketMember, p: Partial<SupermarketMember>) => {
    try { await updateMember(m.id, p); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  const remove = async (m: SupermarketMember) => {
    if (!confirm(`Remover ${m.memberUser?.name ?? "este gerente"}?`)) return;
    try { await deleteMember(m.id); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
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
              <button className={panel.primaryBtn} onClick={() => { setError(null); setOpen(true); }}>
                Adicionar gerente
              </button>
            )}
          </header>
          <p className={panel.muted}>
            Cada gerente pode solicitar vagas para a sua loja. Pedidos de quem não tem permissão de
            aprovação ficam <strong>aguardando aprovação</strong> de um aprovador da rede.
          </p>

          {!isOwner ? (
            <p className={panel.muted}>Somente o responsável pela rede gerencia a equipe.</p>
          ) : (
            <table className={panel.table}>
              <thead><tr><th>Nome</th><th>E-mail</th><th>Loja</th><th>Solicita</th><th>Aprova</th><th>Ações</th></tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.memberUser?.name ?? "—"}{m.isOwner && <span className={panel.badge} style={{ marginLeft: 6 }}>dono</span>}</td>
                    <td>{m.memberUser?.email ?? "—"}</td>
                    <td>
                      {m.isOwner ? "Rede toda" : (
                        <select value={m.branchId ?? ""} onChange={(e) => patch(m, { branchId: e.target.value || null })}>
                          <option value="">Rede toda</option>
                          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
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
                      {!m.isOwner && <button className={panel.secondaryBtn} onClick={() => remove(m)}>Remover</button>}
                    </td>
                  </tr>
                ))}
                {members.length === 0 && <tr><td colSpan={6}>Nenhum membro.</td></tr>}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {open && (
        <Modal title="Adicionar gerente" onClose={() => setOpen(false)}>
          <div className={panel.form}>
            <label>Nome</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label>E-mail</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label>Senha de acesso</label>
            <input type="password" minLength={4} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <label>Loja</label>
            <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              <option value="">Rede toda</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={form.canSubmitOrders} onChange={(e) => setForm({ ...form, canSubmitOrders: e.target.checked })} />
              Pode solicitar vagas
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={form.canApproveOrders} onChange={(e) => setForm({ ...form, canApproveOrders: e.target.checked })} />
              Pode aprovar pedidos (envia direto ao pool)
            </label>
            {error && <p className={panel.error}>{error}</p>}
            <button className={panel.primaryBtn} onClick={save} disabled={!form.name || !form.email || !form.password}>Salvar</button>
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
