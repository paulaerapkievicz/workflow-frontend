import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";
import s from "@/styles/auth.module.scss";
import { authService, RegisterPayload } from "@/src/services/authService";
import { getInvite, InvitePreview } from "@/src/services/inviteService";
import FormField from "@/src/components/FormField";
import { validateForm } from "@/src/lib/validators";

const ROLE_LABELS: Record<string, string> = {
  supermarket: "supermercado",
  freelancer: "colaborador",
  leader: "líder de agência",
  partner: "sócio de agência",
};

function FreelancerInviteForm({ token, agencyName }: { token: string; agencyName: string | null }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", document: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs = validateForm([
      { name: "email", value: form.email, kind: "email", required: true },
      { name: "phone", value: form.phone, kind: "phone", required: true },
      { name: "document", value: form.document, kind: "cpf", required: true },
    ]);
    if (Object.keys(errs).length) {
      setError("Confira os campos destacados antes de continuar.");
      return;
    }
    setLoading(true);
    const payload: RegisterPayload = {
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
      role: "freelancer",
      inviteToken: token,
      profile: { document: form.document || undefined },
    };
    try {
      await authService.register(payload);
      setDone(true);
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Não foi possível cadastrar." : "Não foi possível cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <>
        <h2 className={s.title}>Cadastro concluído</h2>
        <p className={s.success}>Tudo certo! Você já pode entrar e ver as vagas disponíveis.</p>
        <p className={s.foot} style={{ marginTop: "1.25rem" }}>
          <Link href="/login" className={s.link}>Ir para o login</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className={s.title}>Criar conta de colaborador</h2>
      <p className={s.subtitle}>Você foi convidado por {agencyName ?? "uma agência"} — seu cadastro já entra ativo.</p>
      <form className={`${s.form} ${s.scrollForm}`} onSubmit={handleSubmit}>
        <div className={s.field}>
          <label>Nome completo</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <FormField wrapperClassName={s.field} label="E-mail" kind="email" required autoComplete="email"
          value={form.email} onChange={(v) => set("email", v)} />
        <div className={s.field}>
          <label>Senha</label>
          <input type="password" autoComplete="new-password" minLength={4} value={form.password} onChange={(e) => set("password", e.target.value)} required />
        </div>
        <FormField wrapperClassName={s.field} label="Telefone" kind="phone" required placeholder="(00) 00000-0000"
          value={form.phone} onChange={(v) => set("phone", v)} />
        <FormField wrapperClassName={s.field} label="Documento (CPF)" kind="cpf" required placeholder="000.000.000-00"
          value={form.document} onChange={(v) => set("document", v)} />
        {error && <p className={s.error}>{error}</p>}
        <button className={s.submit} type="submit" disabled={loading}>
          {loading ? "Enviando…" : "Criar conta"}
        </button>
      </form>
    </>
  );
}

function LeaderInviteForm({ token, agencyName }: { token: string; agencyName: string | null }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs = validateForm([
      { name: "email", value: form.email, kind: "email", required: true },
      { name: "phone", value: form.phone, kind: "phone", required: true },
    ]);
    if (Object.keys(errs).length) {
      setError("Confira os campos destacados antes de continuar.");
      return;
    }
    setLoading(true);
    const payload: RegisterPayload = {
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
      role: "leader",
      inviteToken: token,
    };
    try {
      await authService.register(payload);
      setDone(true);
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Não foi possível cadastrar." : "Não foi possível cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <>
        <h2 className={s.title}>Cadastro concluído</h2>
        <p className={s.success}>Tudo certo! Você já pode entrar e gerenciar as vagas e os colaboradores.</p>
        <p className={s.foot} style={{ marginTop: "1.25rem" }}>
          <Link href="/login" className={s.link}>Ir para o login</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className={s.title}>Criar conta de líder</h2>
      <p className={s.subtitle}>Você foi convidado por {agencyName ?? "uma agência"} para gerenciar vagas e colaboradores.</p>
      <form className={`${s.form} ${s.scrollForm}`} onSubmit={handleSubmit}>
        <div className={s.field}>
          <label>Nome completo</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <FormField wrapperClassName={s.field} label="E-mail" kind="email" required autoComplete="email"
          value={form.email} onChange={(v) => set("email", v)} />
        <div className={s.field}>
          <label>Senha</label>
          <input type="password" autoComplete="new-password" minLength={6} value={form.password} onChange={(e) => set("password", e.target.value)} required />
        </div>
        <FormField wrapperClassName={s.field} label="Telefone" kind="phone" required placeholder="(00) 00000-0000"
          value={form.phone} onChange={(v) => set("phone", v)} />
        {error && <p className={s.error}>{error}</p>}
        <button className={s.submit} type="submit" disabled={loading}>
          {loading ? "Enviando…" : "Criar conta"}
        </button>
      </form>
    </>
  );
}

