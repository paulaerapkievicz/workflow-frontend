import Head from "next/head";
import Link from "next/link";
import panel from "@/styles/panel.module.scss";
import { useAuth } from "@/src/hooks/useAuth";

export default function ProfilePage() {
  const { user, role, loading, authenticated } = useAuth();

  return (
    <>
      <Head><title>Minha conta | WorkFlow</title></Head>
      <div className={panel.authWrapper}>
        <h1>Minha conta</h1>
        {loading ? (
          <p>Carregando…</p>
        ) : !authenticated ? (
          <p className={panel.linkRow}><Link href="/login">Entrar</Link></p>
        ) : (
          <div className={panel.form}>
            <p><strong>Nome:</strong> {user?.name}</p>
            <p><strong>E-mail:</strong> {user?.email}</p>
            <p><strong>Perfil:</strong> {role}</p>
            <Link className={panel.ghostBtn} href={`/${role}/dashboard`}>Ir para o painel</Link>
          </div>
        )}
      </div>
    </>
  );
}
