import { useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/admin/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import Modal from "@/src/components/common/Modal";
import panel from "@/styles/panel.module.scss";
import { listAgencies, createAgency, updateAgency, AdminAgency } from "@/src/services/adminService";
import FormField from "@/src/components/FormField";
import { validateForm } from "@/src/lib/validators";
import { maskCnpj } from "@/src/lib/masks";

const EMPTY = {
  name: "", legalName: "", cnpj: "", address: "", phone: "", email: "",
  ownerName: "", ownerEmail: "", password: "",
};

function errText(e: unknown) {
  return axios.isAxiosError(e) ? e.response?.data?.message ?? "Erro." : "Erro.";
}

function AdminAgenciesPage() {
  const [agencies, setAgencies] = useState<AdminAgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [edit, setEdit] = useState<AdminAgency | null>(null);

  const load = () =>
    listAgencies()
      .then(setAgencies)
      .catch(() => setMsg({ type: "err", text: "Não foi possível listar as agências." }))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const errs = validateForm([
      { name: "cnpj", value: form.cnpj, kind: "cnpj", required: true },
      { name: "email", value: form.email, kind: "email" },
      { name: "phone", value: form.phone, kind: "phone" },
      { name: "ownerEmail", value: form.ownerEmail, kind: "email", required: true },
    ]);
    if (Object.keys(errs).length) {
      setMsg({ type: "err", text: "Confira os campos destacados antes de salvar." });
      return;
    }
    setCreating(true);
    try {
      const { owner } = await createAgency({
        name: form.name,
        legalName: form.legalName || undefined,
        cnpj: form.cnpj,
        address: form.address,
        phone: form.phone || undefined,
        email: form.email || undefined,
        ownerName: form.ownerName || form.name,
        ownerEmail: form.ownerEmail,
        password: form.password,
      });
      setForm(EMPTY);
      setMsg({ type: "ok", text: `Agência criada. Login do responsável: ${owner.email}` });
      await load();
    } catch (err) {
      setMsg({ type: "err", text: errText(err) });
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (a: AdminAgency) => {
    if (!confirm(`${a.active ? "Desativar" : "Reativar"} a agência ${a.name}?`)) return;
    try {
      await updateAgency(a.id, { active: !a.active });
      await load();
    } catch (err) {
      setMsg({ type: "err", text: errText(err) });
    }
  };

  return (
    <>
      <Head><title>Agências | Administração</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Agências</h1></header>
          <p className={panel.muted}>
            Cadastre uma nova agência e o login do responsável. A agência completa o próprio perfil
            (logotipo, contato, contratos) depois de entrar.
          </p>

          {msg && <p className={msg.type === "ok" ? panel.success : panel.error}>{msg.text}</p>}

          <form className={panel.card} onSubmit={submit} style={{ maxWidth: 620 }}>
            <strong>Nova agência</strong>
            <div className={panel.form} style={{ marginTop: "0.6rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <label className={panel.filterField}><span>Nome fantasia *</span>
                  <input value={form.name} onChange={(e) => set("name", e.target.value)} required /></label>
                <label className={panel.filterField}><span>Razão social</span>
                  <input value={form.legalName} onChange={(e) => set("legalName", e.target.value)} /></label>
                <FormField label="CNPJ" kind="cnpj" required placeholder="00.000.000/0000-00"
                  value={form.cnpj} onChange={(v) => set("cnpj", v)} />
                <FormField label="Telefone" kind="phone" placeholder="(00) 00000-0000"
                  value={form.phone} onChange={(v) => set("phone", v)} />
                <label className={panel.filterField} style={{ gridColumn: "1 / -1" }}><span>Endereço *</span>
                  <input value={form.address} onChange={(e) => set("address", e.target.value)}
                    placeholder="Rua Dirceu Sander, 719, Passo Fundo RS" required /></label>
                <FormField label="E-mail de contato" kind="email" style={{ gridColumn: "1 / -1" }}
                  value={form.email} onChange={(v) => set("email", v)} />
              </div>

              <hr style={{ width: "100%", borderColor: "var(--border)" }} />
              <span className={panel.muted}>Login do responsável (dono da agência)</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <label className={panel.filterField}><span>Nome do responsável</span>
                  <input value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)}
                    placeholder="(usa o nome fantasia se vazio)" /></label>
                <FormField label="E-mail de acesso" kind="email" required
                  value={form.ownerEmail} onChange={(v) => set("ownerEmail", v)} />
                <label className={panel.filterField}><span>Senha inicial *</span>
                  <input type="text" minLength={4} value={form.password}
                    onChange={(e) => set("password", e.target.value)} required /></label>
              </div>

              <button className={panel.primaryBtn} type="submit" disabled={creating}>
                {creating ? "Criando…" : "Criar agência"}
              </button>
            </div>
          </form>

          <h2 style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>Agências cadastradas ({agencies.length})</h2>
          <div className={panel.tableWrap}>
            <table className={panel.table}>
              <thead><tr><th>Agência</th><th>CNPJ</th><th>Responsável</th><th>Clientes</th><th>Colab.</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7}>Carregando…</td></tr>
                ) : agencies.length === 0 ? (
                  <tr><td colSpan={7} className={panel.muted}>Nenhuma agência.</td></tr>
                ) : agencies.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.name}</strong>
                      {a.legalName && <><br /><span className={panel.muted}>{a.legalName}</span></>}
                    </td>
                    <td>{maskCnpj(a.cnpj)}</td>
                    <td>{a.owner?.email ?? "—"}</td>
                    <td>{a.supermarketCount ?? 0}</td>
                    <td>{a.freelancerCount ?? 0}</td>
                    <td>
                      <span className={`${panel.badge} ${a.active ? panel.badgeApproved : panel.badgeCanceled}`}>
                        {a.active ? "Ativa" : "Desativada"}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className={panel.ghostBtn} onClick={() => setEdit(a)}>Editar</button>{" "}
                      <button className={panel.secondaryBtn} onClick={() => toggleActive(a)}>
                        {a.active ? "Desativar" : "Reativar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {edit && (
        <EditAgencyModal
          agency={edit}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); load(); }}
        />
      )}
    </>
  );
}

