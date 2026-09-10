import { photoUrl } from "@/src/services/jobPhotoService";
import styles from "@/styles/freelancerChip.module.scss";
import FreelancerReputation from "@/src/components/FreelancerReputation";
import { FreelancerReputation as Reputation } from "@/src/services/reviewService";
import { AssignedLeader } from "@/src/services/agencyMemberService";

export interface FreelancerChipData {
  name?: string | null;
  profilePhotoUrl?: string | null;
}

interface Props {
  freelancer?: FreelancerChipData | null;
  /** Se passado, o chip vira um botão com hover e chama isto ao clicar. */
  onClick?: () => void;
  /** Texto quando não há colaborador alocado. */
  emptyLabel?: string;
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

/** Colaborador alocado numa vaga: avatar + nome, com estilo consistente em todo o sistema. */
export default function FreelancerChip({ freelancer, onClick, emptyLabel = "—" }: Props) {
  if (!freelancer?.name) return <span className={styles.empty}>{emptyLabel}</span>;

  const { name, profilePhotoUrl } = freelancer;
  const inner = (
    <>
      {profilePhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.avatar} src={photoUrl(profilePhotoUrl)} alt="" />
      ) : (
        <span className={styles.initials} aria-hidden>
          {initialsOf(name)}
        </span>
      )}
      <span className={styles.name}>{name}</span>
    </>
  );

  if (!onClick) return <span className={styles.chip}>{inner}</span>;

  return (
    <button type="button" className={`${styles.chip} ${styles.clickable}`} onClick={onClick} title={`Ver perfil de ${name}`}>
      {inner}
    </button>
  );
}

/** Lista dos líderes que respondem por um colaborador. */
export function AssignedLeaders({ leaders }: { leaders?: AssignedLeader[] | null }) {
  if (!leaders) return null;
  const title = leaders.length === 1 ? "Líder responsável" : "Líderes responsáveis";
  return (
    <div style={{ marginTop: 12, width: "100%", textAlign: "left" }}>
      <p className={styles.profileRow} style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
        {title}
      </p>
      {leaders.length === 0 ? (
        <p className={styles.profileRow}>Nenhum líder designado.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
          {leaders.map((l) => (
            <li key={l.id} className={styles.profileRow} style={{ color: "var(--text)" }}>
              {l.name}
              {l.scope === "all" && (
                <span className={styles.profileRow} style={{ marginLeft: 6 }}>
                  · rede toda
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Conteúdo padrão da modal de perfil do colaborador. */
export function FreelancerProfileBody({
  name,
  phone,
  profilePhotoUrl,
  reputation,
  leaders,
}: {
  name: string;
  phone?: string | null;
  profilePhotoUrl?: string | null;
  reputation?: Reputation | null;
  /** Quando passado, mostra a seção "Líder responsável". */
  leaders?: AssignedLeader[] | null;
}) {
  return (
    <div className={styles.profile}>
      {profilePhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.profilePhoto} src={photoUrl(profilePhotoUrl)} alt={name} />
      ) : (
        <span className={styles.initials} style={{ width: 96, height: 96, fontSize: "1.8rem" }} aria-hidden>
          {initialsOf(name)}
        </span>
      )}
      <p className={styles.profileName}>{name}</p>
      <p className={styles.profileRow}>Telefone: {phone || "—"}</p>
      {reputation && (
        <div style={{ marginTop: 12, width: "100%", textAlign: "left" }}>
          <FreelancerReputation reputation={reputation} compact />
        </div>
      )}
      <AssignedLeaders leaders={leaders} />
    </div>
  );
}
