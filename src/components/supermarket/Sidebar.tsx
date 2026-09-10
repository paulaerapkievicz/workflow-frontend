import SideNav, { SideNavItem } from "@/src/components/panel/SideNav";
import { usePendingCounts } from "@/src/hooks/usePendingCounts";
import { useAuth } from "@/src/hooks/useAuth";
import type { SupermarketMembership } from "@/src/services/authService";

export default function Sidebar() {
  const { ordersToApprove, alertsOpen } = usePendingCounts("supermarket");
  const { profile } = useAuth();
  const membership = (profile as { membership?: SupermarketMembership } | null)?.membership ?? null;
  // Sem membership carregado ainda: assume que pode ver (o backend é a fonte de verdade).
  const canViewInvoices = membership ? membership.isOwner || membership.canViewInvoices : true;

  const items: SideNavItem[] = [
    { href: "/supermarket/dashboard", label: "Dashboard", icon: "▚" },
    { href: "/supermarket/orders", label: "Pedidos", icon: "🛒", badge: ordersToApprove },
    { href: "/supermarket/jobs", label: "Vagas", icon: "📋" },
    ...(alertsOpen > 0
      ? [{ href: "/supermarket/alerts", label: "Alertas", icon: "🚨", badge: alertsOpen }]
      : []),
    { href: "/supermarket/live", label: "Ao vivo", icon: "🟢" },
    ...(canViewInvoices
      ? [{ href: "/supermarket/payments", label: "Faturamento", icon: "💳" }]
      : []),
    { href: "/supermarket/branches", label: "Filiais", icon: "📍" },
    { href: "/supermarket/team", label: "Equipe", icon: "👥" },
    { href: "/supermarket/profile", label: "Perfil", icon: "🏢" },
  ];

  return <SideNav title="Supermercado" items={items} />;
}
