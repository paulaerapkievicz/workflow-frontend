import { useAuth } from "@/src/hooks/useAuth";
import type { AgencyPartnerFeature } from "@/src/services/authService";
import panel from "@/styles/panel.module.scss";

interface Props {
  feature: AgencyPartnerFeature;
  children: React.ReactNode;
}

/**
 * Gate de funcionalidade pro sócio de agência — a mesma área ("configuracoes", "financeiro"…)
 * checada no backend via `requireAgencyFeature`. No-op pra dono/líder/admin: eles só passam
 * pelo `RequireAuth` da página. Sócio sem a permissão vê um aviso em vez do conteúdo.
 */
export default function RequirePermission({ feature, children }: Props) {
  const { role, profile } = useAuth();

  if (role === "partner" && profile?.permissions?.[feature] === false) {
    return (
      <div className={panel.card} style={{ maxWidth: 480 }}>
        <strong>Acesso restrito</strong>
        <p className={panel.muted} style={{ margin: "0.4rem 0 0" }}>
          Você não tem permissão para acessar esta área. Peça ao responsável pela agência para
          liberar essa funcionalidade para o seu perfil.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
