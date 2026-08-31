import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/supermarket/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import StatusBadge from "@/src/components/StatusBadge";
import ShiftsEditor, { ShiftRow } from "@/src/components/ShiftsEditor";
import panel from "@/styles/panel.module.scss";
import { getBranches, Branch } from "@/src/services/branchService";
import { getCategories, Category } from "@/src/services/categoryService";
import {
  getOrders, createOrder, cancelOrder, Order, CreateOrderItemInput,
  ORDER_STATUS_LABELS, orderProgress,
} from "@/src/services/orderService";
import { formatShifts } from "@/src/services/jobService";
import { authService } from "@/src/services/authService";

const todayISO = () => new Date().toISOString().slice(0, 10);

interface CartItem extends CreateOrderItemInput {
  date: string;
  categoryName: string;
}

function OrdersPage() {
  const supermarketId = authService.getProfileId() ?? "";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [branchId, setBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [itemModal, setItemModal] = useState(false);
  const [draft, setDraft] = useState({
    categoryId: "", title: "", quantity: "1", photosRequired: true, agencyReviewEnabled: false,
  });
  const [draftDate, setDraftDate] = useState(todayISO());
  const [draftShifts, setDraftShifts] = useState<ShiftRow[]>([{ start: "08:00", end: "12:00", label: "Manhã" }]);
  const [detail, setDetail] = useState<Order | null>(null);

  const myBranches = useMemo(
    () => branches.filter((b) => b.supermarketId === supermarketId),
    [branches, supermarketId]
  );

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

  const openItem = () => {
    setDraft({ categoryId: "", title: "", quantity: "1", photosRequired: true, agencyReviewEnabled: false });
    setDraftDate(todayISO());
    setDraftShifts([{ start: "08:00", end: "12:00", label: "Manhã" }]);
    setItemModal(true);
  };

  const addItem = () => {
    if (!draft.categoryId || !draft.title || Number(draft.quantity) < 1) return;
    const categoryName = categories.find((c) => c.id === draft.categoryId)?.name ?? "";
    setCart((prev) => [
      ...prev,
      {
        categoryId: draft.categoryId,
        title: draft.title,
        quantity: Number(draft.quantity),
        photosRequired: draft.photosRequired,
        agencyReviewEnabled: draft.agencyReviewEnabled,
        date: draftDate,
        categoryName,
        shifts: draftShifts.map((s) => ({
          startTime: `${draftDate}T${s.start}:00`,
          endTime: `${draftDate}T${s.end}:00`,
          label: s.label || undefined,
        })),
      },
    ]);
    setItemModal(false);
  };

  const removeItem = (i: number) => setCart((prev) => prev.filter((_, idx) => idx !== i));

  const totalVagas = cart.reduce((acc, i) => acc + i.quantity, 0);

  const submit = async () => {
    setError(null);
    if (!branchId) return setError("Selecione a filial.");
    if (!cart.length) return setError("Adicione ao menos um item ao pedido.");
    setSubmitting(true);
    try {
      await createOrder({
        branchId,
        notes: notes || undefined,
        items: cart.map((it) => ({
          categoryId: it.categoryId,
          title: it.title,
          description: it.description,
          quantity: it.quantity,
          photosRequired: it.photosRequired,
          agencyReviewEnabled: it.agencyReviewEnabled,
          shifts: it.shifts,
        })),
      });
      setCart([]);
      setNotes("");
      await load();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao enviar pedido." : "Erro ao enviar pedido.");
    } finally {
      setSubmitting(false);
    }
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
            Monte o pedido uma vez e informe a quantidade — o sistema cria uma vaga por atendente.
            O valor é definido pela agência (tabela de valor/hora por função).
          </p>

          {error && <p className={panel.error}>{error}</p>}

          <div className={panel.card}>
            <div className={panel.form}>
              <label>Filial</label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">Selecione…</option>
                {myBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <label>Observações (opcional)</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: reforço de fim de semana" />
            </div>

            <div className={panel.tableToolbar}>
              <strong>Itens do pedido ({totalVagas} {totalVagas === 1 ? "vaga" : "vagas"})</strong>
              <button className={panel.ghostBtn} onClick={openItem}>+ Adicionar função</button>
            </div>

            <table className={panel.table}>
              <thead>
                <tr><th>Função</th><th>Título</th><th>Qtd.</th><th>Data</th><th>Turnos</th><th>Foto</th><th></th></tr>
              </thead>
              <tbody>
                {cart.map((it, i) => (
                  <tr key={i}>
                    <td>{it.categoryName}</td>
                    <td>{it.title}</td>
                    <td>{it.quantity}</td>
                    <td>{new Date(it.date).toLocaleDateString("pt-BR")}</td>
                    <td>{it.shifts.map((s) => `${s.startTime.slice(11, 16)}–${s.endTime.slice(11, 16)}`).join(", ")}</td>
                    <td>{it.photosRequired ? "sim" : "não"}</td>
                    <td><button className={panel.secondaryBtn} onClick={() => removeItem(i)}>Remover</button></td>
                  </tr>
                ))}
                {cart.length === 0 && <tr><td colSpan={7}>Nenhum item. Clique em “Adicionar função”.</td></tr>}
              </tbody>
            </table>

            <button className={panel.primaryBtn} onClick={submit} disabled={submitting || !cart.length}>
              {submitting ? "Enviando…" : "Enviar pedido"}
            </button>
          </div>

          <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>Meus pedidos</h2>
          {loading ? (
            <p>Carregando…</p>
          ) : (
            <table className={panel.table}>
              <thead>
                <tr><th>Data</th><th>Filial</th><th>Vagas</th><th>Preenchidas</th><th>Concluídas</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const p = orderProgress(o);
                  return (
                    <tr key={o.id}>
                      <td>{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                      <td>{o.orderBranch?.name ?? "—"}</td>
                      <td>{p.total}</td>
                      <td>{p.filled}</td>
                      <td>{p.done}</td>
                      <td><span className={panel.badge}>{ORDER_STATUS_LABELS[o.status]}</span></td>
                      <td>
                        <button className={panel.ghostBtn} onClick={() => setDetail(o)}>Ver</button>
                        {["open", "in_progress"].includes(o.status) && (
                          <button className={panel.secondaryBtn} onClick={() => doCancel(o.id)}>Cancelar</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && <tr><td colSpan={7}>Nenhum pedido ainda.</td></tr>}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {itemModal && (
        <Modal title="Adicionar função ao pedido" onClose={() => setItemModal(false)}>
          <div className={panel.form}>
            <label>Função (categoria)</label>
            <select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
              <option value="">Selecione…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label>Título da vaga</label>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ex.: Operador de caixa" />
            <label>Quantidade de atendentes</label>
            <input type="number" min={1} max={100} value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} />

            <ShiftsEditor date={draftDate} onDateChange={setDraftDate} shifts={draftShifts} onChange={setDraftShifts} />

            <label className={panel.toggleRow}>
              <input type="checkbox" checked={draft.photosRequired} onChange={(e) => setDraft({ ...draft, photosRequired: e.target.checked })} />
              Exigir foto de comprovação no check-out
            </label>
            <label className={panel.toggleRow}>
              <input type="checkbox" checked={draft.agencyReviewEnabled} onChange={(e) => setDraft({ ...draft, agencyReviewEnabled: e.target.checked })} />
              Agência avalia a entrega
            </label>
            <button className={panel.primaryBtn} onClick={addItem} disabled={!draft.categoryId || !draft.title}>
              Adicionar ao pedido
            </button>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal title="Pedido" onClose={() => setDetail(null)}>
          <div className={panel.form}>
            <p className={panel.muted}>
              {detail.orderBranch?.name} · {new Date(detail.createdAt).toLocaleString("pt-BR")}
            </p>
            {detail.notes && <p>{detail.notes}</p>}
            <table className={panel.table}>
              <thead><tr><th>Vaga</th><th>Função</th><th>Turnos</th><th>Freelancer</th><th>Status</th></tr></thead>
              <tbody>
                {(detail.orderJobs ?? []).map((j) => (
                  <tr key={j.id}>
                    <td>{j.title}</td>
                    <td>{j.jobCategory?.name ?? "—"}</td>
                    <td>{formatShifts(j.shifts)}</td>
                    <td>{j.assignedFreelancer?.name ?? "—"}</td>
                    <td><StatusBadge status={j.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
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
