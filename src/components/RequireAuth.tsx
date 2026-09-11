import { useRouter } from "next/router";
import { useEffect } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import type { Role } from "@/src/services/authService";

interface Props {
  role: Role | Role[];
  children: React.ReactNode;
}

// Sócio não tem área própria — usa as telas da agência (`/agency/*`), gated por permissão.
const DASHBOARD_OVERRIDE: Partial<Record<Role, string>> = { partner: "/agency/dashboard" };

export default function RequireAuth({ role, children }: Props) {
  const router = useRouter();
  const { loading, authenticated, role: currentRole } = useAuth();
  const allowed = Array.isArray(role) ? role : [role];
  const ok = !!currentRole && allowed.includes(currentRole);

  useEffect(() => {
    if (loading) return;
    if (!authenticated) {
      router.replace("/login");
    } else if (!ok && currentRole) {
      router.replace(DASHBOARD_OVERRIDE[currentRole] ?? `/${currentRole}/dashboard`);
    }
  }, [loading, authenticated, ok, currentRole, router]);

  if (loading || !authenticated || !ok) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <p>Carregando…</p>
      </div>
    );
  }

  return <>{children}</>;
}
