import { useState, type CSSProperties, type ReactNode } from "react";
import panel from "@/styles/panel.module.scss";

interface Props {
  children: ReactNode;
  /** Repassado pro filterBar interno — mantém compat com ajustes de espaçamento que a página já fazia. */
  style?: CSSProperties;
}

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Envolve um `panel.filterBar` já existente. No desktop/tablet não muda nada
 * (os filtros continuam sempre visíveis); no celular, some atrás de um botão
 * "Filtros" pra não empurrar o conteúdo da tela pra baixo por padrão.
 */
export default function CollapsibleFilterBar({ children, style }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={panel.filterToggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={panel.filterToggleLeft}>
          <FilterIcon />
          Filtros
        </span>
        <span className={`${panel.filterChevron} ${open ? panel.filterChevronOpen : ""}`} aria-hidden="true">
          <ChevronIcon />
        </span>
      </button>
      <div
        className={`${panel.filterBar} ${panel.filterCollapsible} ${open ? panel.filterOpen : ""}`}
        style={style}
      >
        {children}
      </div>
    </>
  );
}
