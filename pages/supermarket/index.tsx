import { useEffect } from "react";
import { useRouter } from "next/router";

export default function SupermarketIndex() {
  const router = useRouter();
  useEffect(() => { router.replace("/supermarket/dashboard"); }, [router]);
  return null;
}
