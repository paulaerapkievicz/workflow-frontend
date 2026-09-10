import { useState } from "react";
import axios from "axios";
import panel from "@/styles/panel.module.scss";
import { photoUrl } from "@/src/services/jobPhotoService";

interface Props {
  label: string;
  hint?: string;
  currentUrl: string | null;
  /** "round" para foto de perfil, "rect" para logotipo. */
  shape?: "round" | "rect";
  onUpload: (file: File) => Promise<unknown>;
  onDone?: () => void;
  disabled?: boolean;
}

export default function ProfileImageField({
  label, hint, currentUrl, shape = "rect", onUpload, onDone, disabled,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      await onUpload(file);
      setFile(null);
      onDone?.();
    } catch (e) {
      setErr(axios.isAxiosError(e) ? e.response?.data?.message ?? "Erro ao enviar imagem." : "Erro ao enviar imagem.");
    } finally {
      setBusy(false);
    }
  };

  const box = shape === "round"
    ? { width: 96, height: 96, borderRadius: "50%" }
    : { width: 160, height: 96, borderRadius: 10 };

  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
      <div
        style={{
          ...box,
          border: "1px solid var(--border)",
          background: "var(--surface-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(currentUrl)} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>sem imagem</span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <strong style={{ fontSize: "0.9rem" }}>{label}</strong>
        {hint && <span className={panel.muted} style={{ maxWidth: 320 }}>{hint}</span>}
        {err && <span className={panel.error}>{err}</span>}
        <input type="file" accept="image/*" disabled={disabled || busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="button" className={panel.ghostBtn} disabled={disabled || busy || !file} onClick={send}>
          {busy ? "Enviando…" : currentUrl ? "Trocar imagem" : "Enviar imagem"}
        </button>
      </div>
    </div>
  );
}
