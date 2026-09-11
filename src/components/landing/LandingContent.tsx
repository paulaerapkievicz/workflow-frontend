import Link from "next/link";
import s from "@/styles/landing.module.scss";
import { useAuth } from "@/src/hooks/useAuth";
import { useSelfRegistrationOpen } from "@/src/hooks/useSelfRegistrationOpen";
import {
  buildWhatsAppLink,
  proposalEmailLink,
  WHATSAPP_NUMBER,
  CONTACT_EMAIL,
  COMPANY_CNPJ,
  COMPANY_CITY,
} from "@/src/config/landingContact";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin/agencias",
  supermarket: "/supermarket/dashboard",
  agency: "/agency/dashboard",
  leader: "/leader/dashboard",
  freelancer: "/freelancer/dashboard",
};

const FUNCTIONS = ["Repositor", "Operador de caixa", "Empacotador", "Promotor", "Estoquista", "Açougue e padaria"];

const PAIN_POINTS = [
  "Profissionais entram na sua loja sem você saber se a documentação trabalhista está em dia.",
  "O controle de horas é feito em papel ou planilha — e a fatura vem com surpresa.",
  "Você não tem como saber se o terceirizado realmente chegou, ou a que horas chegou.",
  "Quando alguém falta, você só descobre quando a loja já está descoberta.",
];

const TIMELINE = [
  { time: "07:58", title: "Falta detectada no check-in", text: "O sistema identifica a ausência sozinho" },
  { time: "07:59", title: "Vaga reaberta para a base", text: "Profissionais qualificados são acionados" },
  { time: "08:12", title: "Novo repositor confirmado", text: "Sua loja nem sentiu" },
];

const BENEFITS = [
  {
    title: "Você define as regras de aprovação",
    text: "O gerente pede, o RH aprova, e ninguém é pego de surpresa na fatura. O fluxo de aprovação é configurado do jeito que a sua empresa funciona.",
  },
  {
    title: "Documentação validada antes de cada turno",
    text: "Nenhum profissional é escalado para a sua loja sem que o sistema confirme a documentação em dia. Segurança verificada turno a turno, não uma vez por ano.",
  },
  {
    title: "Radar de Loja: ponto eletrônico por GPS",
    text: "Veja pelo celular quem da nossa equipe está na sua loja agora. O check-in só é liberado a menos de 200 m do seu supermercado.",
  },
  {
    title: "Fechamento transparente",
    text: "A fatura nasce das horas registradas por GPS, e você avalia o serviço antes de aprovar o fechamento. Pague pelo que aconteceu, não pelo que foi prometido.",
  },
];

const STEPS = [
  { title: "Peça", text: "O gerente solicita a função, a quantidade, o dia e o horário pelo app." },
  { title: "Aprove", text: "O responsável que você definir libera o pedido com um toque." },
  { title: "Acompanhe", text: "Check-ins em tempo real, horas registradas e fechamento mensal consolidado para pagar de uma vez." },
];

const STATS = [
  { value: "12", label: "lojas atendidas na região" },
  { value: "640", label: "turnos preenchidos nos últimos meses" },
  { value: "97%", label: "de presença confirmada por check-in" },
  { value: "4 h", label: "tempo médio entre pedido e equipe confirmada" },
];

const FAQ = [
  {
    q: "Quem é o empregador dos profissionais?",
    a: "A Workflow. Contratação, encargos e gestão são responsabilidade nossa. Sua loja recebe uma única fatura mensal, com o detalhamento de cada turno.",
  },
  {
    q: "E se o profissional não aparecer?",
    a: "O sistema detecta a ausência no horário do check-in e aciona a reposição imediatamente. Você acompanha tudo pelo app, sem precisar ligar para ninguém.",
  },
  {
    q: "Preciso pagar pelo sistema?",
    a: "Não. O acesso ao aplicativo está incluído para todos os clientes da Workflow. Ele existe para você auditar o nosso próprio serviço.",
  },
  {
    q: "Atendem apenas supermercados?",
    a: "Nosso foco é o varejo alimentar, mas atendemos operações de varejo em geral. Fale com a gente e conte a sua necessidade.",
  },
  {
    q: "Qual o volume mínimo?",
    a: "Não exigimos volume mínimo nem contrato de fidelidade. Muitos clientes começam com um único turno de teste.",
  },
];

