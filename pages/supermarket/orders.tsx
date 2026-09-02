import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/supermarket/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import panel from "@/styles/panel.module.scss";
import { getBranches, Branch } from "@/src/services/branchService";
import { getCategories, Category } from "@/src/services/categoryService";
import {
  getOrders, createOrder, addOrderItems, cancelOrder, approveOrder, rejectOrder, Order, OrderItemInput,
  ORDER_STATUS_LABELS, ORDER_APPROVAL_LABELS, orderProgress, jobWasAbandoned, orderBranchNames,
} from "@/src/services/orderService";
import { formatShifts, formatShiftPeriods } from "@/src/services/jobService";
import {
  SHIFT_PERIODS, shiftLabel, shiftTimeRange, makeShiftInput, validateShiftInput,
  ShiftInput, ShiftPeriod,
} from "@/src/services/shifts";
import { authService } from "@/src/services/authService";
import type { SupermarketMembership } from "@/src/services/authService";
import { useAuth } from "@/src/hooks/useAuth";

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Um item do carrinho: função + filial + quantidade + data + um ou mais turnos. */
interface CartItem extends OrderItemInput {
  categoryName: string;
  branchName: string;
}

const emptyDraft = () => ({
  categoryId: "",
  branchId: "",
  title: "",
  titleTouched: false,
  quantity: "1",
  date: todayISO(),
  shifts: [makeShiftInput("manha")] as ShiftInput[],
});

const shiftSortIndex = (p: ShiftPeriod) => SHIFT_PERIODS.findIndex((x) => x.value === p);

