import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import { getMyFreelancers, addFreelancer, AgencyFreelancer } from "@/src/services/agencyService";
import { useAuth } from "@/src/hooks/useAuth";

function FreelancersPage() {
  const { profile } = useAuth();
  const agencyId = (profile as { id?: string } | null)?.id ?? "";
  const [list, setList] = useState<AgencyFreelancer[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", skills: "" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!agencyId) return;
    setList(await getMyFreelancers(agencyId));
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

  return (
    <>
      <Head><title>Freelancers | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>Freelancers da agência</h1>
            <button className={panel.primaryBtn} onClick={() => { setError(null); setOpen(true); }}>
              Adicionar freelancer
            </button>
          </header>

          <table className={panel.table}>
            <thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Saldo</th></tr></thead>
            <tbody>
              {list.map((f) => (
                <tr key={f.id}>
                  <td>{f.name}</td>
                  <td>{f.email}</td>
                  <td>{f.phone ?? "—"}</td>
                  <td>R$ {Number(f.availableBalance ?? 0).toFixed(2)}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={4}>Nenhum freelancer cadastrado.</td></tr>}
            </tbody>
          </table>
        </section>
      </main>

      {open && (
        <Modal title="Adicionar freelancer" onClose={() => setOpen(false)}>
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
