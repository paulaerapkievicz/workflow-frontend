import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import panel from "@/styles/panel.module.scss";
import LandingContent from "@/src/components/landing/LandingContent";
import { getAgencyPublicLanding, AgencyPublicLanding } from "@/src/services/agencyService";

export default function AgencyLandingPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : null;
  const [agency, setAgency] = useState<AgencyPublicLanding | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getAgencyPublicLanding(id)
      .then(setAgency)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className={panel.authWrapper}>
        <p>Carregando…</p>
      </div>
    );
  }

  if (notFound || !agency) {
    return (
      <div className={panel.authWrapper}>
        <p className={panel.error}>Página não encontrada.</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{agency.name} — Mão de obra terceirizada, gerida por tecnologia própria</title>
        <meta
          name="description"
          content={`A Workflow fornece a equipe para o seu supermercado, em parceria com ${agency.name}, e você acompanha ponto, documentação e fechamento em tempo real pelo nosso aplicativo exclusivo.`}
        />
        <link rel="shortcut icon" href="/favicon.ico?v=3" type="image/x-icon" />
      </Head>

      <LandingContent whatsappNumber={agency.whatsappNumber} whatsappMessage={agency.whatsappMessage} />
    </>
  );
}
