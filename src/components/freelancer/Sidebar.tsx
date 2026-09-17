import SideNav from "@/src/components/panel/SideNav";
import { useAuth } from "@/src/hooks/useAuth";

export default function FreelancerSidebar() {
  const { profile } = useAuth();
  const onboarding = (profile as {
    onboarding?: { contractDataApproved?: boolean; contractTemplateAvailable?: boolean; contractSigned?: boolean };
  } | null)?.onboarding;
  // Contrato pronto pra assinar: agência já revisou os dados, o modelo existe e ainda não foi assinado.
  const contractReadyToSign =
    !!onboarding?.contractDataApproved && !!onboarding?.contractTemplateAvailable && !onboarding?.contractSigned;

  return (
    <SideNav
      title="Colaborador"
      items={[
        { href: "/freelancer/dashboard", label: "Dashboard", icon: "dashboard", mobilePrimary: true },
        { href: "/freelancer", label: "Vagas disponíveis", icon: "search", mobilePrimary: true, mobileLabel: "Vagas" },
        { href: "/freelancer/jobs", label: "Meus trabalhos", icon: "receipt", mobilePrimary: true, mobileLabel: "Trabalhos" },
        { href: "/freelancer/payments", label: "Carteira", icon: "wallet", mobilePrimary: true },
        { href: "/freelancer/onboarding", label: "Onboarding", icon: "clipboard-edit" },
        { href: "/freelancer/contrato", label: "Contrato", icon: "contract", badge: contractReadyToSign ? 1 : 0 },
        { href: "/freelancer/reports", label: "Relatório", icon: "chart" },
      ]}
    />
  );
}
