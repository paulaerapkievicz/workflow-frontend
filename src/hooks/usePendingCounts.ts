import { useEffect, useState } from "react";
import api from "@/src/services/api";

export interface AgencyPendingCounts {
  uniformsToShip: number;
  selfiesToReview: number;
  contractsPending: number;
  registrationsToApprove: number;
  branchesToApprove: number;
}

export interface SupermarketPendingCounts {
  ordersToApprove: number;
}

/** Contadores de pendências para os badges do menu (agência, líder ou supermercado). */
export function usePendingCounts(role: "agency" | "supermarket" | "leader") {
  const [counts, setCounts] = useState<AgencyPendingCounts & SupermarketPendingCounts>({
    uniformsToShip: 0,
    selfiesToReview: 0,
    contractsPending: 0,
    registrationsToApprove: 0,
    branchesToApprove: 0,
    ordersToApprove: 0,
  });

  useEffect(() => {
    let alive = true;
    const path = role === "leader" ? "agency" : role;
    const load = () =>
      api
        .get(`/${path}/pending-counts`)
        .then((r) => alive && setCounts((c) => ({ ...c, ...r.data })))
        .catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [role]);

  return counts;
}
