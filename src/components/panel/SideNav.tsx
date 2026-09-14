import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import styles from "@/styles/sidebar.module.scss";
import SidebarIcon, { SidebarIconName } from "@/src/components/panel/SidebarIcon";

export interface SideNavItem {
  href: string;
  label: string;
  icon: SidebarIconName;
  /** Contador de pendências mostrado à direita do item. */
  badge?: number;
  /** Prioriza o item entre os visíveis na barra de navegação inferior do celular (máx. 4; os demais vão em "Mais"). */
  mobilePrimary?: boolean;
  /** Rótulo mais curto pra caber embaixo do ícone na barra inferior (padrão: usa `label`). */
  mobileLabel?: string;
}

interface Props {
  title: string;
  items: SideNavItem[];
}

// Igual ao layout de app nativo do exemplo: até 4 atalhos fixos + "Mais" pro resto.
const MAX_MOBILE_PRIMARY = 4;

function CountBadge({ count }: { count?: number }) {
  if (!count) return null;
  return <span className={styles.badge}>{count > 9 ? "9+" : count}</span>;
}

export default function SideNav({ title, items }: Props) {
  const { pathname } = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  // Fecha o "Mais" ao navegar (ex.: voltar pelo histórico do navegador).
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  // Item ativo = aquele cujo href é o prefixo mais longo do caminho atual.
  const activeHref = items
    .filter((it) => pathname === it.href || pathname.startsWith(`${it.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const flaggedPrimary = items.filter((it) => it.mobilePrimary);
  const mobilePrimary = (flaggedPrimary.length ? flaggedPrimary : items).slice(0, MAX_MOBILE_PRIMARY);
  const mobileSecondary = items.filter((it) => !mobilePrimary.includes(it));
  const secondaryBadgeTotal = mobileSecondary.reduce((sum, it) => sum + (it.badge ?? 0), 0);
  const activeInSecondary = mobileSecondary.some((it) => it.href === activeHref);

  return (
    <>
      {/* Menu lateral (desktop/tablet) */}
      <nav className={styles.sidebar}>
        <p className={styles.title}>{title}</p>
        <ul className={styles.nav}>
          {items.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`${styles.link} ${it.href === activeHref ? styles.active : ""}`}
              >
                <span className={styles.icon} aria-hidden="true">
                  <SidebarIcon name={it.icon} />
                </span>
                {it.label}
                {it.badge ? <span className={styles.countPill}>{it.badge}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Navigation bar de app (celular) */}
      <nav className={styles.mobileBar} aria-label={title}>
        {mobilePrimary.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`${styles.mobileItem} ${it.href === activeHref ? styles.mobileActive : ""}`}
          >
            <span className={styles.mobileIconWrap}>
              <SidebarIcon name={it.icon} size={22} />
              <CountBadge count={it.badge} />
            </span>
            <span className={styles.mobileLabel}>{it.mobileLabel ?? it.label}</span>
          </Link>
        ))}
        {mobileSecondary.length > 0 && (
          <button
            type="button"
            className={`${styles.mobileItem} ${moreOpen || activeInSecondary ? styles.mobileActive : ""}`}
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-label="Mais opções do menu"
          >
            <span className={styles.mobileIconWrap}>
              <SidebarIcon name="more" size={22} />
              <CountBadge count={secondaryBadgeTotal} />
            </span>
            <span className={styles.mobileLabel}>Mais</span>
          </button>
        )}
      </nav>

      {moreOpen && (
        <div className={styles.mobileSheetBackdrop} onClick={() => setMoreOpen(false)}>
          <div className={styles.mobileSheet} onClick={(e) => e.stopPropagation()}>
            <p className={styles.mobileSheetTitle}>{title}</p>
            <ul className={styles.mobileSheetList}>
              {mobileSecondary.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className={`${styles.mobileSheetLink} ${it.href === activeHref ? styles.active : ""}`}
                    onClick={() => setMoreOpen(false)}
                  >
                    <span className={styles.icon} aria-hidden="true">
                      <SidebarIcon name={it.icon} />
                    </span>
                    {it.label}
                    {it.badge ? <span className={styles.countPill}>{it.badge}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
