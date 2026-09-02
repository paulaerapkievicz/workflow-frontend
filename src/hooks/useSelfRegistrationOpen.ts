import { useEffect, useState } from "react";
import { getAgencies } from "@/src/services/agencyService";

/**
 * Diz se ALGUMA agência abriu o autocadastro de colaboradores.
 * Enquanto nenhuma abrir, a plataforma não mostra nenhuma opção de "criar conta".
 * `null` = ainda carregando.
 */
export function useSelfRegistrationOpen(): boolean | null {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    getAgencies()
      .then((list) => alive && setOpen(list.some((a) => a.allowSelfRegistration === true)))
      .catch(() => alive && setOpen(false));
    return () => { alive = false; };
  }, []);

  return open;
}
