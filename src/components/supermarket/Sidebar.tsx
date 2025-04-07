import Link from "next/link";
import styles from "@/styles/sidebar.module.scss";

export default function Sidebar() {
  return (
    <nav className={styles.sidebar}>
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
