import SideNav from "@/src/components/panel/SideNav";
import { usePendingCounts } from "@/src/hooks/usePendingCounts";

export default function LeaderSidebar() {
  const { registrationsToApprove, alertsOpen } = usePendingCounts("leader");
  return (
    <SideNav
      title="Líder"
      items={[
        { href: "/leader/dashboard", label: "Dashboard", icon: "dashboard", mobilePrimary: true },
        { href: "/leader/freelancers", label: "Colaboradores", icon: "people", badge: registrationsToApprove, mobilePrimary: true },
        { href: "/leader/orders", label: "Convocações", icon: "cart", mobilePrimary: true },
        { href: "/leader/alerts", label: "Alertas", icon: "alert", badge: alertsOpen },
        { href: "/leader/live", label: "Ao vivo", icon: "live", mobilePrimary: true },
        { href: "/leader/payments", label: "Minha carteira", icon: "wallet" },
      ]}
    />
  );
}
