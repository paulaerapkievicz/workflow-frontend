import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Sidebar from "@/src/components/agency/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import RequirePermission from "@/src/components/RequirePermission";
import panel from "@/styles/panel.module.scss";
import StarRating from "@/src/components/StarRating";
import { getAgencyReviews, AgencyReviewRow } from "@/src/services/reviewService";
import { getMyFreelancers, AgencyFreelancer } from "@/src/services/agencyService";
import { useAuth } from "@/src/hooks/useAuth";

const authorLabel = (role?: string | null) =>
  role === "supermarket" ? "Cliente" : role === "agency" ? "Agência" : "—";

const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

function ReviewsPage() {
  const { profile } = useAuth();
  const agencyId = (profile as { id?: string } | null)?.id ?? "";
  const [rows, setRows] = useState<AgencyReviewRow[]>([]);
  const [freelancers, setFreelancers] = useState<AgencyFreelancer[]>([]);
  const [freelancerId, setFreelancerId] = useState("");
  const [groupByJob, setGroupByJob] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getAgencyReviews(freelancerId ? { freelancerId } : {}));
    } finally {
      setLoading(false);
    }
  }, [freelancerId]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  useEffect(() => {
    if (agencyId) getMyFreelancers(agencyId).then(setFreelancers).catch(() => {});
  }, [agencyId]);

  const byJob = useMemo(() => {
    const map = new Map<string, AgencyReviewRow[]>();
    for (const r of rows) {
      const arr = map.get(r.jobId) ?? [];
      arr.push(r);
      map.set(r.jobId, arr);
    }
    return [...map.values()];
  }, [rows]);

  const avg = rows.length
    ? (rows.reduce((a, r) => a + r.rating, 0) / rows.length).toFixed(2).replace(".", ",")
    : "—";

  return (
    <>
      <Head><title>Avaliações | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Avaliações dos colaboradores</h1></header>
          <p className={panel.muted}>
            Todas as avaliações que a agência e os supermercados-clientes publicaram sobre a entrega
            das vagas. O colaborador só enxerga a própria nota média; o supermercado só as que ele
            mesmo publicou.
          </p>

          <div className={panel.filterBar}>
            <label>
              Colaborador{" "}
              <select value={freelancerId} onChange={(e) => setFreelancerId(e.target.value)}>
                <option value="">Todos</option>
                {freelancers.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </label>
            <label className={panel.toggleRow}>
              <input type="checkbox" checked={groupByJob} onChange={(e) => setGroupByJob(e.target.checked)} />
              Agrupar por vaga
            </label>
            <span className={panel.muted}>{rows.length} avaliação(ões) · média {avg}</span>
          </div>

          {loading ? (
            <p>Carregando…</p>
          ) : rows.length === 0 ? (
            <p className={panel.muted}>Nenhuma avaliação ainda.</p>
          ) : groupByJob ? (
            <div style={{ display: "grid", gap: 12 }}>
              {byJob.map((group) => (
                <div key={group[0].jobId} className={panel.card}>
                  <div className={panel.tableToolbar}>
                    <strong>{group[0].jobTitle ?? "Vaga"}</strong>
                    <span className={panel.muted}>
                      {" "}{[group[0].freelancerName, group[0].categoryName, group[0].branchName].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                    {group.map((r) => (
                      <li key={r.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <StarRating value={r.rating} size={14} />
                          <small className={panel.muted}>{authorLabel(r.authorRole)} · {fmtDate(r.createdAt)}</small>
                        </div>
                        {r.comment && <p style={{ margin: "4px 0 0" }}>{r.comment}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className={panel.table}>
                <thead>
                  <tr>
                    <th>Colaborador</th><th>Nota</th><th>Comentário</th><th>Autor</th>
                    <th>Função</th><th>Filial</th><th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.freelancerName ?? "—"}</td>
                      <td><StarRating value={r.rating} size={13} /></td>
                      <td>{r.comment || "—"}</td>
                      <td>{authorLabel(r.authorRole)}</td>
                      <td>{r.categoryName ?? "—"}</td>
                      <td>{r.branchName ?? "—"}</td>
                      <td>{fmtDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default function AgencyReviews() {
  return (
    <RequireAuth role={["agency", "partner"]}>
      <RequirePermission feature="colaboradores">
        <ReviewsPage />
      </RequirePermission>
    </RequireAuth>
  );
}
