import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import RequirePermission from "@/src/components/RequirePermission";
import panel from "@/styles/panel.module.scss";
import {
  getAgencyMembers, createAgencyMember, updateAgencyMember, setAgencyMemberScope,
  deactivateAgencyMember, resetAgencyMemberPassword, AgencyMember, LeaderPayType, PAY_TYPE_LABELS,
} from "@/src/services/agencyMemberService";
import {
  getAgencyPartners, createAgencyPartner, updateAgencyPartner, deactivateAgencyPartner,
  resetAgencyPartnerPassword, AgencyPartner, AgencyPartnerPermissions, AGENCY_PARTNER_FEATURES,
  AGENCY_PARTNER_FEATURE_LABELS,
} from "@/src/services/agencyPartnerService";
import ResetPasswordAction from "@/src/components/ResetPasswordAction";
import { createInvite } from "@/src/services/inviteService";
import TeamRolesManager from "@/src/components/TeamRolesManager";
import ScopePicker from "@/src/components/ScopePicker";
import FormField from "@/src/components/FormField";
import Switch from "@/src/components/common/Switch";
import { validateForm } from "@/src/lib/validators";
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

  const [partners, setPartners] = useState<AgencyPartner[]>([]);
  const [partnerCreateOpen, setPartnerCreateOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState({ name: "", email: "", password: "", phone: "", teamRoleId: "" });
  const [partnerCreateError, setPartnerCreateError] = useState<string | null>(null);

  const [partnerInviteOpen, setPartnerInviteOpen] = useState(false);
  const [partnerInviteLink, setPartnerInviteLink] = useState<string | null>(null);
  const [partnerInviteError, setPartnerInviteError] = useState<string | null>(null);
  const [partnerInviteCopied, setPartnerInviteCopied] = useState(false);

  const [permMember, setPermMember] = useState<AgencyPartner | null>(null);
  const [permDraft, setPermDraft] = useState<AgencyPartnerPermissions | null>(null);
  const [permError, setPermError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [m, fl, b, sm, r, p] = await Promise.all([
      getAgencyMembers(),
      agencyId ? getMyFreelancers(agencyId) : Promise.resolve([]),
      getBranches().catch(() => []),
      getSupermarkets().catch(() => []),
      getTeamRoles().catch(() => []),
      getAgencyPartners().catch(() => []),
    ]);
    setMembers(m);
    setFreelancers(fl);
    setBranches(b);
    setSupermarkets(sm);
    setRoles(r);
    setPartners(p);
  }, [agencyId]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const supermarketName = useMemo(() => {
    const map: Record<string, string> = {};
    supermarkets.forEach((s) => { map[s.id] = s.name; });
    return (id: string) => map[id] ?? "—";
  }, [supermarkets]);

  const submitCreate = async () => {
    setCreateError(null);
    const amount = Number(form.payAmount);
    if (!form.name || !form.email || !form.password) { setCreateError("Preencha nome, e-mail e senha."); return; }
    if (!(amount > 0)) { setCreateError("Informe o valor de pagamento do líder."); return; }
    const errs = validateForm([
      { name: "email", value: form.email, kind: "email", required: true },
      { name: "phone", value: form.phone, kind: "phone" },
    ]);
    if (Object.keys(errs).length) { setCreateError("Confira o e-mail e o telefone."); return; }
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

  const submitCreatePartner = async () => {
    setPartnerCreateError(null);
    if (!partnerForm.name || !partnerForm.email || !partnerForm.password) {
      setPartnerCreateError("Preencha nome, e-mail e senha.");
      return;
    }
    const errs = validateForm([
      { name: "email", value: partnerForm.email, kind: "email", required: true },
      { name: "phone", value: partnerForm.phone, kind: "phone" },
    ]);
    if (Object.keys(errs).length) { setPartnerCreateError("Confira o e-mail e o telefone."); return; }
    try {
      await createAgencyPartner({
        name: partnerForm.name, email: partnerForm.email, password: partnerForm.password,
        phone: partnerForm.phone || undefined, teamRoleId: partnerForm.teamRoleId || null,
      });
      setPartnerCreateOpen(false);
      setPartnerForm({ name: "", email: "", password: "", phone: "", teamRoleId: "" });
      setMsg({ type: "success", text: "Sócio cadastrado com acesso total — ajuste as permissões se quiser." });
      await load();
    } catch (err) {
      setPartnerCreateError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  const openInvitePartner = () => {
    setPartnerInviteLink(null);
    setPartnerInviteError(null);
    setPartnerInviteCopied(false);
    setPartnerInviteOpen(true);
  };

  const generateInvitePartner = async () => {
    setPartnerInviteError(null);
    try {
      const { token } = await createInvite("partner");
      setPartnerInviteLink(`${window.location.origin}/invite/${token}`);
    } catch (err) {
      setPartnerInviteError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao gerar convite." : "Erro ao gerar convite.");
    }
  };

  const copyInvitePartner = async () => {
    if (!partnerInviteLink) return;
    try { await navigator.clipboard.writeText(partnerInviteLink); setPartnerInviteCopied(true); } catch { /* ignore */ }
  };

  const openPermissions = (p: AgencyPartner) => {
    setPermMember(p);
    setPermDraft({ ...p.permissions });
    setPermError(null);
  };

  const savePermissions = async () => {
    if (!permMember || !permDraft) return;
    setPermError(null);
    try {
      await updateAgencyPartner(permMember.id, { permissions: permDraft });
      setPermMember(null);
      await load();
    } catch (err) {
      setPermError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  const togglePartnerActive = async (p: AgencyPartner) => {
    try {
      if (p.active) {
        if (!confirm(`Desativar o acesso de ${p.name}?`)) return;
        await deactivateAgencyPartner(p.id);
      } else {
        await updateAgencyPartner(p.id, { active: true });
      }
      await load();
    } catch (err) {
      alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  const permissionSummary = (p: AgencyPartner) => {
    const off = AGENCY_PARTNER_FEATURES.filter((f) => !p.permissions[f]);
    if (off.length === 0) return "Acesso total";
    return `Sem: ${off.map((f) => AGENCY_PARTNER_FEATURE_LABELS[f]).join(", ")}`;
  };

  return (
    <>
      <Head><title>Equipe | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <h1 style={{ margin: 0 }}>Equipe da agência</h1>
          <p className={panel.muted} style={{ marginTop: "-0.5rem" }}>
            Todos os perfis com acesso ao painel da agência, além do seu, ficam centralizados
            aqui: <strong>líderes</strong> (poderes operacionais fixos, sem financeiro) e{" "}
            <strong>sócios</strong> (acesso amplo e configurável por área).
          </p>

          <header className={panel.header}>
            <h1 style={{ fontSize: "1.15rem" }}>Líderes</h1>
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
                    <td className={panel.actionsStack}>
                      <button className={panel.ghostBtn} onClick={() => openScope(m)}>Escopo</button>
                      <button className={panel.ghostBtn} onClick={() => openPay(m)}>Pagamento</button>
                      <ResetPasswordAction label={m.name ?? "este líder"} onReset={() => resetAgencyMemberPassword(m.id)} />
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

          <header className={panel.header} style={{ marginTop: "1rem" }}>
            <h1 style={{ fontSize: "1.15rem" }}>Sócios</h1>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className={panel.ghostBtn} onClick={openInvitePartner}>Convidar sócio</button>
              <button className={panel.primaryBtn} onClick={() => { setPartnerCreateError(null); setPartnerCreateOpen(true); }}>
                Cadastrar sócio
              </button>
            </div>
          </header>
          <p className={panel.muted}>
            Sócio nasce com <strong>acesso total</strong> ao painel da agência — mesmas telas do
            dono. Restrinja por área quando quiser em &quot;Permissões&quot;. Só o dono da agência
            gerencia sócios (nem outro sócio pode).
          </p>

          <div style={{ overflowX: "auto" }}>
            <table className={panel.table}>
              <thead>
                <tr><th>Nome</th><th>Cargo</th><th>E-mail</th><th>Permissões</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name ?? "—"}</td>
                    <td>
                      <select
                        value={p.teamRoleId ?? ""}
                        onChange={async (e) => {
                          try { await updateAgencyPartner(p.id, { teamRoleId: e.target.value || null }); await load(); }
                          catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
                        }}
                      >
                        <option value="">— sem cargo —</option>
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td>{p.email ?? "—"}</td>
                    <td>{permissionSummary(p)}</td>
                    <td>
                      <span className={`${panel.badge} ${p.active ? "" : panel.badgeCanceled}`}>
                        {p.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className={panel.actionsStack}>
                      <button className={panel.ghostBtn} onClick={() => openPermissions(p)}>Permissões</button>
                      <ResetPasswordAction label={p.name ?? "este sócio"} onReset={() => resetAgencyPartnerPassword(p.id)} />
                      <button className={panel.secondaryBtn} onClick={() => togglePartnerActive(p)}>
                        {p.active ? "Desativar" : "Reativar"}
                      </button>
                    </td>
                  </tr>
                ))}
                {partners.length === 0 && <tr><td colSpan={6} className={panel.muted}>Nenhum sócio cadastrado.</td></tr>}
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
            <FormField label="E-mail" kind="email" required value={form.email}
              onChange={(v) => setForm({ ...form, email: v })} />
            <label>Senha de acesso</label>
            <input type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <FormField label="Telefone" kind="phone" placeholder="(00) 00000-0000" value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })} />
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
              desmarcado para dar acesso à rede toda. As duas dimensões são independentes.
            </p>
            <label>Colaboradores</label>
            <ScopePicker
              items={freelancers.map((f) => ({ id: f.id, label: f.name }))}
              value={scopeFreelancers}
              onChange={setScopeFreelancers}
              allLabel="Todos os colaboradores"
            />
            <label>Filiais</label>
            <ScopePicker
              items={branches.map((b) => ({ id: b.id, label: b.name, sublabel: supermarketName(b.supermarketId) }))}
              value={scopeBranches}
              onChange={setScopeBranches}
              allLabel="Todas as filiais"
            />
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

      {partnerCreateOpen && (
        <Modal title="Cadastrar sócio" onClose={() => setPartnerCreateOpen(false)}>
          <div className={panel.form}>
            <label>Nome</label>
            <input value={partnerForm.name} onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })} />
            <FormField label="E-mail" kind="email" required value={partnerForm.email}
              onChange={(v) => setPartnerForm({ ...partnerForm, email: v })} />
            <label>Senha de acesso</label>
            <input type="password" minLength={6} value={partnerForm.password} onChange={(e) => setPartnerForm({ ...partnerForm, password: e.target.value })} />
            <FormField label="Telefone" kind="phone" placeholder="(00) 00000-0000" value={partnerForm.phone}
              onChange={(v) => setPartnerForm({ ...partnerForm, phone: v })} />
            <label>Cargo na equipe</label>
            <select value={partnerForm.teamRoleId} onChange={(e) => setPartnerForm({ ...partnerForm, teamRoleId: e.target.value })}>
              <option value="">— sem cargo —</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <p className={panel.muted} style={{ fontSize: "0.8rem" }}>
              Nasce com acesso total às telas da agência. Ajuste as permissões depois, se quiser.
            </p>
            {partnerCreateError && <p className={panel.error}>{partnerCreateError}</p>}
            <button className={panel.primaryBtn} onClick={submitCreatePartner}>Cadastrar</button>
          </div>
        </Modal>
      )}

      {partnerInviteOpen && (
        <Modal title="Convidar sócio" onClose={() => setPartnerInviteOpen(false)}>
          <div className={panel.form}>
            <p className={panel.muted}>
              Gere o link e envie pro sócio (WhatsApp, e-mail…). Ao se cadastrar, ele já entra com
              acesso total ao painel da agência — ajuste as permissões depois, aqui na tela.
            </p>
            {partnerInviteError && <p className={panel.error}>{partnerInviteError}</p>}
            {!partnerInviteLink ? (
              <button className={panel.primaryBtn} onClick={generateInvitePartner}>Gerar link</button>
            ) : (
              <>
                <input readOnly value={partnerInviteLink} onFocus={(e) => e.target.select()} />
                <button className={panel.primaryBtn} onClick={copyInvitePartner}>{partnerInviteCopied ? "Copiado!" : "Copiar link"}</button>
              </>
            )}
          </div>
        </Modal>
      )}

      {permMember && permDraft && (
        <Modal title={`Permissões — ${permMember.name ?? ""}`} onClose={() => setPermMember(null)}>
          <div className={panel.form}>
            <p className={panel.muted}>
              Áreas do painel que este sócio pode acessar. Desligar uma área bloqueia as telas e
              rotas dela — inclusive se ele tentar acessar direto pelo link.
            </p>
            {AGENCY_PARTNER_FEATURES.map((f) => (
              <label key={f} className={panel.toggleRow}>
                <Switch
                  checked={permDraft[f]}
                  onChange={(v) => setPermDraft({ ...permDraft, [f]: v })}
                />
                {AGENCY_PARTNER_FEATURE_LABELS[f]}
              </label>
            ))}
            {permError && <p className={panel.error}>{permError}</p>}
            <button className={panel.primaryBtn} onClick={savePermissions}>Salvar permissões</button>
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
    <RequireAuth role={["agency", "partner"]}>
      <RequirePermission feature="equipe">
        <TeamPage />
      </RequirePermission>
    </RequireAuth>
  );
}
