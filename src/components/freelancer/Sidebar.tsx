import SideNav from "@/src/components/panel/SideNav";

export default function FreelancerSidebar() {
  return (
    <SideNav
      title="Freelancer"
      items={[
        { href: "/freelancer/dashboard", label: "Dashboard", icon: "▚" },
        { href: "/freelancer", label: "Vagas disponíveis", icon: "🔎" },
        { href: "/freelancer/jobs", label: "Meus trabalhos", icon: "🧾" },
        { href: "/freelancer/reports", label: "Relatório", icon: "📊" },
        { href: "/freelancer/payments", label: "Carteira", icon: "💰" },
      ]}
    />
  );
}
