import panel from "@/styles/panel.module.scss";

export interface TabDef {
  id: string;
  label: string;
}

interface Props {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}

/** Barra de abas (pílula) — usa o mesmo `.roleTabs`/`.active` do seletor de papel do login. */
export default function Tabs({ tabs, active, onChange }: Props) {
  return (
    <div className={panel.roleTabs} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className={active === t.id ? panel.active : undefined}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
