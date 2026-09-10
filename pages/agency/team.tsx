import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import {
  getAgencyMembers, createAgencyMember, updateAgencyMember, setAgencyMemberScope,
  deactivateAgencyMember, AgencyMember, LeaderPayType, PAY_TYPE_LABELS,
} from "@/src/services/agencyMemberService";
import { createInvite } from "@/src/services/inviteService";
import TeamRolesManager from "@/src/components/TeamRolesManager";
import { getTeamRoles, TeamRole } from "@/src/services/teamRoleService";
import { getMyFreelancers, AgencyFreelancer } from "@/src/services/agencyService";
import { getBranches, Branch } from "@/src/services/branchService";
import { getSupermarkets, Supermarket } from "@/src/services/supermarketService";
import { useAuth } from "@/src/hooks/useAuth";

const PAY_TYPES: LeaderPayType[] = ["hora", "diaria", "mensal", "por_colaborador"];

const PAY_TYPE_HINT: Record<LeaderPayType, string> = {
  hora: "Valor por hora — o crédito é lançado manualmente pela agência.",
  diaria: "Valor por diária — o crédito é lançado manualmente pela agência.",
  mensal: "Valor mensal fixo — o crédito é lançado manualmente pela agência.",
  por_colaborador:
    "Sem salário fixo: o líder ganha este valor por cada vaga concluída por um colaborador do grupo dele. O crédito entra sozinho na carteira quando o colaborador cumpre a escala; se houver desistência, falta ou troca, fica aguardando a agência liberar em Pagamentos.",
};

