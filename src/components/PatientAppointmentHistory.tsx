
import { useAppointments } from "@/context/AppointmentContext";
import { Patient } from "@/types/appointment";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PatientAppointmentHistoryProps {
  patient: Patient;
}

const PatientAppointmentHistory = ({ patient }: PatientAppointmentHistoryProps) => {
  const { appointments } = useAppointments();
  
  // Filter only confirmed appointments for this patient
  const confirmedAppointments = appointments.filter(
    app => app.patient.id === patient.id && app.status === "confirmed"
  ).sort((a, b) => {
    // Sort by date (newest first) and then by time
    const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateComparison !== 0) return dateComparison;
    return b.startTime.localeCompare(a.startTime);
  });

  if (confirmedAppointments.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        Este paciente não possui atendimentos confirmados.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Histórico de Atendimentos Confirmados</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horário</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Psicólogo</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {confirmedAppointments.map((appointment) => (
              <tr key={appointment.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap">
                  {format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR })}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {appointment.startTime} - {appointment.endTime}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {appointment.psychologistName}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  R$ {appointment.value.toFixed(2)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {appointment.paymentMethod === "private" ? "Particular" : `Convênio (${appointment.insuranceType})`}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {appointment.insuranceToken || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PatientAppointmentHistory;
