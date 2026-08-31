import { useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/supermarket/Sidebar";
import Modal from "@/src/components/common/Modal";
import RequireAuth from "@/src/components/RequireAuth";
import panel from "@/styles/panel.module.scss";
import { getBranches, createBranch, updateBranch, deleteBranch, Branch } from "@/src/services/branchService";
import { authService } from "@/src/services/authService";

function BranchesPage() {
  const supermarketId = authService.getProfileId() ?? "";
  const [branches, setBranches] = useState<Branch[]>([]);
  const emptyForm = { id: "", name: "", address: "", phone: "", latitude: "", longitude: "", geofenceRadius: "300" };
  const [form, setForm] = useState({ ...emptyForm });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);

  const load = async () => {
    const all = await getBranches();
    setBranches(all.filter((b) => b.supermarketId === supermarketId));
  };
  useEffect(() => { load().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const save = async () => {
    setError(null);
    const payload = {
      name: form.name,
      address: form.address,
      phone: form.phone,
      latitude: num(form.latitude),
      longitude: num(form.longitude),
      geofenceRadius: num(form.geofenceRadius) ?? 300,
    };
    try {
      if (form.id) await updateBranch(form.id, payload);
      else await createBranch({ ...payload, supermarketId });
      setOpen(false);
      await load();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao salvar." : "Erro ao salvar.");
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return setError("Geolocalização indisponível neste dispositivo.");
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setGeoBusy(false);
      },
      () => { setError("Não foi possível obter a localização."); setGeoBusy(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta filial?")) return;
    try {
      await deleteBranch(id);
      await load();
    } catch (err) {
      alert(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro." : "Erro.");
    }
  };

  return (
    <>
      <Head><title>Filiais | Supermercado</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}>
            <h1>Filiais</h1>
            <button className={panel.primaryBtn} onClick={() => { setForm({ ...emptyForm }); setError(null); setOpen(true); }}>
              Nova filial
            </button>
          </header>

          <p className={panel.muted}>
            Informe as coordenadas da filial para validar o check-in do freelancer por geolocalização (raio configurável).
          </p>
          <table className={panel.table}>
            <thead><tr><th>Nome</th><th>Endereço</th><th>Telefone</th><th>Geolocalização</th><th>Raio</th><th>Ações</th></tr></thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.address}</td>
                  <td>{b.phone ?? "—"}</td>
                  <td>{b.latitude != null && b.longitude != null ? `${Number(b.latitude).toFixed(5)}, ${Number(b.longitude).toFixed(5)}` : <span className={panel.muted}>não definida</span>}</td>
                  <td>{b.geofenceRadius ?? 300} m</td>
                  <td>
                    <button className={panel.ghostBtn} onClick={() => { setForm({ id: b.id, name: b.name, address: b.address, phone: b.phone ?? "", latitude: b.latitude != null ? String(b.latitude) : "", longitude: b.longitude != null ? String(b.longitude) : "", geofenceRadius: String(b.geofenceRadius ?? 300) }); setError(null); setOpen(true); }}>Editar</button>
                    <button className={panel.secondaryBtn} onClick={() => remove(b.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
              {branches.length === 0 && <tr><td colSpan={6}>Nenhuma filial cadastrada.</td></tr>}
            </tbody>
          </table>
        </section>
      </main>

      {open && (
        <Modal title={form.id ? "Editar filial" : "Nova filial"} onClose={() => setOpen(false)}>
          <div className={panel.form}>
            <label>Nome</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} />
            <label>Endereço</label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} />
            <label>Telefone</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} />

            <label>Latitude</label>
            <input value={form.latitude} onChange={(e) => set("latitude", e.target.value)} placeholder="-23.550520" />
            <label>Longitude</label>
            <input value={form.longitude} onChange={(e) => set("longitude", e.target.value)} placeholder="-46.633308" />
            <button type="button" className={panel.ghostBtn} onClick={useMyLocation} disabled={geoBusy}>
              {geoBusy ? "Obtendo…" : "Usar minha localização atual"}
            </button>
            <label>Raio permitido para check-in (metros)</label>
            <input type="number" min={50} step={50} value={form.geofenceRadius} onChange={(e) => set("geofenceRadius", e.target.value)} />

            {error && <p className={panel.error}>{error}</p>}
            <button className={panel.primaryBtn} onClick={save}>Salvar</button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="supermarket">
      <BranchesPage />
    </RequireAuth>
  );
}
