import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/leader/Sidebar";
import RevokedNotice from "@/src/components/leader/RevokedNotice";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import WithdrawForm from "@/src/components/WithdrawForm";
import FormField, { type FieldKind } from "@/src/components/FormField";
import HelpIcon from "@/src/components/common/HelpIcon";
import panel from "@/styles/panel.module.scss";
import {
  getMyWithdrawals, Withdrawal, WITHDRAWAL_STATUS_LABELS, PIX_KEY_TYPES, PIX_KEY_TYPE_LABELS, PixKeyType,
} from "@/src/services/withdrawalService";
import {
  getLeaderWallet, LeaderWallet, PAY_TYPE_LABELS, CREDIT_STATUS_LABELS, updateLeaderPix,
} from "@/src/services/agencyMemberService";
import { useAuth } from "@/src/hooks/useAuth";

/** Máscara/validação da chave conforme o tipo escolhido. */
const PIX_KIND: Record<PixKeyType, FieldKind> = {
  cpf: "cpf", cnpj: "cnpj", email: "email", telefone: "phone", aleatoria: "text",
};

function LeaderPixCard({ wallet, onSaved }: { wallet: LeaderWallet | null; onSaved: () => void | Promise<unknown> }) {
  const [editing, setEditing] = useState(false);
  const [pixKey, setPixKey] = useState(wallet?.pixKey ?? "");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType | "">(wallet?.pixKeyType ?? "");
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const pixKind: FieldKind = pixKeyType ? PIX_KIND[pixKeyType] : "text";

  const startEdit = () => {
    setPixKey(wallet?.pixKey ?? "");
    setPixKeyType(wallet?.pixKeyType ?? "");
    setMsg(null);
    setEditing(true);
  };

  const save = async () => {
    if (!pixKeyType || !pixKey.trim()) { setMsg({ type: "error", text: "Selecione o tipo e informe a chave." }); return; }
    setSaving(true);
    setMsg(null);
    try {
      await updateLeaderPix(pixKey.trim(), pixKeyType);
      setEditing(false);
      await onSaved();
    } catch (err) {
      setMsg({ type: "error", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={panel.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>
          Chave Pix cadastrada
          <HelpIcon title="Pra que serve">
            <p>
              Guardada aqui pra ficar registrada no seu cadastro — não substitui a chave que você
              informa a cada saque, que continua sendo pedida de novo na hora.
            </p>
          </HelpIcon>
        </strong>
        {!editing && (
          <button className={panel.ghostBtn} onClick={startEdit}>
            {wallet?.pixKey ? "Editar" : "Cadastrar"}
          </button>
        )}
      </div>
      {!editing ? (
        <p className={panel.muted} style={{ marginTop: "0.5rem" }}>
          {wallet?.pixKey
            ? `${PIX_KEY_TYPE_LABELS[wallet.pixKeyType as PixKeyType]}: ${wallet.pixKey}`
            : "Nenhuma chave cadastrada ainda."}
        </p>
      ) : (
        <div className={panel.form} style={{ marginTop: "0.5rem" }}>
          <label>Tipo da chave</label>
          <select value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value as PixKeyType | "")}>
            <option value="">Selecione…</option>
            {PIX_KEY_TYPES.map((t) => <option key={t} value={t}>{PIX_KEY_TYPE_LABELS[t]}</option>)}
          </select>
          <FormField label="Chave Pix" kind={pixKind} required value={pixKey} onChange={setPixKey} />
          {msg && <p className={panel.error}>{msg.text}</p>}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className={panel.primaryBtn} disabled={saving} onClick={save}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
            <button className={panel.ghostBtn} disabled={saving} onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderPayments() {
  const { profile, refresh } = useAuth();
  const [wallet, setWallet] = useState<LeaderWallet | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  const load = useCallback(async () => {
    const [wl, w] = await Promise.all([getLeaderWallet(), getMyWithdrawals()]);
    setWallet(wl);
    setWithdrawals(w);
  }, []);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const balance = wallet?.availableBalance ?? 0;

  if ((profile as { active?: boolean } | null)?.active === false) return <RevokedNotice />;

  return (
    <>
      <Head><title>Minha carteira | Líder</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Minha carteira</h1></header>
          <p className={panel.muted}>
            {wallet?.payType
              ? `Pagamento combinado: ${PAY_TYPE_LABELS[wallet.payType]} — R$ ${Number(wallet.payAmount ?? 0).toFixed(2)}.`
              : "A agência ainda não definiu a sua forma de pagamento."}
            {wallet?.payType === "por_colaborador"
              ? " Você ganha esse valor por cada vaga que um colaborador do seu grupo conclui. Quando o colaborador cumpre a escala, o crédito entra sozinho; casos de desistência/falta ficam aguardando a agência liberar."
              : " Os créditos são lançados pela sua agência."}
          </p>

          <LeaderPixCard wallet={wallet} onSaved={load} />

          <div className={panel.balanceCard}>
            <span className={panel.muted}>Saldo disponível para saque</span>
            <strong>R$ {balance.toFixed(2)}</strong>
            <WithdrawForm balance={balance} onDone={() => Promise.all([load(), refresh()])} />
          </div>

          {(wallet?.jobCredits?.length ?? 0) > 0 && (
            <>
              <h2 style={{ fontSize: "1.1rem" }}>Ganhos por colaborador que trabalhou</h2>
              <p className={panel.muted}>
                Liberado: R$ {Number(wallet?.creditsReleasedTotal ?? 0).toFixed(2)}
                {Number(wallet?.creditsPendingTotal ?? 0) > 0 &&
                  ` · aguardando a agência: R$ ${Number(wallet?.creditsPendingTotal).toFixed(2)}`}
              </p>
              <div style={{ overflowX: "auto" }}>
                <table className={panel.table}>
                  <thead><tr><th>Data</th><th>Vaga</th><th>Colaborador</th><th>Valor</th><th>Situação</th></tr></thead>
                  <tbody>
                    {(wallet?.jobCredits ?? []).map((c) => (
                      <tr key={c.id}>
                        <td>{new Date(c.createdAt).toLocaleDateString("pt-BR")}</td>
                        <td>{c.jobTitle ?? "—"}</td>
                        <td>{c.freelancerName ?? "—"}</td>
                        <td>R$ {Number(c.amount).toFixed(2)}</td>
                        <td><StatusBadge family="credit" status={c.status} label={CREDIT_STATUS_LABELS[c.status]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <h2 style={{ fontSize: "1.1rem" }}>Créditos recebidos da agência</h2>
          <div style={{ overflowX: "auto" }}>
            <table className={panel.table}>
              <thead><tr><th>Data</th><th>Referência</th><th>Observação</th><th>Valor</th></tr></thead>
              <tbody>
                {(wallet?.payments ?? []).map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td>{p.referenceMonth ?? "—"}</td>
                    <td>{p.note ?? "—"}</td>
                    <td>R$ {Number(p.amount).toFixed(2)}</td>
                  </tr>
                ))}
                {(wallet?.payments ?? []).length === 0 && <tr><td colSpan={4}>Nenhum crédito ainda.</td></tr>}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: "1.1rem" }}>Meus saques</h2>
          <div style={{ overflowX: "auto" }}>
            <table className={panel.table}>
              <thead><tr><th>Data</th><th>Valor</th><th>Chave Pix</th><th>Status</th></tr></thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td>{new Date(w.requestedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td>R$ {Number(w.amount).toFixed(2)}</td>
                    <td>{w.pixKey ?? "—"}</td>
                    <td><StatusBadge family="withdrawal" status={w.status} label={WITHDRAWAL_STATUS_LABELS[w.status]} /></td>
                  </tr>
                ))}
                {withdrawals.length === 0 && <tr><td colSpan={4}>Nenhum saque solicitado.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="leader">
      <LeaderPayments />
    </RequireAuth>
  );
}
