import { useEffect, useRef, useState } from "react";
import panel from "@/styles/panel.module.scss";
import SidebarIcon from "@/src/components/panel/SidebarIcon";

interface Props {
  /** Texto explicando o motivo do bloqueio / o aviso / a ação que falta. */
  text: string;
  /** Rótulo acessível do botão (default: "Ajuda"). */
  label?: string;
}

/**
 * Ícone "?" vermelho ao lado de um botão bloqueado. Ao clicar, abre um painel com borda
 * vermelha explicando o motivo — fecha pelo X ou clicando fora. O botão ao lado nunca some,
 * só fica desabilitado; este componente é o "porquê".
 */
export default function HelpHint({ text, label = "Ajuda" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <span className={panel.helpHintWrap} ref={ref}>
      <button
        type="button"
        className={panel.helpHintBtn}
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <SidebarIcon name="help" size={14} />
      </button>
      {open && (
        <div className={panel.helpHintPanel} role="tooltip">
          <div className={panel.helpHintPanelHeader}>
            <button
              type="button"
              className={panel.helpHintCloseBtn}
              aria-label="Fechar"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          <span>{text}</span>
        </div>
      )}
    </span>
  );
}
