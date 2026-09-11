import styles from "@/styles/panel.module.scss";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
}

// Toggle visual (pílula + bolinha). Não é um <label> — quem usa decide se
// envolve em label/texto clicável ou usa isolado (ex.: dentro de uma célula de tabela).
export default function Switch({ checked, onChange, disabled, title, ...rest }: SwitchProps) {
  return (
    <span className={styles.switch} title={title}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        {...rest}
      />
      <span className={styles.switchTrack}>
        <span className={styles.switchThumb} />
      </span>
    </span>
  );
}
