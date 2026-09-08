import { useEffect } from "react";
import { useRouter } from "next/router";

export default function LeaderIndex() {
  const router = useRouter();
  useEffect(() => { router.replace("/leader/dashboard"); }, [router]);
  return null;
}
