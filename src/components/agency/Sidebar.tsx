import SideNav from "@/src/components/panel/SideNav";
import { usePendingCounts } from "@/src/hooks/usePendingCounts";

export default function AgencySidebar() {
  const {
    uniformsToShip, selfiesToReview, registrationsToApprove, branchesToApprove, memberCreditsToReview,
    contestationsToReview, alertsOpen,
  } = usePendingCounts("agency");
  return (
    <SideNav
      title="Agência"
      items={[
        { href: "/agency/dashboard", label: "Dashboard", icon: "▚" },
        { href: "/agency/freelancers", label: "Colaboradores", icon: "👥" },
        { href: "/agency/categories", label: "Funções", icon: "🏷️" },
        { href: "/agency/onboarding", label: "Onboarding", icon: "📝", badge: uniformsToShip + selfiesToReview + registrationsToApprove },
        { href: "/agency/supermarkets", label: "Gestão de Clientes", icon: "🏬", badge: branchesToApprove },
        { href: "/agency/team", label: "Equipe", icon: "🧑‍💼" },
        { href: "/agency/orders", label: "Convocações", icon: "🛒" },
        { href: "/agency/alerts", label: "Alertas", icon: "🚨", badge: alertsOpen },
        { href: "/agency/live", label: "Ao vivo", icon: "🟢" },
        { href: "/agency/reviews", label: "Avaliações", icon: "⭐" },
        { href: "/agency/closings", label: "Fechamentos", icon: "📅", badge: contestationsToReview },
        { href: "/agency/payments", label: "Pagamentos", icon: "💳", badge: memberCreditsToReview },
        { href: "/agency/contracts", label: "Contratos", icon: "📄" },
        { href: "/agency/settings", label: "Configurações", icon: "⚙️" },
      ]}
    />
  );
}
