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
  /** Campo de opções pré-definidas — vira um `<select>`. */
  options?: { value: string; label: string }[];
  /** Junto de `options`, acrescenta "Outra…" no fim liberando um texto livre. */
  allowOther?: boolean;
  /** Texto de ajuda mostrado abaixo do campo. */
  hint?: string;
  /** Token de autocomplete do navegador — facilita o preenchimento. */
  autoComplete?: string;
  /** Sugestões de preenchimento via `<datalist>` — não restringe o valor digitado. */
  suggestions?: string[];
};

export const GENDER_OPTIONS = [
  { value: "Feminino", label: "Feminino" },
  { value: "Masculino", label: "Masculino" },
  { value: "Prefiro não informar", label: "Prefiro não informar" },
];

export const MARITAL_STATUS_OPTIONS = [
  { value: "Solteiro(a)", label: "Solteiro(a)" },
  { value: "Casado(a)", label: "Casado(a)" },
  { value: "União estável", label: "União estável" },
  { value: "Divorciado(a)", label: "Divorciado(a)" },
  { value: "Viúvo(a)", label: "Viúvo(a)" },
];

export const NATIONALITY_OPTIONS = [
  { value: "Brasileira", label: "Brasileira" },
  { value: "Argentina", label: "Argentina" },
  { value: "Boliviana", label: "Boliviana" },
  { value: "Chilena", label: "Chilena" },
  { value: "Colombiana", label: "Colombiana" },
  { value: "Cubana", label: "Cubana" },
  { value: "Haitiana", label: "Haitiana" },
  { value: "Paraguaia", label: "Paraguaia" },
  { value: "Peruana", label: "Peruana" },
  { value: "Portuguesa", label: "Portuguesa" },
  { value: "Uruguaia", label: "Uruguaia" },
  { value: "Venezuelana", label: "Venezuelana" },
];

export const EDUCATION_LEVEL_OPTIONS = [
  { value: "Fundamental incompleto", label: "Fundamental incompleto" },
  { value: "Fundamental completo", label: "Fundamental completo" },
  { value: "Médio incompleto", label: "Médio incompleto" },
  { value: "Médio completo", label: "Médio completo" },
  { value: "Superior incompleto", label: "Superior incompleto" },
  { value: "Superior completo", label: "Superior completo" },
  { value: "Pós-graduação", label: "Pós-graduação" },
  { value: "Mestrado", label: "Mestrado" },
  { value: "Doutorado", label: "Doutorado" },
];

export const BANK_ACCOUNT_TYPE_OPTIONS = [
  { value: "Conta corrente", label: "Conta corrente" },
  { value: "Conta poupança", label: "Conta poupança" },
  { value: "Conta salário", label: "Conta salário" },
];

export const BRAZILIAN_STATE_OPTIONS = [
  { value: "AC", label: "Acre (AC)" },
  { value: "AL", label: "Alagoas (AL)" },
  { value: "AP", label: "Amapá (AP)" },
  { value: "AM", label: "Amazonas (AM)" },
  { value: "BA", label: "Bahia (BA)" },
  { value: "CE", label: "Ceará (CE)" },
  { value: "DF", label: "Distrito Federal (DF)" },
  { value: "ES", label: "Espírito Santo (ES)" },
  { value: "GO", label: "Goiás (GO)" },
  { value: "MA", label: "Maranhão (MA)" },
  { value: "MT", label: "Mato Grosso (MT)" },
  { value: "MS", label: "Mato Grosso do Sul (MS)" },
  { value: "MG", label: "Minas Gerais (MG)" },
  { value: "PA", label: "Pará (PA)" },
  { value: "PB", label: "Paraíba (PB)" },
  { value: "PR", label: "Paraná (PR)" },
  { value: "PE", label: "Pernambuco (PE)" },
  { value: "PI", label: "Piauí (PI)" },
  { value: "RJ", label: "Rio de Janeiro (RJ)" },
  { value: "RN", label: "Rio Grande do Norte (RN)" },
  { value: "RS", label: "Rio Grande do Sul (RS)" },
  { value: "RO", label: "Rondônia (RO)" },
  { value: "RR", label: "Roraima (RR)" },
  { value: "SC", label: "Santa Catarina (SC)" },
  { value: "SP", label: "São Paulo (SP)" },
  { value: "SE", label: "Sergipe (SE)" },
  { value: "TO", label: "Tocantins (TO)" },
];

