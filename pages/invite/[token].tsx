import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";
import s from "@/styles/auth.module.scss";
import { authService, RegisterPayload } from "@/src/services/authService";
import { getInvite, InvitePreview } from "@/src/services/inviteService";

const ROLE_LABELS: Record<string, string> = {
  supermarket: "supermercado",
  freelancer: "colaborador",
  leader: "líder de agência",
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
        <div className={s.field}>
          <label>E-mail</label>
          <input type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
        </div>
        <div className={s.field}>
          <label>Senha</label>
          <input type="password" autoComplete="new-password" minLength={4} value={form.password} onChange={(e) => set("password", e.target.value)} required />
        </div>
        <div className={s.field}>
          <label>Telefone</label>
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
        </div>
        <div className={s.field}>
          <label>Documento (CPF)</label>
          <input value={form.document} onChange={(e) => set("document", e.target.value)} required />
        </div>
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
        <div className={s.field}>
          <label>CNPJ</label>
          <input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} required />
        </div>
        <div className={s.field}>
          <label>E-mail de acesso</label>
          <input type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
        </div>
        <div className={s.field}>
          <label>Telefone</label>
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
        </div>
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
