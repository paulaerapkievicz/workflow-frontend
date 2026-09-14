import styles from "@/styles/modal.module.scss";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Elemento extra ao lado do título (ex.: botão de ajuda). */
  titleAdornment?: React.ReactNode;
}

export default function Modal({ title, onClose, children, titleAdornment }: ModalProps) {
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
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
