import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import RequirePermission from "@/src/components/RequirePermission";
import panel from "@/styles/panel.module.scss";
import {
  getAgencyUniforms, shipUniform, markUniformPaid, UNIFORM_STATUS_LABELS, UniformOrder,
  getAgencyPhotoReviews, reviewFreelancerPhoto, PHOTO_STATUS_LABELS, FreelancerPhotoReview,
  getFreelancerContractForAgency, FreelancerContract,
  getOnboardingBoard, approveOnboardingDocuments, rejectOnboardingDocuments, uploadOnboardingAso,
  releaseOnboardingContract, activateFreelancerOnboarding,
  ONBOARDING_BOARD_COLUMNS, OnboardingBoard, OnboardingBoardFreelancer,
} from "@/src/services/onboardingService";
import FreelancerContractView from "@/src/components/FreelancerContractView";
import FileField from "@/src/components/FileField";
import { getAgencySettings } from "@/src/services/agencySettingsService";
import {
  getPendingFreelancers, approveFreelancer, rejectFreelancer, PendingFreelancer,
} from "@/src/services/agencyService";
import { photoUrl } from "@/src/services/jobPhotoService";
import DateRangeQuickFilter from "@/src/components/DateRangeQuickFilter";
import CollapsibleFilterBar from "@/src/components/panel/CollapsibleFilterBar";
import { useDateRangeFilter } from "@/src/hooks/useDateRangeFilter";
import { inDateRange } from "@/src/lib/dateRange";