function PartnerInviteForm({ token, agencyName }: { token: string; agencyName: string | null }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs = validateForm([
      { name: "email", value: form.email, kind: "email", required: true },
      { name: "phone", value: form.phone, kind: "phone", required: true },
    ]);
    if (Object.keys(errs).length) {
      setError("Confira os campos destacados antes de continuar.");
      return;
    }
    setLoading(true);
    const payload: RegisterPayload = {
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
      role: "partner",
      inviteToken: token,
    };
    try {
      await authService.register(payload);
      setDone(true);
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Não foi possível cadastrar." : "Não foi possível cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <>
        <h2 className={s.title}>Cadastro concluído</h2>
        <p className={s.success}>Tudo certo! Você já pode entrar no painel da agência.</p>
        <p className={s.foot} style={{ marginTop: "1.25rem" }}>
          <Link href="/login" className={s.link}>Ir para o login</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className={s.title}>Criar conta de sócio</h2>
      <p className={s.subtitle}>Você foi convidado por {agencyName ?? "uma agência"} para acessar o painel dela.</p>
      <form className={`${s.form} ${s.scrollForm}`} onSubmit={handleSubmit}>
        <div className={s.field}>
          <label>Nome completo</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <FormField wrapperClassName={s.field} label="E-mail" kind="email" required autoComplete="email"
          value={form.email} onChange={(v) => set("email", v)} />
        <div className={s.field}>
          <label>Senha</label>
          <input type="password" autoComplete="new-password" minLength={6} value={form.password} onChange={(e) => set("password", e.target.value)} required />
        </div>
        <FormField wrapperClassName={s.field} label="Telefone" kind="phone" required placeholder="(00) 00000-0000"
          value={form.phone} onChange={(v) => set("phone", v)} />
        {error && <p className={s.error}>{error}</p>}
        <button className={s.submit} type="submit" disabled={loading}>
          {loading ? "Enviando…" : "Criar conta"}
        </button>
      </form>
    </>
  );
}

