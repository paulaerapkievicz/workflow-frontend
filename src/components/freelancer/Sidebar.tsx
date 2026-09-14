import SideNav from "@/src/components/panel/SideNav";

export default function FreelancerSidebar() {
  return (
    <SideNav
      title="Colaborador"
      items={[
        { href: "/freelancer/dashboard", label: "Dashboard", icon: "dashboard", mobilePrimary: true },
        { href: "/freelancer", label: "Vagas disponíveis", icon: "search", mobilePrimary: true, mobileLabel: "Vagas" },
        { href: "/freelancer/jobs", label: "Meus trabalhos", icon: "receipt", mobilePrimary: true, mobileLabel: "Trabalhos" },
        { href: "/freelancer/payments", label: "Carteira", icon: "wallet", mobilePrimary: true },
        { href: "/freelancer/onboarding", label: "Onboarding", icon: "clipboard-edit" },
        { href: "/freelancer/contrato", label: "Contrato", icon: "contract" },
        { href: "/freelancer/reports", label: "Relatório", icon: "chart" },
      ]}
    />
  );
}
