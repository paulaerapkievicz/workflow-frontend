import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import RequirePermission from "@/src/components/RequirePermission";
import panel from "@/styles/panel.module.scss";
import {
  getSupermarkets, createSupermarketAsAgency, updateSupermarket, setSupermarketAppPayment, Supermarket,
  getMembers, addMember, updateMember, deleteMember, SupermarketMember,
  resetSupermarketOwnerPassword, resetMemberPassword,
} from "@/src/services/supermarketService";
import ResetPasswordAction from "@/src/components/ResetPasswordAction";
import { getAgencySettings } from "@/src/services/agencySettingsService";
import {
  getBranches, createBranch, updateBranch, deleteBranch, geocodeAddress, branchHasLocation, approveBranch, Branch,
} from "@/src/services/branchService";
import { createInvite } from "@/src/services/inviteService";
import BranchScopeField from "@/src/components/supermarket/BranchScopeField";
import Switch from "@/src/components/common/Switch";
import TeamRolesManager from "@/src/components/TeamRolesManager";
import FormField from "@/src/components/FormField";
import { validateForm } from "@/src/lib/validators";
import { maskCnpj } from "@/src/lib/masks";
import { getTeamRoles, TeamRole } from "@/src/services/teamRoleService";
import { getCategories, Category } from "@/src/services/categoryService";
import {
  getSupermarketRates, saveSupermarketRate, updateSupermarketRate, deleteSupermarketRate,
  SupermarketCategoryRate,
} from "@/src/services/supermarketRateService";

const emptyMarket = { id: "", name: "", cnpj: "", address: "", phone: "", email: "", password: "" };
const emptyBranch = { id: "", name: "", address: "", phone: "" };
const emptyRate = { categoryId: "", branchId: "", hourlyRate: "" };
const emptyMember = {
  name: "", email: "", password: "", branchIds: [] as string[], teamRoleId: "",
  canSubmitOrders: true, canApproveOrders: false, canViewInvoices: false, canPayInvoices: false,
};

