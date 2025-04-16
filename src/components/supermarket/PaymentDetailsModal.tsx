interface Payment {
  id: number;
  agency: string;
  freelancer: string;
  jobTitle: string;
  amount: number;
  status: 'Pago' | 'Pendente';
  date: string;
}

interface PaymentDetailsModalProps {
  payment: Payment;
  onClose: () => void;
}

export default function PaymentDetailsModal({ payment, onClose }: PaymentDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#1e293b] text-black dark:text-white p-6 rounded-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Detalhes do Pagamento</h2>
        <ul className="space-y-2 text-sm">
          <li><strong>Agência:</strong> {payment.agency}</li>
          <li><strong>Freelancer:</strong> {payment.freelancer}</li>
          <li><strong>Serviço:</strong> {payment.jobTitle}</li>
          <li><strong>Valor:</strong> R$ {payment.amount.toFixed(2)}</li>
          <li><strong>Status:</strong> {payment.status}</li>
          <li><strong>Data:</strong> {payment.date}</li>
        </ul>
        <button
          className="mt-6 bg-[#4e6cff] text-white px-4 py-2 rounded hover:bg-[#2d4fe0] transition w-full"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
