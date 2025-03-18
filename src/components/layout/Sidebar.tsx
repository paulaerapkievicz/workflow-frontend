"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, CreditCard, Bell } from "lucide-react";

const menuItems = [
  { title: "Dashboard", href: "/dashboard", icon: <Home size={20} /> },
  { title: "Trabalhos", href: "/dashboard/trabalhos", icon: <Briefcase size={20} /> },
  { title: "Pagamentos", href: "/dashboard/pagamentos", icon: <CreditCard size={20} /> },
  { title: "Notificações", href: "/dashboard/notificacoes", icon: <Bell size={20} /> },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen p-6 fixed">
      <h2 className="text-xl font-bold mb-6">WorkFlow</h2>
      <nav>
        <ul className="space-y-3">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center space-x-3 p-3 rounded-md ${
                  pathname === item.href ? "bg-gray-700" : "hover:bg-gray-800"
                }`}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
