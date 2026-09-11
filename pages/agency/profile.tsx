import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import ProfileImageField from "@/src/components/ProfileImageField";
import FormField, { type FieldKind } from "@/src/components/FormField";
import panel from "@/styles/panel.module.scss";
import { validateForm } from "@/src/lib/validators";
import {
  getAgencyProfile, updateAgencyProfile, uploadAgencyLogo, uploadAgencyPhoto, AgencyProfile,
} from "@/src/services/agencyProfileService";

const FIELDS: { key: keyof AgencyProfile; label: string; required?: boolean; kind?: FieldKind }[] = [
  { key: "name", label: "Nome fantasia", required: true },
  { key: "legalName", label: "Razão social" },
  { key: "cnpj", label: "CNPJ", required: true, kind: "cnpj" },
  { key: "address", label: "Endereço", required: true },
  { key: "phone", label: "Telefone", kind: "phone" },
  { key: "email", label: "E-mail de contato", kind: "email" },
];

function AgencyProfilePage() {
  const [profile, setProfile] = useState<AgencyProfile | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = () =>
    getAgencyProfile()
      .then((p) => {
        setProfile(p);
        setForm(Object.fromEntries(FIELDS.map((f) => [f.key, (p[f.key] as string | null) ?? ""])));
      })
      .catch(() => setMsg({ type: "err", text: "Não foi possível carregar o perfil." }))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const errs = validateForm(
      FIELDS.filter((f) => f.kind).map((f) => ({
        name: String(f.key), value: form[f.key] ?? "", kind: f.kind!, required: f.required,
      }))
    );
    if (Object.keys(errs).length) {
      setMsg({ type: "err", text: "Confira os campos destacados antes de salvar." });
      return;
    }
    setSaving(true);
    try {
      const p = await updateAgencyProfile({
        name: form.name,
        legalName: form.legalName || undefined,
        cnpj: form.cnpj,
        address: form.address,
        phone: form.phone || undefined,
        email: form.email || undefined,
      });
      setProfile(p);
      setMsg({ type: "ok", text: "Dados cadastrais salvos." });
    } catch (err) {
      setMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head><title>Perfil da agência | WorkFlow</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Perfil da agência</h1></header>
          <p className={panel.muted}>
            Estes dados aparecem no seu perfil e são usados nos contratos dos colaboradores.{" "}
            <Link href="/agency/settings" className={panel.linkBtn}>Ir para Configurações operacionais</Link>
          </p>

          {loading ? (
            <p>Carregando…</p>
          ) : (
            <>
              <form className={panel.card} onSubmit={save} style={{ maxWidth: 560 }}>
                <div className={panel.form}>
                  {FIELDS.map((f) => (
                    f.kind ? (
                      <FormField key={f.key} label={f.label} kind={f.kind} required={f.required}
                        value={form[f.key] ?? ""}
                        onChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))} />
                    ) : (
                      <label key={f.key} className={panel.filterField}>
                        <span>{f.label}{f.required ? " *" : ""}</span>
                        <input
                          value={form[f.key] ?? ""}
                          required={f.required}
                          onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                        />
                      </label>
                    )
                  ))}
                  {msg && <p className={msg.type === "ok" ? panel.success : panel.error}>{msg.text}</p>}
                  <button className={panel.primaryBtn} type="submit" disabled={saving}>
                    {saving ? "Salvando…" : "Salvar dados cadastrais"}
                  </button>
                </div>
              </form>

              <div className={panel.card} style={{ maxWidth: 560, marginTop: "1rem", display: "grid", gap: "1.25rem" }}>
                <ProfileImageField
                  label="Foto de perfil"
                  hint="Mostrada no perfil da agência."
                  shape="round"
                  currentUrl={profile?.profilePhotoUrl ?? null}
                  onUpload={uploadAgencyPhoto}
                  onDone={load}
                />
                <ProfileImageField
                  label="Logotipo"
                  hint="Usado no topo do PDF do contrato e nas telas da agência."
                  shape="rect"
                  currentUrl={profile?.logoUrl ?? null}
                  onUpload={uploadAgencyLogo}
                  onDone={load}
                />
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="agency">
      <AgencyProfilePage />
    </RequireAuth>
  );
}
