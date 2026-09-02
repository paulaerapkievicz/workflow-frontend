import { useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import { getAgencySettings, updateAgencySettings, AgencySettings } from "@/src/services/agencySettingsService";

function SettingsPage() {
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [form, setForm] = useState({
    checkinRadius: "300",
    cancellationWindowMinutes: "30",
    requireCheckoutPhoto: true,
    reviewEnabled: false,
    commissionPercentage: "10",
    onboardingRequired: false,
    uniformPrice: "0",
    allowSelfRegistration: false,
  });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAgencySettings()
      .then((s) => {
        setSettings(s);
        setForm({
          checkinRadius: String(s.checkinRadius),
          cancellationWindowMinutes: String(s.cancellationWindowMinutes),
          requireCheckoutPhoto: s.requireCheckoutPhoto,
          reviewEnabled: s.reviewEnabled,
          commissionPercentage: String(s.commissionPercentage),
          onboardingRequired: s.onboardingRequired,
          uniformPrice: String(s.uniformPrice),
          allowSelfRegistration: s.allowSelfRegistration,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const s = await updateAgencySettings({
        checkinRadius: Number(form.checkinRadius),
        cancellationWindowMinutes: Number(form.cancellationWindowMinutes),
        requireCheckoutPhoto: form.requireCheckoutPhoto,
        reviewEnabled: form.reviewEnabled,
        commissionPercentage: Number(form.commissionPercentage),
        onboardingRequired: form.onboardingRequired,
        uniformPrice: Number(form.uniformPrice),
        allowSelfRegistration: form.allowSelfRegistration,
      });
      setSettings(s);
      setMsg({ type: "ok", text: "Configurações salvas." });
    } catch (err) {
      setMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head><title>Configurações | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Configurações da agência</h1></header>
          <p className={panel.muted}>
            Estas regras valem para todos os colaboradores da sua rede.
          </p>

          {loading || !settings ? (
            <p>Carregando…</p>
          ) : (
            <form className={panel.card} onSubmit={save} style={{ maxWidth: 480 }}>
              <div className={panel.form}>
                <label>Raio permitido para check-in (metros)</label>
                <input type="number" min={20} max={5000} step={10} value={form.checkinRadius}
                  onChange={(e) => setForm({ ...form, checkinRadius: e.target.value })} />
                <span className={panel.muted}>Distância máxima entre o colaborador e o endereço da filial.</span>

                <label>Prazo para o colaborador cancelar sozinho (minutos antes do início)</label>
                <input type="number" min={0} max={1440} step={5} value={form.cancellationWindowMinutes}
                  onChange={(e) => setForm({ ...form, cancellationWindowMinutes: e.target.value })} />
                <span className={panel.muted}>Depois desse prazo, só a agência libera/repassa a vaga.</span>

                <label>Comissão da agência (%)</label>
                <input type="number" min={0} max={100} step={0.5} value={form.commissionPercentage}
                  onChange={(e) => setForm({ ...form, commissionPercentage: e.target.value })} />

                <label className={panel.toggleRow}>
                  <input type="checkbox" checked={form.requireCheckoutPhoto}
                    onChange={(e) => setForm({ ...form, requireCheckoutPhoto: e.target.checked })} />
                  Exigir foto de comprovação no check-out
                </label>
                <label className={panel.toggleRow}>
                  <input type="checkbox" checked={form.reviewEnabled}
                    onChange={(e) => setForm({ ...form, reviewEnabled: e.target.checked })} />
                  Avaliar a entrega dos colaboradores após a conclusão
                </label>

                <hr style={{ width: "100%", borderColor: "var(--border)" }} />
                <label className={panel.toggleRow}>
                  <input type="checkbox" checked={form.allowSelfRegistration}
                    onChange={(e) => setForm({ ...form, allowSelfRegistration: e.target.checked })} />
                  Permitir que colaboradores se autocadastrem nesta agência
                </label>
                <span className={panel.muted}>
                  Quando ligado, aparece um formulário simples de cadastro. Cada cadastro fica
                  pendente até você aprovar em <strong>Cadastros pendentes</strong>.
                </span>

                <label className={panel.toggleRow}>
                  <input type="checkbox" checked={form.onboardingRequired}
                    onChange={(e) => setForm({ ...form, onboardingRequired: e.target.checked })} />
                  Exigir onboarding (perfil contratual + uniforme aprovado) antes de aceitar vagas
                </label>
                <label>Preço do kit uniforme (R$)</label>
                <input type="number" min={0} step={0.01} value={form.uniformPrice}
                  onChange={(e) => setForm({ ...form, uniformPrice: e.target.value })} />
                <span className={panel.muted}>Cobrado do colaborador no Mercado Pago ao comprar o uniforme.</span>

                {msg && <p className={msg.type === "ok" ? panel.success : panel.error}>{msg.text}</p>}
                <button className={panel.primaryBtn} type="submit" disabled={saving}>
                  {saving ? "Salvando…" : "Salvar configurações"}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="agency">
      <SettingsPage />
    </RequireAuth>
  );
}
