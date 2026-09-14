import Head from "next/head";
import Sidebar from "@/src/components/supermarket/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import AlertsView from "@/src/components/alerts/AlertsView";
import HelpIcon from "@/src/components/common/HelpIcon";

function AlertsPage() {
  return (
    <>
      <Head><title>Alertas | Supermercado</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>
              Alertas de ocorrência
              <HelpIcon title="Como funcionam os alertas">
                <p>
                  Ocorrências que afetam a entrega do serviço contratado. A agência trata cada uma;
                  aqui você acompanha o andamento.
                </p>
              </HelpIcon>
            </h1>
          </header>
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
