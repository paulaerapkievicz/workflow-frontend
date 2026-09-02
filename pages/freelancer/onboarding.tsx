import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import {
  getContract, saveContract, getUniform, requestUniform, confirmUniformReceived,
  submitUniformSelfie, syncUniformPayment, SHIRT_SIZES, UNIFORM_STATUS_LABELS, UniformOrder,
} from "@/src/services/onboardingService";
import { photoUrl } from "@/src/services/jobPhotoService";
import { useAuth } from "@/src/hooks/useAuth";

type Field = { key: string; label: string; type?: "text" | "date" | "number"; required?: boolean };

const SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: "Dados pessoais",
    fields: [
      { key: "fullName", label: "Nome completo", required: true },
      { key: "cpf", label: "CPF", required: true },
      { key: "rg", label: "RG", required: true },
      { key: "rgIssuer", label: "Órgão emissor" },
      { key: "pisNis", label: "PIS/NIS", required: true },
      { key: "birthDate", label: "Data de nascimento", type: "date", required: true },
      { key: "gender", label: "Gênero" },
      { key: "maritalStatus", label: "Estado civil", required: true },
      { key: "nationality", label: "Nacionalidade", required: true },
      { key: "motherName", label: "Nome da mãe", required: true },
      { key: "fatherName", label: "Nome do pai" },
      { key: "educationLevel", label: "Escolaridade" },
      { key: "ctpsNumber", label: "CTPS - número" },
      { key: "ctpsSeries", label: "CTPS - série" },
    ],
  },
  {
    title: "Endereço",
    fields: [
      { key: "addressCep", label: "CEP", required: true },
      { key: "addressStreet", label: "Rua", required: true },
      { key: "addressNumber", label: "Número", required: true },
      { key: "addressComplement", label: "Complemento" },
      { key: "addressNeighborhood", label: "Bairro", required: true },
      { key: "addressCity", label: "Cidade", required: true },
      { key: "addressState", label: "UF", required: true },
    ],
  },
  {
    title: "Dados bancários",
    fields: [
      { key: "bankName", label: "Banco", required: true },
      { key: "bankBranch", label: "Agência", required: true },
      { key: "bankAccount", label: "Conta", required: true },
      { key: "bankAccountType", label: "Tipo de conta" },
      { key: "pixKey", label: "Chave Pix" },
    ],
  },
  {
    title: "Contato de emergência",
    fields: [
      { key: "emergencyContactName", label: "Nome", required: true },
      { key: "emergencyContactPhone", label: "Telefone", required: true },
    ],
  },
];

const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);
const REQUIRED_KEYS = ALL_FIELDS.filter((f) => f.required).map((f) => f.key).concat("shirtSize");

