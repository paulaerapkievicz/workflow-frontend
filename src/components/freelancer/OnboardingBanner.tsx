import Link from "next/link";
import panel from "@/styles/panel.module.scss";
import { useAuth } from "@/src/hooks/useAuth";

interface Onboarding {
  required?: boolean;
  contractComplete?: boolean;
  approved?: boolean;
  blocked?: boolean;
  awaitingRegistration?: boolean;
}

/** Aviso fixo quando o colaborador ainda não pode operar (cadastro ou onboarding pendente). */
export default function OnboardingBanner() {
  const { profile } = useAuth();
  const ob = (profile as { onboarding?: Onboarding } | null)?.onboarding;
  if (!ob?.blocked) return null;

  if (ob.awaitingRegistration) {
    return (
      <p className={panel.error}>
        Cadastro aguardando aprovação da agência. Você poderá aceitar vagas assim que for aprovado.
      </p>
    );
  }

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
