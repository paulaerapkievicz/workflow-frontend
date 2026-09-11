// Dados de contato da landing page — placeholders, revisar antes de publicar
// (ver copy-landing-workflow-final.md, seção "A revisar antes de publicar").
export const WHATSAPP_NUMBER = "5554999999999";
export const CONTACT_EMAIL = "contato@workflow.com.br";
export const COMPANY_CNPJ = "00.000.000/0001-00";
export const COMPANY_CITY = "Passo Fundo/RS";

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function proposalEmailLink(subject: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
