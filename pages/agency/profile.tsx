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
import { buildWhatsAppLink } from "@/src/config/landingContact";

const DEFAULT_WHATSAPP_MESSAGE_PREVIEW = "Olá! Vim pelo site e queria falar com a agência.";

/** O backend guarda o WhatsApp com DDI (55 + local) — o campo mascarado edita só o local. */
const stripCountryCode = (v: string | null) => (v ? v.replace(/^55/, "") : "");

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

  const [waNumber, setWaNumber] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waSaving, setWaSaving] = useState(false);
  const [waMsg, setWaMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = () =>
    getAgencyProfile()
      .then((p) => {
        setProfile(p);
        setForm(Object.fromEntries(FIELDS.map((f) => [f.key, (p[f.key] as string | null) ?? ""])));
        setWaNumber(stripCountryCode(p.whatsappNumber));
        setWaMessage(p.whatsappMessage ?? "");
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

  const generateWhatsappLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaMsg(null);
    const errs = validateForm([{ name: "whatsappNumber", value: waNumber, kind: "phone", required: false }]);
    if (Object.keys(errs).length) {
      setWaMsg({ type: "err", text: "Confira o número de WhatsApp informado." });
      return;
    }
    setWaSaving(true);
    try {
      const p = await updateAgencyProfile({ whatsappNumber: waNumber, whatsappMessage: waMessage });
      setProfile(p);
      setWaNumber(stripCountryCode(p.whatsappNumber));
      setWaMessage(p.whatsappMessage ?? "");
      setWaMsg({
        type: "ok",
        text: p.whatsappNumber
          ? "Link gerado! O botão de WhatsApp da sua landing já está usando esse número."
          : "Configuração limpa — a landing volta a usar o WhatsApp padrão da plataforma.",
      });
    } catch (err) {
      setWaMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    } finally {
      setWaSaving(false);
    }
  };

  const landingUrl =
    profile && typeof window !== "undefined" ? `${window.location.origin}/p/${profile.id}` : "";
  const whatsappPreviewLink = profile?.whatsappNumber
    ? buildWhatsAppLink(profile.whatsappNumber, profile.whatsappMessage || DEFAULT_WHATSAPP_MESSAGE_PREVIEW)
    : null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setWaMsg({ type: "ok", text: "Copiado!" });
    } catch {
      setWaMsg({ type: "err", text: "Não foi possível copiar automaticamente — selecione e copie manualmente." });
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

              <form className={panel.card} onSubmit={generateWhatsappLink} style={{ maxWidth: 560, marginTop: "1rem" }}>
                <div className={panel.form}>
                  <h3 style={{ margin: 0 }}>WhatsApp da sua landing</h3>
                  <p className={panel.muted} style={{ marginTop: "-0.5rem" }}>
                    Informe o número e a mensagem que o botão de WhatsApp deve abrir na sua landing
                    pública (<code>{landingUrl || "/p/…"}</code>). Cada agência tem o seu próprio.
                  </p>

                  <FormField
                    label="Número de WhatsApp"
                    kind="phone"
                    value={waNumber}
                    onChange={setWaNumber}
                    placeholder="(54) 99999-9999"
                    hint="Com DDD — o código do país é adicionado automaticamente."
                  />

                  <label className={panel.filterField}>
                    <span>Mensagem de contato</span>
                    <textarea
                      value={waMessage}
                      maxLength={300}
                      placeholder={DEFAULT_WHATSAPP_MESSAGE_PREVIEW}
                      onChange={(e) => setWaMessage(e.target.value)}
                    />
                  </label>

                  {waMsg && <p className={waMsg.type === "ok" ? panel.success : panel.error}>{waMsg.text}</p>}

                  <button className={panel.primaryBtn} type="submit" disabled={waSaving}>
                    {waSaving ? "Gerando…" : "Gerar link do botão"}
                  </button>

                  {whatsappPreviewLink && (
                    <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                        <span className={panel.muted}>Link do botão:</span>
                        <code style={{ wordBreak: "break-all" }}>{whatsappPreviewLink}</code>
                        <button
                          type="button"
                          className={panel.linkBtn}
                          onClick={() => copyToClipboard(whatsappPreviewLink)}
                        >
                          Copiar
                        </button>
                      </div>
                      {landingUrl && (
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                          <span className={panel.muted}>Sua landing:</span>
                          <code style={{ wordBreak: "break-all" }}>{landingUrl}</code>
                          <button type="button" className={panel.linkBtn} onClick={() => copyToClipboard(landingUrl)}>
                            Copiar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </form>
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
