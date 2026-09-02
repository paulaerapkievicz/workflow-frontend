import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import {
  getAgencyUniforms, shipUniform, reviewUniform, UNIFORM_STATUS_LABELS, UniformOrder,
} from "@/src/services/onboardingService";
import { photoUrl } from "@/src/services/jobPhotoService";

function OnboardingPage() {
  const [orders, setOrders] = useState<UniformOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<UniformOrder | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await getAgencyUniforms()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try { await fn(); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
    finally { setBusy(null); }
  };

  const toShip = orders.filter((o) => o.status === "paid");
  const toReview = orders.filter((o) => o.status === "photo_submitted");

  return (
    <>
      <Head><title>Onboarding | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Onboarding dos colaboradores</h1></header>
          <p className={panel.muted}>
            Envie os uniformes pagos e revise as selfies de uniforme. Após aprovar, o colaborador é
            liberado para aceitar vagas.
          </p>

          {loading ? (
            <p>Carregando…</p>
          ) : (
            <>
              <h2 style={{ fontSize: "1.05rem" }}>Uniformes a enviar ({toShip.length})</h2>
              <table className={panel.table}>
                <thead><tr><th>Colaborador</th><th>Tamanho</th><th>Valor</th><th>Ação</th></tr></thead>
                <tbody>
                  {toShip.map((o) => (
                    <tr key={o.id}>
                      <td>{o.freelancerName ?? "—"}</td>
                      <td>{o.shirtSize}</td>
                      <td>R$ {Number(o.amount).toFixed(2)}</td>
                      <td>
                        <button className={panel.primaryBtn} disabled={busy === o.id}
                          onClick={() => { const t = prompt("Código de rastreio (opcional):") ?? ""; act(o.id, () => shipUniform(o.id, t)); }}>
                          Marcar como enviado
                        </button>
                      </td>
                    </tr>
                  ))}
                  {toShip.length === 0 && <tr><td colSpan={4} className={panel.muted}>Nada a enviar.</td></tr>}
                </tbody>
              </table>

              <h2 style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>Selfies a revisar ({toReview.length})</h2>
              <table className={panel.table}>
                <thead><tr><th>Colaborador</th><th>Tamanho</th><th>Selfie</th><th>Ação</th></tr></thead>
                <tbody>
                  {toReview.map((o) => (
                    <tr key={o.id}>
                      <td>{o.freelancerName ?? "—"}</td>
                      <td>{o.shirtSize}</td>
                      <td>{o.selfiePhotoUrl && <a href={photoUrl(o.selfiePhotoUrl)} target="_blank" rel="noreferrer">ver foto</a>}</td>
                      <td><button className={panel.ghostBtn} onClick={() => setReview(o)}>Revisar</button></td>
                    </tr>
                  ))}
                  {toReview.length === 0 && <tr><td colSpan={4} className={panel.muted}>Nada a revisar.</td></tr>}
                </tbody>
              </table>

              <h2 style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>Todos os uniformes</h2>
              <table className={panel.table}>
                <thead><tr><th>Colaborador</th><th>Tamanho</th><th>Status</th><th>Rastreio</th></tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>{o.freelancerName ?? "—"}</td>
                      <td>{o.shirtSize}</td>
                      <td><span className={panel.badge}>{UNIFORM_STATUS_LABELS[o.status]}</span></td>
                      <td>{o.trackingCode ?? "—"}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={4} className={panel.muted}>Nenhum pedido de uniforme.</td></tr>}
                </tbody>
              </table>
            </>
          )}
        </section>
      </main>

      {review && (
        <Modal title={`Revisar selfie — ${review.freelancerName ?? ""}`} onClose={() => setReview(null)}>
          <div className={panel.form}>
            {review.selfiePhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl(review.selfiePhotoUrl)} alt="Selfie de uniforme" style={{ maxWidth: "100%", borderRadius: 12 }} />
            )}
            <button className={panel.primaryBtn} disabled={busy === review.id}
              onClick={() => act(review.id, () => reviewUniform(review.id, true)).then(() => setReview(null))}>
              Aprovar
            </button>
            <button className={panel.secondaryBtn} disabled={busy === review.id}
              onClick={() => {
                const r = prompt("Motivo da recusa / o que pedir na nova foto:");
                if (r) act(review.id, () => reviewUniform(review.id, false, r)).then(() => setReview(null));
              }}>
              Recusar / pedir outra foto
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="agency">
      <OnboardingPage />
    </RequireAuth>
  );
}
