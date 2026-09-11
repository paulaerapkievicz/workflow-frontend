import SideNav, { SideNavItem } from "@/src/components/panel/SideNav";
import { usePendingCounts } from "@/src/hooks/usePendingCounts";
import { useAuth } from "@/src/hooks/useAuth";
import { applySidebarOrder } from "@/src/lib/sidebarOrder";
import type { SupermarketMembership } from "@/src/services/authService";

export default function Sidebar() {
  const { ordersToApprove, alertsOpen } = usePendingCounts("supermarket");
  const { profile } = useAuth();
  const membership = (profile as { membership?: SupermarketMembership } | null)?.membership ?? null;
  // Sem membership carregado ainda: assume que pode ver (o backend é a fonte de verdade).
  const canViewInvoices = membership ? membership.isOwner || membership.canViewInvoices : true;
  const sidebarOrder = profile?.sidebarOrder ?? null;

  const rawItems: SideNavItem[] = [
    { href: "/supermarket/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/supermarket/orders", label: "Pedidos", icon: "cart", badge: ordersToApprove },
    { href: "/supermarket/jobs", label: "Vagas", icon: "clipboard-list" },
    ...(alertsOpen > 0
      ? ([{ href: "/supermarket/alerts", label: "Alertas", icon: "alert", badge: alertsOpen }] as SideNavItem[])
      : []),
    { href: "/supermarket/live", label: "Ao vivo", icon: "live" },
    ...(canViewInvoices
      ? ([{ href: "/supermarket/payments", label: "Faturamento", icon: "card" }] as SideNavItem[])
      : []),
    { href: "/supermarket/branches", label: "Filiais", icon: "pin" },
    { href: "/supermarket/team", label: "Equipe", icon: "people" },
    { href: "/supermarket/profile", label: "Perfil", icon: "office" },
  ];

  return <SideNav title="Supermercado" items={applySidebarOrder(rawItems, sidebarOrder)} />;
}
