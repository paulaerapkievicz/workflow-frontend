import SideNav from "@/src/components/panel/SideNav";

export default function AgencySidebar() {
  return (
    <SideNav
      title="Agência"
      items={[
        { href: "/agency/dashboard", label: "Dashboard", icon: "▚" },
        { href: "/agency/freelancers", label: "Freelancers", icon: "👥" },
        { href: "/agency/rates", label: "Valores/hora", icon: "🏷️" },
        { href: "/agency/orders", label: "Pedidos", icon: "🛒" },
        { href: "/agency/live", label: "Ao vivo", icon: "🟢" },
        { href: "/agency/closings", label: "Fechamentos", icon: "📅" },
        { href: "/agency/payments", label: "Pagamentos", icon: "💳" },
      ]}
    />
  );
}