function OnboardingPage() {
  const { refresh } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [contractDone, setContractDone] = useState(false);
  const [uniform, setUniform] = useState<UniformOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [uniformErr, setUniformErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, u0] = await Promise.all([getContract(), getUniform()]);
      if (c) {
        const v: Record<string, string> = {};
        for (const f of ALL_FIELDS) v[f.key] = (c[f.key] as string) ?? "";
        v.shirtSize = (c.shirtSize as string) ?? "";
        setValues(v);
        setContractDone(!!c.completedAt);
      }
      // Sem webhook público (dev local) o pagamento não se confirma sozinho:
      // ao reabrir a tela, checamos o status direto no Mercado Pago.
      let u = u0;
      if (u0 && u0.status === "pending_payment") {
        try { u = await syncUniformPayment(u0.id); } catch { /* mantém pending */ }
      }
      setUniform(u);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const missing = useMemo(
    () => REQUIRED_KEYS.filter((k) => !(values[k] ?? "").trim()),
    [values]
  );

  const set = (k: string, v: string) => setValues((cur) => ({ ...cur, [k]: v }));

  const save = async () => {
    setMsg(null);
    setShowErrors(true);
    setSaving(true);
    try {
      const c = await saveContract(values);
      setContractDone(!!c.completedAt);
      setMsg(
        c.completedAt
          ? { type: "ok", text: "Perfil contratual concluído." }
          : {
              type: "err",
              text: `Rascunho salvo — faltam ${missing.length} ${
                missing.length === 1 ? "campo obrigatório" : "campos obrigatórios"
              }, destacados em vermelho.`,
            }
      );
      await refresh();
    } catch (err) {
      setMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg(null);
    try { await fn(); await load(); await refresh(); }
    catch (err) { setMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." }); }
    finally { setBusy(false); }
  };

  const buyUniform = async () => {
    setUniformErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const u = await requestUniform(values.shirtSize);
      await load();
      await refresh();
      if (u.paymentUrl) {
        const win = window.open(u.paymentUrl, "_blank", "noopener");
        if (!win) {
          setUniformErr(
            'Pagamento liberado. Se a aba não abriu, clique em "Ir para o pagamento" abaixo.'
          );
        }
      } else {
        setUniformErr("Não recebemos o link de pagamento. Tente novamente em instantes.");
      }
    } catch (err) {
      setUniformErr(
        axios.isAxiosError(err)
          ? err.response?.data?.message ?? "Não foi possível iniciar a compra do uniforme."
          : "Não foi possível iniciar a compra do uniforme."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head><title>Onboarding | Colaborador</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Onboarding</h1></header>
          <p className={panel.muted}>
            Preencha o seu perfil contratual e conclua a etapa do uniforme para poder aceitar vagas.
          </p>
          {msg && <p className={msg.type === "ok" ? panel.success : panel.error}>{msg.text}</p>}

          {loading ? (
            <p>Carregando…</p>
          ) : (
            <>
              <div className={panel.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>1. Perfil contratual</strong>
                  <span className={`${panel.badge} ${contractDone ? panel.badgeDone : panel.badgePending}`}>
                    {contractDone ? "Concluído" : `Faltam ${missing.length} campos`}
                  </span>
                </div>
                {SECTIONS.map((sec) => (
                  <div key={sec.title} style={{ marginTop: "0.8rem" }}>
                    <p style={{ fontWeight: 600, margin: "0.4rem 0" }}>{sec.title}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.6rem" }}>
                      {sec.fields.map((f) => {
                        const invalid =
                          showErrors && f.required && !(values[f.key] ?? "").trim();
                        return (
                          <label key={f.key} className={panel.filterField}>
                            <span>
                              {f.label}
                              {f.required ? " *" : ""}
                            </span>
                            <input
                              type={f.type === "date" ? "date" : "text"}
                              value={values[f.key] ?? ""}
                              onChange={(e) => set(f.key, e.target.value)}
                              aria-invalid={invalid || undefined}
                              style={
                                invalid
                                  ? { borderColor: "var(--danger)", background: "var(--danger-soft)" }
                                  : undefined
                              }
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: "0.8rem" }}>
                  <label className={panel.filterField} style={{ maxWidth: 220 }}>
                    <span>Tamanho da camiseta *</span>
                    <select
                      value={values.shirtSize ?? ""}
                      onChange={(e) => set("shirtSize", e.target.value)}
                      aria-invalid={(showErrors && !values.shirtSize) || undefined}
                      style={
                        showErrors && !values.shirtSize
                          ? { borderColor: "var(--danger)", background: "var(--danger-soft)" }
                          : undefined
                      }
                    >
                      <option value="">Selecione…</option>
                      {SHIRT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                </div>
                <button className={panel.primaryBtn} onClick={save} disabled={saving} style={{ marginTop: "0.8rem" }}>
                  {saving ? "Salvando…" : "Salvar perfil"}
                </button>
              </div>

              <div className={panel.card} style={{ marginTop: "1rem" }}>
                <strong>2. Uniforme</strong>
                {uniformErr && (
                  <p className={panel.error} style={{ marginTop: "0.5rem" }}>{uniformErr}</p>
                )}
                {!contractDone ? (
                  <p className={panel.muted}>Conclua o perfil contratual para comprar o uniforme.</p>
                ) : !uniform ? (
                  <div style={{ marginTop: "0.5rem" }}>
                    <p className={panel.muted}>
                      {values.shirtSize
                        ? "Finalize a compra para receber o link de pagamento."
                        : "Escolha o tamanho da camiseta no perfil acima para liberar a compra."}
                    </p>
                    <button className={panel.primaryBtn} disabled={busy || !values.shirtSize} onClick={buyUniform}>
                      {busy ? "Processando…" : "Comprar uniforme"}
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: "0.5rem" }}>
                    <p>
                      Tamanho <strong>{uniform.shirtSize}</strong> · R$ {Number(uniform.amount).toFixed(2)} ·{" "}
                      <span className={panel.badge}>{UNIFORM_STATUS_LABELS[uniform.status]}</span>
                    </p>
                    {uniform.trackingCode && <p className={panel.muted}>Rastreio: {uniform.trackingCode}</p>}
                    {uniform.rejectionReason && <p className={panel.error}>Motivo da recusa: {uniform.rejectionReason}</p>}

                    {uniform.status === "pending_payment" && (
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                        {uniform.paymentUrl && (
                          <a
                            className={panel.primaryBtn}
                            href={uniform.paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "none" }}
                          >
                            Ir para o pagamento
                          </a>
                        )}
                        <button className={panel.ghostBtn} disabled={busy} onClick={buyUniform}>
                          {busy ? "Processando…" : "Gerar novo link"}
                        </button>
                      </div>
                    )}
                    {uniform.status === "shipped" && (
                      <button className={panel.primaryBtn} disabled={busy} onClick={() => act(() => confirmUniformReceived(uniform.id))}>
                        Confirmar recebimento
                      </button>
                    )}
                    {["delivered", "photo_submitted", "rejected"].includes(uniform.status) && (
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.5rem" }}>
                        <input type="file" accept="image/*" capture="user" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} />
                        <button className={panel.primaryBtn} disabled={busy || !selfie}
                          onClick={() => selfie && act(() => submitUniformSelfie(uniform.id, selfie))}>
                          {uniform.status === "rejected" || uniform.status === "photo_submitted" ? "Reenviar selfie" : "Enviar selfie de uniforme"}
                        </button>
                      </div>
                    )}
                    {uniform.selfiePhotoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl(uniform.selfiePhotoUrl)} alt="Selfie de uniforme" style={{ maxWidth: 200, borderRadius: 12, marginTop: "0.5rem" }} />
                    )}
                    {uniform.status === "approved" && <p className={panel.success}>Uniforme aprovado — você já pode aceitar vagas!</p>}
                  </div>
                )}
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
    <RequireAuth role="freelancer">
      <OnboardingPage />
    </RequireAuth>
  );
}
