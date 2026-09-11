import panel from "@/styles/panel.module.scss";
import { applySidebarOrder } from "@/src/lib/sidebarOrder";
import type { SidebarItemDef } from "@/src/config/sidebarItems";
import SidebarIcon from "@/src/components/panel/SidebarIcon";

interface Props {
  items: SidebarItemDef[];
  order: string[] | null;
  onChange: (order: string[]) => void;
}

/** Lista reordenável (↑/↓) dos itens do menu lateral — usado em /agency/settings e /supermarket/profile. */
export default function SidebarOrderEditor({ items, order, onChange }: Props) {
  const current = applySidebarOrder(items, order);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return;
    const next = current.map((it) => it.href);
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.4rem", maxWidth: 360 }}>
      {current.map((item, index) => (
        <li
          key={item.href}
          style={{
            display: "flex", alignItems: "center", gap: "0.6rem",
            padding: "0.5rem 0.7rem", borderRadius: 9, border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <span aria-hidden="true" style={{ display: "inline-flex", color: "var(--text-muted)" }}>
            <SidebarIcon name={item.icon} />
          </span>
          <span style={{ flex: 1 }}>{item.label}</span>
          <button
            type="button"
            className={panel.ghostBtn}
            onClick={() => move(index, -1)}
            disabled={index === 0}
            aria-label={`Mover ${item.label} para cima`}
          >
            ↑
          </button>
          <button
            type="button"
            className={panel.ghostBtn}
            onClick={() => move(index, 1)}
            disabled={index === current.length - 1}
            aria-label={`Mover ${item.label} para baixo`}
          >
            ↓
          </button>
        </li>
      ))}
    </ul>
  );
}