function TeamPage() {
  const { profile } = useAuth();
  const agencyId = (profile as { id?: string } | null)?.id ?? "";
  const [members, setMembers] = useState<AgencyMember[]>([]);
  const [freelancers, setFreelancers] = useState<AgencyFreelancer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", payType: "mensal" as LeaderPayType, payAmount: "", teamRoleId: "" });
  const [createError, setCreateError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ payType: "mensal" as LeaderPayType, payAmount: "" });
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const [scopeMember, setScopeMember] = useState<AgencyMember | null>(null);
  const [scopeFreelancers, setScopeFreelancers] = useState<string[]>([]);
  const [scopeBranches, setScopeBranches] = useState<string[]>([]);
  const [scopeError, setScopeError] = useState<string | null>(null);

  const [payMember, setPayMember] = useState<AgencyMember | null>(null);
  const [payForm, setPayForm] = useState({ payType: "mensal" as LeaderPayType, payAmount: "" });
  const [payError, setPayError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [m, fl, b, sm, r] = await Promise.all([
      getAgencyMembers(),
      agencyId ? getMyFreelancers(agencyId) : Promise.resolve([]),
      getBranches().catch(() => []),
      getSupermarkets().catch(() => []),
      getTeamRoles().catch(() => []),
    ]);
    setMembers(m);
    setFreelancers(fl);
    setBranches(b);
    setSupermarkets(sm);
    setRoles(r);
  }, [agencyId]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const supermarketName = useMemo(() => {
    const map: Record<string, string> = {};
    supermarkets.forEach((s) => { map[s.id] = s.name; });
    return (id: string) => map[id] ?? "—";
  }, [supermarkets]);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const submitCreate = async () => {
    setCreateError(null);
    const amount = Number(form.payAmount);
    if (!form.name || !form.email || !form.password) { setCreateError("Preencha nome, e-mail e senha."); return; }
    if (!(amount > 0)) { setCreateError("Informe o valor de pagamento do líder."); return; }
    try {
      await createAgencyMember({
        name: form.name, email: form.email, password: form.password, phone: form.phone || undefined,
        payType: form.payType, payAmount: amount, teamRoleId: form.teamRoleId || null,
      });
      setCreateOpen(false);
      setForm({ name: "", email: "", password: "", phone: "", payType: "mensal", payAmount: "", teamRoleId: "" });
      setMsg({ type: "success", text: "Líder cadastrado." });
      await load();
    } catch (err) {
      setCreateError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  const openInvite = () => {
    setInviteForm({ payType: "mensal", payAmount: "" });
    setInviteLink(null);
    setInviteError(null);
    setInviteCopied(false);
    setInviteOpen(true);
  };

  const generateInvite = async () => {
    setInviteError(null);
    const amount = Number(inviteForm.payAmount);
    if (!(amount > 0)) { setInviteError("Informe o valor de pagamento do líder."); return; }
    try {
      const { token } = await createInvite("leader", { payType: inviteForm.payType, payAmount: amount });
      setInviteLink(`${window.location.origin}/invite/${token}`);
    } catch (err) {
      setInviteError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao gerar convite." : "Erro ao gerar convite.");
    }
  };

  const copyInvite = async () => {
    if (!inviteLink) return;
    try { await navigator.clipboard.writeText(inviteLink); setInviteCopied(true); } catch { /* ignore */ }
  };

  const openScope = (m: AgencyMember) => {
    setScopeMember(m);
    setScopeFreelancers(m.scope.freelancerIds);
    setScopeBranches(m.scope.branchIds);
    setScopeError(null);
  };

  const saveScope = async () => {
    if (!scopeMember) return;
    setScopeError(null);
    try {
      await setAgencyMemberScope(scopeMember.id, { freelancerIds: scopeFreelancers, branchIds: scopeBranches });
      setScopeMember(null);
      await load();
    } catch (err) {
      setScopeError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  const openPay = (m: AgencyMember) => {
    setPayMember(m);
    setPayForm({ payType: m.payType ?? "mensal", payAmount: m.payAmount != null ? String(m.payAmount) : "" });
    setPayError(null);
  };

  const savePay = async () => {
    if (!payMember) return;
    setPayError(null);
    const amount = Number(payForm.payAmount);
    if (!(amount > 0)) { setPayError("Informe o valor."); return; }
    try {
      await updateAgencyMember(payMember.id, { payType: payForm.payType, payAmount: amount });
      setPayMember(null);
      await load();
    } catch (err) {
      setPayError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  const toggleActive = async (m: AgencyMember) => {
    try {
      if (m.active) {
        if (!confirm(`Desativar o acesso de ${m.name}? O histórico e a carteira são mantidos.`)) return;
        await deactivateAgencyMember(m.id);
      } else {
        await updateAgencyMember(m.id, { active: true });
      }
      await load();
    } catch (err) {
      alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  return (
    <>
      <Head><title>Equipe | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>Líderes da agência</h1>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className={panel.ghostBtn} onClick={() => setRolesOpen(true)}>Cargos</button>
              <button className={panel.ghostBtn} onClick={openInvite}>Convidar líder</button>
              <button className={panel.primaryBtn} onClick={() => { setCreateError(null); setCreateOpen(true); }}>
                Cadastrar líder
              </button>
            </div>
          </header>
          <p className={panel.muted}>
            Líderes gerenciam vagas e colaboradores. Eles <strong>não</strong> acessam faturamento,
            fechamentos, pagamentos, o saldo da agência nem os valores que a agência cobra dos
            supermercados. Sem escopo definido, o líder enxerga a rede toda.
          </p>
          {msg && <p className={msg.type === "error" ? panel.error : panel.success}>{msg.text}</p>}

          <div style={{ overflowX: "auto" }}>
            <table className={panel.table}>
              <thead>
                <tr><th>Nome</th><th>Cargo</th><th>E-mail</th><th>Pagamento</th><th>Carteira</th><th>Escopo</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name ?? "—"}</td>
                    <td>
                      <select
                        value={m.teamRoleId ?? ""}
                        onChange={async (e) => {
                          try { await updateAgencyMember(m.id, { teamRoleId: e.target.value || null }); await load(); }
                          catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
                        }}
                      >
                        <option value="">— sem cargo —</option>
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td>{m.email ?? "—"}</td>
                    <td>{m.payType ? `${PAY_TYPE_LABELS[m.payType]} · R$ ${Number(m.payAmount ?? 0).toFixed(2)}` : "—"}</td>
                    <td>R$ {Number(m.availableBalance).toFixed(2)}</td>
                    <td>
                      {m.scope.freelancerIds.length === 0 && m.scope.branchIds.length === 0 ? (
                        <span className={panel.muted}>rede toda</span>
                      ) : (
                        <span>
                          {m.scope.freelancerIds.length} colaborador(es) · {m.scope.branchIds.length} filial(is)
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`${panel.badge} ${m.active ? "" : panel.badgeCanceled}`}>
                        {m.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <button className={panel.ghostBtn} onClick={() => openScope(m)}>Escopo</button>
                      <button className={panel.ghostBtn} onClick={() => openPay(m)}>Pagamento</button>
                      <button className={panel.secondaryBtn} onClick={() => toggleActive(m)}>
                        {m.active ? "Desativar" : "Reativar"}
                      </button>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && <tr><td colSpan={8} className={panel.muted}>Nenhum líder cadastrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {createOpen && (
        <Modal title="Cadastrar líder" onClose={() => setCreateOpen(false)}>
          <div className={panel.form}>
            <label>Nome</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label>E-mail</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label>Senha de acesso</label>
            <input type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <label>Telefone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <label>Cargo na equipe</label>
            <select value={form.teamRoleId} onChange={(e) => setForm({ ...form, teamRoleId: e.target.value })}>
              <option value="">— sem cargo —</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <label>Forma de pagamento do líder</label>
            <select value={form.payType} onChange={(e) => setForm({ ...form, payType: e.target.value as LeaderPayType })}>
              {PAY_TYPES.map((t) => <option key={t} value={t}>{PAY_TYPE_LABELS[t]}</option>)}
            </select>
            <p className={panel.muted} style={{ fontSize: "0.8rem" }}>{PAY_TYPE_HINT[form.payType]}</p>
            <label>{form.payType === "por_colaborador" ? "Valor por colaborador que trabalhou (R$)" : "Valor (R$)"}</label>
            <input type="number" min="0.01" step="0.01" value={form.payAmount} onChange={(e) => setForm({ ...form, payAmount: e.target.value })} />
            {createError && <p className={panel.error}>{createError}</p>}
            <button className={panel.primaryBtn} onClick={submitCreate}>Cadastrar</button>
          </div>
        </Modal>
      )}

      {inviteOpen && (
        <Modal title="Convidar líder" onClose={() => setInviteOpen(false)}>
          <div className={panel.form}>
            <p className={panel.muted}>
              Defina o pagamento do líder e gere o link. Ao se cadastrar, ele já entra vinculado à sua
              agência. O escopo (colaboradores/filiais) você define depois, aqui na tela.
            </p>
            <label>Forma de pagamento</label>
            <select value={inviteForm.payType} onChange={(e) => setInviteForm({ ...inviteForm, payType: e.target.value as LeaderPayType })}>
              {PAY_TYPES.map((t) => <option key={t} value={t}>{PAY_TYPE_LABELS[t]}</option>)}
            </select>
            <p className={panel.muted} style={{ fontSize: "0.8rem" }}>{PAY_TYPE_HINT[inviteForm.payType]}</p>
            <label>{inviteForm.payType === "por_colaborador" ? "Valor por colaborador que trabalhou (R$)" : "Valor (R$)"}</label>
            <input type="number" min="0.01" step="0.01" value={inviteForm.payAmount} onChange={(e) => setInviteForm({ ...inviteForm, payAmount: e.target.value })} />
            {inviteError && <p className={panel.error}>{inviteError}</p>}
            {!inviteLink ? (
              <button className={panel.primaryBtn} onClick={generateInvite}>Gerar link</button>
            ) : (
              <>
                <input readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
                <button className={panel.primaryBtn} onClick={copyInvite}>{inviteCopied ? "Copiado!" : "Copiar link"}</button>
              </>
            )}
          </div>
        </Modal>
      )}

      {scopeMember && (
        <Modal title={`Escopo — ${scopeMember.name ?? ""}`} onClose={() => setScopeMember(null)}>
          <div className={panel.form}>
            <p className={panel.muted}>
              Marque os colaboradores e/ou as filiais que este líder pode gerenciar. Deixe tudo
              desmarcado para dar acesso à rede toda.
            </p>
            <label>Colaboradores</label>
            <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: 8 }}>
              {freelancers.map((f) => (
                <label key={f.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={scopeFreelancers.includes(f.id)}
                    onChange={() => setScopeFreelancers((cur) => toggle(cur, f.id))}
                  />
                  {f.name}
                </label>
              ))}
              {freelancers.length === 0 && <span className={panel.muted}>Nenhum colaborador.</span>}
            </div>
            <label>Filiais</label>
            <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: 8 }}>
              {branches.map((b) => (
                <label key={b.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={scopeBranches.includes(b.id)}
                    onChange={() => setScopeBranches((cur) => toggle(cur, b.id))}
                  />
                  {b.name} <span className={panel.muted}>· {supermarketName(b.supermarketId)}</span>
                </label>
              ))}
              {branches.length === 0 && <span className={panel.muted}>Nenhuma filial.</span>}
            </div>
            {scopeError && <p className={panel.error}>{scopeError}</p>}
            <button className={panel.primaryBtn} onClick={saveScope}>Salvar escopo</button>
          </div>
        </Modal>
      )}

      {payMember && (
        <Modal title={`Pagamento — ${payMember.name ?? ""}`} onClose={() => setPayMember(null)}>
          <div className={panel.form}>
            <label>Forma de pagamento</label>
            <select value={payForm.payType} onChange={(e) => setPayForm({ ...payForm, payType: e.target.value as LeaderPayType })}>
              {PAY_TYPES.map((t) => <option key={t} value={t}>{PAY_TYPE_LABELS[t]}</option>)}
            </select>
            <p className={panel.muted} style={{ fontSize: "0.8rem" }}>{PAY_TYPE_HINT[payForm.payType]}</p>
            <label>{payForm.payType === "por_colaborador" ? "Valor por colaborador que trabalhou (R$)" : "Valor (R$)"}</label>
            <input type="number" min="0.01" step="0.01" value={payForm.payAmount} onChange={(e) => setPayForm({ ...payForm, payAmount: e.target.value })} />
            <p className={panel.muted} style={{ fontSize: "0.8rem" }}>
              {payForm.payType === "por_colaborador"
                ? "Vale para as vagas concluídas a partir de agora. Você pode ajustar este valor quando quiser."
                : "Para creditar a carteira do líder, use “Pagamento a líderes” na tela de Pagamentos."}
            </p>
            {payError && <p className={panel.error}>{payError}</p>}
            <button className={panel.primaryBtn} onClick={savePay}>Salvar</button>
          </div>
        </Modal>
      )}

      {rolesOpen && (
        <TeamRolesManager roles={roles} onClose={() => setRolesOpen(false)} onChange={load} />
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="agency">
      <TeamPage />
    </RequireAuth>
  );
}
