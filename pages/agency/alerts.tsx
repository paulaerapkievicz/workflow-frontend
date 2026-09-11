import Head from "next/head";
import Sidebar from "@/src/components/agency/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import RequirePermission from "@/src/components/RequirePermission";
import panel from "@/styles/panel.module.scss";
import AlertsView from "@/src/components/alerts/AlertsView";

function AlertsPage() {
  return (
    <>
      <Head><title>Alertas | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>Alertas de ocorrência</h1>
          </header>
          <p className={panel.muted}>
            Atraso no check-in, falta, saída antecipada, turno sem check-out, vaga descoberta e mais.
            Os limites ficam em Configurações → Alertas de ocorrência.
          </p>
          <AlertsView role="agency" jobHref={(id) => `/agency/orders?job=${id}`} />
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role={["agency", "partner"]}>
      <RequirePermission feature="vagas">
        <AlertsPage />
      </RequirePermission>
    </RequireAuth>
  );
}
