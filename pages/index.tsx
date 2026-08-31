import Head from "next/head";
import Link from "next/link";
import s from "@/styles/landing.module.scss";
import { useAuth } from "@/src/hooks/useAuth";

const ROLE_HOME: Record<string, string> = {
  admin: "/",
  supermarket: "/supermarket/dashboard",
  agency: "/agency/dashboard",
  freelancer: "/freelancer/dashboard",
};

const AUDIENCES = [
  {
    icon: "🏪",
    title: "Supermercado",
    text: "Monte um pedido com várias funções e quantidades de uma vez. Acompanhe vagas, horas trabalhadas e o faturamento por mês.",
  },
  {
    icon: "🧭",
    title: "Agência",
    text: "Defina o valor/hora por função, veja quem está trabalhando em tempo real e gere o fechamento mensal para cada supermercado.",
  },
  {
    icon: "🎒",
    title: "Freelancer",
    text: "Receba as vagas disponíveis, faça check-in no local com foto de comprovação e acompanhe tudo o que tem a receber.",
  },
];

const STEPS = [
  { title: "Pedido de vagas", text: "O supermercado publica um pedido com as funções e a quantidade de atendentes." },
  { title: "Agência precifica", text: "A agência define o valor/hora e a vaga fica disponível para os freelancers." },
  { title: "Serviço no local", text: "O freelancer faz check-in por geolocalização, envia fotos e registra os turnos." },
  { title: "Fechamento mensal", text: "As horas trabalhadas viram uma fatura consolidada e o pagamento é feito no fechamento." },
];

export default function HomePage() {
  const { authenticated, role } = useAuth();
  const panelHref = role ? ROLE_HOME[role] ?? "/" : "/login";

  return (
    <>
      <Head>
        <title>WorkFlow — Gestão de vagas, equipes e pagamentos</title>
        <meta
          name="description"
          content="WorkFlow conecta supermercados, agências e freelancers: pedidos de vagas em lote, check-in por geolocalização e fechamento mensal automático."
        />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
      </Head>

      <main className={s.page}>
        {/* Hero */}
        <section className={s.hero}>
          <div className={`${s.wrap} ${s.heroGrid}`}>
            <div>
              <span className={s.eyebrow}>Plataforma de gestão de vagas</span>
              <h1 className={s.h1}>
                Do <em>pedido de vagas</em> ao pagamento, tudo em um só lugar
              </h1>
              <p className={s.lead}>
                O WorkFlow conecta supermercados, agências e freelancers com pedidos em lote,
                check-in por geolocalização e fechamento mensal automático.
              </p>
              <div className={s.actions}>
                {authenticated ? (
                  <Link href={panelHref} className={s.btnPrimary}>Ir para o meu painel</Link>
                ) : (
                  <>
                    <Link href="/register" className={s.btnPrimary}>Criar conta grátis</Link>
                    <Link href="/login" className={s.btnGhost}>Entrar</Link>
                  </>
                )}
              </div>
            </div>

            <div className={s.mock} aria-hidden="true">
              <div className={s.mockBar}><i /><i /><i /></div>
              <div className={s.mockRow}>
                <div><strong>Operador de Caixa</strong><br /><span>3 vagas · 08:00–14:00</span></div>
                <span className={`${s.pill} ${s.pillBlue}`}>Aberto</span>
              </div>
              <div className={s.mockRow}>
                <div><strong>Repositor</strong><br /><span>Joana · check-in às 08:03</span></div>
                <span className={`${s.pill} ${s.pillAmber}`}>Em andamento</span>
              </div>
              <div className={s.mockRow}>
                <div><strong>Fechamento de agosto</strong><br /><span>18 vagas · 142 h trabalhadas</span></div>
                <span className={`${s.pill} ${s.pillGreen}`}>R$ 3.408</span>
              </div>
            </div>
          </div>
        </section>

        {/* Audiências */}
        <section className={s.section}>
          <div className={s.wrap}>
            <h2 className={s.h2}>Feito para os três lados da operação</h2>
            <p className={s.sectionText}>
              Cada perfil tem a sua área, com as informações e ações certas — sem planilhas paralelas.
            </p>
            <div className={s.cards}>
              {AUDIENCES.map((a) => (
                <article key={a.title} className={s.card}>
                  <span className={s.icon}>{a.icon}</span>
                  <h3>{a.title}</h3>
                  <p>{a.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className={`${s.section} ${s.sectionAlt}`}>
          <div className={s.wrap}>
            <h2 className={s.h2}>Como funciona</h2>
            <p className={s.sectionText}>Do pedido ao pagamento, em quatro passos.</p>
            <div className={s.steps}>
              {STEPS.map((step) => (
                <div key={step.title} className={s.step}>
                  <h4>{step.title}</h4>
                  <p>{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={`${s.wrap} ${s.ctaBand}`}>
          <div className={s.ctaInner}>
            <h2>Pronto para organizar a sua operação?</h2>
            <p>Crie a sua conta gratuitamente e faça o primeiro pedido em minutos.</p>
            <Link href={authenticated ? panelHref : "/register"} className={s.ctaBtn}>
              {authenticated ? "Abrir o painel" : "Começar agora"}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
