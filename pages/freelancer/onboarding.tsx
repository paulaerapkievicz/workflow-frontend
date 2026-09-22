import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import RequireAuth from "@/src/components/RequireAuth";
import { useAuth } from "@/src/hooks/useAuth";
import panel from "@/styles/panel.module.scss";
import ContractDataFields from "@/src/components/onboarding/ContractDataFields";
import FileField from "@/src/components/FileField";
import FormField from "@/src/components/FormField";
import HelpHint from "@/src/components/HelpHint";
import ContractDocument from "@/src/components/contract/ContractDocument";
import { validateForm, isValidCpf } from "@/src/lib/validators";
import { maskCpf } from "@/src/lib/masks";
import {
  CONTRACT_ALL_FIELDS as ALL_FIELDS, CONTRACT_REQUIRED_KEYS as REQUIRED_KEYS, PIX_FIELD_KIND,
} from "@/src/lib/freelancerContractFields";
import {
  submitOnboardingDocuments, getContract, type FreelancerOnboarding, type FreelancerPixKeyType, type OnboardingStatus,
} from "@/src/services/onboardingService";
import { getMyAgreement, signMyContract, myContractDocumentUrl, myContractPreviewPdfUrl, openProtectedPdf, type FreelancerAgreement } from "@/src/services/contractService";

const CENTER: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "3rem 1rem",
  background: "var(--bg)",
};

const CARD: React.CSSProperties = { width: "100%", maxWidth: 640 };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Head><title>Cadastro | WorkFlow</title></Head>
      <div style={CENTER}>
        <div style={CARD}>{children}</div>
      </div>
    </>
  );
}

function WaitingCard({ title, message }: { title: string; message: string }) {
  return (
    <div className={panel.card}>
      <strong>{title}</strong>
      <p style={{ marginTop: "0.6rem" }}>{message}</p>
    </div>
  );
}

interface DraftFormProps {
  onSubmitted: () => Promise<void>;
  rejectionReason?: string | null;
  existingPhotos: {
    documentIdPhotoUrl?: string | null;
    addressProofPhotoUrl?: string | null;
    documentSelfiePhotoUrl?: string | null;
  };
}

