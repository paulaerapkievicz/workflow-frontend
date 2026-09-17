import { useEffect } from "react";
import { useRouter } from "next/router";

/** Onboarding e contrato agora ficam centralizados em /freelancer/profile. */
export default function OnboardingRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/freelancer/profile"); }, [router]);
  return null;
}
