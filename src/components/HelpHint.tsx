import { useState } from "react";
import panel from "@/styles/panel.module.scss";
import SidebarIcon from "@/src/components/panel/SidebarIcon";
import Modal from "@/src/components/common/Modal";

interface Props {
  /** Texto explicando o motivo do bloqueio / o aviso / a ação que falta. */
  text: string;
  /** Rótulo acessível do botão (default: "Ajuda"). */
  label?: string;
  /** Título da janela de aviso (default: "Aviso"). */
  title?: string;
}

/**
 * Ícone "?" vermelho ao lado de um botão bloqueado. Ao clicar, abre o texto explicativo numa
 * janela sobreposta ao conteúdo (mesmo componente Modal usado no resto do app, com borda
 * vermelha) — nunca empurra ou quebra o layout da tela, nem em telas pequenas. O botão ao lado
 * nunca some, só fica desabilitado; este componente é o "porquê".
 */
export default function HelpHint({ text, label = "Ajuda", title = "Aviso" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={panel.helpHintBtn}
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <SidebarIcon name="help" size={14} />
      </button>
      {open && (
        <Modal title={title} onClose={() => setOpen(false)} variant="danger">
          <p style={{ margin: 0 }}>{text}</p>
        </Modal>
      )}
    </>
  );
}
