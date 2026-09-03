import SideNav from "@/src/components/panel/SideNav";
import { usePendingCounts } from "@/src/hooks/usePendingCounts";

export default function AgencySidebar() {
  const { uniformsToShip, selfiesToReview, registrationsToApprove } = usePendingCounts("agency");
  return (
    <SideNav
      title="Agência"
      items={[
        { href: "/agency/dashboard", label: "Dashboard", icon: "▚" },
        { href: "/agency/freelancers", label: "Colaboradores", icon: "👥" },
        { href: "/agency/onboarding", label: "Onboarding", icon: "📝", badge: uniformsToShip + selfiesToReview + registrationsToApprove },
        { href: "/agency/supermarkets", label: "Supermercados", icon: "🏬" },
        { href: "/agency/orders", label: "Pedidos", icon: "🛒" },
        { href: "/agency/live", label: "Ao vivo", icon: "🟢" },
        { href: "/agency/closings", label: "Fechamentos", icon: "📅" },
        { href: "/agency/payments", label: "Pagamentos", icon: "💳" },
        { href: "/agency/settings", label: "Configurações", icon: "⚙️" },
      ]}
    />
  );
}
