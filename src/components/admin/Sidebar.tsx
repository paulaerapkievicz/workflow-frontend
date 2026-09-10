import SideNav from "@/src/components/panel/SideNav";

export default function AdminSidebar() {
  return (
    <SideNav
      title="Administração"
      items={[
        { href: "/admin/agencias", label: "Agências", icon: "🧭" },
      ]}
    />
  );
}
