import Head from "next/head";
import type { ReactNode } from "react";
import panel from "@/styles/panel.module.scss";

interface PanelPageProps {
  /** Vira o <title> da aba do navegador. */
  title: string;
  /** Conteúdo do <h1> — por padrão usa o próprio `title` (sem o "| Papel" do <title>). */
  heading?: ReactNode;
  /** Instância do <Sidebar/> do papel (agência/supermercado/freelancer/…). */
  sidebar: ReactNode;
  /** Elemento extra alinhado à direita no cabeçalho, ao lado do h1. */
  headerExtra?: ReactNode;
  children: ReactNode;
}

/** Esqueleto padrão de uma tela de painel — Head + sidebar + conteúdo com cabeçalho — antes
 * duplicado em cada página. Centraliza aqui pra qualquer ajuste futuro de chrome virar um
 * único arquivo em vez de N páginas repetidas. */
export default function PanelPage({ title, heading, sidebar, headerExtra, children }: PanelPageProps) {
  return (
    <>
      <Head><title>{title}</title></Head>
      <main className={panel.container}>
        {sidebar}
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>{heading ?? title}</h1>
            {headerExtra}
          </header>
          {children}
        </section>
      </main>
    </>
  );
}
