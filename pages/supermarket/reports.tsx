import Head from "next/head";
import Sidebar from "@/src/components/supermarket/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";

export default function Page() {
  return (
    <RequireAuth role="supermarket">
      <Head><title>Relatórios | Supermercado</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Relatórios</h1></header>
          <p className={panel.muted}>Em breve.</p>
        </section>
      </main>
    </RequireAuth>
  );
}
