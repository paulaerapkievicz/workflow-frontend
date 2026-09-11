import { useState } from "react";
import axios from "axios";
import Modal from "@/src/components/common/Modal";
import panel from "@/styles/panel.module.scss";
import { reassignJob, Job } from "@/src/services/jobService";
import { AgencyFreelancer } from "@/src/services/agencyService";

interface ReassignModalProps {
  job: Job;
  freelancers: AgencyFreelancer[];
  onClose: () => void;
  /** Chamado após a troca ser confirmada com sucesso (recarregar a lista). */
  onReassigned: () => void | Promise<void>;
}

/** Troca o colaborador alocado numa vaga aceita/em andamento — usada em `/agency/orders` e no dashboard. */
export default function ReassignModal({ job, freelancers, onClose, onReassigned }: ReassignModalProps) {
  const [freelancerId, setFreelancerId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!freelancerId) return;
    setError(null);
    setBusy(true);
    try {
      await reassignJob(job.id, freelancerId, reason || undefined);
      await onReassigned();
      onClose();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? "Erro ao trocar colaborador." : "Erro ao trocar colaborador.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Trocar colaborador — ${job.title}`} onClose={onClose}>
      <div className={panel.form}>
        <p className={panel.muted}>
          Colaborador atual: <strong>{job.assignedFreelancer?.name ?? "—"}</strong>.
          {" "}Se ele já tiver trabalhado parte do turno, essas horas ficam registradas pra ele e o
          restante vira uma vaga nova já atribuída ao novo colaborador escolhido.
        </p>
        <label>Novo colaborador</label>
        <select value={freelancerId} onChange={(e) => setFreelancerId(e.target.value)}>
          <option value="">Selecione…</option>
          {freelancers
            .filter((f) => f.id !== job.assignedFreelancer?.id)
            .map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <label>Motivo (opcional)</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <p className={panel.error}>{error}</p>}
        <button className={panel.primaryBtn} onClick={confirm} disabled={!freelancerId || busy}>
          Trocar
        </button>
      </div>
    </Modal>
  );
}
