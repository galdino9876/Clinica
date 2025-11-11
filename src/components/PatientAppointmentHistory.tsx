
import { useState, useEffect } from "react";
import { Patient } from "@/types/appointment";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PatientAppointmentHistoryProps {
  patient: Patient;
}

interface PatientAppointment {
  id?: number | string;
  appointment_id?: number | string;
  id_appointment?: number | string;
  date: string;
  appointment_type: string;
  Insurance_type: string; // API retorna com I maiúsculo
  status: string;
  start_time: string;
  end_time: string;
  dia_semana: string;
  [key: string]: any; // Permitir outros campos que possam vir da API
}

const PatientAppointmentHistory = ({ patient }: PatientAppointmentHistoryProps) => {
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<number | string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [pendingCancelId, setPendingCancelId] = useState<number | string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPatientAppointments = async (isRefresh = false) => {
    if (!patient?.id) return;
    
    if (!isRefresh) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
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
      
      // Log para debug - verificar estrutura dos dados
      if (validAppointments.length > 0) {
        console.log('Estrutura do primeiro agendamento:', validAppointments[0]);
        console.log('Todos os campos disponíveis:', Object.keys(validAppointments[0]));
        console.log('Valores de todos os campos:', validAppointments[0]);
      }
      
      setAppointments(validAppointments);
    } catch (err) {
      console.error('Erro ao buscar agendamentos do paciente:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPatientAppointments();
  }, [patient?.id]);

  if (loading && !refreshing) {
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

  // Função auxiliar para extrair o ID do agendamento
  const getAppointmentId = (appointment: PatientAppointment, index: number): number | string | null => {
    // Tentar diferentes variações de nome de campo
    const possibleIds = [
      appointment.id,
      appointment.appointment_id,
      appointment.id_appointment,
      (appointment as any).ID,
      (appointment as any).appointmentId,
      (appointment as any).appointment_id,
      (appointment as any).id_appointment,
      (appointment as any).appointmentId,
      (appointment as any).appointment_ID,
      (appointment as any).APPOINTMENT_ID,
    ];
    
    // Encontrar o primeiro ID válido (não null, não undefined, não 0, não string vazia)
    for (const id of possibleIds) {
      if (id !== null && id !== undefined && id !== '' && id !== 0 && id !== '0') {
        return id;
      }
    }
    
    // Se não encontrou, retornar null em vez do index
    console.warn('ID do agendamento não encontrado. Estrutura:', appointment);
    return null;
  };

  const handleCancelClick = (appointmentId: number | string | null) => {
    if (appointmentId === null || appointmentId === undefined || appointmentId === '' || appointmentId === 0 || appointmentId === '0') {
      toast.error('ID do agendamento não encontrado. Verifique os dados do agendamento.');
      console.error('Tentativa de cancelar agendamento sem ID válido:', appointmentId);
      return;
    }
    console.log('ID do agendamento a ser cancelado:', appointmentId);
    setPendingCancelId(appointmentId);
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async () => {
    if (!pendingCancelId || pendingCancelId === 0 || pendingCancelId === '0' || pendingCancelId === '') {
      toast.error('ID do agendamento inválido. Não é possível cancelar.');
      setShowCancelDialog(false);
      setPendingCancelId(null);
      return;
    }

    try {
      setCancelingId(pendingCancelId);
      setShowCancelDialog(false);
      
      const requestBody = {
        action: 'canceled',
        id: pendingCancelId
      };
      
      console.log('Enviando requisição de cancelamento:', requestBody);
      
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/appoiments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Erro ao cancelar agendamento: ${response.status}`);
      }

      // Aguardar a resposta da API
      const responseData = await response.json().catch(() => ({}));
      console.log('Resposta da API de cancelamento:', responseData);

      toast.success('Agendamento cancelado com sucesso!');
      
      // Fazer refresh dos dados após um breve delay para garantir que a API processou
      setTimeout(async () => {
        await fetchPatientAppointments(true);
        toast.info('Dados atualizados');
      }, 500);
      
    } catch (err) {
      console.error('Erro ao cancelar agendamento:', err);
      toast.error('Erro ao cancelar agendamento. Tente novamente.');
    } finally {
      setCancelingId(null);
      setPendingCancelId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Histórico de Consultas</h3>
        {refreshing && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Atualizando...
          </div>
        )}
      </div>
      
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Ações</th>
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
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {(() => {
                    const appointmentId = getAppointmentId(appointment, index);
                    const hasValidId = appointmentId !== null && appointmentId !== undefined && appointmentId !== '' && appointmentId !== 0 && appointmentId !== '0';
                    
                    return (
                      <button
                        onClick={() => {
                          if (!hasValidId) {
                            toast.error('ID do agendamento não encontrado. Verifique os dados.');
                            console.error('Agendamento sem ID válido:', appointment);
                            return;
                          }
                          handleCancelClick(appointmentId);
                        }}
                        disabled={
                          !hasValidId ||
                          cancelingId === appointmentId || 
                          appointment.status === 'canceled'
                        }
                        className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors p-1"
                        title={hasValidId ? "Cancelar agendamento" : "ID do agendamento não encontrado"}
                      >
                        {cancelingId === appointmentId ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="text-sm text-gray-500 text-center">
        Total de {appointments.length} consulta(s) encontrada(s)
      </div>

      {/* Modal de confirmação de cancelamento */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowCancelDialog(false);
                setPendingCancelId(null);
              }}
              disabled={cancelingId !== null}
            >
              Não
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelingId !== null}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelingId !== null ? 'Cancelando...' : 'Sim, cancelar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PatientAppointmentHistory;
