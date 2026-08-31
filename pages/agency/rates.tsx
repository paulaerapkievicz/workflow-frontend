import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import { getCategories, Category } from "@/src/services/categoryService";
import {
  getMyRates, saveRate, updateRate, deleteRate, AgencyCategoryRate,
} from "@/src/services/agencyRateService";

function RatesPage() {
  const [rates, setRates] = useState<AgencyCategoryRate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([getMyRates(), getCategories()]);
      setRates(r);
      setCategories(c);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const missing = useMemo(
    () => categories.filter((c) => !rates.some((r) => r.categoryId === c.id)),
    [categories, rates]
  );

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await saveRate({ categoryId, hourlyRate: Number(hourlyRate) });
      setCategoryId("");
      setHourlyRate("");
      setMsg({ type: "success", text: "Valor/hora salvo." });
      await load();
    } catch (err) {
      setMsg({ type: "error", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    }
  };

  const changeRate = async (r: AgencyCategoryRate, value: string) => {
    try {
      await updateRate(r.id, { hourlyRate: Number(value) });
      await load();
    } catch (err) {
      alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  const toggle = async (r: AgencyCategoryRate) => {
    try {
      await updateRate(r.id, { active: !r.active });
      await load();
    } catch (err) {
      alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  const remove = async (r: AgencyCategoryRate) => {
    if (!confirm("Remover este valor/hora?")) return;
    try {
      await deleteRate(r.id);
      await load();
    } catch (err) {
      alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  return (
    <>
      <Head><title>Valores/hora | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Tabela de valor/hora</h1></header>
          <p className={panel.muted}>
            O valor de cada vaga é calculado por <strong>valor/hora × horas trabalhadas</strong>.
            O freelancer só consegue aceitar vagas de funções que estejam nesta tabela e ativas.
          </p>

          <form className={panel.card} onSubmit={add} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className={panel.filterField}>
              <label>Função</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                <option value="">Selecione…</option>
                {missing.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className={panel.filterField}>
              <label>Valor/hora (R$)</label>
              <input type="number" min="0.01" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} required />
            </div>
            <button className={panel.primaryBtn} type="submit" disabled={!categoryId || !hourlyRate}>Adicionar</button>
            {msg && <p className={msg.type === "error" ? panel.error : panel.success} style={{ width: "100%" }}>{msg.text}</p>}
          </form>

          {loading ? (
            <p>Carregando…</p>
          ) : (
            <table className={panel.table}>
              <thead><tr><th>Função</th><th>Valor/hora</th><th>Situação</th><th>Ações</th></tr></thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.id}>
                    <td>{r.rateCategory?.name ?? categories.find((c) => c.id === r.categoryId)?.name ?? "—"}</td>
                    <td>
                      <input
                        type="number" min="0.01" step="0.01" defaultValue={Number(r.hourlyRate)}
                        style={{ width: 100 }}
                        onBlur={(e) => Number(e.target.value) !== Number(r.hourlyRate) && changeRate(r, e.target.value)}
                      />
                    </td>
                    <td><span className={panel.badge}>{r.active ? "Ativa" : "Inativa"}</span></td>
                    <td>
                      <button className={panel.ghostBtn} onClick={() => toggle(r)}>{r.active ? "Desativar" : "Ativar"}</button>
                      <button className={panel.secondaryBtn} onClick={() => remove(r)}>Remover</button>
                    </td>
                  </tr>
                ))}
                {rates.length === 0 && <tr><td colSpan={4}>Nenhum valor/hora cadastrado.</td></tr>}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="agency">
      <RatesPage />
    </RequireAuth>
  );
}