function SupermarketInviteForm({ token, agencyName }: { token: string; agencyName: string | null }) {
  const [form, setForm] = useState({ companyName: "", legalName: "", cnpj: "", email: "", phone: "", address: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs = validateForm([
      { name: "cnpj", value: form.cnpj, kind: "cnpj", required: true },
      { name: "email", value: form.email, kind: "email", required: true },
      { name: "phone", value: form.phone, kind: "phone", required: true },
    ]);
    if (Object.keys(errs).length) {
      setError("Confira os campos destacados antes de continuar.");
      return;
    }
    setLoading(true);
    const payload: RegisterPayload = {
      name: form.companyName,
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
      role: "supermarket",
      inviteToken: token,
      profile: { companyName: form.companyName, legalName: form.legalName || undefined, cnpj: form.cnpj, address: form.address },
    };
    try {
      await authService.register(payload);
      setDone(true);
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Não foi possível cadastrar." : "Não foi possível cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <>
        <h2 className={s.title}>Cadastro concluído</h2>
        <p className={s.success}>Tudo certo! Sua agência já vai configurar os valores/hora das funções.</p>
        <p className={s.foot} style={{ marginTop: "1.25rem" }}>
          <Link href="/login" className={s.link}>Ir para o login</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className={s.title}>Criar conta de supermercado</h2>
      <p className={s.subtitle}>Você foi convidado por {agencyName ?? "uma agência"} — seu cadastro já entra vinculado a ela.</p>
      <form className={`${s.form} ${s.scrollForm}`} onSubmit={handleSubmit}>
        <div className={s.field}>
          <label>Nome (fantasia)</label>
          <input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} required />
        </div>
        <div className={s.field}>
          <label>Razão social</label>
          <input value={form.legalName} onChange={(e) => set("legalName", e.target.value)} />
        </div>
        <FormField wrapperClassName={s.field} label="CNPJ" kind="cnpj" required placeholder="00.000.000/0000-00"
          value={form.cnpj} onChange={(v) => set("cnpj", v)} />
        <FormField wrapperClassName={s.field} label="E-mail de acesso" kind="email" required autoComplete="email"
          value={form.email} onChange={(v) => set("email", v)} />
        <FormField wrapperClassName={s.field} label="Telefone" kind="phone" required placeholder="(00) 00000-0000"
          value={form.phone} onChange={(v) => set("phone", v)} />
        <div className={s.field}>
          <label>Endereço (matriz)</label>
          <input value={form.address} onChange={(e) => set("address", e.target.value)} required />
        </div>
        <div className={s.field}>
          <label>Senha de acesso</label>
          <input type="password" autoComplete="new-password" minLength={4} value={form.password} onChange={(e) => set("password", e.target.value)} required />
        </div>
        {error && <p className={s.error}>{error}</p>}
        <button className={s.submit} type="submit" disabled={loading}>
          {loading ? "Enviando…" : "Criar conta"}
        </button>
      </form>
    </>
  );
}

export default function InvitePage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : null;
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getInvite(token)
      .then(setInvite)
      .catch((err) =>
        setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Convite não encontrado." : "Convite não encontrado.")
      );
  }, [token]);

  return (
    <>
      <Head><title>Convite | WorkFlow</title></Head>
      <div className={s.page}>
        <aside className={s.brand}>
          <div className={s.brandInner}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className={s.brandMark}><img src="/logo-white.png" alt="WorkFlow" /></div>
            <h1 className={s.brandTitle}>Você foi convidado</h1>
            <p className={s.brandText}>Complete seu cadastro pra começar a usar a plataforma.</p>
          </div>
        </aside>

        <section className={s.formSide}>
          <div className={s.card}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className={s.mobileMark}><img src="/logo-white.png" alt="WorkFlow" /></div>
            {error ? (
              <>
                <h2 className={s.title}>Convite inválido</h2>
                <p className={s.error}>{error}</p>
                <p className={s.foot} style={{ marginTop: "1.25rem" }}>
                  <Link href="/login" className={s.link}>Voltar ao login</Link>
                </p>
              </>
            ) : !invite || !token ? (
              <p className={s.subtitle}>Carregando…</p>
            ) : invite.role === "freelancer" ? (
              <FreelancerInviteForm token={token} agencyName={invite.agencyName} />
            ) : invite.role === "supermarket" ? (
              <SupermarketInviteForm token={token} agencyName={invite.agencyName} />
            ) : invite.role === "leader" ? (
              <LeaderInviteForm token={token} agencyName={invite.agencyName} />
            ) : invite.role === "partner" ? (
              <PartnerInviteForm token={token} agencyName={invite.agencyName} />
            ) : (
              <>
                <h2 className={s.title}>Em breve</h2>
                <p className={s.subtitle}>
                  Cadastro de {ROLE_LABELS[invite.role] ?? invite.role} ainda não está disponível.
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
