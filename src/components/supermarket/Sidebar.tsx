import SideNav from "@/src/components/panel/SideNav";

export default function Sidebar() {
  return (
    <SideNav
      title="Supermercado"
      items={[
        { href: "/supermarket/dashboard", label: "Dashboard", icon: "▚" },
        { href: "/supermarket/orders", label: "Pedidos", icon: "🛒" },
        { href: "/supermarket/jobs", label: "Vagas", icon: "📋" },
        { href: "/supermarket/payments", label: "Faturamento", icon: "💳" },
        { href: "/supermarket/branches", label: "Filiais", icon: "📍" },
      ]}
    />
  );
}
