
import { useState, useEffect } from "react";
import { Patient } from "@/types/appointment";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PatientAppointmentHistoryProps {
  patient: Patient;
}

interface PatientAppointment {
  date: string;
  appointment_type: string;
  Insurance_type: string; // API retorna com I maiúsculo
  status: string;
  start_time: string;
  end_time: string;
  dia_semana: string;
}

const PatientAppointmentHistory = ({ patient }: PatientAppointmentHistoryProps) => {
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatientAppointments = async () => {
      if (!patient?.id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/apointment_patient', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: patient.id })
        });

        if (!response.ok) {
          throw new Error(`Erro ao buscar agendamentos: ${response.status}`);
        }

        const data = await response.json();
        // Filtrar objetos vazios da resposta
        const validAppointments = Array.isArray(data) 
          ? data.filter(appointment => 
              appointment && 
              Object.keys(appointment).length > 0 && 
              appointment.date // Verificar se tem pelo menos a propriedade date
            ) 
          : [];
        setAppointments(validAppointments);
      } catch (err) {
        console.error('Erro ao buscar agendamentos do paciente:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientAppointments();
  }, [patient?.id]);

  if (loading) {
    return (
      <div className="text-center py-6 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        Carregando histórico de consultas...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-red-500">
        Erro ao carregar histórico: {error}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        Este paciente não possui atendimentos confirmados.
      </div>
    );
  }

  const formatTime = (timeString: string) => {
    // Converter de HH:mm:ss para HH:mm
    return timeString.substring(0, 5);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-purple-100 text-green-800';
      case 'confirmed':
        return 'bg-green-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAppointmentTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'presential':
        return 'Presencial';
      case 'online':
        return 'Online';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Histórico de Consultas</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200 rounded-lg">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Plano</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Início</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Término</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Dia da Semana</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {appointments.map((appointment, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {format(new Date(appointment.date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {getAppointmentTypeLabel(appointment.appointment_type)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {appointment.Insurance_type || 'Particular'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(appointment.start_time)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(appointment.end_time)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {appointment.dia_semana}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="text-sm text-gray-500 text-center">
        Total de {appointments.length} consulta(s) encontrada(s)
      </div>
    </div>
  );
};

export default PatientAppointmentHistory;
