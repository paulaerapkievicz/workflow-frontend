import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import { getMyFreelancers, addFreelancer, AgencyFreelancer } from "@/src/services/agencyService";
import { getCategories, Category } from "@/src/services/categoryService";
import {
  updateFreelancer,
  getFreelancerCategories,
  addCategoryToFreelancer,
  setFreelancerCategoryRate,
  removeCategoryFromFreelancer,
} from "@/src/services/freelancerService";
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
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", skills: "" });
  const [editError, setEditError] = useState<string | null>(null);

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
    setEditForm({ name: f.name, email: f.email, phone: f.phone ?? "", skills: f.skills ?? "" });
    setEditId(f.id);
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

  const toggleCategory = async (freelancerId: string, categoryId: string) => {
    const has = (catsByFreelancer[freelancerId] ?? []).includes(categoryId);
    // Atualização otimista.
    setCatsByFreelancer((cur) => {
      const list = cur[freelancerId] ?? [];
      return { ...cur, [freelancerId]: has ? list.filter((c) => c !== categoryId) : [...list, categoryId] };
    });
    try {
      if (has) await removeCategoryFromFreelancer(freelancerId, categoryId);
      else await addCategoryToFreelancer(freelancerId, categoryId);
    } catch {
      await load();
    }
  };

  const setRateInput = (freelancerId: string, categoryId: string, value: string) =>
    setRateByFreelancer((cur) => ({
      ...cur,
      [freelancerId]: { ...(cur[freelancerId] ?? {}), [categoryId]: value },
    }));

  const commitRate = async (freelancerId: string, categoryId: string, value: string) => {
    const num = Number(value);
    if (!value || !Number.isFinite(num) || num <= 0) return;
    try {
      await setFreelancerCategoryRate(freelancerId, categoryId, num);
    } catch (err) {
      alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
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
            <button className={panel.primaryBtn} onClick={() => { setError(null); setOpen(true); }}>
              Adicionar colaborador
            </button>
          </header>
          <p className={panel.muted}>
            As funções definem quais vagas o colaborador enxerga. Para cada função é preciso definir
            o <strong>valor/hora que ele recebe</strong> — sem valor, ele não vê nem aceita vagas dessa função.
          </p>

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
        </section>
      </main>

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
            <label>Nome</label>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <label>E-mail</label>
            <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <label>Telefone</label>
            <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <label>Habilidades</label>
            <textarea value={editForm.skills} onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })} />

            <label>Funções que o colaborador exerce e o valor/hora que ele recebe</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {categories.map((c) => {
                const checked = (catsByFreelancer[editId] ?? []).includes(c.id);
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", minWidth: 160 }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleCategory(editId, c.id)} />
                      {c.name}
                    </label>
                    {checked && (
                      <input
                        type="number" min="0.01" step="0.01" placeholder="R$/h"
                        style={{ width: 110 }}
                        value={rateByFreelancer[editId]?.[c.id] ?? ""}
                        onChange={(e) => setRateInput(editId, c.id, e.target.value)}
                        onBlur={(e) => commitRate(editId, c.id, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

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