function OnboardingPage() {
  const [orders, setOrders] = useState<UniformOrder[]>([]);
  const [photoReviews, setPhotoReviews] = useState<FreelancerPhotoReview[]>([]);
  const [pending, setPending] = useState<PendingFreelancer[]>([]);
  const [board, setBoard] = useState<OnboardingBoard>({});
  const [requireUniformPurchase, setRequireUniformPurchase] = useState(false);
  const [requirePhotoApproval, setRequirePhotoApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<FreelancerPhotoReview | null>(null);
  const [onboardingReview, setOnboardingReview] = useState<OnboardingBoardFreelancer | null>(null);
  const [onboardingContract, setOnboardingContract] = useState<FreelancerContract | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingErr, setOnboardingErr] = useState<string | null>(null);
  const [asoFile, setAsoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [range, setRange] = useDateRangeFilter("agency-onboarding", { preset: "todas" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, p, settings, photos, onboardingBoard] = await Promise.all([
        getAgencyUniforms(), getPendingFreelancers(), getAgencySettings(), getAgencyPhotoReviews(),
        getOnboardingBoard(),
      ]);
      setOrders(u);
      setPending(p);
      setPhotoReviews(photos);
      setBoard(onboardingBoard);
      setRequireUniformPurchase(settings.requireUniformPurchase);
      setRequirePhotoApproval(settings.requirePhotoApproval);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openOnboardingReview = async (row: OnboardingBoardFreelancer) => {
    setOnboardingReview(row);
    setOnboardingContract(null);
    setOnboardingErr(null);
    setAsoFile(null);
    setOnboardingLoading(true);
    try {
      setOnboardingContract(await getFreelancerContractForAgency(row.id));
    } catch (err) {
      setOnboardingErr(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    } finally {
      setOnboardingLoading(false);
    }
  };

  const runOnboardingAction = async (fn: () => Promise<unknown>) => {
    if (!onboardingReview) return;
    setBusy(onboardingReview.id);
    setOnboardingErr(null);
    try {
      await fn();
      setOnboardingReview(null);
      await load();
    } catch (err) {
      setOnboardingErr(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    } finally {
      setBusy(null);
    }
  };

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try { await fn(); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
    finally { setBusy(null); }
  };

  const nameMatches = useCallback(
    (name: string | null | undefined) =>
      !nameFilter.trim() || (name ?? "").toLowerCase().includes(nameFilter.trim().toLowerCase()),
    [nameFilter]
  );

  const pendingFiltered = useMemo(
    () => pending.filter((f) => nameMatches(f.name) && inDateRange(f.createdAt ?? null, range)),
    [pending, nameMatches, range]
  );
  const ordersFiltered = useMemo(
    () => orders.filter((o) => nameMatches(o.freelancerName) && inDateRange(o.createdAt, range)),
    [orders, nameMatches, range]
  );
  const photosFiltered = useMemo(
    () => photoReviews.filter((f) => nameMatches(f.name) && inDateRange(f.profilePhotoSubmittedAt, range)),
    [photoReviews, nameMatches, range]
  );
  const boardFiltered = useMemo(() => {
    const out: OnboardingBoard = {};
    for (const col of ONBOARDING_BOARD_COLUMNS) {
      out[col.status] = (board[col.status] ?? []).filter(
        (f) => nameMatches(f.name) && inDateRange(f.updatedAt, range)
      );
    }
    return out;
  }, [board, nameMatches, range]);

  const awaitingPayment = ordersFiltered.filter((o) => o.status === "pending_payment" && !o.paymentUrl);
  const toShip = ordersFiltered.filter((o) => o.status === "paid");
  const photosPending = photosFiltered.filter((f) => f.profilePhotoStatus === "pending");
  const photosRejected = photosFiltered.filter((f) => f.profilePhotoStatus === "rejected");

  return (
    <>
      <Head><title>Onboarding | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Onboarding dos colaboradores</h1></header>
          <p className={panel.muted}>
            Aprovação de cadastro, andamento e assinatura de contrato sempre aparecem aqui. As seções
            de uniforme e foto só aparecem quando ligadas em <strong>Configurações → Colaborador</strong>.
          </p>

          <CollapsibleFilterBar>
            <label className={panel.filterField} style={{ maxWidth: 260 }}>
              <span>Colaborador</span>
              <input
                type="text"
                placeholder="Buscar por nome…"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </label>
            <DateRangeQuickFilter
              value={range}
              onChange={setRange}
              presets={["todas", "hoje", "semana", "mes", "custom"]}
              label="Enviado em"
            />
          </CollapsibleFilterBar>

          {loading ? (
            <p>Carregando…</p>
          ) : (
            <>
              <h2 style={{ fontSize: "1.05rem" }}>Cadastros pendentes ({pendingFiltered.length})</h2>
              <p className={panel.muted}>
                Colaboradores que se autocadastraram e aguardam a sua aprovação para acessar a plataforma.
              </p>
              <div style={{ overflowX: "auto" }}>
                <table className={panel.table}>
                  <thead><tr><th>Nome</th><th>E-mail</th><th>Documento</th><th>Telefone</th><th>Ações</th></tr></thead>
                  <tbody>
                    {pendingFiltered.map((f) => (
                      <tr key={f.id}>
                        <td>{f.name}</td>
                        <td>{f.email}</td>
                        <td>{f.document ?? "—"}</td>
                        <td>{f.phone ?? "—"}</td>
                        <td>
                          <button className={panel.primaryBtn} disabled={busy === f.id}
                            onClick={() => act(f.id, () => approveFreelancer(f.id))}>
                            Aprovar
                          </button>{" "}
                          <button className={panel.secondaryBtn} disabled={busy === f.id}
                            onClick={() => { if (confirm(`Recusar o cadastro de ${f.name}? A conta será removida.`)) act(f.id, () => rejectFreelancer(f.id)); }}>
                            Recusar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pendingFiltered.length === 0 && <tr><td colSpan={5} className={panel.muted}>Nenhum cadastro pendente.</td></tr>}
                  </tbody>
                </table>
              </div>

              <h2 style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>Esteira do onboarding</h2>
              <p className={panel.muted}>
                Colaboradores em cada fase do funil (pré-cadastro → triagem de documentos → ASO →
                contrato → assinatura → ativação). Convites geram colaboradores em pré-cadastro; esta
                esteira mostra o que ainda precisa de uma ação sua.
              </p>
              {ONBOARDING_BOARD_COLUMNS.map((col) => {
                const rows = boardFiltered[col.status] ?? [];
                return (
                  <div key={col.status} style={{ marginTop: "1rem" }}>
                    <h3 style={{ fontSize: "0.95rem" }}>{col.label} ({rows.length})</h3>
                    <div style={{ overflowX: "auto" }}>
                      <table className={panel.table}>
                        <thead><tr><th>Nome</th><th>E-mail</th><th>Atualizado em</th><th>Ação</th></tr></thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.id}>
                              <td>{r.name}</td>
                              <td>{r.email}</td>
                              <td>{new Date(r.updatedAt).toLocaleString("pt-BR")}</td>
                              <td><button className={panel.ghostBtn} onClick={() => openOnboardingReview(r)}>Ver</button></td>
                            </tr>
                          ))}
                          {rows.length === 0 && <tr><td colSpan={4} className={panel.muted}>Ninguém nesta fase.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {requireUniformPurchase && (
                <>
                  <h2 style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>Uniformes aguardando pagamento ({awaitingPayment.length})</h2>
                  <p className={panel.muted}>
                    Pedidos de colaboradores com o pagamento pelo app desligado. Confirme com o colaborador que
                    você recebeu o valor por fora antes de marcar como pago.
                  </p>
                  <div style={{ overflowX: "auto" }}>
                    <table className={panel.table}>
                      <thead><tr><th>Colaborador</th><th>Tamanho</th><th>Valor</th><th>Ação</th></tr></thead>
                      <tbody>
                        {awaitingPayment.map((o) => (
                          <tr key={o.id}>
                            <td>{o.freelancerName ?? "—"}</td>
                            <td>{o.shirtSize}</td>
                            <td>R$ {Number(o.amount).toFixed(2)}</td>
                            <td>
                              <button className={panel.primaryBtn} disabled={busy === o.id}
                                onClick={() => act(o.id, () => markUniformPaid(o.id))}>
                                Marcar como pago
                              </button>
                            </td>
                          </tr>
                        ))}
                        {awaitingPayment.length === 0 && <tr><td colSpan={4} className={panel.muted}>Nada aguardando pagamento.</td></tr>}
                      </tbody>
                    </table>
                  </div>

                  <h2 style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>Uniformes a enviar ({toShip.length})</h2>
                  <div style={{ overflowX: "auto" }}>
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
                  </div>

                  <h2 style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>Todos os uniformes</h2>
                  <div style={{ overflowX: "auto" }}>
                    <table className={panel.table}>
                      <thead><tr><th>Colaborador</th><th>Tamanho</th><th>Status</th><th>Rastreio</th></tr></thead>
                      <tbody>
                        {ordersFiltered.map((o) => (
                          <tr key={o.id}>
                            <td>{o.freelancerName ?? "—"}</td>
                            <td>{o.shirtSize}</td>
                            <td><span className={panel.badge}>{UNIFORM_STATUS_LABELS[o.status]}</span></td>
                            <td>{o.trackingCode ?? "—"}</td>
                          </tr>
                        ))}
                        {ordersFiltered.length === 0 && <tr><td colSpan={4} className={panel.muted}>Nenhum pedido de uniforme.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {requirePhotoApproval && (
                <>
                  <h2 style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>Fotos a revisar ({photosPending.length})</h2>
                  <div style={{ overflowX: "auto" }}>
                    <table className={panel.table}>
                      <thead><tr><th>Colaborador</th><th>Foto</th><th>Status</th><th>Enviada em</th><th>Ação</th></tr></thead>
                      <tbody>
                        {photosPending.map((f) => (
                          <tr key={f.id}>
                            <td>{f.name}</td>
                            <td>{f.profilePhotoUrl && <a href={photoUrl(f.profilePhotoUrl)} target="_blank" rel="noreferrer">ver foto</a>}</td>
                            <td><span className={panel.badge}>{PHOTO_STATUS_LABELS[f.profilePhotoStatus]}</span></td>
                            <td>{f.profilePhotoSubmittedAt ? new Date(f.profilePhotoSubmittedAt).toLocaleString("pt-BR") : "—"}</td>
                            <td><button className={panel.ghostBtn} onClick={() => setReview(f)}>Revisar</button></td>
                          </tr>
                        ))}
                        {photosPending.length === 0 && <tr><td colSpan={5} className={panel.muted}>Nada a revisar.</td></tr>}
                      </tbody>
                    </table>
                  </div>

                  {photosRejected.length > 0 && (
                    <>
                      <h2 style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>Fotos recusadas aguardando reenvio ({photosRejected.length})</h2>
                      <div style={{ overflowX: "auto" }}>
                        <table className={panel.table}>
                          <thead><tr><th>Colaborador</th><th>Motivo da recusa</th></tr></thead>
                          <tbody>
                            {photosRejected.map((f) => (
                              <tr key={f.id}>
                                <td>{f.name}</td>
                                <td>{f.profilePhotoRejectionReason ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </main>

      {review && (
        <Modal title={`Revisar foto — ${review.name}`} onClose={() => setReview(null)}>
          <div className={panel.form}>
            {review.profilePhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl(review.profilePhotoUrl)} alt="Foto enviada" style={{ maxWidth: "100%", borderRadius: 12 }} />
            )}
            <button className={panel.primaryBtn} disabled={busy === review.id}
              onClick={() => act(review.id, () => reviewFreelancerPhoto(review.id, true)).then(() => setReview(null))}>
              Aprovar
            </button>
            <button className={panel.secondaryBtn} disabled={busy === review.id}
              onClick={() => {
                const r = prompt("Motivo da recusa / o que pedir na nova foto:");
                if (r) act(review.id, () => reviewFreelancerPhoto(review.id, false, r)).then(() => setReview(null));
              }}>
              Recusar / pedir outra foto
            </button>
          </div>
        </Modal>
      )}

      {onboardingReview && (
        <Modal title={`Onboarding — ${onboardingReview.name}`} onClose={() => setOnboardingReview(null)}>
          {onboardingLoading ? (
            <p>Carregando…</p>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              <FreelancerContractView contract={onboardingContract} />

              {onboardingReview.onboardingStatus === "pending_docs_review" && (
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <strong>Documentos enviados</strong>
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    {[
                      { url: onboardingReview.documentIdPhotoUrl, label: "RG/CNH" },
                      { url: onboardingReview.addressProofPhotoUrl, label: "Comprovante de residência" },
                      { url: onboardingReview.documentSelfiePhotoUrl, label: "Selfie" },
                    ].map(({ url, label }) => (
                      <a key={label} href={url ? photoUrl(url) : undefined} target="_blank" rel="noreferrer"
                        className={panel.ghostBtn} aria-disabled={!url}>
                        {label}
                      </a>
                    ))}
                  </div>
                  {onboardingErr && <p className={panel.error}>{onboardingErr}</p>}
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button className={panel.primaryBtn} disabled={busy === onboardingReview.id}
                      onClick={() => runOnboardingAction(() => approveOnboardingDocuments(onboardingReview.id))}>
                      {busy === onboardingReview.id ? "Aprovando…" : "Aprovar Documentos"}
                    </button>
                    <button className={panel.secondaryBtn} disabled={busy === onboardingReview.id}
                      onClick={() => {
                        const reason = prompt("Motivo da recusa (ex.: foto do RG ilegível):");
                        if (reason) runOnboardingAction(() => rejectOnboardingDocuments(onboardingReview.id, reason));
                      }}>
                      Recusar
                    </button>
                  </div>
                </div>
              )}

              {onboardingReview.onboardingStatus === "pending_aso_upload" && (
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <strong>Exame admissional (ASO)</strong>
                  <p className={panel.muted}>
                    Anexe o PDF do ASO recebido da telemedicina depois de concluir a verificação de
                    antecedentes por fora do sistema.
                  </p>
                  <FileField label="PDF do ASO" accept="application/pdf" file={asoFile} onChange={setAsoFile} />
                  {onboardingErr && <p className={panel.error}>{onboardingErr}</p>}
                  <button className={panel.primaryBtn} disabled={busy === onboardingReview.id || !asoFile}
                    onClick={() => asoFile && runOnboardingAction(() => uploadOnboardingAso(onboardingReview.id, asoFile))}>
                    {busy === onboardingReview.id ? "Enviando…" : "Enviar ASO"}
                  </button>
                </div>
              )}

              {onboardingReview.onboardingStatus === "pending_contract_generation" && (
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <p className={panel.muted}>
                    ASO anexado e antecedentes verificados. Ao liberar, o contrato é gerado a partir do
                    modelo ativo e a etapa de assinatura abre para o colaborador.
                  </p>
                  {onboardingErr && <p className={panel.error}>{onboardingErr}</p>}
                  <button className={panel.primaryBtn} disabled={busy === onboardingReview.id}
                    onClick={() => runOnboardingAction(() => releaseOnboardingContract(onboardingReview.id))}>
                    {busy === onboardingReview.id ? "Liberando…" : "Liberar Contrato"}
                  </button>
                </div>
              )}

              {onboardingReview.onboardingStatus === "pending_user_signature" && (
                <p className={panel.muted}>Aguardando o colaborador assinar o contrato.</p>
              )}

              {onboardingReview.onboardingStatus === "pending_final_activation" && (
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <p className={panel.muted}>
                    Contrato assinado. Ao ativar, o colaborador sai da sala de espera e passa a ver e
                    aceitar vagas normalmente.
                  </p>
                  {onboardingErr && <p className={panel.error}>{onboardingErr}</p>}
                  <button className={panel.primaryBtn} disabled={busy === onboardingReview.id}
                    onClick={() => runOnboardingAction(() => activateFreelancerOnboarding(onboardingReview.id))}>
                    {busy === onboardingReview.id ? "Ativando…" : "Ativar Colaborador"}
                  </button>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role={["agency", "partner"]}>
      <RequirePermission feature="colaboradores">
        <OnboardingPage />
      </RequirePermission>
    </RequireAuth>
  );
}
