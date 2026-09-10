import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import axios from "axios";
import Sidebar from "@/src/components/agency/Sidebar";
import RequireAuth from "@/src/components/RequireAuth";
import Modal from "@/src/components/common/Modal";
import RichTextEditor from "@/src/components/RichTextEditor";
import ContractDocument from "@/src/components/contract/ContractDocument";
import panel from "@/styles/panel.module.scss";
import {
  listContractTemplates, createContractTemplate, updateContractTemplate,
  activateContractTemplate, deleteContractTemplate, previewContractTemplate,
  listContractSignatures, agencySignatureDocumentUrl, openProtectedPdf,
  ContractTemplate, MergeToken, ContractSignature,
} from "@/src/services/contractService";
import { getAllFreelancers } from "@/src/services/freelancerService";

function errText(e: unknown) {
  return axios.isAxiosError(e) ? e.response?.data?.message ?? "Erro." : "Erro.";
}
const fmt = (d: string) => new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function ContractsPage() {
  const [tab, setTab] = useState<"modelo" | "assinados">("modelo");
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [tokens, setTokens] = useState<MergeToken[]>([]);
  const [signatures, setSignatures] = useState<ContractSignature[]>([]);
  const [freelancers, setFreelancers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [editing, setEditing] = useState<ContractTemplate | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [savingTpl, setSavingTpl] = useState(false);

  const [preview, setPreview] = useState<{ title: string; html: string; missing: string[] } | null>(null);
  const [previewFreelancer, setPreviewFreelancer] = useState("");
  const [previewFor, setPreviewFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tpl, sigs, frs] = await Promise.all([
        listContractTemplates(),
        listContractSignatures().catch(() => [] as ContractSignature[]),
        getAllFreelancers().catch(() => []),
      ]);
      setTemplates(tpl.templates);
      setTokens(tpl.tokens);
      setSignatures(sigs);
      setFreelancers(frs.map((f) => ({ id: f.id, name: f.name })));
    } catch {
      setMsg({ type: "err", text: "Não foi possível carregar os contratos." });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openEditor = (tpl: ContractTemplate | "new") => {
    setEditing(tpl);
    setTitle(tpl === "new" ? "" : tpl.title);
    setBody(tpl === "new" ? "" : tpl.bodyHtml);
    setMsg(null);
  };

  const saveTemplate = async () => {
    setSavingTpl(true);
    setMsg(null);
    try {
      if (editing === "new") await createContractTemplate({ title, bodyHtml: body });
      else if (editing) await updateContractTemplate(editing.id, { title, bodyHtml: body });
      setEditing(null);
      await load();
      setMsg({ type: "ok", text: "Modelo salvo." });
    } catch (e) {
      setMsg({ type: "err", text: errText(e) });
    } finally {
      setSavingTpl(false);
    }
  };

  const act = async (fn: () => Promise<unknown>, okText: string) => {
    setMsg(null);
    try { await fn(); await load(); setMsg({ type: "ok", text: okText }); }
    catch (e) { setMsg({ type: "err", text: errText(e) }); }
  };

  const runPreview = async (id: string) => {
    setPreviewFor(id);
    try {
      setPreview(await previewContractTemplate(id, previewFreelancer || undefined));
    } catch (e) {
      setMsg({ type: "err", text: errText(e) });
      setPreviewFor(null);
    }
  };

  return (
    <>
      <Head><title>Contratos | Agência</title></Head>
      <main className={panel.container}>
        <Sidebar />
        <section className={panel.content}>
          <header className={panel.header}><h1>Contratos</h1></header>
          <p className={panel.muted}>
            Monte o modelo de contrato da sua agência. Depois do onboarding aprovado, o colaborador
            assina eletronicamente e o sistema preenche os dados do cadastro dele.
          </p>

          <div className={panel.roleTabs} style={{ marginBottom: "1rem" }}>
            <button className={tab === "modelo" ? panel.primaryBtn : panel.ghostBtn} onClick={() => setTab("modelo")}>
              Modelos
            </button>{" "}
            <button className={tab === "assinados" ? panel.primaryBtn : panel.ghostBtn} onClick={() => setTab("assinados")}>
              Assinados ({signatures.length})
            </button>
          </div>

          {msg && <p className={msg.type === "ok" ? panel.success : panel.error}>{msg.text}</p>}
          {loading && <p>Carregando…</p>}

          {!loading && tab === "modelo" && (
            <>
              <button className={panel.primaryBtn} onClick={() => openEditor("new")}>+ Novo modelo</button>
              <div className={panel.tableWrap} style={{ marginTop: "1rem" }}>
                <table className={panel.table}>
                  <thead><tr><th>Título</th><th>Status</th><th>Atualizado</th><th>Ações</th></tr></thead>
                  <tbody>
                    {templates.length === 0 ? (
                      <tr><td colSpan={4} className={panel.muted}>Nenhum modelo ainda.</td></tr>
                    ) : templates.map((t) => (
                      <tr key={t.id}>
                        <td><strong>{t.title}</strong></td>
                        <td>
                          <span className={`${panel.badge} ${t.active ? panel.badgeApproved : panel.badgePending}`}>
                            {t.active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td>{fmt(t.updatedAt)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className={panel.ghostBtn} onClick={() => openEditor(t)}>Editar</button>{" "}
                          <button className={panel.ghostBtn} onClick={() => runPreview(t.id)}>Pré-visualizar</button>{" "}
                          {!t.active && (
                            <button className={panel.secondaryBtn}
                              onClick={() => act(() => activateContractTemplate(t.id), "Modelo ativado.")}>
                              Tornar ativo
                            </button>
                          )}{" "}
                          <button className={panel.secondaryBtn}
                            onClick={() => { if (confirm(`Excluir o modelo "${t.title}"?`)) act(() => deleteContractTemplate(t.id), "Modelo excluído."); }}>
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={panel.card} style={{ marginTop: "1rem", maxWidth: 420 }}>
                <strong>Pré-visualizar com dados de um colaborador</strong>
                <p className={panel.muted}>Sem escolher, a prévia mostra os campos entre colchetes.</p>
                <select value={previewFreelancer} onChange={(e) => setPreviewFreelancer(e.target.value)}
                  style={{ padding: "0.4rem", borderRadius: 8, border: "1px solid var(--border)", width: "100%" }}>
                  <option value="">— dados de exemplo —</option>
                  {freelancers.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </>
          )}

          {!loading && tab === "assinados" && (
            <div className={panel.tableWrap}>
              <table className={panel.table}>
                <thead><tr><th>Colaborador</th><th>Modelo</th><th>Assinado em</th><th>IP</th><th>Verificação (hash)</th><th></th></tr></thead>
                <tbody>
                  {signatures.length === 0 ? (
                    <tr><td colSpan={6} className={panel.muted}>Nenhum contrato assinado ainda.</td></tr>
                  ) : signatures.map((s) => (
                    <tr key={s.id}>
                      <td>{s.freelancer?.name ?? s.signerName}<br /><span className={panel.muted}>CPF {s.signerCpf}</span></td>
                      <td>{s.templateTitle}</td>
                      <td>{fmt(s.signedAt)}</td>
                      <td>{s.ipAddress ?? "—"}</td>
                      <td><code style={{ fontSize: "0.8rem" }}>{s.contentHash.slice(0, 16)}…</code></td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className={panel.ghostBtn} onClick={() => openProtectedPdf(agencySignatureDocumentUrl(s.id))}>
                          Ver PDF
                        </button>{" "}
                        <a className={panel.linkBtn} href={`/contratos/verificar/${s.id}`} target="_blank" rel="noreferrer">
                          Verificar
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {editing && (
        <Modal
          title={editing === "new" ? "Novo modelo de contrato" : `Editar: ${editing.title}`}
          onClose={() => setEditing(null)}
        >
          <div className={panel.form}>
            <label className={panel.filterField}>
              <span>Título do modelo</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contrato de Prestação de Serviços" />
            </label>
            <span className={panel.muted}>
              Use <code>{"{{campo}}"}</code> para os dados do colaborador — insira pelo seletor abaixo.
            </span>
            <RichTextEditor value={body} onChange={setBody} tokens={tokens} placeholder="Escreva o contrato…" />
            <button className={panel.primaryBtn} onClick={saveTemplate} disabled={savingTpl || !title.trim()}>
              {savingTpl ? "Salvando…" : "Salvar modelo"}
            </button>
          </div>
        </Modal>
      )}

      {previewFor && preview && (
        <Modal title={`Prévia — ${preview.title}`} onClose={() => { setPreviewFor(null); setPreview(null); }}>
          {preview.missing.length > 0 && (
            <p className={panel.error}>Campos sem valor: {preview.missing.join(", ")}</p>
          )}
          <ContractDocument html={preview.html} />
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return (
    <RequireAuth role="agency">
      <ContractsPage />
    </RequireAuth>
  );
}
