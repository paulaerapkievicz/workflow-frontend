import SideNav, { SideNavItem } from "@/src/components/panel/SideNav";
import { usePendingCounts } from "@/src/hooks/usePendingCounts";
import { useAuth } from "@/src/hooks/useAuth";
import { applySidebarOrder } from "@/src/lib/sidebarOrder";
import type { AgencyPartnerFeature } from "@/src/services/authService";

// Área funcional de cada item — usada só pra filtrar o menu de um sócio sem a permissão.
const ITEM_FEATURE: Record<string, AgencyPartnerFeature | undefined> = {
  "/agency/freelancers": "colaboradores",
  "/agency/categories": "colaboradores",
  "/agency/onboarding": "colaboradores",
  "/agency/supermarkets": "clientes",
  "/agency/team": "equipe",
  "/agency/orders": "vagas",
  "/agency/alerts": "vagas",
  "/agency/live": "vagas",
  "/agency/reviews": "colaboradores",
  "/agency/closings": "financeiro",
  "/agency/payments": "financeiro",
  "/agency/contracts": "configuracoes",
  "/agency/settings": "configuracoes",
};

export default function AgencySidebar() {
  const {
    uniformsToShip, selfiesToReview, registrationsToApprove, branchesToApprove, memberCreditsToReview,
    contestationsToReview, alertsOpen,
  } = usePendingCounts("agency");
  const { role, profile } = useAuth();
  const sidebarOrder = profile?.sidebarOrder ?? null;
  const permissions = profile?.permissions;

  const items = applySidebarOrder<SideNavItem>(
    ([
      { href: "/agency/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/agency/freelancers", label: "Colaboradores", icon: "people" },
      { href: "/agency/categories", label: "Funções", icon: "tag" },
      { href: "/agency/onboarding", label: "Onboarding", icon: "clipboard-edit", badge: uniformsToShip + selfiesToReview + registrationsToApprove },
      { href: "/agency/supermarkets", label: "Gestão de Clientes", icon: "store", badge: branchesToApprove },
      { href: "/agency/team", label: "Equipe", icon: "id-badge" },
      { href: "/agency/orders", label: "Convocações", icon: "cart" },
      { href: "/agency/alerts", label: "Alertas", icon: "alert", badge: alertsOpen },
      { href: "/agency/live", label: "Ao vivo", icon: "live" },
      { href: "/agency/reviews", label: "Avaliações", icon: "star" },
      { href: "/agency/closings", label: "Fechamentos", icon: "calendar", badge: contestationsToReview },
      { href: "/agency/payments", label: "Pagamentos", icon: "card", badge: memberCreditsToReview },
      { href: "/agency/contracts", label: "Contratos", icon: "contract" },
      { href: "/agency/settings", label: "Configurações", icon: "settings" },
    ] as SideNavItem[]).filter((item) => {
      if (role !== "partner") return true;
      const feature = ITEM_FEATURE[item.href];
      return !feature || permissions?.[feature] !== false;
    }),
    sidebarOrder
  );

  return <SideNav title="Agência" items={items} />;
}