function EditAgencyModal({ agency, onClose, onSaved }: {
  agency: AdminAgency; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: agency.name, legalName: agency.legalName ?? "", cnpj: agency.cnpj,
    address: agency.address, phone: agency.phone ?? "", email: agency.email ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setErr(null);
    const errs = validateForm([
      { name: "cnpj", value: form.cnpj, kind: "cnpj", required: true },
      { name: "phone", value: form.phone, kind: "phone" },
      { name: "email", value: form.email, kind: "email" },
    ]);
    if (Object.keys(errs).length) {
      setErr("Confira os campos destacados antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      await updateAgency(agency.id, {
        name: form.name, legalName: form.legalName || undefined, cnpj: form.cnpj,
        address: form.address, phone: form.phone || undefined, email: form.email || undefined,
      });
      onSaved();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Editar ${agency.name}`} onClose={onClose}>
      <div className={panel.form}>
        {([["name", "Nome fantasia"], ["legalName", "Razão social"],
          ["address", "Endereço"]] as const).map(([k, label]) => (
          <label key={k} className={panel.filterField}>
            <span>{label}</span>
            <input value={form[k]} onChange={(e) => set(k, e.target.value)} />
          </label>
        ))}
        <FormField label="CNPJ" kind="cnpj" required value={form.cnpj} onChange={(v) => set("cnpj", v)} />
        <FormField label="Telefone" kind="phone" value={form.phone} onChange={(v) => set("phone", v)} />
        <FormField label="E-mail de contato" kind="email" value={form.email} onChange={(v) => set("email", v)} />
        {err && <p className={panel.error}>{err}</p>}
        <button className={panel.primaryBtn} onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}

export default function Page() {
  return (
    <RequireAuth role="admin">
      <AdminAgenciesPage />
    </RequireAuth>
  );
}
