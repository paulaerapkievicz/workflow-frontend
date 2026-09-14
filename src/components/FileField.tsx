import { useId } from "react";
import panel from "@/styles/panel.module.scss";

interface Props {
  label: string;
  accept?: string;
  capture?: "user" | "environment";
  file: File | null;
  onChange: (file: File | null) => void;
}

/** Input de arquivo estilizado — botão + nome do arquivo escolhido, sem o input cru do navegador. */
export default function FileField({ label, accept, capture, file, onChange }: Props) {
  const id = useId();
  return (
    <label className={panel.filterField} htmlFor={id}>
      <span>{label}</span>
      <div className={panel.fileField}>
        <span className={panel.secondaryBtn} style={{ display: "inline-block" }}>
          {file ? "Trocar arquivo" : "Escolher arquivo"}
        </span>
        <span className={panel.muted}>{file ? file.name : "Nenhum arquivo escolhido"}</span>
        <input
          id={id}
          className={panel.fileFieldInput}
          type="file"
          accept={accept}
          capture={capture}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </div>
    </label>
  );
}
