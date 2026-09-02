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

const emptyMarket = { id: "", name: "", cnpj: "", address: "", phone: "", email: "", password: "" };
const emptyBranch = { id: "", name: "", address: "", phone: "" };

function SupermarketsPage() {
  const [markets, setMarkets] = useState<Supermarket[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

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
      const [m, b] = await Promise.all([getSupermarkets(), getBranches()]);
      setMarkets(m);
      setBranches(b);
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
