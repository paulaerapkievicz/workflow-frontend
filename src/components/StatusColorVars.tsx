import { useAuth } from "@/src/hooks/useAuth";
import { sanitizeStatusColors, statusColorsCss, DEFAULT_STATUS_COLORS } from "@/src/services/statusColors";

/**
 * Injeta as cores personalizadas dos badges de status da agência do usuário
 * (própria, da agência-cliente ou da agência afiliada) como CSS vars no `:root`.
 * Sem agência (admin / landing) não injeta nada — vale a paleta padrão do SCSS.
 */
export default function StatusColorVars() {
  const { profile, role } = useAuth();
  const p = profile as Record<string, unknown> | null;

  const raw =
    role === "agency"
      ? p?.statusColors
      : role === "freelancer"
      ? (p?.affiliatedAgency as Record<string, unknown> | undefined)?.statusColors
      : role === "supermarket"
      ? (p?.clientAgency as Record<string, unknown> | undefined)?.statusColors
      : role === "leader"
      ? (p?.memberAgency as Record<string, unknown> | undefined)?.statusColors
      : undefined;

  if (!raw) return null;

  const colors = sanitizeStatusColors(raw);
  // Nada a fazer se for exatamente o padrão.
  if (JSON.stringify(colors) === JSON.stringify(DEFAULT_STATUS_COLORS)) return null;

  return <style dangerouslySetInnerHTML={{ __html: statusColorsCss(colors) }} />;
}
