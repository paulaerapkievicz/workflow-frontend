import styles from "@/styles/panel.module.scss";

export type IconAction = "edit" | "delete" | "add" | "cancel" | "activate" | "deactivate";

const ICON_PATHS: Record<IconAction, React.ReactNode> = {
  edit: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
  delete: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  add: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  cancel: (
    <>
      <path d="M18 6 6 18M6 6l12 12" />
    </>
  ),
  activate: (
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4 12 14.01l-3-3" />
    </>
  ),
  deactivate: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </>
  ),
};

interface IconActionButtonProps {
  /** Qual ícone mostrar. */
  action: IconAction;
  /** Texto que antes ia no botão — agora só aparece no tooltip (title) e no aria-label. */
  label: string;
  /** Opcional quando type="submit" dentro de um <form onSubmit>: o clique já dispara o submit nativo. */
  onClick?: () => void;
  disabled?: boolean;
  variant?: "ghost" | "secondary" | "primary";
  type?: "button" | "submit";
}

/** Botão de ação de tabela/grid com só o ícone visível — o texto (Editar, Excluir, Adicionar…)
 * vira tooltip via `title`. Reaproveita os estilos primaryBtn/secondaryBtn/ghostBtn já existentes,
 * só sobrepondo o padding pra ficar quadrado. */
export default function IconActionButton({ action, label, onClick, disabled, variant = "ghost", type = "button" }: IconActionButtonProps) {
  const variantClass = variant === "primary" ? styles.primaryBtn : variant === "secondary" ? styles.secondaryBtn : styles.ghostBtn;
  return (
    <button
      type={type}
      className={`${variantClass} ${styles.iconBtn}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      <svg
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      >
        {ICON_PATHS[action]}
      </svg>
    </button>
  );
}
