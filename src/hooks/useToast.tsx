import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import ToastComponent from "@/src/components/toast";

type ToastKind = "success" | "danger";

interface ToastState {
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  /** Mostra uma mensagem transitória (~3.5s) no canto da tela — confirmação de uma ação já concluída. */
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3500;

/** Provider único no topo do app (ver `pages/_app.tsx`) — liga o `Toast`/`ToastBody` do
 * reactstrap (já uma dependência do projeto, só que sem nenhum uso até então) a um
 * auto-dismiss simples, pra qualquer tela poder chamar `useToast().showToast(...)`. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, kind: ToastKind = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, kind });
    timerRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastComponent
        isOpen={!!toast}
        message={toast?.message ?? ""}
        color={toast?.kind === "danger" ? "bg-danger" : "bg-success"}
      />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  return ctx;
}
