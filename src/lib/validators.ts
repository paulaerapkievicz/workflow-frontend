// src/lib/validators.ts
//
// Validação e normalização dos campos tipados dos cadastros — espelho puro das
// regras do backend (workflow-backend/src/helpers/validation.ts). Sem dependência.
// O valor guardado no estado do formulário / enviado à API é sempre o normalizado
// (só dígitos, minúsculas ou ISO) — a máscara é só exibição.

export const onlyDigits = (value: unknown): string => String(value ?? "").replace(/\D/g, "");

const allSameChar = (value: string): boolean => value.length > 0 && /^(.)\1*$/.test(value);

// ---------------- CPF ----------------

export const normalizeCpf = (value: unknown): string => onlyDigits(value);

function cpfCheckDigit(base: string, factor: number): number {
  let sum = 0;
  for (const digit of base) sum += Number(digit) * factor--;
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

export function isValidCpf(value: unknown): boolean {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11 || allSameChar(cpf)) return false;
  if (cpfCheckDigit(cpf.slice(0, 9), 10) !== Number(cpf[9])) return false;
  return cpfCheckDigit(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

// ---------------- CNPJ (numérico e alfanumérico) ----------------

export const normalizeCnpj = (value: unknown): string =>
  String(value ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");

const CNPJ_FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const cnpjCharValue = (ch: string): number => ch.charCodeAt(0) - 48;

function cnpjCheckDigit(base: string, weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) sum += cnpjCharValue(base[i]) * weights[i];
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCnpj(value: unknown): boolean {
  const cnpj = normalizeCnpj(value);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj) || allSameChar(cnpj)) return false;
  if (cnpjCheckDigit(cnpj.slice(0, 12), CNPJ_FIRST_WEIGHTS) !== Number(cnpj[12])) return false;
  return cnpjCheckDigit(cnpj.slice(0, 13), CNPJ_SECOND_WEIGHTS) === Number(cnpj[13]);
}

// ---------------- Documento (CPF ou CNPJ) ----------------

export function isValidDocument(value: unknown): boolean {
  return onlyDigits(value).length === 11 ? isValidCpf(value) : isValidCnpj(value);
}

export function normalizeDocument(value: unknown): string {
  const digits = onlyDigits(value);
  return digits.length === 11 ? digits : normalizeCnpj(value);
}

// ---------------- E-mail ----------------

export const normalizeEmail = (value: unknown): string => String(value ?? "").trim().toLowerCase();

// Regra alinhada ao validator.isEmail para os casos comuns; simples de propósito.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isValidEmail = (value: unknown): boolean => EMAIL_RE.test(normalizeEmail(value));

// ---------------- Telefone (Brasil) ----------------

export function normalizePhone(value: unknown): string {
  let digits = onlyDigits(value);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  return digits;
}

export function isValidBrPhone(value: unknown): boolean {
  const phone = normalizePhone(value);
  if (phone.length !== 10 && phone.length !== 11) return false;
  const ddd = Number(phone.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  if (phone.length === 11) return phone[2] === "9";
  return !["0", "1"].includes(phone[2]);
}

// ---------------- CEP ----------------

export const normalizeCep = (value: unknown): string => onlyDigits(value);
export const isValidCep = (value: unknown): boolean => normalizeCep(value).length === 8;

// ---------------- UF ----------------

export const BR_UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const normalizeUf = (value: unknown): string => String(value ?? "").trim().toUpperCase();
export const isValidUf = (value: unknown): boolean =>
  (BR_UFS as readonly string[]).includes(normalizeUf(value));

// ---------------- Datas ----------------

/** 'AAAA-MM-DD' que corresponde a uma data de calendário real. */
export function isValidDateOnly(value: unknown): boolean {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Data de nascimento plausível: data real, idade entre 14 e 100 anos. */
export function isPlausibleBirthDate(value: unknown): boolean {
  if (!isValidDateOnly(value)) return false;
  const birth = new Date(`${String(value).trim()}T00:00:00Z`);
  const age = (Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000);
  return age >= 14 && age <= 100;
}

// ---------------- Registro por kind ----------------

export type FieldKind =
  | "text"
  | "cpf"
  | "cnpj"
  | "cpfcnpj"
  | "phone"
  | "cep"
  | "uf"
  | "date"
  | "birthdate"
  | "digits"
  | "email"
  | "currency";

interface KindRule {
  valid: (v: unknown) => boolean;
  normalize: (v: unknown) => string;
  /** Mensagem quando o valor preenchido é inválido. */
  message: string;
}

export const KIND_RULES: Record<Exclude<FieldKind, "text" | "digits" | "currency">, KindRule> = {
  cpf: { valid: isValidCpf, normalize: normalizeCpf, message: "CPF inválido" },
  cnpj: { valid: isValidCnpj, normalize: normalizeCnpj, message: "CNPJ inválido" },
  cpfcnpj: { valid: isValidDocument, normalize: normalizeDocument, message: "CPF/CNPJ inválido" },
  phone: { valid: isValidBrPhone, normalize: normalizePhone, message: "Telefone incompleto" },
  cep: { valid: isValidCep, normalize: normalizeCep, message: "CEP incompleto" },
  uf: { valid: isValidUf, normalize: normalizeUf, message: "UF inválida" },
  date: { valid: isValidDateOnly, normalize: (v) => String(v ?? "").trim(), message: "Data inválida" },
  birthdate: {
    valid: isPlausibleBirthDate,
    normalize: (v) => String(v ?? "").trim(),
    message: "Data de nascimento inválida",
  },
  email: { valid: isValidEmail, normalize: normalizeEmail, message: "E-mail inválido" },
};

/**
 * Valida um valor **já normalizado** conforme o `kind`. Retorna a mensagem de erro
 * (string) ou `null` se ok. Vazio só é erro quando `required`.
 */
export function fieldError(value: string, kind: FieldKind, required = false): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return required ? "Campo obrigatório" : null;
  if (kind === "text" || kind === "currency") return null;
  if (kind === "digits") return null;
  const rule = KIND_RULES[kind as keyof typeof KIND_RULES];
  if (!rule) return null;
  return rule.valid(raw) ? null : rule.message;
}

/** Reúne os erros de um formulário: `{ campo: 'mensagem' }` só para os inválidos. */
export function validateForm(
  fields: { name: string; value: string; kind: FieldKind; required?: boolean }[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const err = fieldError(f.value, f.kind, f.required);
    if (err) errors[f.name] = err;
  }
  return errors;
}
