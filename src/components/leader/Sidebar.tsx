import SideNav from "@/src/components/panel/SideNav";
import { usePendingCounts } from "@/src/hooks/usePendingCounts";

export default function LeaderSidebar() {
  const { registrationsToApprove } = usePendingCounts("leader");
  return (
    <SideNav
      title="Líder"
      items={[
        { href: "/leader/dashboard", label: "Dashboard", icon: "▚" },
        { href: "/leader/freelancers", label: "Colaboradores", icon: "👥", badge: registrationsToApprove },
        { href: "/leader/orders", label: "Convocações", icon: "🛒" },
        { href: "/leader/live", label: "Ao vivo", icon: "🟢" },
        { href: "/leader/payments", label: "Minha carteira", icon: "💳" },
      ]}
    />
  );
}