function DraftForm({ onSubmitted, rejectionReason, existingPhotos }: DraftFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [customOptionFields, setCustomOptionFields] = useState<Record<string, boolean>>({});
  const [documentIdPhoto, setDocumentIdPhoto] = useState<File | null>(null);
  const [addressProofPhoto, setAddressProofPhoto] = useState<File | null>(null);
  const [documentSelfiePhoto, setDocumentSelfiePhoto] = useState<File | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Um rascunho pode já existir (ex.: colaborador recusado voltou pra cá) — recupera o que já foi digitado.
  useEffect(() => {
    getContract().then((c) => {
      if (!c) return;
      const v: Record<string, string> = {};
      for (const f of ALL_FIELDS) v[f.key] = (c[f.key] as string) ?? "";
      v.pixKey = (c.pixKey as string) ?? "";
      v.pixKeyType = (c.pixKeyType as string) ?? "";
      setValues(v);
    });
  }, []);

  const set = (k: string, v: string) => setValues((cur) => ({ ...cur, [k]: v }));

  const missing = useMemo(
    () => REQUIRED_KEYS.filter((k) => !(values[k] ?? "").trim()),
    [values]
  );
  // Um documento já enviado antes (ex.: recusa da agência) não precisa ser reenviado — só quem
  // ainda não tem nenhum arquivo salvo é obrigatório escolher agora.
  const missingPhotos = [
    !documentIdPhoto && !existingPhotos.documentIdPhotoUrl && "foto do RG/CNH",
    !addressProofPhoto && !existingPhotos.addressProofPhotoUrl && "foto do comprovante de residência",
    !documentSelfiePhoto && !existingPhotos.documentSelfiePhotoUrl && "selfie do documento",
  ].filter((v): v is string => !!v);

  const submit = async () => {
    setMsg(null);
    setShowErrors(true);
    const pixKind = PIX_FIELD_KIND[(values.pixKeyType as FreelancerPixKeyType) || "aleatoria"];
    const fieldErrs = validateForm(
      ALL_FIELDS.filter((f) => f.kind).map((f) => ({
        name: f.key, value: values[f.key] ?? "", kind: f.kind!, required: f.required,
      })).concat([{ name: "pixKey", value: values.pixKey ?? "", kind: pixKind, required: true }])
    );
    if (Object.keys(fieldErrs).length || missing.length) {
      setMsg({ type: "err", text: "Confira os campos destacados — há campos obrigatórios pendentes ou inválidos." });
      return;
    }
    if (missingPhotos.length) {
      setMsg({ type: "err", text: `Envie: ${missingPhotos.join(", ")}.` });
      return;
    }
    setSubmitting(true);
    try {
      await submitOnboardingDocuments(values, { documentIdPhoto, addressProofPhoto, documentSelfiePhoto });
      await onSubmitted();
    } catch (err) {
      setMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={panel.card}>
      <strong>Pré-cadastro</strong>
      <p className={panel.muted} style={{ marginTop: "0.4rem" }}>
        Preencha seus dados e envie os documentos abaixo. Sua agência vai revisar tudo antes de
        liberar as próximas etapas.
      </p>
      {rejectionReason && (
        <p className={panel.error} style={{ marginTop: "0.6rem" }}>
          A agência recusou o envio anterior. Motivo: {rejectionReason} — corrija o que for preciso
          e reenvie abaixo.
        </p>
      )}
      {msg && <p className={msg.type === "ok" ? panel.success : panel.error}>{msg.text}</p>}

      <ContractDataFields
        values={values}
        set={set}
        showErrors={showErrors}
        customOptionFields={customOptionFields}
        setCustomOptionFields={setCustomOptionFields}
      />

      <div style={{ marginTop: "1.2rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
        <p style={{ fontWeight: 600, margin: "0 0 0.6rem" }}>Documentos</p>
        <div style={{ display: "grid", gap: "0.6rem", maxWidth: 340 }}>
          <div>
            <FileField label="Foto do RG/CNH" accept="image/*" capture="environment" file={documentIdPhoto} onChange={setDocumentIdPhoto} />
            {existingPhotos.documentIdPhotoUrl && !documentIdPhoto && (
              <small className={panel.muted}>Já enviado — escolha outro arquivo só se quiser substituir.</small>
            )}
          </div>
          <div>
            <FileField label="Foto do comprovante de residência" accept="image/*" capture="environment" file={addressProofPhoto} onChange={setAddressProofPhoto} />
            {existingPhotos.addressProofPhotoUrl && !addressProofPhoto && (
              <small className={panel.muted}>Já enviado — escolha outro arquivo só se quiser substituir.</small>
            )}
          </div>
          <div>
            <FileField label="Selfie" accept="image/*" capture="user" file={documentSelfiePhoto} onChange={setDocumentSelfiePhoto} />
            {existingPhotos.documentSelfiePhotoUrl && !documentSelfiePhoto && (
              <small className={panel.muted}>Já enviada — escolha outro arquivo só se quiser substituir.</small>
            )}
          </div>
        </div>
      </div>

      <button className={panel.primaryBtn} onClick={submit} disabled={submitting} style={{ marginTop: "1.2rem" }}>
        {submitting ? "Enviando…" : "Enviar cadastro"}
      </button>
    </div>
  );
}

function SignatureStep({ onSigned }: { onSigned: () => Promise<void> }) {
  const [agreement, setAgreement] = useState<FreelancerAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerCpf, setSignerCpf] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getMyAgreement();
      setAgreement(d);
      setSignerName(d.signerName ?? "");
      setSignerCpf(d.signerCpf ?? "");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const sign = async () => {
    setMsg(null);
    if (!isValidCpf(signerCpf)) {
      setMsg({ type: "err", text: "Informe um CPF válido para assinar." });
      return;
    }
    setBusy(true);
    try {
      await signMyContract({ accepted, signerName, signerCpf });
      await onSigned();
    } catch (err) {
      setMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className={panel.card}><p>Carregando…</p></div>;
  if (!agreement?.hasTemplate) {
    return <WaitingCard title="Contrato" message={agreement?.blockedReason ?? "A sua agência ainda não disponibilizou um modelo de contrato."} />;
  }

  return (
    <div className={panel.card}>
      <strong>Contrato</strong>
      {msg && <p className={msg.type === "ok" ? panel.success : panel.error}>{msg.text}</p>}

      {agreement.signedCurrent && agreement.signature && (
        <div className={panel.card} style={{ marginTop: "0.6rem" }}>
          <span className={`${panel.badge} ${panel.badgeApproved}`}>Assinado</span>
          <p style={{ marginTop: "0.5rem" }}>
            Assinado por {agreement.signature.signerName} (CPF {maskCpf(agreement.signature.signerCpf)}).
          </p>
          <button className={panel.primaryBtn} onClick={() => openProtectedPdf(myContractDocumentUrl())}>
            Baixar PDF do contrato
          </button>
        </div>
      )}

      {!agreement.signedCurrent && (
        <>
          <ContractDocument html={agreement.renderedHtml} />
          <p style={{ marginTop: "0.75rem" }}>
            <button className={panel.ghostBtn} onClick={() => openProtectedPdf(myContractPreviewPdfUrl())}>
              Baixar PDF (rascunho, sem assinatura)
            </button>
          </p>
          <div className={panel.card} style={{ marginTop: "1rem" }}>
            <strong>Assinar eletronicamente</strong>
            <div className={panel.form} style={{ marginTop: "0.6rem" }}>
              <label className={panel.filterField}>
                <span>Nome completo</span>
                <input value={signerName} onChange={(e) => setSignerName(e.target.value)} disabled={!agreement.canSign} />
              </label>
              <FormField label="CPF" kind="cpf" required placeholder="000.000.000-00"
                value={signerCpf} onChange={setSignerCpf} disabled={!agreement.canSign} />
              <label className={panel.toggleRow}>
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} disabled={!agreement.canSign} />
                {agreement.acceptanceText}
              </label>
              <span className={panel.muted}>
                Sua assinatura registra data e hora, o seu IP e o dispositivo, além de um código
                de integridade do documento — com validade legal (MP 2.200-2/2001).
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <button className={panel.primaryBtn} onClick={sign} disabled={busy || !accepted || !agreement.canSign}>
                  {busy ? "Assinando…" : "Li e aceito — assinar"}
                </button>
                {!agreement.canSign && agreement.blockedReason && <HelpHint text={agreement.blockedReason} />}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const WAITING_TITLES: Partial<Record<OnboardingStatus, string>> = {
  pending_docs_review: "Cadastro enviado",
  pending_aso_upload: "Documentos aprovados",
  pending_contract_generation: "Aguardando contrato",
  pending_final_activation: "Contrato assinado",
};

function OnboardingGate() {
  const { profile, refresh } = useAuth();
  const onboarding = (profile as { onboarding?: FreelancerOnboarding } | null)?.onboarding;
  const status = onboarding?.status ?? "draft";

  if (onboarding?.awaitingRegistration) {
    return (
      <WaitingCard
        title="Cadastro em análise"
        message="Seu cadastro está aguardando aprovação da agência antes de liberar o pré-cadastro do onboarding."
      />
    );
  }

  switch (status) {
    case "draft":
      return (
        <DraftForm
          onSubmitted={refresh}
          rejectionReason={onboarding?.statusReason}
          existingPhotos={{
            documentIdPhotoUrl: onboarding?.documentIdPhotoUrl,
            addressProofPhotoUrl: onboarding?.addressProofPhotoUrl,
            documentSelfiePhotoUrl: onboarding?.documentSelfiePhotoUrl,
          }}
        />
      );
    case "pending_user_signature":
      return <SignatureStep onSigned={refresh} />;
    case "active":
      return null; // RequireAuth já redireciona pro app principal
    default:
      return (
        <WaitingCard
          title={WAITING_TITLES[status] ?? "Onboarding"}
          message={onboarding?.phaseMessage ?? "Aguarde a agência avançar a próxima etapa."}
        />
      );
  }
}

export default function Page() {
  return (
    <RequireAuth role="freelancer" enforceOnboarding>
      <Shell>
        <OnboardingGate />
      </Shell>
    </RequireAuth>
  );
}
