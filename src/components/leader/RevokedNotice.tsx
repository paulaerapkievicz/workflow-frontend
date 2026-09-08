import panel from "@/styles/panel.module.scss";

/** Mostrado quando a agência desativou o acesso do líder (profile.active === false). */
export default function RevokedNotice() {
  return (
    <section className={panel.content}>
      <header className={panel.header}>
        <div>
          <h1>Acesso suspenso</h1>
          <p className={panel.muted}>
            A sua agência desativou o seu acesso de líder. Fale com o responsável pela agência.
          </p>
        </div>
      </header>
    </section>
  );
}
