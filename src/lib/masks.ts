// src/lib/masks.ts
//
// Formatadores de exibição dos campos tipados. Recebem o valor cru (ou já
// normalizado) e devolvem o texto mascarado para mostrar no input. O componente
// FormField guarda no estado sempre o valor normalizado; a máscara nunca vai ao back.

import { onlyDigits } from "./validators";
import { isoDateBR } from "./datetime";

export { onlyDigits };

/** 000.000.000-00 (parcial conforme digita). */
export function maskCpf(value: unknown): string {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

/** 00.000.000/0000-00 — aceita CNPJ alfanumérico (12 chars + 2 dígitos). */
export function maskCnpj(value: unknown): string {
  const c = String(value ?? "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, 14);
  return c
    .replace(/^([0-9A-Z]{2})([0-9A-Z])/, "$1.$2")
    .replace(/^([0-9A-Z]{2})\.([0-9A-Z]{3})([0-9A-Z])/, "$1.$2.$3")
    .replace(/\.([0-9A-Z]{3})([0-9A-Z])/, ".$1/$2")
    .replace(/([0-9A-Z]{4})(\d)/, "$1-$2");
}

/** Escolhe CPF ou CNPJ pela quantidade de caracteres. */
export function maskCpfCnpj(value: unknown): string {
  return onlyDigits(value).length > 11 ? maskCnpj(value) : maskCpf(value);
}

/** (00) 0000-0000 / (00) 00000-0000. */
export function maskPhone(value: unknown): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

/** 00000-000. */
export function maskCep(value: unknown): string {
  return onlyDigits(value).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

/** ISO 'AAAA-MM-DD' -> 'DD/MM/AAAA' (para exibir). */
export function maskDateBR(isoOrRaw: unknown): string {
  const raw = String(isoOrRaw ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-");
    return `${d}/${m}/${y}`;
  }
  // Digitação progressiva no formato BR.
  const d = onlyDigits(raw).slice(0, 8);
  return d
    .replace(/^(\d{2})(\d)/, "$1/$2")
    .replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}

/** 'DD/MM/AAAA' (ou parcial) -> ISO 'AAAA-MM-DD' quando completo, senão string vazia. */
export function unmaskDateBR(brOrRaw: unknown): string {
  const raw = String(brOrRaw ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = onlyDigits(raw);
  if (d.length !== 8) return "";
  const iso = `${d.slice(4)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
  return isoDateBR(iso) || iso;
}

/** UF: só letras, 2 caracteres, maiúsculas. */
export const maskUf = (value: unknown): string =>
  String(value ?? "").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
