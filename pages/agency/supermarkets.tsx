import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import {
  getSupermarkets, createSupermarketAsAgency, updateSupermarket, Supermarket,
} from "@/src/services/supermarketService";
import {
  getBranches, createBranch, updateBranch, deleteBranch, geocodeAddress, branchHasLocation, Branch,
} from "@/src/services/branchService";
import { getCategories, Category } from "@/src/services/categoryService";
import {
  getSupermarketRates, saveSupermarketRate, updateSupermarketRate, deleteSupermarketRate,
  SupermarketCategoryRate,
} from "@/src/services/supermarketRateService";

const emptyMarket = { id: "", name: "", cnpj: "", address: "", phone: "", email: "", password: "" };
const emptyBranch = { id: "", name: "", address: "", phone: "" };
const emptyRate = { categoryId: "", branchId: "", hourlyRate: "" };

function SupermarketsPage() {
  const [markets, setMarkets] = useState<Supermarket[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [ratesOf, setRatesOf] = useState<Supermarket | null>(null);
  const [rates, setRates] = useState<SupermarketCategoryRate[]>([]);
  const [rateForm, setRateForm] = useState({ ...emptyRate });
  const [rateMsg, setRateMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [marketModal, setMarketModal] = useState(false);
  const [marketForm, setMarketForm] = useState({ ...emptyMarket });
  const [marketError, setMarketError] = useState<string | null>(null);

  const [branchesOf, setBranchesOf] = useState<Supermarket | null>(null);
  const [branchModal, setBranchModal] = useState(false);
  const [branchForm, setBranchForm] = useState({ ...emptyBranch });
  const [branchError, setBranchError] = useState<string | null>(null);
  const [geoMsg, setGeoMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, b, c] = await Promise.all([getSupermarkets(), getBranches(), getCategories()]);
      setMarkets(m);
      setBranches(b);
      setCategories(c);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const branchesForMarket = useMemo(
    () => (id: string) => branches.filter((b) => b.supermarketId === id),
    [branches]
  );

  const openNewMarket = () => { setMarketForm({ ...emptyMarket }); setMarketError(null); setMarketModal(true); };
  const openEditMarket = (m: Supermarket) => {
    setMarketForm({ id: m.id, name: m.name, cnpj: m.cnpj, address: m.address ?? "", phone: m.phone ?? "", email: "", password: "" });
    setMarketError(null);
    setMarketModal(true);
  };

  const saveMarket = async () => {
    setMarketError(null);
    try {
      if (marketForm.id) {
        await updateSupermarket(marketForm.id, {
          name: marketForm.name, cnpj: marketForm.cnpj, address: marketForm.address, phone: marketForm.phone,
        });
      } else {
        await createSupermarketAsAgency({
          name: marketForm.name, cnpj: marketForm.cnpj, address: marketForm.address,
          phone: marketForm.phone || undefined, email: marketForm.email, password: marketForm.password,
        });
      }
      setMarketModal(false);
      await load();
    } catch (err) {
      setMarketError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao salvar." : "Erro ao salvar.");
    }
  };

  const openNewBranch = () => { setBranchForm({ ...emptyBranch }); setBranchError(null); setGeoMsg(null); setBranchModal(true); };
  const openEditBranch = (b: Branch) => {
    setBranchForm({ id: b.id, name: b.name, address: b.address, phone: b.phone ?? "" });
    setBranchError(null);
    setGeoMsg(branchHasLocation(b) ? { type: "ok", text: "Localização já definida pelo endereço." } : null);
    setBranchModal(true);
  };

  const testGeocode = async () => {
    if (!branchForm.address.trim()) return;
    setGeoBusy(true);
    setGeoMsg(null);
    try {
      const r = await geocodeAddress(branchForm.address);
      setGeoMsg({ type: "ok", text: `Encontrado: ${r.displayName}` });
    } catch (err) {
      setGeoMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Não localizado." : "Não localizado." });
    } finally {
      setGeoBusy(false);
    }
  };

  const saveBranch = async () => {
    if (!branchesOf) return;
    setBranchError(null);
    const payload = { name: branchForm.name, address: branchForm.address, phone: branchForm.phone, regeocode: true };
    try {
      if (branchForm.id) await updateBranch(branchForm.id, payload);
      else await createBranch({ ...payload, supermarketId: branchesOf.id });
      setBranchModal(false);
      await load();
    } catch (err) {
      setBranchError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao salvar." : "Erro ao salvar.");
    }
  };

  const removeBranch = async (id: string) => {
    if (!confirm("Excluir esta filial?")) return;
    try { await deleteBranch(id); await load(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  const openRates = async (m: Supermarket) => {
    setRatesOf(m);
    setRateForm({ ...emptyRate });
    setRateMsg(null);
    setRates([]);
    try { setRates(await getSupermarketRates(m.id)); } catch { /* vazio */ }
  };

  const reloadRates = async () => {
    if (!ratesOf) return;
    try { setRates(await getSupermarketRates(ratesOf.id)); } catch { /* vazio */ }
  };

  const addRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratesOf) return;
    setRateMsg(null);
    try {
      await saveSupermarketRate(ratesOf.id, {
        categoryId: rateForm.categoryId,
        branchId: rateForm.branchId || null,
        hourlyRate: Number(rateForm.hourlyRate),
      });
      setRateForm({ ...emptyRate });
      setRateMsg({ type: "ok", text: "Valor/hora salvo." });
      await reloadRates();
    } catch (err) {
      setRateMsg({ type: "err", text: axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro." });
    }
  };

  const changeRate = async (r: SupermarketCategoryRate, value: string) => {
    if (!ratesOf || Number(value) === Number(r.hourlyRate)) return;
    try { await updateSupermarketRate(ratesOf.id, r.id, { hourlyRate: Number(value) }); await reloadRates(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  const toggleRate = async (r: SupermarketCategoryRate) => {
    if (!ratesOf) return;
    try { await updateSupermarketRate(ratesOf.id, r.id, { active: !r.active }); await reloadRates(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  const removeRate = async (r: SupermarketCategoryRate) => {
    if (!ratesOf || !confirm("Remover este valor/hora?")) return;
    try { await deleteSupermarketRate(ratesOf.id, r.id); await reloadRates(); }
    catch (err) { alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro."); }
  };

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <>
      <Head><title>Supermercados | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>Supermercados</h1>
            <button className={panel.primaryBtn} onClick={openNewMarket}>Novo supermercado</button>
          </header>
          <p className={panel.muted}>
            A agência cadastra os supermercados e as filiais de cada um. O acesso do supermercado é
            criado junto (e-mail + senha informados aqui).
          </p>

          {loading ? (
            <p>Carregando…</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className={panel.table}>
                <thead><tr><th>Nome</th><th>CNPJ</th><th>Acesso</th><th>Filiais</th><th>Ações</th></tr></thead>
                <tbody>
                  {markets.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.cnpj}</td>
                      <td>{m.owner?.email ?? "—"}</td>
                      <td>{branchesForMarket(m.id).length}</td>
                      <td>
                        <button className={panel.ghostBtn} onClick={() => setBranchesOf(m)}>Filiais</button>
                        <button className={panel.ghostBtn} onClick={() => openRates(m)}>Valores/hora</button>
                        <button className={panel.ghostBtn} onClick={() => openEditMarket(m)}>Editar</button>
                      </td>
                    </tr>
                  ))}
                  {markets.length === 0 && <tr><td colSpan={5} className={panel.muted}>Nenhum supermercado cadastrado.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {marketModal && (
        <Modal title={marketForm.id ? "Editar supermercado" : "Novo supermercado"} onClose={() => setMarketModal(false)}>
          <div className={panel.form}>
            <label>Nome</label>
            <input value={marketForm.name} onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })} />
            <label>CNPJ</label>
            <input value={marketForm.cnpj} onChange={(e) => setMarketForm({ ...marketForm, cnpj: e.target.value })} />
            <label>Endereço (matriz)</label>
            <input value={marketForm.address} onChange={(e) => setMarketForm({ ...marketForm, address: e.target.value })} />
            <label>Telefone</label>
            <input value={marketForm.phone} onChange={(e) => setMarketForm({ ...marketForm, phone: e.target.value })} />
            {!marketForm.id && (
              <>
                <label>E-mail de acesso</label>
                <input type="email" value={marketForm.email} onChange={(e) => setMarketForm({ ...marketForm, email: e.target.value })} />
                <label>Senha de acesso</label>
                <input type="password" minLength={4} value={marketForm.password} onChange={(e) => setMarketForm({ ...marketForm, password: e.target.value })} />
              </>
            )}
            {marketError && <p className={panel.error}>{marketError}</p>}
            <button
              className={panel.primaryBtn}
              onClick={saveMarket}
              disabled={!marketForm.name || !marketForm.cnpj || !marketForm.address || (!marketForm.id && (!marketForm.email || !marketForm.password))}
            >
              Salvar
            </button>
          </div>
        </Modal>
      )}

      {ratesOf && (
        <Modal title={`Valores/hora — ${ratesOf.name}`} onClose={() => setRatesOf(null)}>
          <div className={panel.form}>
            <p className={panel.muted}>
              Valor que a agência cobra deste supermercado por <strong>função</strong>, por hora
              trabalhada. Deixe a loja em <em>Todas as lojas</em> para o valor padrão da rede, ou
              escolha uma filial para uma tarifa específica (tem prioridade sobre o padrão).
            </p>
            <form onSubmit={addRate} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className={panel.filterField}>
                <label>Função</label>
                <select value={rateForm.categoryId} onChange={(e) => setRateForm({ ...rateForm, categoryId: e.target.value })} required>
                  <option value="">Selecione…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className={panel.filterField}>
                <label>Loja</label>
                <select value={rateForm.branchId} onChange={(e) => setRateForm({ ...rateForm, branchId: e.target.value })}>
                  <option value="">Todas as lojas (padrão)</option>
                  {branchesForMarket(ratesOf.id).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className={panel.filterField}>
                <label>Valor/hora (R$)</label>
                <input type="number" min="0.01" step="0.01" value={rateForm.hourlyRate}
                  onChange={(e) => setRateForm({ ...rateForm, hourlyRate: e.target.value })} required />
              </div>
              <button className={panel.primaryBtn} type="submit" disabled={!rateForm.categoryId || !rateForm.hourlyRate}>
                Adicionar
              </button>
              {rateMsg && <p className={rateMsg.type === "ok" ? panel.success : panel.error} style={{ width: "100%" }}>{rateMsg.text}</p>}
            </form>

            <div style={{ overflowX: "auto" }}>
              <table className={panel.table}>
                <thead><tr><th>Função</th><th>Loja</th><th>Valor/hora</th><th>Situação</th><th>Ações</th></tr></thead>
                <tbody>
                  {rates.map((r) => (
                    <tr key={r.id}>
                      <td>{r.rateCategory?.name ?? categoryName(r.categoryId)}</td>
                      <td>{r.rateBranch?.name ?? "Todas as lojas"}</td>
                      <td>
                        <input type="number" min="0.01" step="0.01" defaultValue={Number(r.hourlyRate)}
                          style={{ width: 100 }}
                          onBlur={(e) => changeRate(r, e.target.value)} />
                      </td>
                      <td><span className={panel.badge}>{r.active ? "Ativa" : "Inativa"}</span></td>
                      <td>
                        <button className={panel.ghostBtn} onClick={() => toggleRate(r)}>{r.active ? "Desativar" : "Ativar"}</button>
                        <button className={panel.secondaryBtn} onClick={() => removeRate(r)}>Remover</button>
                      </td>
                    </tr>
                  ))}
                  {rates.length === 0 && <tr><td colSpan={5} className={panel.muted}>Nenhum valor/hora cadastrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {branchesOf && !branchModal && (
        <Modal title={`Filiais — ${branchesOf.name}`} onClose={() => setBranchesOf(null)}>
          <div className={panel.form}>
            <button className={panel.primaryBtn} onClick={openNewBranch}>Nova filial</button>
            <div style={{ overflowX: "auto" }}>
              <table className={panel.table}>
                <thead><tr><th>Nome</th><th>Endereço</th><th>Localização</th><th>Ações</th></tr></thead>
                <tbody>
                  {branchesForMarket(branchesOf.id).map((b) => (
                    <tr key={b.id}>
                      <td>{b.name}</td>
                      <td>{b.address}</td>
                      <td>
                        {branchHasLocation(b)
                          ? <span className={`${panel.badge} ${panel.badgeDone}`}>ok</span>
                          : <span className={`${panel.badge} ${panel.badgePending}`}>não localizada</span>}
                      </td>
                      <td>
                        <button className={panel.ghostBtn} onClick={() => openEditBranch(b)}>Editar</button>
                        <button className={panel.secondaryBtn} onClick={() => removeBranch(b.id)}>Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {branchesForMarket(branchesOf.id).length === 0 && (
                    <tr><td colSpan={4} className={panel.muted}>Nenhuma filial.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {branchModal && branchesOf && (
        <Modal title={branchForm.id ? "Editar filial" : "Nova filial"} onClose={() => setBranchModal(false)}>
          <div className={panel.form}>
            <label>Nome</label>
            <input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
            <label>Endereço completo</label>
            <input
              value={branchForm.address}
              onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
              placeholder="Rua, número - bairro, cidade/UF"
            />
            <button type="button" className={panel.ghostBtn} onClick={testGeocode} disabled={geoBusy || !branchForm.address.trim()}>
              {geoBusy ? "Buscando…" : "Buscar localização pelo endereço"}
            </button>
            {geoMsg && <p className={geoMsg.type === "ok" ? panel.success : panel.error}>{geoMsg.text}</p>}
            <label>Telefone</label>
            <input value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
            {branchError && <p className={panel.error}>{branchError}</p>}
            <button className={panel.primaryBtn} onClick={saveBranch} disabled={!branchForm.name || !branchForm.address}>Salvar</button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="agency">
      <SupermarketsPage />
    </RequireAuth>
  );
}
