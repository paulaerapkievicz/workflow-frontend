import Link from "next/link";
import panel from "@/styles/panel.module.scss";
import { useAuth } from "@/src/hooks/useAuth";

interface Onboarding {
  required?: boolean;
  contractComplete?: boolean;
  approved?: boolean;
  blocked?: boolean;
}

/** Aviso fixo quando o colaborador ainda não concluiu o onboarding exigido pela agência. */
export default function OnboardingBanner() {
  const { profile } = useAuth();
  const ob = (profile as { onboarding?: Onboarding } | null)?.onboarding;
  if (!ob?.blocked) return null;
  const what = !ob.contractComplete
    ? "Preencha o seu perfil contratual"
    : "Aguarde a aprovação do seu uniforme";
  return (
    <p className={panel.error} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      Onboarding pendente — {what} para aceitar vagas.
      <Link href="/freelancer/onboarding" className={panel.ghostBtn}>Ir para o onboarding</Link>
    </p>
  );
}
