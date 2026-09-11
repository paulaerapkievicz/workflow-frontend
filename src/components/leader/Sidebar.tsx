import SideNav from "@/src/components/panel/SideNav";
import { usePendingCounts } from "@/src/hooks/usePendingCounts";

export default function LeaderSidebar() {
  const { registrationsToApprove, alertsOpen } = usePendingCounts("leader");
  return (
    <SideNav
      title="Líder"
      items={[
        { href: "/leader/dashboard", label: "Dashboard", icon: "dashboard" },
        { href: "/leader/freelancers", label: "Colaboradores", icon: "people", badge: registrationsToApprove },
        { href: "/leader/orders", label: "Convocações", icon: "cart" },
        { href: "/leader/alerts", label: "Alertas", icon: "alert", badge: alertsOpen },
        { href: "/leader/live", label: "Ao vivo", icon: "live" },
        { href: "/leader/payments", label: "Minha carteira", icon: "wallet" },
      ]}
    />
  );
}
