import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";
import s from "@/styles/auth.module.scss";
import { authService, RegisterPayload } from "@/src/services/authService";
import { getAgencies, Agency } from "@/src/services/agencyService";

type RoleKey = "supermarket" | "agency" | "freelancer";

const ROLE_TABS: { key: RoleKey; label: string }[] = [
  { key: "supermarket", label: "Supermercado" },
  { key: "agency", label: "Agência" },
  { key: "freelancer", label: "Freelancer" },
];

const ROLE_HOME: Record<string, string> = {
  supermarket: "/supermarket/dashboard",
  agency: "/agency/dashboard",
  freelancer: "/freelancer/dashboard",
};

export default function RegisterPage() {
  const [role, setRole] = useState<RoleKey>("supermarket");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    companyName: "", cnpj: "", address: "",
    commissionPercentage: "15", agencyId: "", skills: "",
  });
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAgencies().then(setAgencies).catch(() => setAgencies([]));
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: RegisterPayload = {
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
      role,
      profile:
        role === "freelancer"
          ? { agencyId: form.agencyId || null, skills: form.skills || undefined }
          : {
              companyName: form.companyName,
              cnpj: form.cnpj,
              address: form.address,
              commissionPercentage: role === "agency" ? Number(form.commissionPercentage) : undefined,
            },
    };

    try {
      const { user } = await authService.register(payload);
      window.location.assign(ROLE_HOME[user.role] ?? "/");
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message ?? "Não foi possível cadastrar."
          : "Não foi possível cadastrar."
      );
    } finally {
      setLoading(false);
    }
  };

  const isCompany = role === "supermarket" || role === "agency";

  return (
    <>
      <Head><title>Criar conta | WorkFlow</title></Head>
      <div className={s.page}>
        <aside className={s.brand}>
          <div className={s.brandInner}>
            <div className={s.brandMark}><span>W</span> WorkFlow</div>
            <h1 className={s.brandTitle}>Crie a sua conta</h1>
            <p className={s.brandText}>
              Comece em minutos. Escolha o seu perfil e tenha acesso à gestão completa de vagas,
              equipes e pagamentos.
            </p>
            <ul className={s.brandList}>
              <li><span className={s.check}>✓</span> Grátis para começar</li>
              <li><span className={s.check}>✓</span> Sem cartão de crédito</li>
              <li><span className={s.check}>✓</span> Configuração guiada</li>
            </ul>
          </div>
        </aside>

        <section className={s.formSide}>
          <div className={s.card}>
            <div className={s.mobileMark}><span>W</span> WorkFlow</div>
            <h2 className={s.title}>Criar conta</h2>
            <p className={s.subtitle}>Selecione o tipo de acesso.</p>

            <div className={s.tabs}>
              {ROLE_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={role === t.key ? s.tabActive : ""}
                  onClick={() => setRole(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form className={`${s.form} ${s.scrollForm}`} onSubmit={handleSubmit}>
              <div className={s.field}>
                <label>Nome {role === "freelancer" ? "completo" : "do responsável"}</label>
                <input value={form.name} onChange={(e) => set("name", e.target.value)} required />
              </div>

              <div className={s.field}>
                <label>E-mail</label>
                <input type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
              </div>

              <div className={s.field}>
                <label>Senha</label>
                <div className={s.passwordWrap}>
                  <input
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={4}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShow((v) => !v)}>{show ? "Ocultar" : "Mostrar"}</button>
                </div>
              </div>

              <div className={s.field}>
                <label>Telefone</label>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>

              {isCompany && (
                <>
                  <div className={s.field}>
                    <label>Nome da empresa</label>
                    <input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} required />
                  </div>
                  <div className={s.field}>
                    <label>CNPJ</label>
                    <input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} required />
                  </div>
                  <div className={s.field}>
                    <label>Endereço</label>
                    <input value={form.address} onChange={(e) => set("address", e.target.value)} required />
                  </div>
                </>
              )}

              {role === "agency" && (
                <div className={s.field}>
                  <label>Comissão da agência (%)</label>
                  <input type="number" min={0} max={100} step="0.5" value={form.commissionPercentage} onChange={(e) => set("commissionPercentage", e.target.value)} />
                </div>
              )}

              {role === "freelancer" && (
                <>
                  <div className={s.field}>
                    <label>Agência</label>
                    <select value={form.agencyId} onChange={(e) => set("agencyId", e.target.value)}>
                      <option value="">Sem agência (defina depois)</option>
                      {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className={s.field}>
                    <label>Habilidades</label>
                    <textarea value={form.skills} onChange={(e) => set("skills", e.target.value)} />
                  </div>
                </>
              )}

              {error && <p className={s.error}>{error}</p>}

              <button className={s.submit} type="submit" disabled={loading}>
                {loading ? "Enviando…" : "Criar conta"}
              </button>
            </form>

            <div className={s.divider}>ou</div>
            <p className={s.foot}>
              Já tem uma conta? <Link href="/login" className={s.link}>Entrar</Link>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
