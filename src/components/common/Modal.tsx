import styles from "@/styles/modal.module.scss";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <header>
          <h2>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            X
          </button>
        </header>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}
