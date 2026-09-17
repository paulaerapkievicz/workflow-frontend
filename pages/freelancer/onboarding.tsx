import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import {
  getContract, saveContract, getUniform, requestUniform, confirmUniformReceived,
  syncUniformPayment, SHIRT_SIZES, UNIFORM_STATUS_LABELS, UniformOrder, PHOTO_STATUS_LABELS,
  FREELANCER_PIX_KEY_TYPES, PIX_KEY_TYPE_LABELS, type FreelancerPixKeyType,
} from "@/src/services/onboardingService";
import { photoUrl } from "@/src/services/jobPhotoService";
import { uploadMyProfilePhoto } from "@/src/services/freelancerService";
import { useAuth } from "@/src/hooks/useAuth";
import Link from "next/link";
import FormField from "@/src/components/FormField";
import FileField from "@/src/components/FileField";
import { validateForm } from "@/src/lib/validators";
import HelpIcon from "@/src/components/common/HelpIcon";
import {
  CONTRACT_SECTIONS as SECTIONS, CONTRACT_ALL_FIELDS as ALL_FIELDS,
  CONTRACT_REQUIRED_KEYS as REQUIRED_KEYS, PIX_FIELD_KIND,
} from "@/src/lib/freelancerContractFields";

function OnboardingPage() {
  const { profile, refresh } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [contractDone, setContractDone] = useState(false);
  const [uniform, setUniform] = useState<UniformOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [uniformErr, setUniformErr] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoErr, setProfilePhotoErr] = useState<string | null>(null);
  const profilePhotoUrl = (profile?.profilePhotoUrl as string | null | undefined) ?? null;
  const appPaymentEnabledForFreelancers =
    (profile as { affiliatedAgency?: { appPaymentEnabledForFreelancers?: boolean } } | null)
      ?.affiliatedAgency?.appPaymentEnabledForFreelancers !== false;
  const onboarding = (profile as {
    onboarding?: {
      requireUniformPurchase?: boolean;
      requirePhotoApproval?: boolean;
      photoStatus?: "none" | "pending" | "approved" | "rejected";
      photoRejectionReason?: string | null;
      approved?: boolean;
      contractTemplateAvailable?: boolean;
      contractSigned?: boolean;
    };
  } | null)?.onboarding;
  const requireUniformPurchase = !!onboarding?.requireUniformPurchase;
  const requirePhotoApproval = !!onboarding?.requirePhotoApproval;
  const photoStatus = onboarding?.photoStatus ?? "none";
  const photoRejectionReason = onboarding?.photoRejectionReason ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, u0] = await Promise.all([getContract(), getUniform()]);
      if (c) {
        const v: Record<string, string> = {};
        for (const f of ALL_FIELDS) v[f.key] = (c[f.key] as string) ?? "";
        v.shirtSize = (c.shirtSize as string) ?? "";
        v.pixKey = (c.pixKey as string) ?? "";
        v.pixKeyType = (c.pixKeyType as string) ?? "";
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
    const pixKind = PIX_FIELD_KIND[(values.pixKeyType as FreelancerPixKeyType) || "aleatoria"];
    const fieldErrs = validateForm(
      ALL_FIELDS.filter((f) => f.kind).map((f) => ({
        name: f.key, value: values[f.key] ?? "", kind: f.kind!, required: f.required,
      })).concat([{ name: "pixKey", value: values.pixKey ?? "", kind: pixKind, required: true }])
    );
    if (Object.keys(fieldErrs).length) {
      setMsg({ type: "err", text: "Confira os campos destacados — há valores inválidos." });
      return;
    }
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

  const sendProfilePhoto = async () => {
    if (!profilePhoto) return;
    setProfilePhotoErr(null);
    setBusy(true);
    try {
      await uploadMyProfilePhoto(profilePhoto);
      setProfilePhoto(null);
      await refresh();
    } catch (err) {
      setProfilePhotoErr(
        axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao enviar foto." : "Erro ao enviar foto."
      );
    } finally {
      setBusy(false);
    }
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
      } else if (appPaymentEnabledForFreelancers) {
        setUniformErr("Não recebemos o link de pagamento. Tente novamente em instantes.");
      }
      // Sem paymentUrl e com o pagamento pelo app desligado: pedido registrado, sem erro —
      // a agência confirma manualmente (ver mensagem no card abaixo).
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

  // Numeração dinâmica dos cards — a seção de uniforme só existe (e só conta) quando exigida.
  let stepCounter = 1;
  const perfilStep = stepCounter++;
  const uniformStep = requireUniformPurchase ? stepCounter++ : null;
  const fotoStep = stepCounter++;
  const contractStep = stepCounter++;

  return (
    <>
      <Head><title>Onboarding | Colaborador</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>
              Onboarding
              <HelpIcon title="Como funciona o onboarding">
                <p>Preencha o seu perfil contratual e as demais etapas exigidas pela sua agência para poder aceitar vagas.</p>
              </HelpIcon>
            </h1>
          </header>
          {msg && <p className={msg.type === "ok" ? panel.success : panel.error}>{msg.text}</p>}

          {loading ? (
            <p>Carregando…</p>
          ) : (
            <>
              <div className={panel.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{perfilStep}. Perfil contratual</strong>
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
                        if (f.kind) {
                          return (
                            <FormField
                              key={f.key}
                              label={f.label}
                              kind={f.kind}
                              required={f.required}
                              maxLength={f.maxLength}
                              value={values[f.key] ?? ""}
                              onChange={(v) => set(f.key, v)}
                              error={invalid ? "Campo obrigatório" : undefined}
                            />
                          );
                        }
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
                  <p style={{ fontWeight: 600, margin: "0.4rem 0", display: "flex", alignItems: "center", gap: 4 }}>
                    Chave Pix
                    <HelpIcon title="Chave Pix pessoal">
                      <p>
                        A chave Pix cadastrada aqui precisa ser <strong>sua</strong> — a mesma pessoa do
                        CPF, do e-mail de login ou do telefone informados no seu cadastro, conforme o
                        tipo escolhido. Chave de terceiro (de outra pessoa) é recusada.
                      </p>
                      <p>
                        Sem uma chave Pix própria cadastrada não é possível aceitar vagas — é o único
                        jeito de você receber o pagamento.
                      </p>
                    </HelpIcon>
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.6rem" }}>
                    <label className={panel.filterField}>
                      <span>Tipo de chave Pix *</span>
                      <select
                        value={values.pixKeyType ?? ""}
                        onChange={(e) => set("pixKeyType", e.target.value)}
                        aria-invalid={(showErrors && !values.pixKeyType) || undefined}
                        style={
                          showErrors && !values.pixKeyType
                            ? { borderColor: "var(--danger)", background: "var(--danger-soft)" }
                            : undefined
                        }
                      >
                        <option value="">Selecione…</option>
                        {FREELANCER_PIX_KEY_TYPES.map((t) => (
                          <option key={t} value={t}>{PIX_KEY_TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                    </label>
                    <FormField
                      label="Chave Pix"
                      kind={PIX_FIELD_KIND[(values.pixKeyType as FreelancerPixKeyType) || "aleatoria"]}
                      required
                      value={values.pixKey ?? ""}
                      onChange={(v) => set("pixKey", v)}
                      error={showErrors && !(values.pixKey ?? "").trim() ? "Campo obrigatório" : undefined}
                      hint="Precisa ser a sua própria chave — não pode ser de terceiros."
                    />
                  </div>
                </div>
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

              {requireUniformPurchase && (
                <div className={panel.card} style={{ marginTop: "1rem" }}>
                  <strong>{uniformStep}. Uniforme</strong>
                  {uniformErr && (
                    <p className={panel.error} style={{ marginTop: "0.5rem" }}>{uniformErr}</p>
                  )}
                  {!contractDone ? (
                    <p className={panel.muted}>Conclua o perfil contratual para comprar o uniforme.</p>
                  ) : !uniform ? (
                    <div style={{ marginTop: "0.5rem" }}>
                      <p className={panel.muted}>
                        {!values.shirtSize
                          ? "Escolha o tamanho da camiseta no perfil acima para liberar a compra."
                          : appPaymentEnabledForFreelancers
                          ? "Finalize a compra para receber o link de pagamento."
                          : "Confirme o tamanho — a agência vai combinar o pagamento com você por fora."}
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

                      {uniform.status === "pending_payment" && uniform.paymentUrl && (
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                          <a
                            className={panel.primaryBtn}
                            href={uniform.paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "none" }}
                          >
                            Ir para o pagamento
                          </a>
                          <button className={panel.ghostBtn} disabled={busy} onClick={buyUniform}>
                            {busy ? "Processando…" : "Gerar novo link"}
                          </button>
                        </div>
                      )}
                      {uniform.status === "pending_payment" && !uniform.paymentUrl && (
                        <p className={panel.muted} style={{ marginTop: "0.5rem" }}>
                          Pedido registrado — combine o pagamento com a agência e aguarde ela confirmar
                          o recebimento por aqui.
                        </p>
                      )}
                      {uniform.status === "shipped" && (
                        <button className={panel.primaryBtn} disabled={busy} onClick={() => act(() => confirmUniformReceived(uniform.id))}>
                          Confirmar recebimento
                        </button>
                      )}
                      {uniform.status === "delivered" && (
                        <p className={panel.success}>Uniforme recebido — você já pode aceitar vagas!</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className={panel.card} style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{fotoStep}. Foto</strong>
                  {requirePhotoApproval && (
                    <span className={`${panel.badge} ${photoStatus === "approved" ? panel.badgeDone : panel.badgePending}`}>
                      {PHOTO_STATUS_LABELS[photoStatus]}
                    </span>
                  )}
                </div>
                <p className={panel.muted} style={{ marginTop: "0.4rem" }}>
                  {requirePhotoApproval
                    ? "Envie uma foto sua. A sua agência precisa aprovar antes que ela valha como foto de perfil e libere vagas."
                    : "Essa foto é mostrada ao supermercado quando você aceita uma vaga, para identificação de quem vai atender."}
                </p>
                {requirePhotoApproval && photoStatus === "rejected" && photoRejectionReason && (
                  <p className={panel.error}>Motivo da recusa: {photoRejectionReason} — envie outra foto.</p>
                )}
                {profilePhotoErr && <p className={panel.error}>{profilePhotoErr}</p>}
                {profilePhotoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl(profilePhotoUrl)}
                    alt="Foto de perfil"
                    style={{ width: 120, height: 120, objectFit: "cover", borderRadius: "50%", marginTop: "0.5rem" }}
                  />
                )}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end", marginTop: "0.5rem" }}>
                  <FileField label="Foto" accept="image/*" file={profilePhoto} onChange={setProfilePhoto} />
                  <button className={panel.primaryBtn} disabled={busy || !profilePhoto} onClick={sendProfilePhoto}>
                    {busy ? "Enviando…" : profilePhotoUrl ? "Trocar foto" : "Enviar foto"}
                  </button>
                </div>
              </div>

              {(() => {
                const ob = (profile as {
                  onboarding?: { contractDataApproved?: boolean; contractTemplateAvailable?: boolean; contractSigned?: boolean };
                } | null)?.onboarding;
                // O card aparece assim que o perfil contratual está completo — não depende de
                // uniforme/foto (isso só bloqueia aceitar vaga, não a etapa do contrato).
                if (!contractDone) return null;
                const statusLabel = ob?.contractSigned
                  ? "Assinado"
                  : ob?.contractDataApproved
                  ? ob?.contractTemplateAvailable ? "Pendente — pronto para assinar" : "Aguardando modelo de contrato"
                  : "Aguardando revisão da agência";
                return (
                  <div className={panel.card} style={{ marginTop: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>{contractStep}. Contrato</strong>
                      <span className={`${panel.badge} ${ob?.contractSigned ? panel.badgeDone : panel.badgePending}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className={panel.muted} style={{ marginTop: "0.4rem" }}>
                      {ob?.contractSigned
                        ? "Contrato assinado — baixe o PDF quando quiser."
                        : ob?.contractDataApproved
                        ? ob?.contractTemplateAvailable
                          ? "A agência conferiu os seus dados — o contrato já está pronto para revisar e assinar eletronicamente."
                          : "A agência aprovou os seus dados, mas ainda não publicou o modelo de contrato."
                        : "A agência ainda vai revisar os dados que você preencheu acima antes de liberar o contrato para assinatura."}
                    </p>
                    <Link className={panel.primaryBtn} href="/freelancer/contrato" style={{ textDecoration: "none" }}>
                      {ob?.contractSigned ? "Ver contrato assinado" : "Ir para o contrato"}
                    </Link>
                  </div>
                );
              })()}
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
