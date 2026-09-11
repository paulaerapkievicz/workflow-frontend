// src/config/sidebarItems.ts
//
// Lista canônica dos itens do menu lateral por perfil, na ordem padrão do sistema.
// Usada tanto pelo Sidebar (que aplica a ordem salva por cima, via applySidebarOrder)
// quanto pelo editor de ordem em /agency/settings e /supermarket/profile — um único
// lugar de verdade para não duplicar href/label/ícone.

import type { SidebarIconName } from "@/src/components/panel/SidebarIcon";

export interface SidebarItemDef {
  href: string;
  label: string;
  icon: SidebarIconName;
}

export const AGENCY_SIDEBAR_ITEMS: SidebarItemDef[] = [
  { href: "/agency/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/agency/freelancers", label: "Colaboradores", icon: "people" },
  { href: "/agency/categories", label: "Funções", icon: "tag" },
  { href: "/agency/onboarding", label: "Onboarding", icon: "clipboard-edit" },
  { href: "/agency/supermarkets", label: "Gestão de Clientes", icon: "store" },
  { href: "/agency/team", label: "Equipe", icon: "id-badge" },
  { href: "/agency/orders", label: "Convocações", icon: "cart" },
  { href: "/agency/alerts", label: "Alertas", icon: "alert" },
  { href: "/agency/live", label: "Ao vivo", icon: "live" },
  { href: "/agency/reviews", label: "Avaliações", icon: "star" },
  { href: "/agency/closings", label: "Fechamentos", icon: "calendar" },
  { href: "/agency/payments", label: "Pagamentos", icon: "card" },
  { href: "/agency/contracts", label: "Contratos", icon: "contract" },
  { href: "/agency/settings", label: "Configurações", icon: "settings" },
];

export const SUPERMARKET_SIDEBAR_ITEMS: SidebarItemDef[] = [
  { href: "/supermarket/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/supermarket/orders", label: "Pedidos", icon: "cart" },
  { href: "/supermarket/jobs", label: "Vagas", icon: "clipboard-list" },
  { href: "/supermarket/alerts", label: "Alertas", icon: "alert" },
  { href: "/supermarket/live", label: "Ao vivo", icon: "live" },
  { href: "/supermarket/payments", label: "Faturamento", icon: "card" },
  { href: "/supermarket/branches", label: "Filiais", icon: "pin" },
  { href: "/supermarket/team", label: "Equipe", icon: "people" },
  { href: "/supermarket/profile", label: "Perfil", icon: "office" },
];
