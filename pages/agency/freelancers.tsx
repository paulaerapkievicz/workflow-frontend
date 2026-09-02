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
  removeCategoryFromFreelancer,
} from "@/src/services/freelancerService";
import { useAuth } from "@/src/hooks/useAuth";

function FreelancersPage() {
  const { profile } = useAuth();
  const agencyId = (profile as { id?: string } | null)?.id ?? "";
  const [list, setList] = useState<AgencyFreelancer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catsByFreelancer, setCatsByFreelancer] = useState<Record<string, string[]>>({});
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
          return [f.id, rows.map((r) => r.categoryId)] as const;
        } catch {
          return [f.id, [] as string[]] as const;
        }
      })
    );
    setCatsByFreelancer(Object.fromEntries(entries));
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

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

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
            As funções (tags) definem quais vagas o colaborador enxerga — sem função marcada, ele não vê vagas.
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
                      (catsByFreelancer[f.id] ?? []).map((cid) => (
                        <span key={cid} className={panel.badge} style={{ marginRight: 4 }}>{categoryName(cid)}</span>
                      ))
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

            <label>Funções que o colaborador exerce</label>
            <div className={panel.shiftRow} style={{ flexWrap: "wrap" }}>
              {categories.map((c) => (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={(catsByFreelancer[editId] ?? []).includes(c.id)}
                    onChange={() => toggleCategory(editId, c.id)}
                  />
                  {c.name}
                </label>
              ))}
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
