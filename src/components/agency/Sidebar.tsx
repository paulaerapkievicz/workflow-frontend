import SideNav from "@/src/components/panel/SideNav";
import { usePendingCounts } from "@/src/hooks/usePendingCounts";

export default function AgencySidebar() {
  const { uniformsToShip, selfiesToReview, registrationsToApprove, branchesToApprove } = usePendingCounts("agency");
  return (
    <SideNav
      title="Agência"
      items={[
        { href: "/agency/dashboard", label: "Dashboard", icon: "▚" },
        { href: "/agency/freelancers", label: "Colaboradores", icon: "👥" },
        { href: "/agency/onboarding", label: "Onboarding", icon: "📝", badge: uniformsToShip + selfiesToReview + registrationsToApprove },
        { href: "/agency/supermarkets", label: "Gestão de Clientes", icon: "🏬", badge: branchesToApprove },
        { href: "/agency/team", label: "Equipe", icon: "🧑‍💼" },
        { href: "/agency/orders", label: "Convocações", icon: "🛒" },
        { href: "/agency/live", label: "Ao vivo", icon: "🟢" },
        { href: "/agency/closings", label: "Fechamentos", icon: "📅" },
        { href: "/agency/payments", label: "Pagamentos", icon: "💳" },
        { href: "/agency/settings", label: "Configurações", icon: "⚙️" },
      ]}
    />
  );
}