const PROPOSAL_MESSAGE = "Olá! Quero uma proposta da Workflow para o meu supermercado.";
const DEFAULT_WHATSAPP_MESSAGE = "Olá! Vim pelo site e queria falar com a Workflow.";

export interface LandingContentProps {
  /** Número de WhatsApp (com DDI) usado nos botões de contato. Sem valor, cai no padrão da plataforma. */
  whatsappNumber?: string | null;
  /** Mensagem pré-preenchida dos botões de WhatsApp. Sem valor, usa uma mensagem genérica. */
  whatsappMessage?: string | null;
}

export default function LandingContent({ whatsappNumber, whatsappMessage }: LandingContentProps) {
  const { authenticated, role } = useAuth();
  const registrationOpen = useSelfRegistrationOpen();
  const panelHref = role ? ROLE_HOME[role] ?? "/" : "/login";

  const number = whatsappNumber || WHATSAPP_NUMBER;
  const chatMessage = whatsappMessage || DEFAULT_WHATSAPP_MESSAGE;
  const waLink = buildWhatsAppLink(number, chatMessage);

  return (
    <main className={s.page}>
      {/* Hero */}
      <section className={s.hero}>
        <div className={`${s.wrap} ${s.heroGrid}`}>
          <div>
            <span className={s.eyebrow}>Mão de obra sob demanda para o varejo</span>
            <h1 className={s.h1}>
              Mão de obra terceirizada, <em>gerida por tecnologia própria</em>.
            </h1>
            <p className={s.lead}>
              Esqueça as agências que operam no escuro pelo WhatsApp. A Workflow fornece a equipe
              — e você acompanha ponto, documentação e fechamento em tempo real pelo nosso
              aplicativo exclusivo, sem pagar nada por ele.
            </p>

            {authenticated ? (
              <div className={s.actions}>
                <Link href={panelHref} className={s.btnPrimary}>Ir para o meu painel</Link>
              </div>
            ) : (
              <>
                <div className={s.actions}>
                  <a href={proposalEmailLink(PROPOSAL_MESSAGE)} className={s.btnPrimary}>
                    Quero uma proposta para minha loja
                  </a>
                  <a href={waLink} className={s.btnGhost}>
                    Falar no WhatsApp
                  </a>
                </div>
                <span className={s.heroNote}>Sem volume mínimo e sem contrato de fidelidade</span>
              </>
            )}
          </div>

          <div className={s.mock} aria-hidden="true">
            <div className={s.mockBar}><i /><i /><i /></div>
            <div className={s.mockHeader}>Loja Centro · hoje</div>
            <div className={s.mockRow}>
              <div><strong>Operador de Caixa</strong><br /><span>3 vagas · 08:00–14:00</span></div>
              <span className={`${s.pill} ${s.pillAmber}`}>2 de 3 confirmados</span>
            </div>
            <div className={s.mockRow}>
              <div><strong>Repositor</strong><br /><span>Joana · check-in às 08:03 · a 46 m da loja</span></div>
              <span className={`${s.pill} ${s.pillBlue}`}>Em andamento</span>
            </div>
            <div className={s.mockRow}>
              <div><strong>Fechamento de agosto</strong><br /><span>18 vagas · 142 h auditadas por GPS</span></div>
              <span className={`${s.pill} ${s.pillGreen}`}>R$ 3.408</span>
            </div>

            <div className={s.mockNotification}>
              <strong>Falta detectada — reposição acionada</strong>
              <span>Novo repositor confirmado em 14 min</span>
            </div>
          </div>
        </div>
      </section>

      {!authenticated && (
        <>
          {/* Faixa de funções */}
          <section className={s.functionsBar}>
            <div className={`${s.wrap} ${s.functionsInner}`}>
              <span className={s.functionsLabel}>Funções que escalamos:</span>
              <div className={s.functionsList}>
                {FUNCTIONS.map((f) => (
                  <span key={f} className={s.functionPill}>{f}</span>
                ))}
              </div>
            </div>
          </section>

          {/* A dor */}
          <section className={s.section}>
            <div className={s.wrap}>
              <h2 className={s.h2}>Por que a terceirização tradicional coloca seu supermercado em risco?</h2>
              <p className={s.sectionText}>
                Não é má vontade das agências. É que sem tecnologia, ninguém consegue enxergar a
                operação — nem elas, nem você.
              </p>
              <ul className={s.painList}>
                {PAIN_POINTS.map((p) => (
                  <li key={p} className={s.painItem}>
                    <span className={s.painIcon}>✕</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* A solução */}
          <section className={`${s.section} ${s.sectionAlt}`}>
            <div className={`${s.wrap} ${s.solutionInner}`}>
              <span className={s.eyebrow}>O jeito Workflow</span>
              <h2 className={s.h2}>A evolução da terceirização.</h2>
              <p className={s.solutionText}>
                Não somos um software à venda, e não somos uma agência comum. Somos uma operação
                de mão de obra que <strong>criou a própria tecnologia para proteger quem
                contrata</strong>. Ao fechar com a Workflow, seu supermercado ganha acesso
                completo ao nosso sistema — e paga <em>apenas pelo que foi auditado e
                executado</em>.
              </p>
            </div>
          </section>

          {/* Benefícios */}
          <section className={s.section}>
            <div className={s.wrap}>
              <h2 className={s.h2}>O que muda quando a agência tem tecnologia própria</h2>

              <div className={s.benefitHighlight}>
                <div className={s.benefitHighlightText}>
                  <h3>Pediu hoje, equipe amanhã.</h3>
                  <p>
                    Solicite pelo app em dois minutos. E se alguém da nossa equipe faltar, o
                    sistema aciona a reposição na hora — antes de a sua loja sentir.
                  </p>
                </div>
                <ol className={s.timeline}>
                  {TIMELINE.map((t) => (
                    <li key={t.time}>
                      <time>{t.time}</time>
                      <div>
                        <strong>{t.title}</strong>
                        <span>{t.text}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className={s.cards}>
                {BENEFITS.map((b) => (
                  <article key={b.title} className={s.card}>
                    <h3>{b.title}</h3>
                    <p>{b.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* Como funciona */}
          <section className={`${s.section} ${s.sectionAlt}`}>
            <div className={s.wrap}>
              <h2 className={s.h2}>Simples para a sua equipe, do pedido ao pagamento</h2>
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

          {/* Números */}
          <section className={s.section}>
            <div className={s.wrap}>
              <h2 className={s.h2}>Operação em andamento, não promessa</h2>
              <div className={s.stats}>
                {STATS.map((st) => (
                  <div key={st.label} className={s.statItem}>
                    <strong>{st.value}</strong>
                    <span>{st.label}</span>
                  </div>
                ))}
              </div>
              <p className={s.statsNote}>Números da operação Workflow, atualizados a cada fechamento mensal.</p>
            </div>
          </section>

          {/* FAQ */}
          <section className={`${s.section} ${s.sectionAlt}`}>
            <div className={`${s.wrap} ${s.faqWrap}`}>
              <h2 className={s.h2}>Perguntas frequentes</h2>
              <div className={s.faq}>
                {FAQ.map((item) => (
                  <details key={item.q} className={s.faqItem}>
                    <summary>{item.q}</summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* Chamada final */}
          <section className={`${s.wrap} ${s.ctaBand}`}>
            <div className={s.ctaInner}>
              <h2>Coloque a sua próxima equipe para trabalhar com transparência total.</h2>
              <p>
                Peça uma proposta sem compromisso. Em uma conversa rápida entendemos a sua
                operação e montamos o plano para a sua loja.
              </p>
              <div className={s.ctaActions}>
                <a href={proposalEmailLink(PROPOSAL_MESSAGE)} className={s.ctaBtn}>
                  Quero uma proposta para minha loja
                </a>
                <a href={waLink} className={s.ctaBtnGhost}>
                  Chamar no WhatsApp
                </a>
              </div>
            </div>
          </section>

          {/* Rodapé */}
          <footer className={s.landingFooter}>
            <div className={`${s.wrap} ${s.footerInner}`}>
              <div className={s.footerBrand}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-white.png"
                  alt="Workflow — Gente certa, na hora certa"
                  className={s.footerLogo}
                />
              </div>

              <div className={s.footerCol}>
                <h4>Contato</h4>
                <a href={waLink}>WhatsApp comercial</a>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </div>

              <div className={s.footerCol}>
                <h4>Acesso</h4>
                <Link href="/login">Entrar no sistema</Link>
                {registrationOpen && <Link href="/register">Trabalhe conosco</Link>}
              </div>
            </div>

            <div className={s.footerBottom}>
              © {new Date().getFullYear()} Workflow. Todos os direitos reservados. · CNPJ {COMPANY_CNPJ} · {COMPANY_CITY}
            </div>
          </footer>
        </>
      )}
    </main>
  );
}
