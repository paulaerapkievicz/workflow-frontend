import Link from "next/link";
import { useRouter } from "next/router";
import styles from "@/styles/sidebar.module.scss";

export interface SideNavItem {
  href: string;
  label: string;
  icon: string;
}

interface Props {
  title: string;
  items: SideNavItem[];
}

export default function SideNav({ title, items }: Props) {
  const { pathname } = useRouter();

  // Item ativo = aquele cujo href é o prefixo mais longo do caminho atual.
  const activeHref = items
    .filter((it) => pathname === it.href || pathname.startsWith(`${it.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className={styles.sidebar}>
      <p className={styles.title}>{title}</p>
      <ul className={styles.nav}>
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className={`${styles.link} ${it.href === activeHref ? styles.active : ""}`}
            >
              <span className={styles.icon} aria-hidden="true">{it.icon}</span>
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