function SupermarketsPage() {
  const [markets, setMarkets] = useState<Supermarket[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [ratesOf, setRatesOf] = useState<Supermarket | null>(null);
  const [rates, setRates] = useState<SupermarketCategoryRate[]>([]);
  const [rateForm, setRateForm] = useState({ ...emptyRate });
  const [rateMsg, setRateMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [marketModal, setMarketModal] = useState(false);
  const [marketForm, setMarketForm] = useState({ ...emptyMarket });
  const [marketError, setMarketError] = useState<string | null>(null);

  const [inviteModal, setInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const [teamOf, setTeamOf] = useState<Supermarket | null>(null);
  const [members, setMembers] = useState<SupermarketMember[]>([]);
  const [teamRoles, setTeamRoles] = useState<TeamRole[]>([]);
  const [rolesModal, setRolesModal] = useState(false);
  const [memberModal, setMemberModal] = useState(false);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState({ ...emptyMember });
  const [memberError, setMemberError] = useState<string | null>(null);

  const [branchesOf, setBranchesOf] = useState<Supermarket | null>(null);
  const [branchModal, setBranchModal] = useState(false);
  const [branchForm, setBranchForm] = useState({ ...emptyBranch });
  const [branchError, setBranchError] = useState<string | null>(null);
  const [geoMsg, setGeoMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [appPaymentMasterEnabled, setAppPaymentMasterEnabled] = useState(true);
  const [appPaymentBusy, setAppPaymentBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, b, c, settings] = await Promise.all([
        getSupermarkets(), getBranches(), getCategories(), getAgencySettings(),
      ]);
      setMarkets(m);
      setBranches(b);
      setCategories(c);
      setAppPaymentMasterEnabled(settings.appPaymentEnabledForSupermarkets);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const toggleAppPayment = async (m: Supermarket) => {
    setAppPaymentBusy(m.id);
    try {
      const { appPaymentEnabled } = await setSupermarketAppPayment(m.id, !m.appPaymentEnabled);
      setMarkets((cur) => cur.map((x) => (x.id === m.id ? { ...x, appPaymentEnabled } : x)));
    } catch { /* vazio */ }
    finally { setAppPaymentBusy(null); }
  };

  const branchesForMarket = useMemo(
    () => (id: string) => branches.filter((b) => b.supermarketId === id),
    [branches]
  );

  const openNewMarket = () => { setMarketForm({ ...emptyMarket }); setMarketError(null); setMarketModal(true); };

  const openInviteMarket = async () => {
    setInviteError(null);
    setInviteCopied(false);
    setInviteLink(null);
    setInviteModal(true);
    try {
      const { token } = await createInvite("supermarket");
      setInviteLink(`${window.location.origin}/invite/${token}`);
    } catch (err) {
      setInviteError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao gerar convite." : "Erro ao gerar convite.");
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try { await navigator.clipboard.writeText(inviteLink); setInviteCopied(true); } catch { /* ignore */ }
  };
  const openEditMarket = (m: Supermarket) => {
    setMarketForm({ id: m.id, name: m.name, cnpj: m.cnpj, address: m.address ?? "", phone: m.phone ?? "", email: "", password: "" });
    setMarketError(null);
    setMarketModal(true);
  };

  const saveMarket = async () => {
    setMarketError(null);
    const errs = validateForm([
      { name: "cnpj", value: marketForm.cnpj, kind: "cnpj", required: true },
      { name: "phone", value: marketForm.phone, kind: "phone" },
      ...(marketForm.id ? [] : [{ name: "email", value: marketForm.email, kind: "email" as const, required: true }]),
    ]);
    if (Object.keys(errs).length) {
      setMarketError("Confira os campos destacados antes de salvar.");
      return;
    }
    try {
      if (marketForm.id) {
        await updateSupermarket(marketForm.id, {
          name: marketForm.name, cnpj: marketForm.cnpj, address: marketForm.address, phone: marketForm.phone,
        });
      } else {
        await createSupermarketAsAgency({
          name: marketForm.name, cnpj: marketForm.cnpj, address: marketForm.address,
          phone: marketForm.phone || undefined, email: marketForm.email, password: marketForm.password,
        });
      }
      setMarketModal(false);
      await load();
    } catch (err) {
      setMarketError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao salvar." : "Erro ao salvar.");
    }
  };

  const openNewBranch = () => { setBranchForm({ ...emptyBranch }); setBranchError(null); setGeoMsg(null); setBranchModal(true); };
  const openEditBranch = (b: Branch) => {
    setBranchForm({ id: b.id, name: b.name, address: b.address, phone: b.phone ?? "" });
    setBranchError(null);
    setGeoMsg(branchHasLocation(b) ? { type: "ok", text: "Localização já definida pelo endereço." } : null);
    setBranchModal(true);
  };

  const testGeocode = async () => {
    if (!branchForm.address.trim()) return;
    setGeoBusy(true);
    setGeoMsg(null);
    try {
      const r = await geocodeAddress(branchForm.address);
      setGeoMsg({ type: "ok", text: `Encontrado: ${r.displayName}` });
    } catch (err) {
      setGeoMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Não localizado." : "Não localizado." });
    } finally {
      setGeoBusy(false);
    }
  };

  const saveBranch = async () => {
    if (!branchesOf) return;
    setBranchError(null);
    if (Object.keys(validateForm([{ name: "phone", value: branchForm.phone, kind: "phone" }])).length) {
      setBranchError("Telefone inválido.");
      return;
    }
    const payload = { name: branchForm.name, address: branchForm.address, phone: branchForm.phone, regeocode: true };
    try {
      if (branchForm.id) await updateBranch(branchForm.id, payload);
      else await createBranch({ ...payload, supermarketId: branchesOf.id });
      setBranchModal(false);
      await load();
    } catch (err) {
      setBranchError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao salvar." : "Erro ao salvar.");
    }
  };

  const removeBranch = async (id: string) => {
    if (!confirm("Excluir esta filial?")) return;
    try { await deleteBranch(id); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  const approveBranchAttendance = async (id: string) => {
    try { await approveBranch(id); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  const openTeam = async (m: Supermarket) => {
    setTeamOf(m);
    setMembers([]);
    setTeamRoles([]);
    setMemberModal(false);
    setRolesModal(false);
    setEditMemberId(null);
    try { setMembers(await getMembers(m.id)); } catch { /* vazio */ }
    try { setTeamRoles(await getTeamRoles({ supermarketId: m.id })); } catch { /* vazio */ }
  };
  const reloadTeam = async () => {
    if (!teamOf) return;
    try { setMembers(await getMembers(teamOf.id)); } catch { /* vazio */ }
  };
  const reloadTeamRoles = async () => {
    if (!teamOf) return;
    try { setTeamRoles(await getTeamRoles({ supermarketId: teamOf.id })); } catch { /* vazio */ }
    await reloadTeam();
  };
  const openAddMember = () => { setEditMemberId(null); setMemberForm({ ...emptyMember }); setMemberError(null); setMemberModal(true); };
  const openEditMember = (mem: SupermarketMember) => {
    setEditMemberId(mem.id);
    setMemberForm({
      ...emptyMember,
      branchIds: mem.branchIds ?? [],
      teamRoleId: mem.teamRoleId ?? "",
      canSubmitOrders: mem.canSubmitOrders,
      canApproveOrders: mem.canApproveOrders,
      canViewInvoices: mem.canViewInvoices,
      canPayInvoices: mem.canPayInvoices,
    });
    setMemberError(null);
    setMemberModal(true);
  };
  const saveMember = async () => {
    if (!teamOf) return;
    setMemberError(null);
    if (!editMemberId) {
      const errs = validateForm([{ name: "email", value: memberForm.email, kind: "email", required: true }]);
      if (Object.keys(errs).length) { setMemberError("Informe um e-mail válido para o gerente."); return; }
    }
    const perms = {
      branchIds: memberForm.branchIds,
      teamRoleId: memberForm.teamRoleId || null,
      canSubmitOrders: memberForm.canSubmitOrders,
      canApproveOrders: memberForm.canApproveOrders,
      canViewInvoices: memberForm.canViewInvoices,
      canPayInvoices: memberForm.canPayInvoices,
    };
    try {
      if (editMemberId) {
        await updateMember(editMemberId, perms);
      } else {
        await addMember(teamOf.id, {
          name: memberForm.name, email: memberForm.email, password: memberForm.password, ...perms,
        });
      }
      setMemberModal(false);
      setEditMemberId(null);
      setMemberForm({ ...emptyMember });
      await reloadTeam();
    } catch (err) {
      setMemberError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };
  const patchMember = async (mem: SupermarketMember, p: Parameters<typeof updateMember>[1]) => {
    try { await updateMember(mem.id, p); await reloadTeam(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };
  const setMemberView = (mem: SupermarketMember, on: boolean) =>
    patchMember(mem, on ? { canViewInvoices: true } : { canViewInvoices: false, canPayInvoices: false });
  const setMemberPay = (mem: SupermarketMember, on: boolean) =>
    patchMember(mem, on ? { canViewInvoices: true, canPayInvoices: true } : { canPayInvoices: false });
  const memberScopeLabel = (mem: SupermarketMember) => {
    if (mem.isOwner || !mem.branchIds?.length) return "Rede toda";
    if (mem.memberBranches?.length) return mem.memberBranches.map((b) => b.name).join(", ");
    return `${mem.branchIds.length} loja(s)`;
  };
  const removeMember = async (mem: SupermarketMember) => {
    if (!confirm(`Remover ${mem.memberUser?.name ?? "este gerente"}?`)) return;
    try { await deleteMember(mem.id); await reloadTeam(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  const openRates = async (m: Supermarket) => {
    setRatesOf(m);
    setRateForm({ ...emptyRate });
    setRateMsg(null);
    setRates([]);
    try { setRates(await getSupermarketRates(m.id)); } catch { /* vazio */ }
  };

  const reloadRates = async () => {
    if (!ratesOf) return;
    try { setRates(await getSupermarketRates(ratesOf.id)); } catch { /* vazio */ }
  };

  const addRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratesOf) return;
    setRateMsg(null);
    try {
      await saveSupermarketRate(ratesOf.id, {
        categoryId: rateForm.categoryId,
        branchId: rateForm.branchId || null,
        hourlyRate: Number(rateForm.hourlyRate),
      });
      setRateForm({ ...emptyRate });
      setRateMsg({ type: "ok", text: "Valor/hora salvo." });
      await reloadRates();
    } catch (err) {
      setRateMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    }
  };

  const changeRate = async (r: SupermarketCategoryRate, value: string) => {
    if (!ratesOf || Number(value) === Number(r.hourlyRate)) return;
    try { await updateSupermarketRate(ratesOf.id, r.id, { hourlyRate: Number(value) }); await reloadRates(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  const toggleRate = async (r: SupermarketCategoryRate) => {
    if (!ratesOf) return;
    try { await updateSupermarketRate(ratesOf.id, r.id, { active: !r.active }); await reloadRates(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  const removeRate = async (r: SupermarketCategoryRate) => {
    if (!ratesOf || !confirm("Remover este valor/hora?")) return;
    try { await deleteSupermarketRate(ratesOf.id, r.id); await reloadRates(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <>
      <Head><title>Gestão de Clientes | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>Gestão de Clientes</h1>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className={panel.ghostBtn} onClick={openInviteMarket}>Convidar supermercado</button>
              <button className={panel.primaryBtn} onClick={openNewMarket}>Novo supermercado</button>
            </div>
          </header>
          <p className={panel.muted}>
            A agência cadastra os supermercados e as filiais de cada um. O acesso do supermercado é
            criado junto (e-mail + senha informados aqui).
          </p>

          {loading ? (
            <p>Carregando…</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className={panel.table}>
                <thead><tr>
                  <th>Nome</th><th>CNPJ</th><th>Acesso</th><th>Filiais</th>
                  <th title="Pagamento pelo app (Mercado Pago) para este cliente">App</th>
                  <th>Ações</th>
                </tr></thead>
                <tbody>
                  {markets.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{maskCnpj(m.cnpj)}</td>
                      <td>{m.owner?.email ?? "—"}</td>
                      <td>
                        {branchesForMarket(m.id).length}
                        {branchesForMarket(m.id).some((b) => b.serviceStatus === "pending") && (
                          <span className={`${panel.badge} ${panel.badgePending}`} style={{ marginLeft: 6 }}>
                            aguardando aprovação
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Switch
                          checked={m.appPaymentEnabled}
                          disabled={!appPaymentMasterEnabled || appPaymentBusy === m.id}
                          onChange={() => toggleAppPayment(m)}
                          title={
                            !appPaymentMasterEnabled
                              ? "Habilite em Configurações primeiro"
                              : m.appPaymentEnabled
                                ? "Pagamento pelo app ligado para este cliente — clique para desligar"
                                : "Pagamento pelo app desligado para este cliente — clique para ligar"
                          }
                          aria-label="Pagamento pelo app"
                        />
                      </td>
                      <td className={panel.actionsStack}>
                        <button className={panel.ghostBtn} onClick={() => setBranchesOf(m)}>Filiais</button>
                        <button className={panel.ghostBtn} onClick={() => openRates(m)}>Valores/hora</button>
                        <button className={panel.ghostBtn} onClick={() => openTeam(m)}>Equipe</button>
                        <button className={panel.ghostBtn} onClick={() => openEditMarket(m)}>Editar</button>
                      </td>
                    </tr>
                  ))}
                  {markets.length === 0 && <tr><td colSpan={6} className={panel.muted}>Nenhum supermercado cadastrado.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {inviteModal && (
        <Modal title="Convidar supermercado" onClose={() => setInviteModal(false)}>
          <div className={panel.form}>
            <p className={panel.muted}>
              Envie este link pro supermercado (WhatsApp, e-mail…). Ao preencher o cadastro, ele já
              nasce vinculado à sua agência — sem etapa de aprovação depois. Nenhum valor/preço aparece
              nesse formulário, só cadastro básico.
            </p>
            {inviteError && <p className={panel.error}>{inviteError}</p>}
            {!inviteError && !inviteLink && <p>Gerando link…</p>}
            {inviteLink && (
              <>
                <input readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
                <button className={panel.primaryBtn} onClick={copyInviteLink}>
                  {inviteCopied ? "Copiado!" : "Copiar link"}
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      {marketModal && (
        <Modal title={marketForm.id ? "Editar supermercado" : "Novo supermercado"} onClose={() => setMarketModal(false)}>
          <div className={panel.form}>
            <label>Nome</label>
            <input value={marketForm.name} onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })} />
            <FormField label="CNPJ" kind="cnpj" required placeholder="00.000.000/0000-00"
              value={marketForm.cnpj} onChange={(v) => setMarketForm({ ...marketForm, cnpj: v })} />
            <label>Endereço (matriz)</label>
            <input value={marketForm.address} onChange={(e) => setMarketForm({ ...marketForm, address: e.target.value })} />
            <FormField label="Telefone" kind="phone" placeholder="(00) 00000-0000"
              value={marketForm.phone} onChange={(v) => setMarketForm({ ...marketForm, phone: v })} />
            {!marketForm.id && (
              <>
                <FormField label="E-mail de acesso" kind="email" required
                  value={marketForm.email} onChange={(v) => setMarketForm({ ...marketForm, email: v })} />
                <label>Senha de acesso</label>
                <input type="password" minLength={4} value={marketForm.password} onChange={(e) => setMarketForm({ ...marketForm, password: e.target.value })} />
              </>
            )}
            {marketError && <p className={panel.error}>{marketError}</p>}
            <button
              className={panel.primaryBtn}
              onClick={saveMarket}
              disabled={!marketForm.name || !marketForm.cnpj || !marketForm.address || (!marketForm.id && (!marketForm.email || !marketForm.password))}
            >
              Salvar
            </button>
          </div>
        </Modal>
      )}

      {ratesOf && (
        <Modal title={`Valores/hora — ${ratesOf.name}`} onClose={() => setRatesOf(null)}>
          <div className={panel.form}>
            <p className={panel.muted}>
              Valor que a agência cobra deste supermercado por <strong>função</strong>, por hora
              trabalhada. Deixe a loja em <em>Todas as lojas</em> para o valor padrão da rede, ou
              escolha uma filial para uma tarifa específica (tem prioridade sobre o padrão).
            </p>
            <form onSubmit={addRate} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className={panel.filterField}>
                <label>Função</label>
                <select value={rateForm.categoryId} onChange={(e) => setRateForm({ ...rateForm, categoryId: e.target.value })} required>
                  <option value="">Selecione…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className={panel.filterField}>
                <label>Loja</label>
                <select value={rateForm.branchId} onChange={(e) => setRateForm({ ...rateForm, branchId: e.target.value })}>
                  <option value="">Todas as lojas (padrão)</option>
                  {branchesForMarket(ratesOf.id).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className={panel.filterField}>
                <label>Valor/hora (R$)</label>
                <input type="number" min="0.01" step="0.01" value={rateForm.hourlyRate}
                  onChange={(e) => setRateForm({ ...rateForm, hourlyRate: e.target.value })} required />
              </div>
              <button className={panel.primaryBtn} type="submit" disabled={!rateForm.categoryId || !rateForm.hourlyRate}>
                Adicionar
              </button>
              {rateMsg && <p className={rateMsg.type === "ok" ? panel.success : panel.error} style={{ width: "100%" }}>{rateMsg.text}</p>}
            </form>

            <div style={{ overflowX: "auto" }}>
              <table className={panel.table}>
                <thead><tr><th>Função</th><th>Loja</th><th>Valor/hora</th><th>Situação</th><th>Ações</th></tr></thead>
                <tbody>
                  {rates.map((r) => (
                    <tr key={r.id}>
                      <td>{r.rateCategory?.name ?? categoryName(r.categoryId)}</td>
                      <td>{r.rateBranch?.name ?? "Todas as lojas"}</td>
                      <td>
                        <input type="number" min="0.01" step="0.01" defaultValue={Number(r.hourlyRate)}
                          style={{ width: 100 }}
                          onBlur={(e) => changeRate(r, e.target.value)} />
                      </td>
                      <td><span className={panel.badge}>{r.active ? "Ativa" : "Inativa"}</span></td>
                      <td>
                        <button className={panel.ghostBtn} onClick={() => toggleRate(r)}>{r.active ? "Desativar" : "Ativar"}</button>
                        <button className={panel.secondaryBtn} onClick={() => removeRate(r)}>Remover</button>
                      </td>
                    </tr>
                  ))}
                  {rates.length === 0 && <tr><td colSpan={5} className={panel.muted}>Nenhum valor/hora cadastrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {teamOf && !memberModal && (
        <Modal title={`Equipe — ${teamOf.name}`} onClose={() => setTeamOf(null)}>
          <div className={panel.form}>
            <p className={panel.muted}>
              Gerentes do supermercado. Um gerente pode responder pela rede toda ou por uma ou mais
              filiais. A agência também define quem <strong>vê</strong> e quem <strong>paga/contesta</strong>
              as faturas do fechamento mensal — quem vê não necessariamente paga. O dono do
              supermercado sempre vê e paga.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className={panel.ghostBtn} onClick={() => setRolesModal(true)}>Cargos</button>
              <button className={panel.primaryBtn} onClick={openAddMember}>Adicionar gerente</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className={panel.table}>
                <thead><tr>
                  <th>Nome</th><th>Cargo</th><th>E-mail</th><th>Lojas</th><th>Solicita</th><th>Aprova</th>
                  <th>Vê faturas</th><th>Paga faturas</th><th>Ações</th>
                </tr></thead>
                <tbody>
                  {members.map((mem) => (
                    <tr key={mem.id}>
                      <td>{mem.memberUser?.name ?? "—"}</td>
                      <td>
                        <select value={mem.teamRoleId ?? ""} onChange={(e) => patchMember(mem, { teamRoleId: e.target.value || null })}>
                          <option value="">— sem cargo —</option>
                          {teamRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </td>
                      <td>{mem.memberUser?.email ?? "—"}</td>
                      <td>{memberScopeLabel(mem)}</td>
                      <td style={{ textAlign: "center" }}>
                        <Switch disabled={mem.isOwner} checked={mem.canSubmitOrders}
                          onChange={(v) => patchMember(mem, { canSubmitOrders: v })} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Switch disabled={mem.isOwner} checked={mem.canApproveOrders}
                          onChange={(v) => patchMember(mem, { canApproveOrders: v })} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Switch disabled={mem.isOwner} checked={mem.isOwner || mem.canViewInvoices}
                          onChange={(v) => setMemberView(mem, v)} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Switch disabled={mem.isOwner} checked={mem.isOwner || mem.canPayInvoices}
                          onChange={(v) => setMemberPay(mem, v)} />
                      </td>
                      <td className={panel.actionsStack}>
                        {!mem.isOwner && <button className={panel.ghostBtn} onClick={() => openEditMember(mem)}>Editar</button>}
                        <ResetPasswordAction
                          label={mem.memberUser?.name ?? (mem.isOwner ? "o dono" : "este gerente")}
                          onReset={() =>
                            mem.isOwner ? resetSupermarketOwnerPassword(teamOf!.id) : resetMemberPassword(mem.id)
                          }
                        />
                        {!mem.isOwner && <button className={panel.secondaryBtn} onClick={() => removeMember(mem)}>Remover</button>}
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 && <tr><td colSpan={9} className={panel.muted}>Nenhum membro.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {teamOf && rolesModal && (
        <TeamRolesManager
          roles={teamRoles}
          supermarketId={teamOf.id}
          onClose={() => setRolesModal(false)}
          onChange={reloadTeamRoles}
        />
      )}

      {teamOf && memberModal && (
        <Modal
          title={editMemberId ? "Editar gerente" : "Adicionar gerente"}
          onClose={() => { setMemberModal(false); setEditMemberId(null); }}
        >
          <div className={panel.form}>
            {!editMemberId && (
              <>
                <label>Nome</label>
                <input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} />
                <FormField label="E-mail" kind="email" required value={memberForm.email}
                  onChange={(v) => setMemberForm({ ...memberForm, email: v })} />
                <label>Senha de acesso</label>
                <input type="password" minLength={4} value={memberForm.password} onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })} />
              </>
            )}
            <label>Cargo na equipe</label>
            <select value={memberForm.teamRoleId} onChange={(e) => setMemberForm({ ...memberForm, teamRoleId: e.target.value })}>
              <option value="">— sem cargo —</option>
              {teamRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <label>Lojas do gerente</label>
            <BranchScopeField
              branches={branchesForMarket(teamOf.id)}
              value={memberForm.branchIds}
              onChange={(branchIds) => setMemberForm({ ...memberForm, branchIds })}
            />
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={memberForm.canSubmitOrders} onChange={(e) => setMemberForm({ ...memberForm, canSubmitOrders: e.target.checked })} />
              Pode solicitar vagas
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={memberForm.canApproveOrders} onChange={(e) => setMemberForm({ ...memberForm, canApproveOrders: e.target.checked })} />
              Pode aprovar pedidos (envia direto ao pool)
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={memberForm.canViewInvoices}
                onChange={(e) => setMemberForm({ ...memberForm, canViewInvoices: e.target.checked, canPayInvoices: e.target.checked ? memberForm.canPayInvoices : false })} />
              Pode ver as faturas da rede
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={memberForm.canPayInvoices}
                onChange={(e) => setMemberForm({ ...memberForm, canPayInvoices: e.target.checked, canViewInvoices: e.target.checked ? true : memberForm.canViewInvoices })} />
              Pode pagar e contestar as faturas
            </label>
            {memberError && <p className={panel.error}>{memberError}</p>}
            <button
              className={panel.primaryBtn}
              onClick={saveMember}
              disabled={!editMemberId && (!memberForm.name || !memberForm.email || !memberForm.password)}
            >
              Salvar
            </button>
          </div>
        </Modal>
      )}

      {branchesOf && !branchModal && (
        <Modal title={`Filiais — ${branchesOf.name}`} onClose={() => setBranchesOf(null)}>
          <div className={panel.form}>
            <button className={panel.primaryBtn} onClick={openNewBranch}>Nova filial</button>
            <div style={{ overflowX: "auto" }}>
              <table className={panel.table}>
                <thead><tr><th>Nome</th><th>Endereço</th><th>Localização</th><th>Atendimento</th><th>Ações</th></tr></thead>
                <tbody>
                  {branchesForMarket(branchesOf.id).map((b) => (
                    <tr key={b.id}>
                      <td>{b.name}</td>
                      <td>{b.address}</td>
                      <td>
                        {branchHasLocation(b)
                          ? <span className={`${panel.badge} ${panel.badgeDone}`}>ok</span>
                          : <span className={`${panel.badge} ${panel.badgePending}`}>não localizada</span>}
                      </td>
                      <td>
                        {b.serviceStatus === "approved"
                          ? <span className={`${panel.badge} ${panel.badgeDone}`}>Aprovada</span>
                          : <span className={`${panel.badge} ${panel.badgePending}`}>Pendente</span>}
                      </td>
                      <td className={panel.actionsStack}>
                        {b.serviceStatus === "pending" && (
                          <button className={panel.primaryBtn} onClick={() => approveBranchAttendance(b.id)}>Aprovar atendimento</button>
                        )}
                        <button className={panel.ghostBtn} onClick={() => openEditBranch(b)}>Editar</button>
                        <button className={panel.secondaryBtn} onClick={() => removeBranch(b.id)}>Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {branchesForMarket(branchesOf.id).length === 0 && (
                    <tr><td colSpan={5} className={panel.muted}>Nenhuma filial.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {branchModal && branchesOf && (
        <Modal title={branchForm.id ? "Editar filial" : "Nova filial"} onClose={() => setBranchModal(false)}>
          <div className={panel.form}>
            <label>Nome</label>
            <input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
            <label>Endereço completo</label>
            <input
              value={branchForm.address}
              onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
              placeholder="Ex.: Rua Dirceu Sander, 719, Passo Fundo RS"
            />
            <button type="button" className={panel.ghostBtn} onClick={testGeocode} disabled={geoBusy || !branchForm.address.trim()}>
              {geoBusy ? "Buscando…" : "Buscar localização pelo endereço"}
            </button>
            {geoMsg && <p className={geoMsg.type === "ok" ? panel.success : panel.error}>{geoMsg.text}</p>}
            <FormField label="Telefone" kind="phone" placeholder="(00) 00000-0000"
              value={branchForm.phone} onChange={(v) => setBranchForm({ ...branchForm, phone: v })} />
            {branchError && <p className={panel.error}>{branchError}</p>}
            <button className={panel.primaryBtn} onClick={saveBranch} disabled={!branchForm.name || !branchForm.address}>Salvar</button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role={["agency", "partner"]}>
      <RequirePermission feature="clientes">
        <SupermarketsPage />
      </RequirePermission>
    </RequireAuth>
  );
}
