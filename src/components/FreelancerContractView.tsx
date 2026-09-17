import { CONTRACT_SECTIONS } from "@/src/lib/freelancerContractFields";
import { PIX_KEY_TYPE_LABELS, type FreelancerContract, type FreelancerPixKeyType } from "@/src/services/onboardingService";
import panel from "@/styles/panel.module.scss";

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: "var(--text-muted)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
  gap: "0.5rem 1rem",
  fontSize: "0.88rem",
};

/** Exibição somente-leitura do perfil contratual do onboarding — usada na revisão da agência e
 * na seção "Dados do onboarding" do cadastro do colaborador (ambas leem os mesmos dados). */
export default function FreelancerContractView({ contract }: { contract: FreelancerContract | null }) {
  if (!contract) {
    return <p className={panel.muted}>Nenhum dado de onboarding preenchido ainda.</p>;
  }
  const val = (key: string) => {
    const v = contract[key];
    return v == null || v === "" ? "—" : String(v);
  };
  const pixType = contract.pixKeyType as FreelancerPixKeyType | null | undefined;

  return (
    <div style={{ display: "grid", gap: "0.9rem" }}>
      {CONTRACT_SECTIONS.map((sec) => (
        <div key={sec.title}>
          <p style={{ fontWeight: 700, margin: "0 0 0.4rem" }}>{sec.title}</p>
          <div style={gridStyle}>
            {sec.fields.map((f) => (
              <div key={f.key}>
                <span style={fieldLabelStyle}>{f.label}</span>
                {val(f.key)}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p style={{ fontWeight: 700, margin: "0 0 0.4rem" }}>Pix e uniforme</p>
        <div style={gridStyle}>
          <div>
            <span style={fieldLabelStyle}>Chave Pix</span>
            {pixType ? `${PIX_KEY_TYPE_LABELS[pixType]}: ${val("pixKey")}` : "—"}
          </div>
          <div>
            <span style={fieldLabelStyle}>Tamanho da camiseta</span>
            {val("shirtSize")}
          </div>
        </div>
      </div>
    </div>
  );
}
