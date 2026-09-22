import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import PanelPage from "@/src/components/panel/PanelPage";
import panel from "@/styles/panel.module.scss";
import Tabs from "@/src/components/panel/Tabs";
import {
  getContract, saveContract, getUniform, requestUniform, confirmUniformReceived,
  syncUniformPayment, SHIRT_SIZES, UNIFORM_STATUS_LABELS, UniformOrder, PHOTO_STATUS_LABELS,
  type FreelancerOnboarding,
} from "@/src/services/onboardingService";
import { photoUrl } from "@/src/services/jobPhotoService";
import { uploadMyProfilePhoto } from "@/src/services/freelancerService";
import { useAuth } from "@/src/hooks/useAuth";
import ContractDataFields from "@/src/components/onboarding/ContractDataFields";
import FileField from "@/src/components/FileField";
import HelpIcon from "@/src/components/common/HelpIcon";
import { validateForm } from "@/src/lib/validators";
import {
  CONTRACT_ALL_FIELDS as ALL_FIELDS, CONTRACT_REQUIRED_KEYS as REQUIRED_KEYS, PIX_FIELD_KIND,
} from "@/src/lib/freelancerContractFields";
import type { FreelancerPixKeyType } from "@/src/services/onboardingService";

type TabId = "perfil" | "uniforme";

function ProfilePage() {
  const { profile, refresh } = useAuth();
  const [tab, setTab] = useState<TabId>("perfil");
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
  // Campos de opção com "Outra…" (ex.: nacionalidade): força o modo texto-livre mesmo
  // quando o valor atual (ainda vazio) bateria com o placeholder, não com uma opção real.
  const [customOptionFields, setCustomOptionFields] = useState<Record<string, boolean>>({});
  const profilePhotoUrl = (profile?.profilePhotoUrl as string | null | undefined) ?? null;
  const appPaymentEnabledForFreelancers =
    (profile as { affiliatedAgency?: { appPaymentEnabledForFreelancers?: boolean } } | null)
      ?.affiliatedAgency?.appPaymentEnabledForFreelancers !== false;
  const onboarding = (profile as { onboarding?: FreelancerOnboarding } | null)?.onboarding;
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

  const tabs = useMemo(() => {
    const list: { id: TabId; label: string; badge?: number }[] = [
      {
        id: "perfil",
        label: "Perfil contratual",
        badge: (contractDone ? 0 : missing.length) + (requirePhotoApproval && photoStatus === "rejected" ? 1 : 0),
      },
    ];
    if (requireUniformPurchase) list.push({ id: "uniforme", label: "Uniforme" });
    return list;
  }, [contractDone, missing.length, requireUniformPurchase, requirePhotoApproval, photoStatus]);

  // Se a aba ativa deixar de existir (ex.: a agência desliga uniforme obrigatório), volta pro perfil.
  useEffect(() => {
    if (!tabs.some((t) => t.id === tab)) setTab("perfil");
  }, [tabs, tab]);

  return (
    <PanelPage
      title="Meu perfil | Colaborador"
      heading={
        <>
          Meu perfil
          <HelpIcon title="Como funciona o seu perfil">
            <p>
              Seus dados contratuais e o uniforme (quando exigido pela sua agência) ficam
              centralizados aqui, em abas. O pré-cadastro e a assinatura do contrato acontecem uma
              vez só, no início, antes da sua ativação.
            </p>
          </HelpIcon>
        </>
      }
      sidebar={<Sidebar />}
    >
      {msg && <p className={msg.type === "ok" ? panel.success : panel.error}>{msg.text}</p>}

      {loading ? (
            <p>Carregando…</p>
          ) : (
            <>
              <Tabs tabs={tabs} active={tab} onChange={(id) => setTab(id as TabId)} />

              <div className={panel.card}>
                {tab === "perfil" && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>Perfil contratual</strong>
                      <span className={`${panel.badge} ${contractDone ? panel.badgeDone : panel.badgePending}`}>
                        {contractDone ? "Concluído" : `Faltam ${missing.length} campos`}
                      </span>
                    </div>
                    <ContractDataFields
                      values={values}
                      set={set}
                      showErrors={showErrors}
                      customOptionFields={customOptionFields}
                      setCustomOptionFields={setCustomOptionFields}
                    />
                    <div style={{ marginTop: "1.2rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <p style={{ fontWeight: 600, margin: 0 }}>Foto</p>
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

                    <button className={panel.primaryBtn} onClick={save} disabled={saving} style={{ marginTop: "1.2rem" }}>
                      {saving ? "Salvando…" : "Salvar perfil"}
                    </button>
                  </>
                )}

                {tab === "uniforme" && requireUniformPurchase && (
                  <>
                    <strong>Uniforme</strong>
                    {uniformErr && (
                      <p className={panel.error} style={{ marginTop: "0.5rem" }}>{uniformErr}</p>
                    )}
                    {!contractDone ? (
                      <p className={panel.muted}>Conclua o perfil contratual (aba anterior) para comprar o uniforme.</p>
                    ) : !uniform ? (
                      <div style={{ marginTop: "0.5rem" }}>
                        <label className={panel.filterField} style={{ maxWidth: 220 }}>
                          <span>Tamanho da camiseta *</span>
                          <select
                            value={values.shirtSize ?? ""}
                            onChange={(e) => set("shirtSize", e.target.value)}
                          >
                            <option value="">Selecione…</option>
                            {SHIRT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </label>
                        <p className={panel.muted} style={{ marginTop: "0.5rem" }}>
                          {!values.shirtSize
                            ? "Escolha o tamanho da camiseta para liberar a compra."
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
                  </>
                )}

              </div>
            </>
          )}
    </PanelPage>
  );
}

export default function Page() {
  return (
    <RequireAuth role="freelancer" enforceOnboarding>
      <ProfilePage />
    </RequireAuth>
  );
}
