import { useEffect } from "react";
import { useRouter } from "next/router";

export default function AgencyIndex() {
  const router = useRouter();
  useEffect(() => { router.replace("/agency/dashboard"); }, [router]);
  return null;
}
