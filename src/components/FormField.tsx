import { useState } from "react";
import panel from "@/styles/panel.module.scss";
import {
  maskCpf, maskCnpj, maskCpfCnpj, maskPhone, maskCep, maskUf, onlyDigits,
} from "@/src/lib/masks";
import { fieldError, normalizeCnpj, normalizeDocument, type FieldKind } from "@/src/lib/validators";

export type { FieldKind };

interface Props {
  label: string;
  /** Valor **normalizado** (só dígitos / minúsculas / ISO). */
  value: string;
  onChange: (normalized: string) => void;
  kind?: FieldKind;
  required?: boolean;
  /** Limite de caracteres do valor normalizado. */
  maxLength?: number;
  placeholder?: string;
  hint?: string;
  name?: string;
  id?: string;
  autoComplete?: string;
  disabled?: boolean;
  /** Erro controlado de fora (ex.: validação no submit). Some quando o campo fica válido. */
  error?: string | null;
  /** Data mínima/máxima para `kind="date"`. */
  min?: string;
  max?: string;
  style?: React.CSSProperties;
  /** Classe do wrapper — padrão `panel.filterField`; passe `s.field` nas telas de auth. */
  wrapperClassName?: string;
}

const NUMERIC_KINDS: FieldKind[] = ["cpf", "phone", "cep", "digits"];

function display(value: string, kind: FieldKind): string {
  switch (kind) {
    case "cpf": return maskCpf(value);
    case "cnpj": return maskCnpj(value);
    case "cpfcnpj": return maskCpfCnpj(value);
    case "phone": return maskPhone(value);
    case "cep": return maskCep(value);
    case "uf": return maskUf(value);
    case "digits": return onlyDigits(value);
    default: return value;
  }
}

function normalize(raw: string, kind: FieldKind, maxLength?: number): string {
  let out = raw;
  switch (kind) {
    case "cpf":
    case "phone":
    case "cep":
    case "digits":
      out = onlyDigits(raw);
      break;
    case "cnpj":
      out = normalizeCnpj(raw).slice(0, 14);
      break;
    case "cpfcnpj":
      out = normalizeDocument(raw).slice(0, 14);
      break;
    case "uf":
      out = maskUf(raw);
      break;
    case "email":
      out = raw.trim().toLowerCase();
      break;
    default:
      out = raw;
  }
  return maxLength ? out.slice(0, maxLength) : out;
}

/**
 * Input controlado com máscara + validação por tipo. Guarda no estado do pai
 * sempre o valor normalizado (sem máscara) — pronto para enviar à API.
 */
export default function FormField({
  label, value, onChange, kind = "text", required, maxLength,
  placeholder, hint, name, id, autoComplete, disabled, error, min, max, style,
  wrapperClassName,
}: Props) {
  const [touched, setTouched] = useState(false);
  const innerError = touched ? fieldError(value, kind, required) : null;
  const shownError = error ?? innerError;
  const isDate = kind === "date" || kind === "birthdate";

  const invalidStyle = shownError
    ? { borderColor: "var(--danger)", background: "var(--danger-soft)" }
    : undefined;

  return (
    <div className={wrapperClassName ?? panel.filterField} style={style}>
      <label htmlFor={id}>{label}{required ? " *" : ""}</label>
      <input
        id={id}
        name={name}
        type={isDate ? "date" : "text"}
        value={isDate ? value : display(value, kind)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        inputMode={NUMERIC_KINDS.includes(kind) ? "numeric" : kind === "email" ? "email" : undefined}
        min={isDate ? min : undefined}
        max={isDate ? max : undefined}
        aria-invalid={shownError ? true : undefined}
        style={invalidStyle}
        onKeyDown={(e) => {
          // Bloqueia letra em campo só numérico (deixa passar teclas de controle).
          if (
            NUMERIC_KINDS.includes(kind) &&
            e.key.length === 1 &&
            !e.ctrlKey && !e.metaKey && !/[0-9]/.test(e.key)
          ) {
            e.preventDefault();
          }
        }}
        onChange={(e) => onChange(isDate ? e.target.value : normalize(e.target.value, kind, maxLength))}
        onBlur={() => setTouched(true)}
      />
      {shownError ? (
        <small style={{ color: "var(--danger)", textTransform: "none", fontWeight: 400 }}>{shownError}</small>
      ) : hint ? (
        <small className={panel.muted} style={{ textTransform: "none", fontWeight: 400 }}>{hint}</small>
      ) : null}
    </div>
  );
}
