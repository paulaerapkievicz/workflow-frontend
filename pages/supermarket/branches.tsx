import { useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/supermarket/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import {
  getBranches, createBranch, deleteBranch, geocodeAddress, branchHasLocation, Branch,
} from "@/src/services/branchService";
import {
  getBranchProfile, updateBranchProfile, uploadBranchImage, ResolvedBranchProfile,
} from "@/src/services/supermarketProfileService";
import ProfileImageField from "@/src/components/ProfileImageField";
import FormField from "@/src/components/FormField";
import { validateForm } from "@/src/lib/validators";
import { authService } from "@/src/services/authService";

const emptyForm = {
  id: "", name: "", address: "", phone: "", legalName: "", cnpj: "", email: "",
};

function BranchesPage() {
  const supermarketId = authService.getProfileId() ?? "";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoMsg, setGeoMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [resolved, setResolved] = useState<ResolvedBranchProfile | null>(null);
  const editingBranch = branches.find((b) => b.id === form.id) ?? null;

  const load = async () => {
    const all = await getBranches();
    setBranches(all.filter((b) => b.supermarketId === supermarketId));
  };
  useEffect(() => { load().catch(() => {}); }, []); // eslint-disable-line

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setForm({ ...emptyForm });
    setResolved(null);
    setError(null); setGeoMsg(null); setOpen(true);
  };
  const openEdit = async (b: Branch) => {
    setForm({
      id: b.id, name: b.name, address: b.address, phone: b.phone ?? "",
      legalName: b.legalName ?? "", cnpj: b.cnpj ?? "", email: b.email ?? "",
    });
    setResolved(null);
    setError(null);
    setGeoMsg(branchHasLocation(b) ? { type: "ok", text: "Localização já definida pelo endereço." } : null);
    setOpen(true);
    try { setResolved((await getBranchProfile(b.id)).profile); } catch { /* opcional */ }
  };

  const testGeocode = async () => {
    if (!form.address.trim()) return;
    setGeoBusy(true);
    setGeoMsg(null);
    try {
      const r = await geocodeAddress(form.address);
      setGeoMsg({ type: "ok", text: `Encontrado: ${r.displayName}` });
    } catch (err) {
      setGeoMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Não localizado." : "Não localizado." });
    } finally {
      setGeoBusy(false);
    }
  };

  const save = async () => {
    setError(null);
    const errs = validateForm([
      { name: "phone", value: form.phone, kind: "phone" },
      { name: "cnpj", value: form.cnpj, kind: "cnpj" },
      { name: "email", value: form.email, kind: "email" },
    ]);
    if (Object.keys(errs).length) {
      setError("Confira os campos destacados antes de salvar.");
      return;
    }
    try {
      if (form.id) {
        await updateBranchProfile(form.id, {
          name: form.name, address: form.address, phone: form.phone,
          legalName: form.legalName, cnpj: form.cnpj, email: form.email,
        });
      } else {
        await createBranch({ name: form.name, address: form.address, phone: form.phone, regeocode: true, supermarketId });
      }
      setOpen(false);
      await load();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao salvar." : "Erro ao salvar.");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta filial?")) return;
    try { await deleteBranch(id); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  return (
    <>
      <Head><title>Filiais | Supermercado</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>Filiais</h1>
            <button className={panel.primaryBtn} onClick={openNew}>Nova filial</button>
          </header>
          <p className={panel.muted}>
            A localização usada no check-in vem do <strong>endereço da filial</strong>. O raio permitido é
            configurado pela agência.
          </p>

          <div style={{ overflowX: "auto" }}>
            <table className={panel.table}>
              <thead><tr><th>Nome</th><th>Endereço</th><th>Telefone</th><th>Localização</th><th>Ações</th></tr></thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.id}>
                    <td>{b.name}</td>
                    <td>{b.address}</td>
                    <td>{b.phone ?? "—"}</td>
                    <td>
                      {branchHasLocation(b)
                        ? <span className={`${panel.badge} ${panel.badgeDone}`}>definida pelo endereço</span>
                        : <span className={`${panel.badge} ${panel.badgePending}`}>não localizada</span>}
                    </td>
                    <td>
                      <button className={panel.ghostBtn} onClick={() => openEdit(b)}>Editar</button>
                      <button className={panel.secondaryBtn} onClick={() => remove(b.id)}>Excluir</button>
                    </td>
                  </tr>
                ))}
                {branches.length === 0 && <tr><td colSpan={5} className={panel.muted}>Nenhuma filial cadastrada.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {open && (
        <Modal title={form.id ? "Editar filial" : "Nova filial"} onClose={() => setOpen(false)}>
          <div className={panel.form}>
            <label>Nome</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} />
            <label>Endereço completo</label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Rua, número - bairro, cidade/UF" />
            <button type="button" className={panel.ghostBtn} onClick={testGeocode} disabled={geoBusy || !form.address.trim()}>
              {geoBusy ? "Buscando…" : "Buscar localização pelo endereço"}
            </button>
            {geoMsg && <p className={geoMsg.type === "ok" ? panel.success : panel.error}>{geoMsg.text}</p>}
            <FormField label="Telefone" kind="phone" placeholder="(00) 00000-0000"
              value={form.phone} onChange={(v) => set("phone", v)} />

            {form.id && (
              <>
                <hr style={{ width: "100%", borderColor: "var(--border)" }} />
                <p className={panel.muted} style={{ margin: 0 }}>
                  Dados cadastrais da filial. Deixe em branco para <strong>usar o cadastro da matriz</strong>.
                </p>
                <label>Razão social</label>
                <input value={form.legalName} onChange={(e) => set("legalName", e.target.value)}
                  placeholder={resolved?.inherited.includes("legalName") ? `matriz: ${resolved?.legalName ?? ""}` : ""} />
                <FormField label="CNPJ" kind="cnpj" value={form.cnpj} onChange={(v) => set("cnpj", v)}
                  placeholder={resolved?.inherited.includes("cnpj") ? `matriz: ${resolved?.cnpj ?? ""}` : "00.000.000/0000-00"} />
                <FormField label="E-mail" kind="email" value={form.email} onChange={(v) => set("email", v)}
                  placeholder={resolved?.inherited.includes("email") ? `matriz: ${resolved?.email ?? ""}` : ""} />

                {editingBranch && (
                  <div style={{ display: "grid", gap: "1rem", marginTop: "0.5rem" }}>
                    <ProfileImageField label="Logotipo da filial" shape="rect"
                      hint={resolved?.inherited.includes("logoUrl") ? "Hoje usa o logotipo da matriz." : undefined}
                      currentUrl={editingBranch.logoUrl ?? null}
                      onUpload={(f) => uploadBranchImage(editingBranch.id, "logo", f)}
                      onDone={load} />
                    <ProfileImageField label="Foto da filial" shape="round"
                      hint={resolved?.inherited.includes("profilePhotoUrl") ? "Hoje usa a foto da matriz." : undefined}
                      currentUrl={editingBranch.profilePhotoUrl ?? null}
                      onUpload={(f) => uploadBranchImage(editingBranch.id, "photo", f)}
                      onDone={load} />
                  </div>
                )}
              </>
            )}

            {error && <p className={panel.error}>{error}</p>}
            <button className={panel.primaryBtn} onClick={save} disabled={!form.name || !form.address}>Salvar</button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="supermarket">
      <BranchesPage />
    </RequireAuth>
  );
}
