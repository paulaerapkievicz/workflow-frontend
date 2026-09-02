import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";
import s from "@/styles/auth.module.scss";
import { authService, RegisterPayload } from "@/src/services/authService";
import { getAgencies, Agency } from "@/src/services/agencyService";

export default function RegisterPage() {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", document: "", agencyId: "",
  });
  const [agencies, setAgencies] = useState<Agency[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getAgencies().then(setAgencies).catch(() => setAgencies([]));
  }, []);

  // Só as agências que abriram o autocadastro aceitam colaborador se cadastrando.
  const openAgencies = (agencies ?? []).filter((a) => a.allowSelfRegistration === true);
  const registrationOpen = agencies === null ? null : openAgencies.length > 0;

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
      profile: { agencyId: form.agencyId || null, document: form.document || undefined },
    };
    try {
      await authService.register(payload);
      authService.logout(); // fica pendente até a agência aprovar
      setDone(true);
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

  return (
    <>
      <Head><title>Criar conta | WorkFlow</title></Head>
      <div className={s.page}>
        <aside className={s.brand}>
          <div className={s.brandInner}>
            <div className={s.brandMark}><span>W</span> WorkFlow</div>
            <h1 className={s.brandTitle}>Cadastro de colaborador</h1>
            <p className={s.brandText}>
              Preencha os seus dados. A sua agência recebe o cadastro e aprova o seu acesso.
            </p>
            <ul className={s.brandList}>
              <li><span className={s.check}>✓</span> Formulário rápido</li>
              <li><span className={s.check}>✓</span> A agência aprova o seu acesso</li>
              <li><span className={s.check}>✓</span> Depois é só aceitar vagas</li>
            </ul>
          </div>
        </aside>

        <section className={s.formSide}>
          <div className={s.card}>
            <div className={s.mobileMark}><span>W</span> WorkFlow</div>

            {done ? (
              <>
                <h2 className={s.title}>Cadastro enviado</h2>
                <p className={s.subtitle}>
                  A sua agência precisa aprovar o cadastro antes do primeiro acesso.
                </p>
                <p className={s.success}>Tudo certo! Aguarde o aviso da agência.</p>
                <p className={s.foot} style={{ marginTop: "1.25rem" }}>
                  <Link href="/login" className={s.link}>Ir para o login</Link>
                </p>
              </>
            ) : registrationOpen === null ? (
              <p className={s.subtitle}>Carregando…</p>
            ) : registrationOpen === false ? (
              <>
                <h2 className={s.title}>Cadastros fechados</h2>
                <p className={s.subtitle}>
                  Nenhuma agência está aceitando autocadastro no momento. Peça um convite à sua agência.
                </p>
                <p className={s.foot} style={{ marginTop: "1.25rem" }}>
                  <Link href="/login" className={s.link}>Voltar ao login</Link>
                </p>
              </>
            ) : (
              <>
                <h2 className={s.title}>Criar conta</h2>
                <p className={s.subtitle}>Colaborador — os seus dados vão para a agência aprovar.</p>

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
                    <input value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
                  </div>
                  <div className={s.field}>
                    <label>Documento (CPF)</label>
                    <input value={form.document} onChange={(e) => set("document", e.target.value)} required />
                  </div>
                  <div className={s.field}>
                    <label>Agência</label>
                    <select value={form.agencyId} onChange={(e) => set("agencyId", e.target.value)} required>
                      <option value="">Selecione a agência</option>
                      {openAgencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>

                  {error && <p className={s.error}>{error}</p>}

                  <button className={s.submit} type="submit" disabled={loading}>
                    {loading ? "Enviando…" : "Criar conta"}
                  </button>
                </form>

                <div className={s.divider}>ou</div>
                <p className={s.foot}>
                  Já tem uma conta? <Link href="/login" className={s.link}>Entrar</Link>
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
