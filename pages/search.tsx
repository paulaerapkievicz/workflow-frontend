import { useEffect } from "react";
import { useRouter } from "next/router";

// Busca ainda não implementada; redireciona para a home.
export default function SearchRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/"); }, [router]);
  return null;
}