function OrdersPage() {
  const supermarketId = authService.getProfileId() ?? "";
  const { profile } = useAuth();
  const membership = (profile as { membership?: SupermarketMembership } | null)?.membership ?? null;
  const canApprove = membership?.canApproveOrders ?? true;
  const managerBranchId = membership?.branchId ?? null;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [itemModal, setItemModal] = useState<{ open: boolean; addToOrderId?: string }>({ open: false });
  const [draft, setDraft] = useState(emptyDraft());
  const [itemError, setItemError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Order | null>(null);

  const myBranches = useMemo(
    () =>
      branches
        .filter((b) => b.supermarketId === supermarketId)
        .filter((b) => !managerBranchId || b.id === managerBranchId),
    [branches, supermarketId, managerBranchId]
  );
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "";
  const branchName = (id: string) => myBranches.find((b) => b.id === id)?.name ?? "";

  const load = async () => {
    setLoading(true);
    try {
      const [b, c, o] = await Promise.all([getBranches(), getCategories(), getOrders()]);
      setBranches(b);
      setCategories(c);
      setOrders(o);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load().catch(() => setError("Erro ao carregar dados.")); }, []); // eslint-disable-line

  /** Título padrão da vaga: "<Função> - <Filial>" (quando ambos já conhecidos). */
  const autoTitle = (categoryId: string, branchIdSel: string) => {
    if (!categoryId) return "";
    const fn = categoryName(categoryId);
    const branch = branchName(branchIdSel);
    return branch ? `${fn} - ${branch}` : fn;
  };

  const changeCategory = (categoryId: string) =>
    setDraft((d) => ({
      ...d,
      categoryId,
      title: d.titleTouched ? d.title : autoTitle(categoryId, d.branchId),
    }));

  const changeBranch = (branchIdSel: string) =>
    setDraft((d) => ({
      ...d,
      branchId: branchIdSel,
      title: d.titleTouched ? d.title : autoTitle(d.categoryId, branchIdSel),
    }));

  const toggleShift = (period: ShiftPeriod) =>
    setDraft((d) => {
      const has = d.shifts.some((s) => s.shiftPeriod === period);
      const shifts = has
        ? d.shifts.filter((s) => s.shiftPeriod !== period)
        : [...d.shifts, makeShiftInput(period)].sort(
            (a, b) => shiftSortIndex(a.shiftPeriod) - shiftSortIndex(b.shiftPeriod)
          );
      return { ...d, shifts };
    });

  const updateShiftTime = (period: ShiftPeriod, patch: Partial<ShiftInput>) =>
    setDraft((d) => ({
      ...d,
      shifts: d.shifts.map((s) => (s.shiftPeriod === period ? { ...s, ...patch } : s)),
    }));

  const toItemInput = (): OrderItemInput => ({
    categoryId: draft.categoryId,
    branchId: draft.branchId,
    quantity: Number(draft.quantity),
    date: draft.date,
    shifts: draft.shifts,
    title: draft.title.trim() || undefined,
  });

  const openNewItem = (addToOrderId?: string) => {
    setDraft({ ...emptyDraft(), branchId: managerBranchId ?? "" });
    setItemError(null);
    setItemModal({ open: true, addToOrderId });
  };

  const confirmItem = async () => {
    setItemError(null);
    if (!draft.categoryId) return setItemError("Selecione a função.");
    if (!draft.branchId) return setItemError("Selecione a filial.");
    if (Number(draft.quantity) < 1) return setItemError("Informe a quantidade de atendentes.");
    if (!draft.shifts.length) return setItemError("Selecione ao menos um turno.");
    for (const s of draft.shifts) {
      const err = validateShiftInput(s);
      if (err) return setItemError(`${shiftLabel(s.shiftPeriod)}: ${err}`);
    }
    if (itemModal.addToOrderId) {
      try {
        await addOrderItems(itemModal.addToOrderId, [toItemInput()]);
        setItemModal({ open: false });
        await load();
      } catch (err) {
        setItemError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
      }
      return;
    }
    setCart((prev) => [
      ...prev,
      { ...toItemInput(), categoryName: categoryName(draft.categoryId), branchName: branchName(draft.branchId) },
    ]);
    setItemModal({ open: false });
  };

  const totalVagas = cart.reduce((acc, i) => acc + i.quantity, 0);

  const submitOrder = async () => {
    setError(null);
    if (!cart.length) return setError("Adicione ao menos uma vaga ao pedido.");
    setSubmitting(true);
    try {
      await createOrder({ notes: notes || undefined, items: cart });
      setCart([]);
      setNotes("");
      await load();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao enviar pedido." : "Erro ao enviar pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  const act = async (fn: () => Promise<unknown>) => {
    try { await fn(); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  const doCancel = async (id: string) => {
    if (!confirm("Cancelar as vagas ainda não preenchidas deste pedido?")) return;
    try {
      await cancelOrder(id);
      await load();
    } catch (err) {
      alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  return (
    <>
      <Head><title>Pedidos | Supermercado</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Pedidos de vagas</h1></header>
          <p className={panel.muted}>
            Informe a filial, a função, a data e o turno. Monte uma vez e escolha a quantidade de atendentes.
            O valor é definido pela agência (valor/hora por função).
          </p>

          {error && <p className={panel.error}>{error}</p>}

          <div className={panel.card}>
            <div className={panel.form}>
              <label>Observações (opcional)</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: reforço de fim de semana" />
              <p className={panel.muted}>
                A filial é escolhida por vaga — um pedido pode pedir vagas para lojas diferentes.
              </p>
            </div>

            <div className={panel.tableToolbar}>
              <strong>Vagas do pedido ({totalVagas})</strong>
              <button className={panel.ghostBtn} onClick={() => openNewItem()}>+ Adicionar função</button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className={panel.table}>
                <thead>
                  <tr><th>Função</th><th>Filial</th><th>Qtd.</th><th>Data</th><th>Turno</th><th>Horário</th><th>Título</th><th></th></tr>
                </thead>
                <tbody>
                  {cart.map((it, i) => (
                    <tr key={i}>
                      <td>{it.categoryName}</td>
                      <td>{it.branchName}</td>
                      <td>{it.quantity}</td>
                      <td>{new Date(`${it.date}T00:00`).toLocaleDateString("pt-BR")}</td>
                      <td>{it.shifts.map((s) => shiftLabel(s.shiftPeriod)).join(", ")}</td>
                      <td>{it.shifts.map((s) => `${s.startTime}–${s.endTime}`).join(", ")}</td>
                      <td className={panel.muted}>{it.title ?? "padrão"}</td>
                      <td><button className={panel.secondaryBtn} onClick={() => setCart((p) => p.filter((_, idx) => idx !== i))}>Remover</button></td>
                    </tr>
                  ))}
                  {cart.length === 0 && <tr><td colSpan={8} className={panel.muted}>Nenhuma vaga. Clique em “Adicionar função”.</td></tr>}
                </tbody>
              </table>
            </div>

            <button className={panel.primaryBtn} onClick={submitOrder} disabled={submitting || !cart.length}>
              {submitting ? "Enviando…" : canApprove ? "Enviar pedido" : "Enviar para aprovação"}
            </button>
            {!canApprove && (
              <p className={panel.muted}>
                Seu pedido ficará aguardando a aprovação de um responsável da rede antes de virar vaga.
              </p>
            )}
          </div>

          <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>Meus pedidos</h2>
          {loading ? (
            <p>Carregando…</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className={panel.table}>
                <thead>
                  <tr><th>Data</th><th>Filial</th><th>Vagas</th><th>Preenchidas</th><th>Concluídas</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const p = orderProgress(o);
                    const abandoned = (o.orderJobs ?? []).some(jobWasAbandoned);
                    return (
                      <tr key={o.id}>
                        <td>{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                        <td>{orderBranchNames(o)}</td>
                        <td>{p.total}</td>
                        <td>{p.filled}</td>
                        <td>{p.done}</td>
                        <td>
                          {o.approvalStatus === "approved" ? (
                            <span className={panel.badge}>{ORDER_STATUS_LABELS[o.status]}</span>
                          ) : (
                            <span
                              className={`${panel.badge} ${o.approvalStatus === "rejected" ? panel.badgeCanceled : panel.badgePending}`}
                              title={o.rejectionReason ?? undefined}
                            >
                              {ORDER_APPROVAL_LABELS[o.approvalStatus]}
                            </span>
                          )}
                          {abandoned && <span className={`${panel.badge} ${panel.badgeCanceled}`} style={{ marginLeft: 6 }}>desistência</span>}
                        </td>
                        <td>
                          <button className={panel.ghostBtn} onClick={() => setDetail(o)}>Ver</button>
                          {o.approvalStatus === "pending_approval" && canApprove && (
                            <>
                              <button className={panel.primaryBtn} onClick={() => act(() => approveOrder(o.id))}>Aprovar</button>
                              <button className={panel.secondaryBtn}
                                onClick={() => { const r = prompt("Motivo da recusa (opcional):"); if (r !== null) act(() => rejectOrder(o.id, r)); }}>
                                Rejeitar
                              </button>
                            </>
                          )}
                          {o.approvalStatus === "approved" && ["open", "in_progress"].includes(o.status) && (
                            <>
                              <button className={panel.ghostBtn} onClick={() => openNewItem(o.id)}>+ Vagas</button>
                              <button className={panel.secondaryBtn} onClick={() => doCancel(o.id)}>Cancelar</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && <tr><td colSpan={7} className={panel.muted}>Nenhum pedido ainda.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {itemModal.open && (
        <Modal
          title={itemModal.addToOrderId ? "Adicionar vagas ao pedido" : "Adicionar função ao pedido"}
          onClose={() => setItemModal({ open: false })}
        >
          <div className={panel.form}>
            <label>Função</label>
            <select value={draft.categoryId} onChange={(e) => changeCategory(e.target.value)}>
              <option value="">Selecione…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <label>Filial (local do trabalho)</label>
            <select value={draft.branchId} onChange={(e) => changeBranch(e.target.value)} disabled={!!managerBranchId}>
              <option value="">Selecione…</option>
              {myBranches.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.address}</option>)}
            </select>

            <label>Título (descrição da vaga)</label>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value, titleTouched: true })}
              placeholder="preenchido com função + filial — edite se quiser"
            />

            <label>Quantidade de atendentes</label>
            <input type="number" min={1} max={100} value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} />

            <label>Data</label>
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />

            <label>Turnos da vaga (um ou mais)</label>
            <div className={panel.shiftRow}>
              {SHIFT_PERIODS.map((p) => (
                <label key={p.value} style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={draft.shifts.some((s) => s.shiftPeriod === p.value)}
                    onChange={() => toggleShift(p.value)}
                  />
                  {p.label}
                </label>
              ))}
            </div>

            {draft.shifts.map((s) => {
              const range = shiftTimeRange(s.shiftPeriod);
              return (
                <div key={s.shiftPeriod} className={panel.shiftRow}>
                  <span style={{ minWidth: 72, fontWeight: 600 }}>{shiftLabel(s.shiftPeriod)}</span>
                  <div style={{ flex: 1 }}>
                    <label>Início</label>
                    <input
                      type="time"
                      value={s.startTime}
                      min={range.min}
                      max={range.max}
                      onChange={(e) => updateShiftTime(s.shiftPeriod, { startTime: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Fim</label>
                    <input
                      type="time"
                      value={s.endTime}
                      min={range.min}
                      max={range.max}
                      onChange={(e) => updateShiftTime(s.shiftPeriod, { endTime: e.target.value })}
                    />
                  </div>
                </div>
              );
            })}

            {itemError && <p className={panel.error}>{itemError}</p>}

            <button className={panel.primaryBtn} onClick={confirmItem} disabled={!draft.categoryId || !draft.branchId || !draft.shifts.length}>
              {itemModal.addToOrderId ? "Adicionar ao pedido" : "Adicionar ao carrinho"}
            </button>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal title="Pedido" onClose={() => setDetail(null)}>
          <div className={panel.form}>
            <p className={panel.muted}>{orderBranchNames(detail)} · {new Date(detail.createdAt).toLocaleString("pt-BR")}</p>
            {detail.notes && <p>{detail.notes}</p>}
            <div style={{ overflowX: "auto" }}>
              <table className={panel.table}>
                <thead><tr><th>Vaga</th><th>Filial</th><th>Função</th><th>Turno</th><th>Horário</th><th>Colaborador</th><th>Status</th></tr></thead>
                <tbody>
                  {(detail.orderJobs ?? []).map((j) => (
                    <tr key={j.id}>
                      <td>{j.title}{jobWasAbandoned(j) && <span className={`${panel.badge} ${panel.badgeCanceled}`} style={{ marginLeft: 6 }}>desistência</span>}</td>
                      <td>{j.jobBranch?.name ?? "—"}</td>
                      <td>{j.jobCategory?.name ?? "—"}</td>
                      <td>{formatShiftPeriods(j)}</td>
                      <td>{formatShifts(j.shifts)}</td>
                      <td>{j.assignedFreelancer?.name ?? "—"}</td>
                      <td><StatusBadge status={j.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="supermarket">
      <OrdersPage />
    </RequireAuth>
  );
}
