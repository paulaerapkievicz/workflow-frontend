import SideNav, { SideNavItem } from "@/src/components/panel/SideNav";
import { useAuth } from "@/src/hooks/useAuth";

interface FreelancerVisibilityProfile {
  walletVisibleOverride?: boolean | null;
  reportVisibleOverride?: boolean | null;
  affiliatedAgency?: {
    walletVisibleToFreelancers?: boolean;
    reportVisibleToFreelancers?: boolean;
  } | null;
}

export default function FreelancerSidebar() {
  const { profile } = useAuth();
  const p = profile as FreelancerVisibilityProfile | null;
  const walletVisible = p?.walletVisibleOverride ?? p?.affiliatedAgency?.walletVisibleToFreelancers ?? false;
  const reportVisible = p?.reportVisibleOverride ?? p?.affiliatedAgency?.reportVisibleToFreelancers ?? false;

  const items: SideNavItem[] = [
    { href: "/freelancer/dashboard", label: "Home", icon: "dashboard", mobilePrimary: true },
    { href: "/freelancer", label: "Vagas disponíveis", icon: "search", mobilePrimary: true, mobileLabel: "Vagas" },
    { href: "/freelancer/jobs", label: "Meus trabalhos", icon: "receipt", mobilePrimary: true, mobileLabel: "Trabalhos" },
    { href: "/freelancer/profile", label: "Meu perfil", icon: "clipboard-edit", mobilePrimary: true, mobileLabel: "Perfil" },
  ];
  if (walletVisible) items.push({ href: "/freelancer/payments", label: "Carteira", icon: "wallet" });
  if (reportVisible) items.push({ href: "/freelancer/reports", label: "Relatório", icon: "chart" });

  return <SideNav title="Colaborador" items={items} />;
}
