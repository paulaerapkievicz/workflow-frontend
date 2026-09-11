import { useState } from "react";
import axios from "axios";
import Modal from "@/src/components/common/Modal";
import panel from "@/styles/panel.module.scss";

export interface PasswordResetResult {
  email: string;
  password: string;
}

interface ResetPasswordActionProps {
  /** Nome da pessoa, usado na confirmação e no título da modal de resultado. */
  label: string;
  onReset: () => Promise<PasswordResetResult>;
  /** Classe do botão — default é o botão "fantasma" usado nas ações de linha das tabelas. */
  className?: string;
}

/**
 * Botão de "Redefinir senha" reutilizável — confirma, chama `onReset` e mostra o e-mail de
 * login + a senha nova uma única vez (não há como recuperar depois de fechar a modal).
 */
export default function ResetPasswordAction({ label, onReset, className }: ResetPasswordActionProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PasswordResetResult | null>(null);
  const [copied, setCopied] = useState(false);

  const trigger = async () => {
    if (!confirm(`Redefinir a senha de ${label}? A nova senha só aparece uma vez — anote ou copie antes de fechar.`)) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const r = await onReset();
      setCopied(false);
      setResult(r);
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao redefinir senha." : "Erro ao redefinir senha.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`E-mail: ${result.email}\nSenha: ${result.password}`);
      setCopied(true);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <button type="button" className={className ?? panel.ghostBtn} onClick={trigger} disabled={busy}>
        {busy ? "Redefinindo…" : "Redefinir senha"}
      </button>
      {error && <p className={panel.error} style={{ marginTop: "0.25rem" }}>{error}</p>}
      {result && (
        <Modal title={`Senha redefinida — ${label}`} onClose={() => setResult(null)}>
          <div className={panel.form}>
            <p className={panel.muted}>
              Repasse estes dados por fora (WhatsApp, por exemplo). A senha não aparece de novo
              depois de fechar esta janela — se perder, redefina de novo.
            </p>
            <label>E-mail de login</label>
            <input readOnly value={result.email} onFocus={(e) => e.target.select()} />
            <label>Nova senha</label>
            <input readOnly value={result.password} onFocus={(e) => e.target.select()} />
            <button className={panel.primaryBtn} onClick={copy}>
              {copied ? "Copiado!" : "Copiar e-mail e senha"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
