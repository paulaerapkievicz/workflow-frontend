import { useState } from "react";
import axios from "axios";
import panel from "@/styles/panel.module.scss";
import FormField, { type FieldKind } from "@/src/components/FormField";
import { fieldError } from "@/src/lib/validators";
import {
  requestWithdrawal, PIX_KEY_TYPES, PIX_KEY_TYPE_LABELS, PixKeyType,
} from "@/src/services/withdrawalService";

/** Máscara/validação da chave conforme o tipo escolhido. */
const PIX_KIND: Record<PixKeyType, FieldKind> = {
  cpf: "cpf",
  cnpj: "cnpj",
  email: "email",
  telefone: "phone",
  aleatoria: "text",
};

interface Props {
  balance: number;
  /** Chamado após um saque solicitado com sucesso (recarregar listas + saldo). */
  onDone: () => void | Promise<unknown>;
}

/** Formulário de saque com captura da chave Pix — usado por colaborador, agência e líder. */
export default function WithdrawForm({ balance, onDone }: Props) {
  const [amount, setAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType | "">("");
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const pixKind: FieldKind = pixKeyType ? PIX_KIND[pixKeyType] : "text";
  const pixError = pixKeyType ? fieldError(pixKey, pixKind, true) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (pixError) {
      setMsg({ type: "error", text: `Chave Pix: ${pixError.toLowerCase()}.` });
      return;
    }
    setSaving(true);
    try {
      await requestWithdrawal(Number(amount), {
        pixKey: pixKey.trim(),
        pixKeyType: pixKeyType || undefined,
      });
      setAmount("");
      setPixKey("");
      setPixKeyType("");
      setMsg({ type: "success", text: "Saque solicitado. O pagamento é feito por Pix na chave informada." });
      await onDone();
    } catch (err) {
      setMsg({
        type: "error",
        text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={panel.form} onSubmit={submit}>
      <label>Valor do saque</label>
      <input
        type="number" min="0.01" step="0.01" max={balance}
        value={amount} onChange={(e) => setAmount(e.target.value)} required
      />
      <label>Tipo da chave</label>
      <select value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value as PixKeyType | "")}>
        <option value="">Não informar</option>
        {PIX_KEY_TYPES.map((t) => <option key={t} value={t}>{PIX_KEY_TYPE_LABELS[t]}</option>)}
      </select>
      <FormField
        label="Chave Pix para receber"
        kind={pixKind}
        required
        placeholder="CPF, e-mail, telefone ou chave aleatória"
        value={pixKey}
        onChange={setPixKey}
        error={pixError}
      />
      <p className={panel.muted} style={{ fontSize: "0.8rem", margin: 0 }}>
        Informe o tipo para a chave ser validada e guardada sem máscara.
      </p>
      {msg && <p className={msg.type === "error" ? panel.error : panel.success}>{msg.text}</p>}
      <button
        className={panel.primaryBtn}
        type="submit"
        disabled={saving || !amount || Number(amount) <= 0 || !pixKey.trim() || !!pixError}
      >
        {saving ? "Enviando…" : "Solicitar saque"}
      </button>
    </form>
  );
}
