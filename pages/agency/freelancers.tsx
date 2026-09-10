import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import { getMyFreelancers, addFreelancer, AgencyFreelancer } from "@/src/services/agencyService";
import { createInvite } from "@/src/services/inviteService";
import { getCategories, Category } from "@/src/services/categoryService";
import {
  updateFreelancer,
  getFreelancerCategories,
  addCategoryToFreelancer,
  setFreelancerCategoryRate,
  removeCategoryFromFreelancer,
} from "@/src/services/freelancerService";
import { getFreelancerReputation, FreelancerReputation as Reputation } from "@/src/services/reviewService";
import { getFreelancerLeaders, AssignedLeader } from "@/src/services/agencyMemberService";
import { FreelancerProfileBody } from "@/src/components/FreelancerChip";
import { useAuth } from "@/src/hooks/useAuth";

function FreelancersPage() {
  const { profile } = useAuth();
  const agencyId = (profile as { id?: string } | null)?.id ?? "";
  const [list, setList] = useState<AgencyFreelancer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catsByFreelancer, setCatsByFreelancer] = useState<Record<string, string[]>>({});
  // valor/hora que o colaborador recebe por função: { [freelancerId]: { [categoryId]: "18.00" } }
  const [rateByFreelancer, setRateByFreelancer] = useState<Record<string, Record<string, string>>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", skills: "" });
  const [error, setError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editReputation, setEditReputation] = useState<Reputation | null>(null);
  const [editLeaders, setEditLeaders] = useState<AssignedLeader[] | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", skills: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [catMsg, setCatMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [inviteModal, setInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const openInviteFreelancer = async () => {
    setInviteError(null);
    setInviteCopied(false);
    setInviteLink(null);
    setInviteModal(true);
    try {
      const { token } = await createInvite("freelancer");
      setInviteLink(`${window.location.origin}/invite/${token}`);
    } catch (err) {
      setInviteError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao gerar convite." : "Erro ao gerar convite.");
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try { await navigator.clipboard.writeText(inviteLink); setInviteCopied(true); } catch { /* ignore */ }
  };

  const load = useCallback(async () => {
    if (!agencyId) return;
    const [fl, cs] = await Promise.all([getMyFreelancers(agencyId), getCategories()]);
    setList(fl);
    setCategories(cs);
    const entries = await Promise.all(
      fl.map(async (f) => {
        try {
          const rows = await getFreelancerCategories(f.id);
          const rateMap: Record<string, string> = {};
          rows.forEach((r) => { rateMap[r.categoryId] = r.hourlyRate != null ? String(r.hourlyRate) : ""; });
          return [f.id, rows.map((r) => r.categoryId), rateMap] as const;
        } catch {
          return [f.id, [] as string[], {} as Record<string, string>] as const;
        }
      })
    );
    setCatsByFreelancer(Object.fromEntries(entries.map((e) => [e[0], e[1]])));
    setRateByFreelancer(Object.fromEntries(entries.map((e) => [e[0], e[2]])));
  }, [agencyId]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError(null);
    try {
      await addFreelancer(form);
      setOpen(false);
      setForm({ name: "", email: "", password: "", phone: "", skills: "" });
      await load();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  const openEdit = (f: AgencyFreelancer) => {
    setEditError(null);
    setCatMsg(null);
    setEditForm({ name: f.name, email: f.email, phone: f.phone ?? "", skills: f.skills ?? "" });
    setEditId(f.id);
    setEditReputation(null);
    setEditLeaders(null);
    getFreelancerReputation(f.id).then(setEditReputation).catch(() => {});
    getFreelancerLeaders(f.id).then(setEditLeaders).catch(() => {});
  };

  const saveEdit = async () => {
    if (!editId) return;
    setEditError(null);
    try {
      await updateFreelancer(editId, editForm);
      setEditId(null);
      await load();
    } catch (err) {
      setEditError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  const setRateInput = (freelancerId: string, categoryId: string, value: string) =>
    setRateByFreelancer((cur) => ({
      ...cur,
      [freelancerId]: { ...(cur[freelancerId] ?? {}), [categoryId]: value },
    }));

  // Adiciona a função já com o valor/hora — sem valor não salva (o colaborador não veria a vaga).
  const addCategory = async (freelancerId: string, categoryId: string, value: string) => {
    setCatMsg(null);
    const num = Number(value);
    if (!value || !Number.isFinite(num) || num <= 0) {
      setCatMsg({ type: "err", text: "Informe o valor/hora antes de adicionar a função." });
      return;
    }
    try {
      await addCategoryToFreelancer(freelancerId, categoryId, num);
      await load();
      setCatMsg({
        type: "ok",
        text: `Função adicionada a R$ ${num.toFixed(2)}/h. O colaborador já enxerga vagas dessa função — desde que o supermercado também tenha o valor/hora da função cadastrado.`,
      });
    } catch (err) {
      setCatMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    }
  };

  const removeCategory = async (freelancerId: string, categoryId: string) => {
    setCatMsg(null);
    try {
      await removeCategoryFromFreelancer(freelancerId, categoryId);
      await load();
    } catch (err) {
      setCatMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    }
  };

  const commitRate = async (freelancerId: string, categoryId: string, value: string) => {
    setCatMsg(null);
    const num = Number(value);
    if (!value || !Number.isFinite(num) || num <= 0) {
      setCatMsg({ type: "err", text: "O valor/hora não pode ficar em branco. Informe um número maior que zero." });
      // devolve o valor salvo
      await load();
      return;
    }
    if (num === Number(rateByFreelancer[freelancerId]?.[categoryId])) return;
    try {
      await setFreelancerCategoryRate(freelancerId, categoryId, num);
      setCatMsg({ type: "ok", text: `Valor/hora atualizado para R$ ${num.toFixed(2)}/h.` });
    } catch (err) {
      setCatMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
      await load();
    }
  };

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  const missingRate = (freelancerId: string) =>
    (catsByFreelancer[freelancerId] ?? []).some((cid) => !Number(rateByFreelancer[freelancerId]?.[cid]));

  return (
    <>
      <Head><title>Colaboradores | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>Colaboradores da agência</h1>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className={panel.ghostBtn} onClick={openInviteFreelancer}>Convidar colaborador</button>
              <button className={panel.primaryBtn} onClick={() => { setError(null); setOpen(true); }}>
                Adicionar colaborador
              </button>
            </div>
          </header>
          <p className={panel.muted}>
            As funções definem quais vagas o colaborador enxerga. Para cada função é preciso definir
            o <strong>valor/hora que ele recebe</strong> — sem valor, ele não vê nem aceita vagas dessa função.
          </p>

          <div style={{ overflowX: "auto" }}>
          <table className={panel.table}>
            <thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Funções</th><th>Saldo</th><th>Ações</th></tr></thead>
            <tbody>
              {list.map((f) => (
                <tr key={f.id}>
                  <td>{f.name}</td>
                  <td>{f.email}</td>
                  <td>{f.phone ?? "—"}</td>
                  <td>
                    {(catsByFreelancer[f.id] ?? []).length === 0 ? (
                      <span className={panel.muted}>nenhuma</span>
                    ) : (
                      <>
                        {(catsByFreelancer[f.id] ?? []).map((cid) => {
                          const rate = Number(rateByFreelancer[f.id]?.[cid]);
                          return (
                            <span key={cid} className={panel.badge} style={{ marginRight: 4 }}>
                              {categoryName(cid)}{rate > 0 ? ` · R$ ${rate.toFixed(2)}/h` : " · sem valor"}
                            </span>
                          );
                        })}
                        {missingRate(f.id) && (
                          <div className={panel.error} style={{ fontSize: "0.8rem", marginTop: 4 }}>
                            Defina o valor/hora das funções sem valor.
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td>R$ {Number(f.availableBalance ?? 0).toFixed(2)}</td>
                  <td><button className={panel.ghostBtn} onClick={() => openEdit(f)}>Editar</button></td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={6}>Nenhum colaborador cadastrado.</td></tr>}
            </tbody>
          </table>
          </div>
        </section>
      </main>

      {inviteModal && (
        <Modal title="Convidar colaborador" onClose={() => setInviteModal(false)}>
          <div className={panel.form}>
            <p className={panel.muted}>
              Envie este link pro colaborador (WhatsApp, e-mail…). Ao preencher o cadastro, ele já
              nasce vinculado à sua agência e aprovado — sem etapa de aprovação depois. Você define o
              valor/hora dele por função separadamente, aqui na tela.
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

      {open && (
        <Modal title="Adicionar colaborador" onClose={() => setOpen(false)}>
          <div className={panel.form}>
            <label>Nome</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} />
            <label>E-mail</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            <label>Senha de acesso</label>
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} minLength={4} />
            <label>Telefone</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            <label>Habilidades</label>
            <textarea value={form.skills} onChange={(e) => set("skills", e.target.value)} />
            {error && <p className={panel.error}>{error}</p>}
            <button className={panel.primaryBtn} onClick={save}>Salvar</button>
          </div>
        </Modal>
      )}

      {editId && (
        <Modal title="Editar colaborador" onClose={() => setEditId(null)}>
          <div className={panel.form}>
            <div style={{ padding: "8px 0 12px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
              <FreelancerProfileBody
                name={list.find((f) => f.id === editId)?.name ?? editForm.name}
                phone={list.find((f) => f.id === editId)?.phone ?? editForm.phone}
                profilePhotoUrl={list.find((f) => f.id === editId)?.profilePhotoUrl}
                reputation={editReputation}
                leaders={editLeaders}
              />
            </div>
            <label>Nome</label>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <label>E-mail</label>
            <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <label>Telefone</label>
            <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <label>Habilidades</label>
            <textarea value={editForm.skills} onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })} />

            <label>Funções que o colaborador exerce e o valor/hora que ele recebe</label>
            <p className={panel.muted} style={{ fontSize: "0.8rem", margin: 0 }}>
              Toda função precisa de um valor/hora para ser salva — sem ele o colaborador não vê nem aceita vagas dessa função.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {categories.map((c) => {
                const added = (catsByFreelancer[editId] ?? []).includes(c.id);
                const rateValue = rateByFreelancer[editId]?.[c.id] ?? "";
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ minWidth: 160 }}>{c.name}</span>
                    <input
                      type="number" min="0.01" step="0.01" placeholder="R$/h"
                      style={{ width: 110 }}
                      value={rateValue}
                      onChange={(e) => setRateInput(editId, c.id, e.target.value)}
                      onBlur={added ? (e) => commitRate(editId, c.id, e.target.value) : undefined}
                    />
                    {added ? (
                      <button type="button" className={panel.secondaryBtn} onClick={() => removeCategory(editId, c.id)}>
                        Remover
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={panel.ghostBtn}
                        disabled={!(Number(rateValue) > 0)}
                        onClick={() => addCategory(editId, c.id, rateValue)}
                      >
                        Adicionar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {catMsg && <p className={catMsg.type === "ok" ? panel.success : panel.error}>{catMsg.text}</p>}

            {editError && <p className={panel.error}>{editError}</p>}
            <button className={panel.primaryBtn} onClick={saveEdit}>Salvar</button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="agency">
      <FreelancersPage />
    </RequireAuth>
  );
}
