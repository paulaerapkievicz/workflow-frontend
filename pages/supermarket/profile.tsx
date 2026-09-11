import { useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/supermarket/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import ProfileImageField from "@/src/components/ProfileImageField";
import FormField, { type FieldKind } from "@/src/components/FormField";
import panel from "@/styles/panel.module.scss";
import { useAuth } from "@/src/hooks/useAuth";
import { validateForm } from "@/src/lib/validators";
import {
  updateSupermarketProfile, uploadSupermarketImage,
} from "@/src/services/supermarketProfileService";

const FIELDS: { key: string; label: string; required?: boolean; kind?: FieldKind }[] = [
  { key: "name", label: "Nome fantasia", required: true },
  { key: "legalName", label: "Razão social" },
  { key: "cnpj", label: "CNPJ", required: true, kind: "cnpj" },
  { key: "address", label: "Endereço", required: true },
  { key: "phone", label: "Telefone", kind: "phone" },
  { key: "email", label: "E-mail de contato", kind: "email" },
];

function SupermarketProfilePage() {
  const { profile, refresh } = useAuth();
  const supermarketId = (profile?.id as string | undefined) ?? "";
  const membership = (profile as { membership?: { isOwner: boolean } } | null)?.membership ?? null;
  const canEdit = membership ? membership.isOwner : true;

  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!profile) return;
    setForm(Object.fromEntries(FIELDS.map((f) => [f.key, (profile[f.key] as string | null | undefined) ?? ""])));
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const errs = validateForm(
      FIELDS.filter((f) => f.kind).map((f) => ({
        name: f.key, value: form[f.key] ?? "", kind: f.kind!, required: f.required,
      }))
    );
    if (Object.keys(errs).length) {
      setMsg({ type: "err", text: "Confira os campos destacados antes de salvar." });
      return;
    }
    setSaving(true);
    try {
      await updateSupermarketProfile(supermarketId, {
        name: form.name, legalName: form.legalName || undefined, cnpj: form.cnpj,
        address: form.address, phone: form.phone || undefined, email: form.email || undefined,
      });
      await refresh();
      setMsg({ type: "ok", text: "Perfil salvo." });
    } catch (err) {
      setMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head><title>Perfil | Supermercado</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Perfil do supermercado</h1></header>
          <p className={panel.muted}>
            Dados cadastrais da matriz. Cada filial pode ter dados próprios em <strong>Filiais</strong> —
            o que faltar na filial usa o que está aqui.
          </p>
          {!canEdit && <p className={panel.error}>Só o proprietário do supermercado edita o perfil.</p>}

          <form className={panel.card} onSubmit={save} style={{ maxWidth: 560 }}>
            <div className={panel.form}>
              {FIELDS.map((f) => (
                f.kind ? (
                  <FormField key={f.key} label={f.label} kind={f.kind} required={f.required}
                    disabled={!canEdit} value={form[f.key] ?? ""}
                    onChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))} />
                ) : (
                  <label key={f.key} className={panel.filterField}>
                    <span>{f.label}{f.required ? " *" : ""}</span>
                    <input value={form[f.key] ?? ""} disabled={!canEdit} required={f.required}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />
                  </label>
                )
              ))}
              {msg && <p className={msg.type === "ok" ? panel.success : panel.error}>{msg.text}</p>}
              <button className={panel.primaryBtn} type="submit" disabled={saving || !canEdit}>
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>

          {canEdit && supermarketId && (
            <div className={panel.card} style={{ maxWidth: 560, marginTop: "1rem", display: "grid", gap: "1.25rem" }}>
              <ProfileImageField label="Foto do supermercado" shape="round"
                currentUrl={(profile?.profilePhotoUrl as string | null) ?? null}
                onUpload={(f) => uploadSupermarketImage(supermarketId, "photo", f)}
                onDone={refresh} />
              <ProfileImageField label="Logotipo" shape="rect"
                currentUrl={(profile?.logoUrl as string | null) ?? null}
                onUpload={(f) => uploadSupermarketImage(supermarketId, "logo", f)}
                onDone={refresh} />
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="supermarket">
      <SupermarketProfilePage />
    </RequireAuth>
  );
}
