import { useMemo, useState } from 'react';
import PaymentDetailsModal from './PaymentDetailsModal';

interface Payment {
  id: number;
  agency: string;
  freelancer: string;
  jobTitle: string;
  amount: number;
  status: 'Pago' | 'Pendente';
  date: string; // formato 'YYYY-MM-DD'
}

interface PaymentsTableProps {
  payments: Payment[];
}

export default function PaymentsTable({ payments }: PaymentsTableProps) {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [dateFilter, setDateFilter] = useState<string>('');

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const statusMatch = statusFilter === 'Todos' || payment.status === statusFilter;
      const dateMatch = !dateFilter || payment.date === dateFilter;
      return statusMatch && dateMatch;
    });
  }, [payments, statusFilter, dateFilter]);

  const totalAmount = useMemo(() => {
    return filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [filteredPayments]);

  return (
    <>
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-sm mb-1">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border p-2 rounded bg-white dark:bg-[#1e293b] dark:text-white"
          >
            <option value="Todos">Todos</option>
            <option value="Pago">Pago</option>
            <option value="Pendente">Pendente</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Data:</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border p-2 rounded bg-white dark:bg-[#1e293b] dark:text-white"
          />
        </div>
      </div>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="p-3 border-b">Agência</th>
            <th className="p-3 border-b">Freelancer</th>
            <th className="p-3 border-b">Serviço</th>
            <th className="p-3 border-b">Valor</th>
            <th className="p-3 border-b">Status</th>
            <th className="p-3 border-b">Data</th>
            <th className="p-3 border-b"></th>
          </tr>
        </thead>
        <tbody>
          {filteredPayments.map(payment => (
            <tr key={payment.id} className="hover:bg-[rgba(78,108,255,0.05)] transition">
              <td className="p-3">{payment.agency}</td>
              <td className="p-3">{payment.freelancer}</td>
              <td className="p-3">{payment.jobTitle}</td>
              <td className="p-3">R$ {payment.amount.toFixed(2)}</td>
              <td className={`p-3 ${payment.status === 'Pago' ? 'text-green-500' : 'text-yellow-500'}`}>
                {payment.status}
              </td>
              <td className="p-3">{payment.date}</td>
              <td className="p-3">
                <button
                  className="px-3 py-1 rounded bg-[#4e6cff] text-white text-sm hover:bg-[#2d4fe0] transition"
                  onClick={() => setSelectedPayment(payment)}
                >
                  Detalhes
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold border-t">
            <td className="p-3" colSpan={3}>Total:</td>
            <td className="p-3">R$ {totalAmount.toFixed(2)}</td>
            <td colSpan={3}></td>
          </tr>
        </tfoot>
      </table>

      {selectedPayment && (
        <PaymentDetailsModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </>
  );
}
