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
  type FreelancerContract, type FreelancerOnboarding, type FreelancerPixKeyType,
} from "@/src/services/onboardingService";
import {
  getMyAgreement, myContractDocumentUrl, openProtectedPdf, type FreelancerAgreement,
} from "@/src/services/contractService";
import { photoUrl } from "@/src/services/jobPhotoService";
import { uploadMyProfilePhoto } from "@/src/services/freelancerService";
import { useAuth } from "@/src/hooks/useAuth";
import FreelancerContractView from "@/src/components/FreelancerContractView";
import PixKeyFields from "@/src/components/onboarding/PixKeyFields";
import FileField from "@/src/components/FileField";
import HelpIcon from "@/src/components/common/HelpIcon";
import { validateForm } from "@/src/lib/validators";
import { maskCpf } from "@/src/lib/masks";
import { PIX_FIELD_KIND } from "@/src/lib/freelancerContractFields";

type TabId = "onboarding" | "contrato" | "uniforme";

const fmtDateTime = (d: string) => new Date(d).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });

function ProfilePage() {
  const { profile, refresh } = useAuth();
  const [tab, setTab] = useState<TabId | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [contract, setContract] = useState<FreelancerContract | null>(null);
  const [uniform, setUniform] = useState<UniformOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingPix, setSavingPix] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [uniformErr, setUniformErr] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoErr, setProfilePhotoErr] = useState<string | null>(null);
  const [agreement, setAgreement] = useState<FreelancerAgreement | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(true);

  const profilePhotoUrl = (profile?.profilePhotoUrl as string | null | undefined) ?? null;
  const name = (profile?.name as string | undefined) ?? "";
  const email = (profile?.email as string | undefined) ?? "";
  const phone = (profile?.phone as string | undefined) ?? "";
  const appPaymentEnabledForFreelancers =
    (profile as { affiliatedAgency?: { appPaymentEnabledForFreelancers?: boolean } } | null)
      ?.affiliatedAgency?.appPaymentEnabledForFreelancers !== false;
  const onboarding = (profile as { onboarding?: FreelancerOnboarding } | null)?.onboarding;
  const requireUniformPurchase = !!onboarding?.requireUniformPurchase;
  const requirePhotoApproval = !!onboarding?.requirePhotoApproval;
  const photoStatus = onboarding?.photoStatus ?? "none";
  const photoRejectionReason = onboarding?.photoRejectionReason ?? null;
  // Ligado pela agência (Configurações -> Colaborador): mostra os dados do pré-cadastro (consulta)
  // e o contrato assinado aqui. Desligado (padrão), só o cartão básico de contato aparece.
  const showFullProfile = !!onboarding?.showFullProfile;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, u0] = await Promise.all([getContract(), getUniform()]);
      if (c) {
        const v: Record<string, string> = { pixKey: (c.pixKey as string) ?? "", pixKeyType: (c.pixKeyType as string) ?? "", shirtSize: (c.shirtSize as string) ?? "" };
        setValues(v);
        setContract(c);
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

  useEffect(() => {
    if (!showFullProfile) { setAgreementLoading(false); return; }
    setAgreementLoading(true);
    getMyAgreement().then(setAgreement).finally(() => setAgreementLoading(false));
  }, [showFullProfile]);

  const set = (k: string, v: string) => setValues((cur) => ({ ...cur, [k]: v }));

  const savePix = async () => {
    setMsg(null);
    setShowErrors(true);
    const pixKind = PIX_FIELD_KIND[(values.pixKeyType as FreelancerPixKeyType) || "aleatoria"];
    const fieldErrs = validateForm([{ name: "pixKey", value: values.pixKey ?? "", kind: pixKind, required: true }]);
    if (Object.keys(fieldErrs).length || !values.pixKeyType) {
      setMsg({ type: "err", text: "Confira o tipo e a chave Pix." });
      return;
    }
    setSavingPix(true);
    try {
      const c = await saveContract({ pixKey: values.pixKey, pixKeyType: values.pixKeyType });
      setContract(c);
      setMsg({ type: "ok", text: "Chave Pix atualizada." });
    } catch (err) {
      setMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    } finally {
      setSavingPix(false);
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
    const list: { id: TabId; label: string }[] = [];
    if (showFullProfile) list.push({ id: "onboarding", label: "Dados do onboarding" });
    if (showFullProfile) list.push({ id: "contrato", label: "Contrato" });
    if (requireUniformPurchase) list.push({ id: "uniforme", label: "Uniforme" });
    return list;
  }, [showFullProfile, requireUniformPurchase]);

  // Se a aba ativa deixar de existir (ex.: a agência desliga uma dessas opções), volta pra primeira.
  useEffect(() => {
    if (!tabs.length) { setTab(null); return; }
    if (!tabs.some((t) => t.id === tab)) setTab(tabs[0].id);
  }, [tabs, tab]);

  return (
    <PanelPage
      title="Meu perfil | Colaborador"
      heading={
        <>
          Meu perfil
          <HelpIcon title="Como funciona o seu perfil">
            <p>
              Aqui ficam seus dados de contato e sua chave Pix. O pré-cadastro e a assinatura do
              contrato acontecem uma vez só, no início, antes da sua ativação — sua agência decide
              se esses dados continuam visíveis aqui depois.
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
          <div className={panel.card}>
            <strong>Meus dados</strong>
            <div style={{ marginTop: "0.8rem" }}>
              {requirePhotoApproval && (
                <span className={`${panel.badge} ${photoStatus === "approved" ? panel.badgeDone : panel.badgePending}`}>
                  {PHOTO_STATUS_LABELS[photoStatus]}
                </span>
              )}
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

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.6rem", marginTop: "1rem" }}>
              <div>
                <span className={panel.muted} style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase" }}>Nome</span>
                {name || "—"}
              </div>
              <div>
                <span className={panel.muted} style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase" }}>E-mail</span>
                {email || "—"}
              </div>
              <div>
                <span className={panel.muted} style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase" }}>Telefone</span>
                {phone || "—"}
              </div>
            </div>

            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
              <PixKeyFields values={values} set={set} showErrors={showErrors} />
              <button className={panel.primaryBtn} onClick={savePix} disabled={savingPix} style={{ marginTop: "0.8rem" }}>
                {savingPix ? "Salvando…" : "Salvar chave Pix"}
              </button>
            </div>
          </div>

          {tabs.length > 0 && (
            <>
              <Tabs tabs={tabs} active={tab ?? tabs[0].id} onChange={(id) => setTab(id as TabId)} />

              <div className={panel.card}>
                {tab === "onboarding" && showFullProfile && (
                  <>
                    <strong>Dados do onboarding</strong>
                    <p className={panel.muted} style={{ marginTop: "0.4rem" }}>
                      Só para consulta — os dados preenchidos no pré-cadastro. Pra corrigir algo, fale
                      com a sua agência.
                    </p>
                    <div style={{ marginTop: "0.8rem" }}>
                      <FreelancerContractView contract={contract} />
                    </div>
                  </>
                )}

                {tab === "contrato" && showFullProfile && (
                  <>
                    <strong>Contrato</strong>
                    {agreementLoading ? (
                      <p style={{ marginTop: "0.5rem" }}>Carregando…</p>
                    ) : agreement?.signature ? (
                      <div style={{ marginTop: "0.5rem" }}>
                        <span className={`${panel.badge} ${panel.badgeApproved}`}>Assinado</span>
                        <p style={{ marginTop: "0.5rem" }}>
                          Assinado em <strong>{fmtDateTime(agreement.signature.signedAt)}</strong> por{" "}
                          {agreement.signature.signerName} (CPF {maskCpf(agreement.signature.signerCpf)}).
                        </p>
                        <p className={panel.muted}>
                          Código de verificação: <code>{agreement.signature.contentHash.slice(0, 24)}…</code>
                        </p>
                        <button className={panel.primaryBtn} onClick={() => openProtectedPdf(myContractDocumentUrl())}>
                          Baixar PDF do contrato
                        </button>
                      </div>
                    ) : (
                      <p className={panel.muted} style={{ marginTop: "0.5rem" }}>Nenhum contrato assinado.</p>
                    )}
                  </>
                )}

                {tab === "uniforme" && requireUniformPurchase && (
                  <>
                    <strong>Uniforme</strong>
                    {uniformErr && (
                      <p className={panel.error} style={{ marginTop: "0.5rem" }}>{uniformErr}</p>
                    )}
                    {!uniform ? (
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
