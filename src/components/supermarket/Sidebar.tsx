import Link from "next/link";
import Image from "next/image";
import styles from "@/styles/sidebar.module.scss";
import ThemeToggle from '@/src/components/ThemeToggle';

export default function Sidebar() {
  return (
    <nav className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <Image
          src="/logoWorkflow.png"
          alt="Workflow Logo"
          width={120}
          height={40}
          priority
        />
      </div>

      <ThemeToggle />

      <h2>Supermercado</h2>
      <ul>
        <li><Link href="/supermarket/dashboard">Dashboard</Link></li>
        <li><Link href="/supermarket/jobs">Vagas</Link></li>
        <li><Link href="/supermarket/payments">Pagamentos</Link></li>
        <li><Link href="/supermarket/branches">Filiais</Link></li>
        <li><Link href="/supermarket/favorites">Favoritos</Link></li>
      </ul>
    </nav>
  );
}
