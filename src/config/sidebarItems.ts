// src/config/sidebarItems.ts
//
// Lista canônica dos itens do menu lateral por perfil, na ordem padrão do sistema.
// Usada tanto pelo Sidebar (que aplica a ordem salva por cima, via applySidebarOrder)
// quanto pelo editor de ordem em /agency/settings e /supermarket/profile — um único
// lugar de verdade para não duplicar href/label/ícone.

export interface SidebarItemDef {
  href: string;
  label: string;
  icon: string;
}

export const AGENCY_SIDEBAR_ITEMS: SidebarItemDef[] = [
  { href: "/agency/dashboard", label: "Dashboard", icon: "▚" },
  { href: "/agency/freelancers", label: "Colaboradores", icon: "👥" },
  { href: "/agency/categories", label: "Funções", icon: "🏷️" },
  { href: "/agency/onboarding", label: "Onboarding", icon: "📝" },
  { href: "/agency/supermarkets", label: "Gestão de Clientes", icon: "🏬" },
  { href: "/agency/team", label: "Equipe", icon: "🧑‍💼" },
  { href: "/agency/orders", label: "Convocações", icon: "🛒" },
  { href: "/agency/alerts", label: "Alertas", icon: "🚨" },
  { href: "/agency/live", label: "Ao vivo", icon: "🟢" },
  { href: "/agency/reviews", label: "Avaliações", icon: "⭐" },
  { href: "/agency/closings", label: "Fechamentos", icon: "📅" },
  { href: "/agency/payments", label: "Pagamentos", icon: "💳" },
  { href: "/agency/contracts", label: "Contratos", icon: "📄" },
  { href: "/agency/settings", label: "Configurações", icon: "⚙️" },
];

export const SUPERMARKET_SIDEBAR_ITEMS: SidebarItemDef[] = [
  { href: "/supermarket/dashboard", label: "Dashboard", icon: "▚" },
  { href: "/supermarket/orders", label: "Pedidos", icon: "🛒" },
  { href: "/supermarket/jobs", label: "Vagas", icon: "📋" },
  { href: "/supermarket/alerts", label: "Alertas", icon: "🚨" },
  { href: "/supermarket/live", label: "Ao vivo", icon: "🟢" },
  { href: "/supermarket/payments", label: "Faturamento", icon: "💳" },
  { href: "/supermarket/branches", label: "Filiais", icon: "📍" },
  { href: "/supermarket/team", label: "Equipe", icon: "👥" },
  { href: "/supermarket/profile", label: "Perfil", icon: "🏢" },
];
