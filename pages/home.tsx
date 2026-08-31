import { useEffect } from "react";
import { useRouter } from "next/router";

// Redireciona para a landing page. Mantido para compatibilidade de rotas antigas.
export default function HomeRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/"); }, [router]);
  return null;
}
