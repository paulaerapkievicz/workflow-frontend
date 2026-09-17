import type { FieldKind } from "@/src/components/FormField";
import type { FreelancerPixKeyType } from "@/src/services/onboardingService";

export type ContractField = {
  key: string;
  label: string;
  type?: "text" | "date" | "number";
  required?: boolean;
  /** Campo tipado: máscara + validação. */
  kind?: FieldKind;
  /** Limite de dígitos (kind="digits"). */
  maxLength?: number;
};

/**
 * Seções e campos do perfil contratual do onboarding — fonte única usada tanto no formulário
 * de preenchimento do colaborador (`/freelancer/profile`) quanto na revisão/exibição
 * somente-leitura pela agência (tela de aprovação + seção no cadastro do colaborador).
 */
export const CONTRACT_SECTIONS: { title: string; fields: ContractField[] }[] = [
  {
    title: "Dados pessoais",
    fields: [
      { key: "fullName", label: "Nome completo", required: true },
      { key: "cpf", label: "CPF", required: true, kind: "cpf" },
      { key: "rg", label: "RG", required: true },
      { key: "rgIssuer", label: "Órgão emissor" },
      { key: "pisNis", label: "PIS/NIS", required: true, kind: "digits", maxLength: 11 },
      { key: "birthDate", label: "Data de nascimento", type: "date", required: true, kind: "birthdate" },
      { key: "gender", label: "Gênero" },
      { key: "maritalStatus", label: "Estado civil", required: true },
      { key: "nationality", label: "Nacionalidade", required: true },
      { key: "motherName", label: "Nome da mãe", required: true },
      { key: "fatherName", label: "Nome do pai" },
      { key: "educationLevel", label: "Escolaridade" },
      { key: "ctpsNumber", label: "CTPS - número" },
      { key: "ctpsSeries", label: "CTPS - série" },
    ],
  },
  {
    title: "Endereço",
    fields: [
      { key: "addressCep", label: "CEP", required: true, kind: "cep" },
      { key: "addressStreet", label: "Rua", required: true },
      { key: "addressNumber", label: "Número", required: true },
      { key: "addressComplement", label: "Complemento" },
      { key: "addressNeighborhood", label: "Bairro", required: true },
      { key: "addressCity", label: "Cidade", required: true },
      { key: "addressState", label: "UF", required: true, kind: "uf" },
    ],
  },
  {
    title: "Dados bancários",
    fields: [
      { key: "bankName", label: "Banco", required: true },
      { key: "bankBranch", label: "Agência", required: true, kind: "digits" },
      { key: "bankAccount", label: "Conta", required: true, kind: "digits" },
      { key: "bankAccountType", label: "Tipo de conta" },
    ],
  },
  {
    title: "Contato de emergência",
    fields: [
      { key: "emergencyContactName", label: "Nome", required: true },
      { key: "emergencyContactPhone", label: "Telefone", required: true, kind: "phone" },
    ],
  },
];

export const CONTRACT_ALL_FIELDS = CONTRACT_SECTIONS.flatMap((s) => s.fields);
export const CONTRACT_REQUIRED_KEYS = CONTRACT_ALL_FIELDS.filter((f) => f.required)
  .map((f) => f.key)
  .concat("shirtSize", "pixKey", "pixKeyType");

/** Tipo de chave Pix -> tipo do campo (máscara/validação do FormField). */
export const PIX_FIELD_KIND: Record<FreelancerPixKeyType, FieldKind> = {
  cpf: "cpf",
  email: "email",
  telefone: "phone",
  aleatoria: "text",
};
