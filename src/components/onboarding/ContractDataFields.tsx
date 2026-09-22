import panel from "@/styles/panel.module.scss";
import FormField from "@/src/components/FormField";
import HelpIcon from "@/src/components/common/HelpIcon";
import {
  CONTRACT_SECTIONS as SECTIONS, PIX_FIELD_KIND,
} from "@/src/lib/freelancerContractFields";
import { FREELANCER_PIX_KEY_TYPES, PIX_KEY_TYPE_LABELS, type FreelancerPixKeyType } from "@/src/services/onboardingService";

interface Props {
  values: Record<string, string>;
  set: (key: string, value: string) => void;
  showErrors: boolean;
  customOptionFields: Record<string, boolean>;
  setCustomOptionFields: (updater: (cur: Record<string, boolean>) => Record<string, boolean>) => void;
}

/**
 * Campos do perfil contratual (dados pessoais, endereço, banco, contato de emergência + chave
 * Pix) — usado tanto no pré-cadastro (`/freelancer/onboarding`) quanto na edição pós-ativação
 * (`/freelancer/profile`), pra não duplicar essa renderização em dois lugares.
 */
export default function ContractDataFields({ values, set, showErrors, customOptionFields, setCustomOptionFields }: Props) {
  return (
    <>
      {SECTIONS.map((sec) => (
        <div key={sec.title} style={{ marginTop: "0.8rem" }}>
          <p style={{ fontWeight: 600, margin: "0.4rem 0" }}>{sec.title}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.6rem" }}>
            {sec.fields.map((f) => {
              const invalid = showErrors && f.required && !(values[f.key] ?? "").trim();
              const invalidStyle = invalid
                ? { borderColor: "var(--danger)", background: "var(--danger-soft)" }
                : undefined;

              if (f.kind) {
                return (
                  <FormField
                    key={f.key}
                    label={f.label}
                    kind={f.kind}
                    required={f.required}
                    maxLength={f.maxLength}
                    value={values[f.key] ?? ""}
                    onChange={(v) => set(f.key, v)}
                    error={invalid ? "Campo obrigatório" : undefined}
                    hint={f.hint}
                    autoComplete={f.autoComplete}
                  />
                );
              }

              if (f.options) {
                const raw = values[f.key] ?? "";
                const known = f.options.some((o) => o.value === raw);
                const isOther = f.allowOther && (customOptionFields[f.key] || (!!raw && !known));
                return (
                  <div key={f.key} className={panel.filterField}>
                    <label>
                      <span>
                        {f.label}
                        {f.required ? " *" : ""}
                      </span>
                      <select
                        value={isOther ? "__outra__" : known ? raw : ""}
                        aria-invalid={invalid || undefined}
                        style={invalidStyle}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "__outra__") {
                            setCustomOptionFields((cur) => ({ ...cur, [f.key]: true }));
                            set(f.key, "");
                          } else {
                            setCustomOptionFields((cur) => ({ ...cur, [f.key]: false }));
                            set(f.key, v);
                          }
                        }}
                      >
                        <option value="">Selecione…</option>
                        {f.options.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                        {f.allowOther && <option value="__outra__">Outra…</option>}
                      </select>
                    </label>
                    {isOther && (
                      <input
                        style={{ marginTop: "0.4rem", ...(invalidStyle ?? {}) }}
                        placeholder="Especifique"
                        value={raw}
                        onChange={(e) => set(f.key, e.target.value)}
                        aria-invalid={invalid || undefined}
                      />
                    )}
                    {f.hint && <small className={panel.muted} style={{ textTransform: "none", fontWeight: 400 }}>{f.hint}</small>}
                  </div>
                );
              }

              return (
                <label key={f.key} className={panel.filterField}>
                  <span>
                    {f.label}
                    {f.required ? " *" : ""}
                  </span>
                  <input
                    type={f.type === "date" ? "date" : "text"}
                    value={values[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                    aria-invalid={invalid || undefined}
                    autoComplete={f.autoComplete}
                    list={f.suggestions ? `${f.key}-suggestions` : undefined}
                    style={invalidStyle}
                  />
                  {f.suggestions && (
                    <datalist id={`${f.key}-suggestions`}>
                      {f.suggestions.map((s) => <option key={s} value={s} />)}
                    </datalist>
                  )}
                  {f.hint && <small className={panel.muted} style={{ textTransform: "none", fontWeight: 400 }}>{f.hint}</small>}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ marginTop: "0.8rem" }}>
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
    </>
  );
}
