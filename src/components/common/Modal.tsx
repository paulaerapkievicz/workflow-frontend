import styles from "@/styles/modal.module.scss";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Elemento extra ao lado do título (ex.: botão de ajuda). */
  titleAdornment?: React.ReactNode;
  /** "danger" dá borda vermelha — usado pelos avisos de ação bloqueada (HelpHint). */
  variant?: "default" | "danger";
}

export default function Modal({ title, onClose, children, titleAdornment, variant = "default" }: ModalProps) {
  return (
    <div className={styles.modalBackdrop}>
      <div className={`${styles.modal} ${variant === "danger" ? styles.modalDanger : ""}`}>
        <header className={styles.modalHeader}>
          <h2>{title}{titleAdornment}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">✕</button>
        </header>
        <div className={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>
  );
}
