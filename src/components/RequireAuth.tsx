import { useRouter } from "next/router";
import { useEffect } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import type { Role } from "@/src/services/authService";
import type { FreelancerOnboarding } from "@/src/services/onboardingService";

interface Props {
  role: Role | Role[];
  children: React.ReactNode;
  /**
   * Só faz sentido pra role="freelancer": enquanto o onboarding não chega em 'active', qualquer
   * página do app principal (vagas, trabalhos, carteira, perfil…) força o redirect pro Pré-App
   * (`/freelancer/onboarding`) — e o inverso, pra quem já está ativo não ficar preso lá.
   */
  enforceOnboarding?: boolean;
}

// Sócio não tem área própria — usa as telas da agência (`/agency/*`), gated por permissão.
const DASHBOARD_OVERRIDE: Partial<Record<Role, string>> = { partner: "/agency/dashboard" };

const ONBOARDING_ROUTE = "/freelancer/onboarding";

export default function RequireAuth({ role, children, enforceOnboarding }: Props) {
  const router = useRouter();
  const { loading, authenticated, role: currentRole, profile } = useAuth();
  const allowed = Array.isArray(role) ? role : [role];
  const ok = !!currentRole && allowed.includes(currentRole);

  const onboarding = (profile as { onboarding?: FreelancerOnboarding } | null)?.onboarding;
  const onboardingActive = currentRole !== "freelancer" || onboarding?.status === "active";
  const onOnboardingRoute = router.pathname === ONBOARDING_ROUTE;

  useEffect(() => {
    if (loading) return;
    if (!authenticated) {
      router.replace("/login");
    } else if (!ok && currentRole) {
      router.replace(DASHBOARD_OVERRIDE[currentRole] ?? `/${currentRole}/dashboard`);
    } else if (ok && enforceOnboarding && currentRole === "freelancer" && !onboardingActive && !onOnboardingRoute) {
      router.replace(ONBOARDING_ROUTE);
    } else if (ok && currentRole === "freelancer" && onboardingActive && onOnboardingRoute) {
      router.replace("/freelancer/dashboard");
    }
  }, [loading, authenticated, ok, currentRole, enforceOnboarding, onboardingActive, onOnboardingRoute, router]);

  const blockedByOnboarding =
    ok && enforceOnboarding && currentRole === "freelancer" && !onboardingActive && !onOnboardingRoute;
  const blockedByActivation =
    ok && currentRole === "freelancer" && onboardingActive && onOnboardingRoute;

  if (loading || !authenticated || !ok || blockedByOnboarding || blockedByActivation) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <p>Carregando…</p>
      </div>
    );
  }

  return <>{children}</>;
}
