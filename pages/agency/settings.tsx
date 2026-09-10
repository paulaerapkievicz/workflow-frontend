import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import {
  getAgencySettings, updateAgencySettings, AgencySettings, UnfilledAlertTier,
} from "@/src/services/agencySettingsService";

const newTier = (): UnfilledAlertTier => ({
  id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  minutesBefore: 30,
  color: "#F97316",
  label: "",
  blink: false,
});

function SettingsPage() {
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [form, setForm] = useState({
    checkinRadius: "300",
    cancellationWindowMinutes: "30",
    checkinEarlyToleranceMinutes: "30",
    requireCheckoutPhoto: true,
    reviewEnabled: false,
    breaksEnabled: false,
    breakLimitMinutes: "",
    alertsEnabled: true,
    notifySupermarketOnAlerts: true,
    lateCheckinToleranceMinutes: "10",
    lateCheckinCriticalMinutes: "30",
    earlyCheckoutToleranceMinutes: "15",
    missingCheckoutGraceMinutes: "20",
    unfilledAlertLeadMinutes: "120",
    shortNoticeWithdrawalMinutes: "180",
    onboardingRequired: false,
    uniformPrice: "0",
    allowSelfRegistration: false,
  });
  const [tiers, setTiers] = useState<UnfilledAlertTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const patchTier = (id: string, p: Partial<UnfilledAlertTier>) =>
    setTiers((cur) => cur.map((t) => (t.id === id ? { ...t, ...p } : t)));

  useEffect(() => {
    getAgencySettings()
      .then((s) => {
        setSettings(s);
        setTiers(s.unfilledAlertTiers ?? []);
        setForm({
          checkinRadius: String(s.checkinRadius),
          cancellationWindowMinutes: String(s.cancellationWindowMinutes),
          checkinEarlyToleranceMinutes: String(s.checkinEarlyToleranceMinutes),
          requireCheckoutPhoto: s.requireCheckoutPhoto,
          reviewEnabled: s.reviewEnabled,
          breaksEnabled: s.breaksEnabled,
          breakLimitMinutes: s.breakLimitMinutes != null ? String(s.breakLimitMinutes) : "",
          alertsEnabled: s.alertsEnabled,
          notifySupermarketOnAlerts: s.notifySupermarketOnAlerts,
          lateCheckinToleranceMinutes: String(s.lateCheckinToleranceMinutes),
          lateCheckinCriticalMinutes: String(s.lateCheckinCriticalMinutes),
          earlyCheckoutToleranceMinutes: String(s.earlyCheckoutToleranceMinutes),
          missingCheckoutGraceMinutes: String(s.missingCheckoutGraceMinutes),
          unfilledAlertLeadMinutes: String(s.unfilledAlertLeadMinutes),
          shortNoticeWithdrawalMinutes: String(s.shortNoticeWithdrawalMinutes),
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
        checkinEarlyToleranceMinutes: Number(form.checkinEarlyToleranceMinutes),
        requireCheckoutPhoto: form.requireCheckoutPhoto,
        reviewEnabled: form.reviewEnabled,
        breaksEnabled: form.breaksEnabled,
        breakLimitMinutes: form.breakLimitMinutes.trim() === "" ? null : Number(form.breakLimitMinutes),
        alertsEnabled: form.alertsEnabled,
        notifySupermarketOnAlerts: form.notifySupermarketOnAlerts,
        lateCheckinToleranceMinutes: Number(form.lateCheckinToleranceMinutes),
        lateCheckinCriticalMinutes: Number(form.lateCheckinCriticalMinutes),
        earlyCheckoutToleranceMinutes: Number(form.earlyCheckoutToleranceMinutes),
        missingCheckoutGraceMinutes: Number(form.missingCheckoutGraceMinutes),
        unfilledAlertLeadMinutes: Number(form.unfilledAlertLeadMinutes),
        unfilledAlertTiers: tiers.map((t) => ({
          ...t,
          minutesBefore: Number(t.minutesBefore) || 0,
          label: t.label.trim() || `${Number(t.minutesBefore) || 0} min`,
        })),
        shortNoticeWithdrawalMinutes: Number(form.shortNoticeWithdrawalMinutes),
        onboardingRequired: form.onboardingRequired,
        uniformPrice: Number(form.uniformPrice),
        allowSelfRegistration: form.allowSelfRegistration,
      });
      setSettings(s);
      setTiers(s.unfilledAlertTiers ?? []);
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

          <div className={panel.card} style={{ maxWidth: 480, marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            <div>
              <strong>Perfil e dados cadastrais</strong>
              <p className={panel.muted} style={{ margin: 0 }}>
                Nome fantasia, razão social, CNPJ, contato, foto e logotipo da agência.
              </p>
            </div>
            <Link href="/agency/profile" className={panel.primaryBtn} style={{ textDecoration: "none", whiteSpace: "nowrap" }}>
              Gerenciar cadastro
            </Link>
          </div>

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

                <label>Antecedência máxima para o check-in (minutos antes do início do turno)</label>
                <input type="number" min={0} max={240} step={5} value={form.checkinEarlyToleranceMinutes}
                  onChange={(e) => setForm({ ...form, checkinEarlyToleranceMinutes: e.target.value })} />
                <span className={panel.muted}>
                  Antes disso o ponto não abre — vale para todos os turnos da vaga, então o turno
                  seguinte só libera perto do horário dele, mesmo que o colaborador já tenha encerrado
                  o anterior. Atraso nunca é bloqueado. Pode ser sobrescrito por vaga.
                </span>

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
                <label className={panel.toggleRow}>
                  <input type="checkbox" checked={form.breaksEnabled}
                    onChange={(e) => setForm({ ...form, breaksEnabled: e.target.checked })} />
                  Permitir pausa/intervalo no ponto (pausar e retomar sem abandonar a vaga)
                </label>
                <span className={panel.muted}>
                  O tempo de pausa não conta como hora trabalhada. Pode ser liberado ou bloqueado
                  por vaga no lançamento do pedido.
                </span>

                <label>Limite de pausa por turno (minutos)</label>
                <input type="number" min={1} max={480} step={5} placeholder="sem limite"
                  value={form.breakLimitMinutes}
                  onChange={(e) => setForm({ ...form, breakLimitMinutes: e.target.value })} />
                <span className={panel.muted}>
                  Depois de atingido, o colaborador não consegue abrir uma nova pausa no turno.
                  Deixe em branco para não limitar. Também pode ser sobrescrito por vaga.
                </span>

                <hr style={{ width: "100%", borderColor: "var(--border)" }} />
                <strong>Alertas de ocorrência</strong>
                <span className={panel.muted}>
                  Avisos automáticos de problemas na execução das vagas, na página <strong>Alertas</strong>.
                </span>
                <label className={panel.toggleRow}>
                  <input type="checkbox" checked={form.alertsEnabled}
                    onChange={(e) => setForm({ ...form, alertsEnabled: e.target.checked })} />
                  Ativar o controle de ocorrências
                </label>
                <label className={panel.toggleRow}>
                  <input type="checkbox" checked={form.notifySupermarketOnAlerts}
                    onChange={(e) => setForm({ ...form, notifySupermarketOnAlerts: e.target.checked })} />
                  Mostrar ao supermercado-cliente os alertas que afetam a entrega
                </label>

                <label>Atraso tolerado no check-in (minutos)</label>
                <input type="number" min={0} max={120} step={1} value={form.lateCheckinToleranceMinutes}
                  onChange={(e) => setForm({ ...form, lateCheckinToleranceMinutes: e.target.value })} />
                <span className={panel.muted}>Passado esse atraso sem check-in, abre um alerta.</span>

                <label>Atraso no check-in que vira crítico (minutos)</label>
                <input type="number" min={5} max={240} step={1} value={form.lateCheckinCriticalMinutes}
                  onChange={(e) => setForm({ ...form, lateCheckinCriticalMinutes: e.target.value })} />

                <label>Margem de saída antecipada (minutos)</label>
                <input type="number" min={0} max={120} step={1} value={form.earlyCheckoutToleranceMinutes}
                  onChange={(e) => setForm({ ...form, earlyCheckoutToleranceMinutes: e.target.value })} />
                <span className={panel.muted}>Check-out mais cedo que isso, em relação ao fim do turno, vira alerta.</span>

                <label>Folga após o fim do turno sem check-out (minutos)</label>
                <input type="number" min={0} max={240} step={1} value={form.missingCheckoutGraceMinutes}
                  onChange={(e) => setForm({ ...form, missingCheckoutGraceMinutes: e.target.value })} />

                <label>Antecedência do aviso de vaga sem colaborador (minutos)</label>
                <input type="number" min={15} max={1440} step={15} value={form.unfilledAlertLeadMinutes}
                  onChange={(e) => setForm({ ...form, unfilledAlertLeadMinutes: e.target.value })} />
                <span className={panel.muted}>Alimenta a página <strong>Alertas</strong>.</span>

                <hr style={{ width: "100%", borderColor: "var(--border)" }} />
                <strong>Marcações de vaga sem colaborador (Convocações)</strong>
                <span className={panel.muted}>
                  Bolinhas coloridas nas vagas ainda <strong>disponíveis</strong> conforme se
                  aproximam do horário de início. Aparecem por vaga e somadas no pedido, na tela de
                  Convocações. Configure de menos urgente (mais minutos antes) para mais urgente.
                </span>
                {tiers.map((t) => (
                  <div key={t.id} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      type="number" min={0} max={1440} step={5}
                      style={{ width: 84 }}
                      value={t.minutesBefore}
                      onChange={(e) => patchTier(t.id, { minutesBefore: Number(e.target.value) })}
                      aria-label="Minutos antes do início"
                    />
                    <span className={panel.muted} style={{ fontSize: "0.8rem" }}>min antes</span>
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(t.color) ? t.color : "#F97316"}
                      onChange={(e) => patchTier(t.id, { color: e.target.value })}
                      style={{ width: 42, height: 32, padding: 0 }}
                      aria-label="Cor"
                    />
                    <input
                      type="text" maxLength={40} placeholder="Rótulo (ex.: Falta 30 min)"
                      style={{ flex: "1 1 140px", minWidth: 120 }}
                      value={t.label}
                      onChange={(e) => patchTier(t.id, { label: e.target.value })}
                    />
                    <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: "0.85rem" }}>
                      <input type="checkbox" checked={t.blink}
                        onChange={(e) => patchTier(t.id, { blink: e.target.checked })} />
                      piscar
                    </label>
                    <button type="button" className={panel.secondaryBtn}
                      onClick={() => setTiers((cur) => cur.filter((x) => x.id !== t.id))}>
                      Remover
                    </button>
                  </div>
                ))}
                {tiers.length === 0 && (
                  <span className={panel.muted} style={{ fontSize: "0.85rem" }}>Nenhuma faixa — nenhuma bolinha será exibida.</span>
                )}
                {tiers.length < 6 && (
                  <button type="button" className={panel.ghostBtn} style={{ alignSelf: "flex-start" }}
                    onClick={() => setTiers((cur) => [...cur, newTier()])}>
                    + Adicionar faixa
                  </button>
                )}

                <hr style={{ width: "100%", borderColor: "var(--border)" }} />

                <label>Desistência considerada &quot;de última hora&quot; (minutos antes do início)</label>
                <input type="number" min={0} max={1440} step={15} value={form.shortNoticeWithdrawalMinutes}
                  onChange={(e) => setForm({ ...form, shortNoticeWithdrawalMinutes: e.target.value })} />

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
