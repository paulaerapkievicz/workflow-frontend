import Head from "next/head";
import LandingContent from "@/src/components/landing/LandingContent";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Workflow — Mão de obra terceirizada, gerida por tecnologia própria</title>
        <meta
          name="description"
          content="A Workflow fornece a equipe para o seu supermercado e você acompanha ponto, documentação e fechamento em tempo real pelo nosso aplicativo exclusivo, sem pagar nada por ele."
        />
        <link rel="shortcut icon" href="/favicon.ico?v=3" type="image/x-icon" />
      </Head>

      <LandingContent />
    </>
  );
}
