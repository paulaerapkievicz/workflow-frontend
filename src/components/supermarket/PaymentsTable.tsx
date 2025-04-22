import { useMemo, useState } from 'react';
import { Payment } from "@/src/types";
import PaymentDetailsModal from "./PaymentDetailsModal";

interface Props {
  payments: Payment[];
}

export default function PaymentsTable({ payments }: Props) {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [dateFilter, setDateFilter] = useState('');

  const filteredPayments = useMemo(() => {
    return payments.filter(({ status, date }) => {
      const statusMatch = statusFilter === 'Todos' || status === statusFilter;
      const dateMatch = !dateFilter || date.startsWith(dateFilter);
      return statusMatch && dateMatch;
    });
  }, [payments, statusFilter, dateFilter]);

  return (
    <div>
      <div className="flex gap-4 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="Todos">Todos</option>
          <option value="Pago">Pago</option>
          <option value="Pendente">Pendente</option>
          <option value="Cancelado">Cancelado</option>
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
      </div>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th>Serviço</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Data</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {filteredPayments.map(payment => (
            <tr key={payment.id}>
              <td>{payment.jobTitle}</td>
              <td>R$ {payment.amount.toFixed(2)}</td>
              <td>{payment.status}</td>
              <td>{new Date(payment.date).toLocaleDateString()}</td>
              <td>
                <button className="text-indigo-600" onClick={() => setSelectedPayment(payment)}>
                  Detalhes
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedPayment && (
        <PaymentDetailsModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
      )}
    </div>
  );
}
