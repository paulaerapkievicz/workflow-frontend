import Head from "next/head";
import Sidebar from "@/src/components/leader/Sidebar";
import RevokedNotice from "@/src/components/leader/RevokedNotice";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import AlertsView from "@/src/components/alerts/AlertsView";

function AlertsPage() {
  return (
    <>
      <Head><title>Alertas | Líder</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <RevokedNotice />
          <header className={panel.header}>
            <h1>Alertas de ocorrência</h1>
          </header>
          <p className={panel.muted}>
            Ocorrências das vagas do seu grupo de trabalho: atraso, falta, saída antecipada, turno sem check-out e mais.
          </p>
          <AlertsView role="leader" jobHref={(id) => `/leader/orders?job=${id}`} />
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="leader">
      <AlertsPage />
    </RequireAuth>
  );
}
