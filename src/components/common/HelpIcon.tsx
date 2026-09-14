import { useState } from "react";
import Modal from "./Modal";
import panel from "@/styles/panel.module.scss";

interface HelpIconProps {
  title?: string;
  children: React.ReactNode;
}

/** Botão "?" que abre uma janela de ajuda com o texto explicativo — usado no lugar de
 * parágrafos de instrução fixos no topo das telas. */
export default function HelpIcon({ title = "Ajuda", children }: HelpIconProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={panel.helpIcon}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        aria-label={`Ajuda: ${title}`}
        title="Ajuda"
      >
        ?
      </button>
      {open && (
        <Modal title={title} onClose={() => setOpen(false)}>
          <div className={panel.helpText}>{children}</div>
        </Modal>
      )}
    </>
  );
}
