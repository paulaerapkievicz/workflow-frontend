import SideNav from "@/src/components/panel/SideNav";
import { usePendingCounts } from "@/src/hooks/usePendingCounts";

export default function Sidebar() {
  const { ordersToApprove } = usePendingCounts("supermarket");
  return (
    <SideNav
      title="Supermercado"
      items={[
        { href: "/supermarket/dashboard", label: "Dashboard", icon: "▚" },
        { href: "/supermarket/orders", label: "Pedidos", icon: "🛒", badge: ordersToApprove },
        { href: "/supermarket/jobs", label: "Vagas", icon: "📋" },
        { href: "/supermarket/live", label: "Ao vivo", icon: "🟢" },
        { href: "/supermarket/payments", label: "Faturamento", icon: "💳" },
        { href: "/supermarket/branches", label: "Filiais", icon: "📍" },
        { href: "/supermarket/team", label: "Equipe", icon: "👥" },
      ]}
    />
  );
}
