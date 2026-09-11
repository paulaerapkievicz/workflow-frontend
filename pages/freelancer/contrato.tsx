import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/freelancer/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import ContractDocument from "@/src/components/contract/ContractDocument";
import FormField from "@/src/components/FormField";
import { isValidCpf } from "@/src/lib/validators";
import { maskCpf } from "@/src/lib/masks";
import panel from "@/styles/panel.module.scss";
import {
  getMyAgreement, signMyContract, myContractDocumentUrl, openProtectedPdf, FreelancerAgreement,
} from "@/src/services/contractService";

const fmt = (d: string) => new Date(d).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });

function ContractPage() {
  const [data, setData] = useState<FreelancerAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerCpf, setSignerCpf] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getMyAgreement();
      setData(d);
      setSignerName(d.signerName ?? "");
      setSignerCpf(d.signerCpf ?? "");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const sign = async () => {
    setMsg(null);
    if (!isValidCpf(signerCpf)) {
      setMsg({ type: "err", text: "Informe um CPF válido para assinar." });
      return;
    }
    setBusy(true);
    try {
      await signMyContract({ accepted, signerName, signerCpf });
      setMsg({ type: "ok", text: "Contrato assinado. Você já pode baixar o PDF." });
      setAccepted(false);
      await load();
    } catch (e) {
      setMsg({ type: "err", text: axios.isAxiosError(e) ? e.response?.data?.message ?? "Erro." : "Erro." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head><title>Contrato | Colaborador</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Contrato</h1></header>

          {loading ? (
            <p>Carregando…</p>
          ) : !data?.hasTemplate ? (
            <p className={panel.muted}>
              {data?.blockedReason ?? "A sua agência ainda não disponibilizou um modelo de contrato."}
            </p>
          ) : (
            <>
              {msg && <p className={msg.type === "ok" ? panel.success : panel.error}>{msg.text}</p>}

              {data.signedCurrent && data.signature && (
                <div className={panel.card} style={{ marginBottom: "1rem" }}>
                  <span className={`${panel.badge} ${panel.badgeApproved}`}>Assinado</span>
                  <p style={{ marginTop: "0.5rem" }}>
                    Assinado em <strong>{fmt(data.signature.signedAt)}</strong> por {data.signature.signerName}
                    {" "}(CPF {maskCpf(data.signature.signerCpf)}).
                  </p>
                  <p className={panel.muted}>Código de verificação: <code>{data.signature.contentHash.slice(0, 24)}…</code></p>
                  <button className={panel.primaryBtn} onClick={() => openProtectedPdf(myContractDocumentUrl())}>
                    Baixar PDF do contrato
                  </button>
                </div>
              )}

              {data.supersededSignature && !data.signedCurrent && (
                <p className={panel.error}>
                  O modelo de contrato foi atualizado pela agência. Revise e assine a nova versão abaixo.
                </p>
              )}

              {!data.signedCurrent && data.blockedReason && (
                <p className={panel.error}>{data.blockedReason}</p>
              )}

              <ContractDocument html={data.renderedHtml} />

              {data.canSign && (
                <div className={panel.card} style={{ marginTop: "1rem", maxWidth: 520 }}>
                  <strong>Assinar eletronicamente</strong>
                  <div className={panel.form} style={{ marginTop: "0.6rem" }}>
                    <label className={panel.filterField}>
                      <span>Nome completo</span>
                      <input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                    </label>
                    <FormField label="CPF" kind="cpf" required placeholder="000.000.000-00"
                      value={signerCpf} onChange={setSignerCpf} />
                    <label className={panel.toggleRow}>
                      <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                      {data.acceptanceText}
                    </label>
                    <span className={panel.muted}>
                      Sua assinatura registra data e hora, o seu IP e o dispositivo, além de um código
                      de integridade do documento — com validade legal (MP 2.200-2/2001).
                    </span>
                    <button className={panel.primaryBtn} onClick={sign} disabled={busy || !accepted}>
                      {busy ? "Assinando…" : "Assinar contrato"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="freelancer">
      <ContractPage />
    </RequireAuth>
  );
}
