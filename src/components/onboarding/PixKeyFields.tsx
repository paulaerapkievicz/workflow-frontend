import panel from "@/styles/panel.module.scss";
import FormField from "@/src/components/FormField";
import HelpIcon from "@/src/components/common/HelpIcon";
import { PIX_FIELD_KIND } from "@/src/lib/freelancerContractFields";
import { FREELANCER_PIX_KEY_TYPES, PIX_KEY_TYPE_LABELS, type FreelancerPixKeyType } from "@/src/services/onboardingService";

interface Props {
  values: Record<string, string>;
  set: (key: string, value: string) => void;
  showErrors: boolean;
}

/** Tipo + chave Pix — usado no formulário completo do onboarding e no cartão básico do perfil. */
export default function PixKeyFields({ values, set, showErrors }: Props) {
  return (
    <div>
      <p style={{ fontWeight: 600, margin: "0.4rem 0", display: "flex", alignItems: "center", gap: 4 }}>
        Chave Pix
        <HelpIcon title="Chave Pix pessoal">
          <p>
            A chave Pix cadastrada aqui precisa ser <strong>sua</strong> — a mesma pessoa do
            CPF, do e-mail de login ou do telefone informados no seu cadastro, conforme o
            tipo escolhido. Chave de terceiro (de outra pessoa) é recusada.
          </p>
          <p>
            Sem uma chave Pix própria cadastrada não é possível aceitar vagas — é o único
            jeito de você receber o pagamento.
          </p>
        </HelpIcon>
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.6rem" }}>
        <label className={panel.filterField}>
          <span>Tipo de chave Pix *</span>
          <select
            value={values.pixKeyType ?? ""}
            onChange={(e) => set("pixKeyType", e.target.value)}
            aria-invalid={(showErrors && !values.pixKeyType) || undefined}
            style={
              showErrors && !values.pixKeyType
                ? { borderColor: "var(--danger)", background: "var(--danger-soft)" }
                : undefined
            }
          >
            <option value="">Selecione…</option>
            {FREELANCER_PIX_KEY_TYPES.map((t) => (
              <option key={t} value={t}>{PIX_KEY_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <FormField
          label="Chave Pix"
          kind={PIX_FIELD_KIND[(values.pixKeyType as FreelancerPixKeyType) || "aleatoria"]}
          required
          value={values.pixKey ?? ""}
          onChange={(v) => set("pixKey", v)}
          error={showErrors && !(values.pixKey ?? "").trim() ? "Campo obrigatório" : undefined}
          hint="Precisa ser a sua própria chave — não pode ser de terceiros."
        />
      </div>
    </div>
  );
}
