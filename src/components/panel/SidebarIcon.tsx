// Ícones de linha (stroke=currentColor, sem preenchimento) para o menu lateral.
// Substituem os emojis coloridos antigos por um conjunto único e "profissional".

export type SidebarIconName =
  | "dashboard"
  | "people"
  | "id-badge"
  | "tag"
  | "clipboard-edit"
  | "clipboard-list"
  | "store"
  | "cart"
  | "alert"
  | "live"
  | "star"
  | "calendar"
  | "card"
  | "wallet"
  | "contract"
  | "settings"
  | "pin"
  | "office"
  | "search"
  | "receipt"
  | "chart"
  | "compass";

const PATHS: Record<SidebarIconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.2" />
      <rect x="14" y="3" width="7" height="7" rx="1.2" />
      <rect x="14" y="14" width="7" height="7" rx="1.2" />
      <rect x="3" y="14" width="7" height="7" rx="1.2" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="7.5" r="3.3" />
      <path d="M3.5 20.5v-1a5.5 5.5 0 0 1 5.5-5.5" />
      <circle cx="17" cy="8.5" r="2.6" />
      <path d="M14.8 13.6A5 5 0 0 1 20.5 18v1.2" />
      <path d="M3.5 20.5a5.5 5.5 0 0 1 11 0" />
    </>
  ),
  "id-badge": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M5.6 16.2a3.4 3.4 0 0 1 6.8 0" />
      <path d="M14.2 9h4.2" />
      <path d="M14.2 13h4.2" />
    </>
  ),
  tag: (
    <>
      <path d="M11.6 2.5H4a1.5 1.5 0 0 0-1.5 1.5v7.6c0 .4.16.78.44 1.06l8.9 8.9c.58.58 1.53.58 2.12 0l6.9-6.9c.58-.58.58-1.53 0-2.12l-8.9-8.9a1.5 1.5 0 0 0-1.06-.44Z" />
      <circle cx="7.2" cy="7.2" r="1.4" />
    </>
  ),
  "clipboard-edit": (
    <>
      <rect x="5.5" y="4" width="13" height="17" rx="2" />
      <path d="M9 2.5h6a1 1 0 0 1 1 1V6H8V3.5a1 1 0 0 1 1-1Z" />
      <path d="m9.2 15.3 5.6-5.6c.4-.4 1-.4 1.4 0l.5.5c.4.4.4 1 0 1.4l-5.6 5.6-2.3.6.4-2.5Z" />
    </>
  ),
  "clipboard-list": (
    <>
      <rect x="5.5" y="4" width="13" height="17" rx="2" />
      <path d="M9 2.5h6a1 1 0 0 1 1 1V6H8V3.5a1 1 0 0 1 1-1Z" />
      <path d="M9 11.2h6" />
      <path d="M9 14.6h6" />
      <path d="M9 18h3.6" />
    </>
  ),
  store: (
    <>
      <path d="M3.5 8.5 4.8 3.5h14.4l1.3 5" />
      <path d="M3.5 8.5a2.2 2.2 0 0 0 4.3.5 2.2 2.2 0 0 0 4.3 0 2.2 2.2 0 0 0 4.3 0 2.2 2.2 0 0 0 4.3-.5" />
      <path d="M5 9v11.5h14V9" />
      <path d="M9.5 20.5V15h5v5.5" />
    </>
  ),
  cart: (
    <>
      <circle cx="9.5" cy="20.5" r="1.1" />
      <circle cx="18" cy="20.5" r="1.1" />
      <path d="M2.5 3h2.2l2.2 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 6.5H6.2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2.3 20h19.4L12 3Z" />
      <path d="M12 9.3v4.6" />
      <path d="M12 16.8h.01" />
    </>
  ),
  live: (
    <>
      <circle cx="12" cy="12" r="2.1" />
      <path d="M8.7 8.7a4.6 4.6 0 0 0 0 6.6" />
      <path d="M15.3 8.7a4.6 4.6 0 0 1 0 6.6" />
      <path d="M5.8 5.8a8.7 8.7 0 0 0 0 12.4" />
      <path d="M18.2 5.8a8.7 8.7 0 0 1 0 12.4" />
    </>
  ),
  star: <path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3 1.1-6.5-4.7-4.6 6.5-.9Z" />,
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="17" rx="2" />
      <path d="M16 2.5v4" />
      <path d="M8 2.5v4" />
      <path d="M3 10h18" />
    </>
  ),
  card: (
    <>
      <rect x="2.2" y="5" width="19.6" height="14" rx="2" />
      <path d="M2.2 10h19.6" />
      <path d="M6 15h4" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.2A2.2 2.2 0 0 1 6.2 5h11.6A2.2 2.2 0 0 1 20 7.2" />
      <rect x="3" y="7.2" width="18" height="13.3" rx="2" />
      <path d="M15.5 13.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9Z" />
    </>
  ),
  contract: (
    <>
      <path d="M14 2.5H6.2a1.7 1.7 0 0 0-1.7 1.7v15.6a1.7 1.7 0 0 0 1.7 1.7h11.6a1.7 1.7 0 0 0 1.7-1.7V8.2Z" />
      <path d="M14 2.5v5.7h5.5" />
      <path d="M8.5 13.5h7" />
      <path d="M8.5 17h7" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14.5a1.65 1.65 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.65 1.65 0 0 0-1.8-.3 1.65 1.65 0 0 0-1 1.5v.2a2 2 0 0 1-4 0v-.1a1.65 1.65 0 0 0-1-1.5 1.65 1.65 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.65 1.65 0 0 0 .3-1.8 1.65 1.65 0 0 0-1.5-1H4a2 2 0 0 1 0-4h.1a1.65 1.65 0 0 0 1.5-1 1.65 1.65 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.65 1.65 0 0 0 1.8.3h.1a1.65 1.65 0 0 0 1-1.5V4a2 2 0 0 1 4 0v.1a1.65 1.65 0 0 0 1 1.5h.1a1.65 1.65 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.65 1.65 0 0 0-.3 1.8v.1a1.65 1.65 0 0 0 1.5 1H20a2 2 0 0 1 0 4h-.1a1.65 1.65 0 0 0-1.5 1Z" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10.2c0 6.3-8 12-8 12s-8-5.7-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10.2" r="2.8" />
    </>
  ),
  office: (
    <>
      <rect x="4.5" y="2.5" width="15" height="19" rx="1.2" />
      <path d="M8.5 6.5h.01" />
      <path d="M12 6.5h.01" />
      <path d="M15.5 6.5h.01" />
      <path d="M8.5 10.5h.01" />
      <path d="M12 10.5h.01" />
      <path d="M15.5 10.5h.01" />
      <path d="M8.5 14.5h.01" />
      <path d="M12 14.5h.01" />
      <path d="M15.5 14.5h.01" />
      <path d="M9.5 21.5v-4.2h5v4.2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.4-4.4" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 2.5v19l2-1.1 2 1.1 2-1.1 2 1.1 2-1.1 2 1.1V2.5l-2 1.1-2-1.1-2 1.1-2-1.1-2 1.1Z" />
      <path d="M8.2 8h7.6" />
      <path d="M8.2 12h7.6" />
      <path d="M8.2 16h4.8" />
    </>
  ),
  chart: (
    <>
      <path d="M3.5 3.5v17h17" />
      <rect x="7.2" y="12.5" width="3" height="5.5" rx="0.6" />
      <rect x="12.2" y="8.5" width="3" height="9.5" rx="0.6" />
      <rect x="17.2" y="5.5" width="3" height="12.5" rx="0.6" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m15.5 8.5-2 5.5-5.5 2 2-5.5Z" />
    </>
  ),
};

interface Props {
  name: SidebarIconName;
  size?: number;
}

/** Ícone de linha único para menus laterais — usa `currentColor`, sem cor própria. */
export default function SidebarIcon({ name, size = 18 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
