import { useRouter } from "next/router";
import { useEffect } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import type { Role } from "@/src/services/authService";

interface Props {
  role: Role;
  children: React.ReactNode;
}

export default function RequireAuth({ role, children }: Props) {
  const router = useRouter();
  const { loading, authenticated, role: currentRole } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!authenticated) {
      router.replace("/login");
    } else if (currentRole !== role) {
      router.replace(`/${currentRole}/dashboard`);
    }
  }, [loading, authenticated, currentRole, role, router]);

  if (loading || !authenticated || currentRole !== role) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <p>Carregando…</p>
      </div>
    );
  }

  return <>{children}</>;
}
