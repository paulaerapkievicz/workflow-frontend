import type { ReactNode } from "react";
import BottomSheet from "./BottomSheet";
import panel from "@/styles/panel.module.scss";

interface Props {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ação destrutiva/irreversível — troca o botão de confirmar pro tom secundário (não é um "excluir", mas chama mais atenção que o primário padrão). */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Substitui o `window.confirm()` nativo por uma folha própria do app — mesma pergunta,
 * mesma decisão binária, mas com a cara do resto do sistema. */
export default function ConfirmDialog({
  open, title, message, confirmLabel = "Confirmar", cancelLabel = "Cancelar",
  danger, busy, onConfirm, onCancel,
}: Props) {
  return (
    <BottomSheet open={open} onClose={onCancel} title={title}>
      <div className={panel.muted} style={{ marginBottom: "1.1rem" }}>{message}</div>
      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button type="button" className={panel.ghostBtn} onClick={onCancel} disabled={busy} style={{ flex: 1, justifyContent: "center" }}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? panel.secondaryBtn : panel.primaryBtn}
          onClick={onConfirm}
          disabled={busy}
          style={{ flex: 1, justifyContent: "center" }}
        >
          {busy ? "Aguarde…" : confirmLabel}
        </button>
      </div>
    </BottomSheet>
  );
}
