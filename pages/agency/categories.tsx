import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import RequirePermission from "@/src/components/RequirePermission";
import panel from "@/styles/panel.module.scss";
import {
  getManagedCategories, createCategory, updateCategory, deleteCategory, Category,
} from "@/src/services/categoryService";

function CategoriesPage() {
  const [list, setList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await getManagedCategories()); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const fail = (err: unknown) =>
    setMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setMsg(null);
    try {
      await createCategory({ name });
      setNewName("");
      setMsg({ type: "ok", text: `Função "${name}" criada.` });
      await load();
    } catch (err) { fail(err); }
    finally { setBusy(false); }
  };

  const rename = async (c: Category, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === c.name) return;
    setMsg(null);
    try { await updateCategory(c.id, { name: trimmed }); await load(); }
    catch (err) { fail(err); await load(); }
  };

  const toggleActive = async (c: Category) => {
    setMsg(null);
    try { await updateCategory(c.id, { active: !c.active }); await load(); }
    catch (err) { fail(err); }
  };

  const remove = async (c: Category) => {
    if (!confirm(`Excluir a função "${c.name}"? Só é possível se ela não estiver em uso.`)) return;
    setMsg(null);
    try { await deleteCategory(c.id); setMsg({ type: "ok", text: "Função excluída." }); await load(); }
    catch (err) { fail(err); }
  };

  return (
    <>
      <Head><title>Funções | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Funções</h1></header>
          <p className={panel.muted}>
            As funções (cargos) que os colaboradores exercem e que os supermercados contratam. Só as
            funções <strong>ativas</strong> aparecem nas combos de cadastro do colaborador, de
            valores/hora do supermercado e do pedido de vagas. Uma função em uso não pode ser
            excluída — desative-a.
          </p>

          <div className={panel.card} style={{ maxWidth: 520 }}>
            <div className={panel.form} style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "1 1 200px" }}>
                <label>Nova função</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                  placeholder="Ex.: Estoquista"
                />
              </div>
              <button className={panel.primaryBtn} onClick={add} disabled={busy || !newName.trim()}>
                Adicionar
              </button>
            </div>
            {msg && <p className={msg.type === "ok" ? panel.success : panel.error} style={{ marginTop: 8 }}>{msg.text}</p>}
          </div>

          {loading ? (
            <p>Carregando…</p>
          ) : (
            <div style={{ overflowX: "auto", marginTop: "1rem" }}>
              <table className={panel.table}>
                <thead><tr><th>Nome</th><th>Situação</th><th>Ações</th></tr></thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <input
                          defaultValue={c.name}
                          style={{ minWidth: 180 }}
                          onBlur={(e) => rename(c, e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        />
                      </td>
                      <td>
                        <span className={`${panel.badge} ${c.active ? "" : panel.badgeCanceled}`}>
                          {c.active ? "Ativa" : "Inativa"}
                        </span>
                      </td>
                      <td>
                        <button className={panel.ghostBtn} onClick={() => toggleActive(c)}>
                          {c.active ? "Desativar" : "Ativar"}
                        </button>
                        <button className={panel.secondaryBtn} onClick={() => remove(c)}>Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {list.length === 0 && <tr><td colSpan={3} className={panel.muted}>Nenhuma função cadastrada.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role={["agency", "partner"]}>
      <RequirePermission feature="colaboradores">
        <CategoriesPage />
      </RequirePermission>
    </RequireAuth>
  );
}
