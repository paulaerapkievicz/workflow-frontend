import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import RequirePermission from "@/src/components/RequirePermission";
import panel from "@/styles/panel.module.scss";
import {
  getAgencySettings, updateAgencySettings, AgencySettings, UnfilledAlertTier,
} from "@/src/services/agencySettingsService";
import {
  StatusColors, STATUS_TONES, DEFAULT_STATUS_COLORS, sanitizeStatusColors,
} from "@/src/services/statusColors";
import SidebarOrderEditor from "@/src/components/SidebarOrderEditor";
import Switch from "@/src/components/common/Switch";
import Tabs from "@/src/components/panel/Tabs";
import { AGENCY_SIDEBAR_ITEMS } from "@/src/config/sidebarItems";

const newTier = (): UnfilledAlertTier => ({
  id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  minutesBefore: 30,
  color: "#F97316",
  label: "",
  blink: false,
});

const TABS = [
  { id: "vagas", label: "Vagas" },
  { id: "notificacoes", label: "Notificações" },
  { id: "colaborador", label: "Colaborador" },
  { id: "clientes", label: "Clientes" },
  { id: "pagamento", label: "Pagamento" },
  { id: "equipe", label: "Equipe" },
  { id: "status", label: "Status" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function SettingsPage() {
  const [tab, setTab] = useState<TabId>("vagas");
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [form, setForm] = useState({
    checkinRadius: "300",
    cancellationWindowMinutes: "30",
    checkinEarlyToleranceMinutes: "30",
    requireCheckoutPhoto: true,
    reviewEnabled: false,
    breaksEnabled: false,
    breakLimitMinutes: "",
    defaultBreakMinutes: "0",
    maxShiftHours: "10",
    maxJobHours: "10",
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
    appPaymentEnabledForSupermarkets: true,
    appPaymentEnabledForFreelancers: true,
    loginEmailPolicy: "informed" as "informed" | "pattern",
  });
  const [tiers, setTiers] = useState<UnfilledAlertTier[]>([]);
  const [statusColors, setStatusColors] = useState<StatusColors>(DEFAULT_STATUS_COLORS);
  const [sidebarOrder, setSidebarOrder] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  const patchColor = (tone: keyof StatusColors, key: "bg" | "fg", value: string) =>
    setStatusColors((cur) => ({ ...cur, [tone]: { ...cur[tone], [key]: value } }));
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const patchTier = (id: string, p: Partial<UnfilledAlertTier>) =>
    setTiers((cur) => cur.map((t) => (t.id === id ? { ...t, ...p } : t)));

  useEffect(() => {
    getAgencySettings()
      .then((s) => {
        setSettings(s);
        setTiers(s.unfilledAlertTiers ?? []);
        setStatusColors(sanitizeStatusColors(s.statusColors));
        setSidebarOrder(s.sidebarOrder ?? null);
        setForm({
          checkinRadius: String(s.checkinRadius),
          cancellationWindowMinutes: String(s.cancellationWindowMinutes),
          checkinEarlyToleranceMinutes: String(s.checkinEarlyToleranceMinutes),
          requireCheckoutPhoto: s.requireCheckoutPhoto,
          reviewEnabled: s.reviewEnabled,
          breaksEnabled: s.breaksEnabled,
          breakLimitMinutes: s.breakLimitMinutes != null ? String(s.breakLimitMinutes) : "",
          defaultBreakMinutes: String(s.defaultBreakMinutes ?? 0),
          maxShiftHours: String(s.maxShiftHours ?? 10),
          maxJobHours: String(s.maxJobHours ?? 10),
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
          appPaymentEnabledForSupermarkets: s.appPaymentEnabledForSupermarkets,
          appPaymentEnabledForFreelancers: s.appPaymentEnabledForFreelancers,
          loginEmailPolicy: s.loginEmailPolicy ?? "informed",
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
        defaultBreakMinutes: Number(form.defaultBreakMinutes) || 0,
        maxShiftHours: Number(form.maxShiftHours),
        maxJobHours: Number(form.maxJobHours),
        statusColors,
        sidebarOrder,
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
        appPaymentEnabledForSupermarkets: form.appPaymentEnabledForSupermarkets,
        appPaymentEnabledForFreelancers: form.appPaymentEnabledForFreelancers,
        loginEmailPolicy: form.loginEmailPolicy,
      });
      setSettings(s);
      setTiers(s.unfilledAlertTiers ?? []);
      setStatusColors(sanitizeStatusColors(s.statusColors));
      setSidebarOrder(s.sidebarOrder ?? null);
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
            <form onSubmit={save} style={{ maxWidth: 560 }}>
              <Tabs tabs={TABS as unknown as { id: string; label: string }[]} active={tab} onChange={(id) => setTab(id as TabId)} />

              <div className={panel.card}>
                {tab === "vagas" && (
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
                      <Switch checked={form.requireCheckoutPhoto}
                        onChange={(v) => setForm({ ...form, requireCheckoutPhoto: v })} />
                      Exigir foto de comprovação no check-out
                    </label>
                    <label className={panel.toggleRow}>
                      <Switch checked={form.reviewEnabled}
                        onChange={(v) => setForm({ ...form, reviewEnabled: v })} />
                      Avaliar a entrega dos colaboradores após a conclusão
                    </label>
                    <label className={panel.toggleRow}>
                      <Switch checked={form.breaksEnabled}
                        onChange={(v) => setForm({ ...form, breaksEnabled: v })} />
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
                    <strong>Jornada (limites da vaga)</strong>
                    <span className={panel.muted}>
                      Tetos aplicados ao lançar/editar a vaga, para não infringir a legislação
                      trabalhista. Podem ser sobrescritos por vaga.
                    </span>

                    <label>Intervalo padrão do turno (minutos)</label>
                    <input type="number" min={0} max={480} step={5} value={form.defaultBreakMinutes}
                      onChange={(e) => setForm({ ...form, defaultBreakMinutes: e.target.value })} />
                    <span className={panel.muted}>
                      Ao montar a vaga, é possível marcar &quot;usar intervalo padrão&quot; num turno —
                      esse tempo é descontado das horas contratadas. 0 = sem intervalo padrão.
                    </span>

                    <label>Máximo de horas por turno</label>
                    <input type="number" min={1} max={24} step={0.5} value={form.maxShiftHours}
                      onChange={(e) => setForm({ ...form, maxShiftHours: e.target.value })} />

                    <label>Máximo de horas por vaga (soma dos turnos)</label>
                    <input type="number" min={1} max={24} step={0.5} value={form.maxJobHours}
                      onChange={(e) => setForm({ ...form, maxJobHours: e.target.value })} />
                    <span className={panel.muted}>As horas são contadas já líquidas de intervalo.</span>

                    <hr style={{ width: "100%", borderColor: "var(--border)" }} />

                    <label>Desistência considerada &quot;de última hora&quot; (minutos antes do início)</label>
                    <input type="number" min={0} max={1440} step={15} value={form.shortNoticeWithdrawalMinutes}
                      onChange={(e) => setForm({ ...form, shortNoticeWithdrawalMinutes: e.target.value })} />

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
                  </div>
                )}

                {tab === "notificacoes" && (
                  <div className={panel.form}>
                    <strong>Alertas de ocorrência</strong>
                    <span className={panel.muted}>
                      Avisos automáticos de problemas na execução das vagas, na página <strong>Alertas</strong>.
                    </span>
                    <label className={panel.toggleRow}>
                      <Switch checked={form.alertsEnabled}
                        onChange={(v) => setForm({ ...form, alertsEnabled: v })} />
                      Ativar o controle de ocorrências
                    </label>
                    <label className={panel.toggleRow}>
                      <Switch checked={form.notifySupermarketOnAlerts}
                        onChange={(v) => setForm({ ...form, notifySupermarketOnAlerts: v })} />
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
                  </div>
                )}

                {tab === "colaborador" && (
                  <div className={panel.form}>
                    <label className={panel.toggleRow}>
                      <Switch checked={form.allowSelfRegistration}
                        onChange={(v) => setForm({ ...form, allowSelfRegistration: v })} />
                      Permitir que colaboradores se autocadastrem nesta agência
                    </label>
                    <span className={panel.muted}>
                      Quando ligado, aparece um formulário simples de cadastro. Cada cadastro fica
                      pendente até você aprovar em <strong>Cadastros pendentes</strong>.
                    </span>

                    <label className={panel.toggleRow}>
                      <Switch checked={form.onboardingRequired}
                        onChange={(v) => setForm({ ...form, onboardingRequired: v })} />
                      Exigir onboarding (perfil contratual + uniforme aprovado) antes de aceitar vagas
                    </label>
                    <label>Preço do kit uniforme (R$)</label>
                    <input type="number" min={0} step={0.01} value={form.uniformPrice}
                      onChange={(e) => setForm({ ...form, uniformPrice: e.target.value })} />
                    <span className={panel.muted}>Cobrado do colaborador no Mercado Pago ao comprar o uniforme.</span>

                    <label>E-mail de login das contas da rede</label>
                    <label className={panel.toggleRow}>
                      <input type="radio" name="loginEmailPolicy" checked={form.loginEmailPolicy === "informed"}
                        onChange={() => setForm({ ...form, loginEmailPolicy: "informed" })} />
                      E-mail informado no cadastro
                    </label>
                    <label className={panel.toggleRow}>
                      <input type="radio" name="loginEmailPolicy" checked={form.loginEmailPolicy === "pattern"}
                        onChange={() => setForm({ ...form, loginEmailPolicy: "pattern" })} />
                      Padrão nomesobrenome@workflow.com
                    </label>
                    <span className={panel.muted}>
                      Vale para freelancer, supermercado-cliente, líder e sócio cadastrados a partir de
                      agora (não muda contas já existentes). No padrão, a pessoa não tem uma caixa de
                      e-mail real pra recuperar sozinha — se esquecer a senha, só você consegue
                      redefinir (botão &quot;Redefinir senha&quot; em cada cadastro).
                    </span>
                  </div>
                )}

                {tab === "clientes" && (
                  <div className={panel.form}>
                    <p className={panel.muted} style={{ marginTop: 0 }}>
                      O cadastro dos supermercados-clientes, filiais, valores/hora e equipe de cada
                      um fica em <strong>Gestão de Clientes</strong> — inclusive o pagamento pelo app
                      ligado/desligado por cliente.
                    </p>
                    <Link href="/agency/supermarkets" className={panel.primaryBtn} style={{ alignSelf: "flex-start", textDecoration: "none" }}>
                      Abrir Gestão de Clientes
                    </Link>
                  </div>
                )}

                {tab === "pagamento" && (
                  <div className={panel.form}>
                    <label className={panel.toggleRow}>
                      <Switch checked={form.appPaymentEnabledForSupermarkets}
                        onChange={(v) => setForm({ ...form, appPaymentEnabledForSupermarkets: v })} />
                      Permitir que os mercados-clientes paguem a fatura pelo app
                    </label>
                    <span className={panel.muted}>
                      Quando desligado, o botão de pagar some pro mercado; você dá baixa manual em{" "}
                      <strong>Fechamentos</strong> depois de receber por fora. Escolha quais clientes veem a
                      opção em <strong>Gestão de Clientes</strong>.
                    </span>

                    <label className={panel.toggleRow}>
                      <Switch checked={form.appPaymentEnabledForFreelancers}
                        onChange={(v) => setForm({ ...form, appPaymentEnabledForFreelancers: v })} />
                      Permitir que os colaboradores comprem o uniforme pelo app
                    </label>
                    <span className={panel.muted}>
                      Quando desligado, o colaborador registra o pedido sem gerar link de pagamento; você
                      dá baixa manual em <strong>Onboarding</strong> depois de receber por fora.
                    </span>
                  </div>
                )}

                {tab === "equipe" && (
                  <div className={panel.form}>
                    <p className={panel.muted} style={{ marginTop: 0 }}>
                      Líderes (poderes operacionais fixos) e sócios (acesso amplo e configurável por
                      área) ficam centralizados em <strong>Equipe</strong>.
                    </p>
                    <Link href="/agency/team" className={panel.primaryBtn} style={{ alignSelf: "flex-start", textDecoration: "none" }}>
                      Abrir Equipe
                    </Link>
                  </div>
                )}

                {tab === "status" && (
                  <div className={panel.form}>
                    <strong>Cores das tags de status</strong>
                    <span className={panel.muted}>
                      Um tom por situação — vale para os badges de vaga, pedido, fatura e pagamento em
                      todas as áreas (sua, dos líderes, dos colaboradores e dos supermercados-clientes).
                    </span>
                    {STATUS_TONES.map(({ tone, label }) => (
                      <div key={tone} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span
                          className={panel.badge}
                          style={{ background: statusColors[tone].bg, color: statusColors[tone].fg, borderColor: "transparent", minWidth: 150 }}
                        >
                          {label}
                        </span>
                        <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: "0.8rem" }}>
                          fundo
                          <input type="color" value={statusColors[tone].bg}
                            onChange={(e) => patchColor(tone, "bg", e.target.value)}
                            style={{ width: 40, height: 30, padding: 0 }} />
                        </label>
                        <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: "0.8rem" }}>
                          texto
                          <input type="color" value={statusColors[tone].fg}
                            onChange={(e) => patchColor(tone, "fg", e.target.value)}
                            style={{ width: 40, height: 30, padding: 0 }} />
                        </label>
                      </div>
                    ))}
                    <button type="button" className={panel.ghostBtn} style={{ alignSelf: "flex-start" }}
                      onClick={() => setStatusColors(DEFAULT_STATUS_COLORS)}>
                      Restaurar cores padrão
                    </button>

                    <hr style={{ width: "100%", borderColor: "var(--border)" }} />
                    <strong>Ordem do menu lateral</strong>
                    <span className={panel.muted}>
                      Reorganize os itens do seu menu lateral na ordem que preferir.
                    </span>
                    <SidebarOrderEditor items={AGENCY_SIDEBAR_ITEMS} order={sidebarOrder} onChange={setSidebarOrder} />
                    {sidebarOrder && (
                      <button type="button" className={panel.ghostBtn} style={{ alignSelf: "flex-start" }}
                        onClick={() => setSidebarOrder(null)}>
                        Restaurar ordem padrão
                      </button>
                    )}
                  </div>
                )}

                <div className={panel.form} style={{ marginTop: "1rem" }}>
                  {msg && <p className={msg.type === "ok" ? panel.success : panel.error}>{msg.text}</p>}
                  <button className={panel.primaryBtn} type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
                    {saving ? "Salvando…" : "Salvar configurações"}
                  </button>
                </div>
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
    <RequireAuth role={["agency", "partner"]}>
      <RequirePermission feature="configuracoes">
        <SettingsPage />
      </RequirePermission>
    </RequireAuth>
  );
}
