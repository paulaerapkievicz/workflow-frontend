import { useEffect } from "react";
import { useRouter } from "next/router";

// Rota antiga /login/<perfil> — o login agora é único (redireciona conforme o perfil da conta).
export default function LoginRoleRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/login"); }, [router]);
  return null;
}
