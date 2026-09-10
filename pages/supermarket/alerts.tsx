import Head from "next/head";
import Sidebar from "@/src/components/supermarket/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import AlertsView from "@/src/components/alerts/AlertsView";

function AlertsPage() {
  return (
    <>
      <Head><title>Alertas | Supermercado</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>Alertas de ocorrência</h1>
          </header>
          <p className={panel.muted}>
            Ocorrências que afetam a entrega do serviço contratado. A agência trata cada uma;
            aqui você acompanha o andamento.
          </p>
          <AlertsView role="supermarket" jobHref={(id) => `/supermarket/jobs?job=${id}`} />
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="supermarket">
      <AlertsPage />
    </RequireAuth>
  );
}