export const BANK_NAME_SUGGESTIONS = [
  "Banco do Brasil", "Caixa Econômica Federal", "Bradesco", "Itaú Unibanco", "Santander",
  "Nubank", "Banco Inter", "Banco C6", "Sicoob", "Sicredi", "Banco Original", "PagBank", "Mercado Pago",
];

/**
 * Seções e campos do perfil contratual do onboarding — fonte única usada tanto no formulário
 * de preenchimento do colaborador (`/freelancer/profile`) quanto na revisão/exibição
 * somente-leitura pela agência (tela de aprovação + seção no cadastro do colaborador).
 *
 * Só ficam `required` os dados de fato necessários para a contratação (documento, endereço,
 * chave Pix); dados de conta bancária e contato de emergência são informativos e opcionais.
 */
export const CONTRACT_SECTIONS: { title: string; fields: ContractField[] }[] = [
  {
    title: "Dados pessoais",
    fields: [
      { key: "fullName", label: "Nome completo", required: true, autoComplete: "name" },
      { key: "cpf", label: "CPF", required: true, kind: "cpf" },
      { key: "rg", label: "RG", required: true },
      { key: "rgIssuer", label: "Órgão emissor", hint: "Ex.: SSP, DETRAN — o órgão que emitiu o seu RG." },
      { key: "pisNis", label: "PIS/NIS", required: true, kind: "digits", maxLength: 11 },
      { key: "birthDate", label: "Data de nascimento", type: "date", required: true, kind: "birthdate", autoComplete: "bday" },
      { key: "gender", label: "Gênero", options: GENDER_OPTIONS },
      { key: "maritalStatus", label: "Estado civil", required: true, options: MARITAL_STATUS_OPTIONS },
      { key: "nationality", label: "Nacionalidade", required: true, options: NATIONALITY_OPTIONS, allowOther: true },
      { key: "motherName", label: "Nome da mãe", required: true },
      { key: "fatherName", label: "Nome do pai" },
      { key: "educationLevel", label: "Escolaridade", options: EDUCATION_LEVEL_OPTIONS },
      {
        key: "ctpsNumber",
        label: "CTPS - número",
        hint: "Opcional. CTPS = Carteira de Trabalho e Previdência Social — preencha só se você já tiver uma; não é exigida para trabalhar como colaborador autônomo.",
      },
      { key: "ctpsSeries", label: "CTPS - série" },
    ],
  },
  {
    title: "Endereço",
    fields: [
      { key: "addressCep", label: "CEP", required: true, kind: "cep", autoComplete: "postal-code" },
      { key: "addressStreet", label: "Rua", required: true, autoComplete: "address-line1" },
      { key: "addressNumber", label: "Número", required: true },
      { key: "addressComplement", label: "Complemento", autoComplete: "address-line2" },
      { key: "addressNeighborhood", label: "Bairro", required: true },
      { key: "addressCity", label: "Cidade", required: true, autoComplete: "address-level2" },
      { key: "addressState", label: "Estado (UF)", required: true, options: BRAZILIAN_STATE_OPTIONS },
    ],
  },
  {
    title: "Dados bancários",
    fields: [
      {
        key: "bankName",
        label: "Banco",
        suggestions: BANK_NAME_SUGGESTIONS,
        hint: "Opcional — informe se já quiser adiantar o cadastro para pagamento.",
      },
      { key: "bankBranch", label: "Agência", kind: "digits" },
      { key: "bankAccount", label: "Conta", kind: "digits" },
      { key: "bankAccountType", label: "Tipo de conta", options: BANK_ACCOUNT_TYPE_OPTIONS },
    ],
  },
  {
    title: "Contato de emergência",
    fields: [
      { key: "emergencyContactName", label: "Nome" },
      { key: "emergencyContactPhone", label: "Telefone", kind: "phone", autoComplete: "tel" },
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
