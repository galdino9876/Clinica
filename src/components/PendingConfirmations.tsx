import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNextBusinessDay, formatDateForDisplay } from "@/utils/dateUtils";
import { Loader2, Send, Calendar, Clock, User } from "lucide-react";
import AppointmentsDashboard from "./AppointmentsDashboard";
import ReminderModal from "./ReminderModal";

// Interface para os dados da API
interface WebhookAppointment {
  id: number;
  patient_id: number;
  patient_name: string;
  psychologist_id: number;
  psychologist_name: string;
  room_id: number | null;
  date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  payment_method: "private" | "insurance";
  insurance_type: string | null;
  insurance_token: string | null;
  value: string;
  appointment_type: "presential" | "online";
  is_recurring: number;
  recurrence_type: string | null;
  created_at: string;
  updated_at: string | null;
}

const PendingConfirmations = () => {
  const [appointments, setAppointments] = useState<WebhookAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextBusinessDay, setNextBusinessDay] = useState<string>("");
  const [sendingReminder, setSendingReminder] = useState<boolean>(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calcular o próximo dia útil
      const targetDate = getNextBusinessDay();
      setNextBusinessDay(targetDate);
      
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/appointmens');
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados: ${response.status}`);
      }
      
      const data: WebhookAppointment[] = await response.json();
      
      // Filtrar apenas appointments do próximo dia útil com status pending
      const filteredAppointments = data.filter(
        (app) => app.status === "pending" && app.date === targetDate
      );
      
      setAppointments(filteredAppointments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = () => {
    if (appointments.length === 0) return;
    setIsReminderModalOpen(true);
  };

  const handleSendReminderMessages = async (messages: string[]) => {
    try {
      setSendingReminder(true);
      
      const payload = {
        date: nextBusinessDay,
        patients: appointments.map((app, index) => ({
          patient_id: app.patient_id,
          patient_name: app.patient_name,
          psychologist_id: app.psychologist_id,
          psychologist_name: app.psychologist_name,
          start_time: app.start_time,
          end_time: app.end_time,
          status: app.status,
          appointment_type: app.appointment_type,
          room_id: app.room_id,
          value: app.value,
          insurance_type: app.insurance_type,
          message: messages[index] || messages[0] // Usar mensagem específica ou primeira como fallback
        }))
      };

      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/lembrete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar lembrete: ${response.status}`);
      }

      alert(`Lembrete enviado com sucesso para ${formatDateForDisplay(nextBusinessDay)}!`);
    } catch (err) {
      console.error('Erro ao enviar lembrete:', err);
      alert('Erro ao enviar lembrete. Tente novamente.');
    } finally {
      setSendingReminder(false);
    }
  };

  const getStatusBadge = (status: "pending" | "confirmed" | "completed" | "cancelled") => {
    if (status === "pending") {
      return <Badge variant="destructive" className="bg-red-500">Pendente</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Confirmado</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando confirmações...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-md text-center">
        <p className="text-red-600">Erro: {error}</p>
        <Button onClick={fetchAppointments} className="mt-4">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex justify-between items-center">
        <div>
          {nextBusinessDay && (
            <p className="text-sm text-gray-600">
              Exibindo agendamentos pendentes para: <span className="font-medium">{formatDateForDisplay(nextBusinessDay)}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAppointments} variant="outline">
            Atualizar
          </Button>
          {appointments.length > 0 && (
            <Button 
              onClick={handleSendReminder}
              disabled={sendingReminder}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sendingReminder ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Lembrete
            </Button>
          )}
        </div>
      </div>
      
      {appointments.length === 0 ? (
        <div className="p-6 bg-gray-50 rounded-md text-center">
          <p className="text-gray-500">
            Não há consultas pendentes para {nextBusinessDay ? formatDateForDisplay(nextBusinessDay) : 'o próximo dia útil'}.
          </p>
        </div>
      ) : (
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {formatDateForDisplay(nextBusinessDay)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {/* Cabeçalho da tabela */}
            <div className="flex items-center px-4 py-2 bg-gray-100 text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2 flex-1">
                <User className="h-4 w-4" />
                <span>Nome do Paciente</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <User className="h-4 w-4" />
                <span>Psicólogo</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Clock className="h-4 w-4" />
                <span>Horário | Tipo - Sala</span>
              </div>
              <div className="flex items-center gap-2 w-24">
                <span>Status</span>
              </div>
            </div>
            
            <div className="space-y-1">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center px-4 py-2 bg-gray-50 rounded text-sm hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="font-medium truncate">{appointment.patient_name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-600 truncate">{appointment.psychologist_name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="font-medium">{appointment.start_time}</span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {appointment.appointment_type === "presential" ? "Presencial" : "Online"}
                      {appointment.room_id && ` - Sala ${appointment.room_id}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-center w-24">
                    {getStatusBadge(appointment.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard de Estatísticas */}
      <AppointmentsDashboard />

      {/* Modal de Lembretes */}
      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        appointments={appointments.map(app => ({
          id: app.id,
          patient_id: app.patient_id,
          patient_name: app.patient_name,
          psychologist_id: app.psychologist_id,
          psychologist_name: app.psychologist_name,
          start_time: app.start_time,
          end_time: app.end_time,
          date: app.date, // Usar a data real do appointment
          status: app.status,
          appointment_type: app.appointment_type,
          room_id: app.room_id,
          value: app.value,
          insurance_type: app.insurance_type
        }))}
        onSend={handleSendReminderMessages}
      />
    </div>
  );
};

export default PendingConfirmations;