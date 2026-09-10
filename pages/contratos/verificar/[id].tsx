import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import panel from "@/styles/panel.module.scss";
import { verifyContract, ContractVerification } from "@/src/services/contractService";

export default function VerifyContractPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : null;
  const [data, setData] = useState<ContractVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    verifyContract(id)
      .then(setData)
      .catch(() => setError("Documento não encontrado. Verifique o código."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <Head><title>Verificação de contrato | WorkFlow</title></Head>
      <div className={panel.authWrapper}>
        <h1>Verificação de assinatura</h1>
        {loading ? (
          <p>Carregando…</p>
        ) : error ? (
          <p className={panel.error}>{error}</p>
        ) : data ? (
          <div className={panel.card} style={{ maxWidth: 560 }}>
            <p className={panel.success}>
              Documento localizado — assinatura {data.status === "signed" ? "válida" : data.status}.
            </p>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.4rem 1rem", margin: 0 }}>
              <dt><strong>Documento</strong></dt><dd>{data.documentTitle}</dd>
              <dt><strong>Agência</strong></dt><dd>{data.agencyName ?? "—"}</dd>
              <dt><strong>Signatário</strong></dt><dd>{data.signerFirstName} · CPF {data.signerCpfMasked}</dd>
              <dt><strong>Assinado em</strong></dt>
              <dd>{new Date(data.signedAt).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "medium" })}</dd>
              <dt><strong>Código (SHA-256)</strong></dt>
              <dd style={{ wordBreak: "break-all" }}><code>{data.contentHash}</code></dd>
            </dl>
            <p className={panel.muted} style={{ marginTop: "1rem" }}>
              O código de verificação corresponde ao conteúdo íntegro do contrato assinado. Assinatura
              eletrônica nos termos do Art. 10, § 2º, da MP 2.200-2/2001.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
