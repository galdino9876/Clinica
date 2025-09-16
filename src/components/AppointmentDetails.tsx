
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Appointment } from "@/types/appointment";
import { useAuth } from "@/context/AuthContext";
import { useAppointments } from "@/context/AppointmentContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface AppointmentDetailsProps {
  appointment: Appointment;
  onClose: () => void;
}

const AppointmentDetails = ({ appointment, onClose }: AppointmentDetailsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { updateAppointmentStatus, deleteAppointment, findNextAvailableSlot, rescheduleAppointment, updateAppointment } = useAppointments();
  const [isReschedulingOpen, setIsReschedulingOpen] = useState(false);
  const [newDate, setNewDate] = useState<string>(appointment.date);
  const [newStartTime, setNewStartTime] = useState<string>(appointment.start_time || appointment.startTime || '');
  const [newEndTime, setNewEndTime] = useState<string>(appointment.end_time || appointment.endTime || '');
  const [insuranceToken, setInsuranceToken] = useState<string>(appointment.insurance_token || "");

  const formattedDate = format(new Date(appointment.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const isAdmin = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";
  const isPsychologist = user?.role === "psychologist";
  const canManage = isAdmin || isReceptionist || isPsychologist;
  const canEditToken = isAdmin || isReceptionist || isPsychologist;
  
  // Determine if we should show token input (for insurance appointments that are pending OR confirmed)
  const shouldShowTokenInput = appointment.payment_method === "insurance" && 
    (appointment.status === "pending" || appointment.status === "confirmed") && 
    canEditToken;

  const handleStatusChange = (status: "pending" | "confirmed" | "cancelled") => {
    updateAppointmentStatus(appointment.id, status);
  };

  const handleDelete = () => {
    if (window.confirm("Tem certeza que deseja cancelar este agendamento?")) {
      deleteAppointment(appointment.id);
      onClose();
    }
  };

  const handleOpenReschedule = () => {
    console.log('Abrindo modal de reagendamento...');
    console.log('Dados do agendamento:', appointment);
    
    // Define os valores atuais como padrão
    setNewDate(appointment.date);
    setNewStartTime(appointment.start_time || appointment.startTime || '');
    setNewEndTime(appointment.end_time || appointment.endTime || '');
    
    console.log('Valores iniciais:', {
      newDate: appointment.date,
      newStartTime: appointment.start_time || appointment.startTime || '',
      newEndTime: appointment.end_time || appointment.endTime || ''
    });
    
    // Encontra o próximo horário disponível para o psicólogo
    const nextSlot = findNextAvailableSlot(appointment.psychologist_id);
    
    if (nextSlot) {
      setNewDate(format(nextSlot.date, 'yyyy-MM-dd'));
      setNewStartTime(nextSlot.startTime);
      setNewEndTime(nextSlot.endTime);
    }
    
    setIsReschedulingOpen(true);
  };

  const handleReschedule = () => {
    // Validação do campo obrigatório
    if (!newDate) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma nova data.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Reagendando com dados:', {
      id: appointment.id,
      newDate,
      newStartTime,
      newEndTime
    });
    
    rescheduleAppointment(appointment.id, newDate, newStartTime, newEndTime);
    setIsReschedulingOpen(false);
  };

  const handleSaveToken = () => {
    const updatedAppointment = {
      ...appointment,
      insuranceToken
    };
    updateAppointment(updatedAppointment);
    
    toast({
      title: "Token salvo",
      description: "O token do convênio foi salvo com sucesso.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "text-green-700 bg-green-100";
      case "pending":
        return "text-yellow-700 bg-yellow-100";
      case "cancelled":
        return "text-red-700 bg-red-100";
      case "completed":
        return "text-blue-700 bg-blue-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmado";
      case "pending":
        return "Pendente";
      case "cancelled":
        return "Cancelado";
      case "completed":
        return "Concluído";
      default:
        return status;
    }
  };

  // Log for debugging
  console.log("Appointment details:", {
    paymentMethod: appointment.payment_method,
    status: appointment.status,
    canEditToken,
    shouldShowTokenInput
  });

  return (
    <div className="space-y-6">
      {/* Header com Status */}
      <div className="text-center pb-6 border-b border-gray-100">
        <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(appointment.status)}`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${appointment.status === 'confirmed' ? 'bg-green-500' : appointment.status === 'pending' ? 'bg-yellow-500' : appointment.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
          {getStatusText(appointment.status)}
        </div>
      </div>

      {/* Informações Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda */}
        <div className="space-y-5">
          {/* Paciente */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Paciente</p>
                                 <p className="text-lg font-bold text-gray-900">{(appointment as any).patient?.name || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Data e Horário */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v16a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-emerald-600 uppercase tracking-wide font-semibold">Data</p>
                <p className="text-lg font-bold text-gray-900">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-teal-600 uppercase tracking-wide font-semibold">Horário</p>
                <p className="text-lg font-bold text-gray-900">{appointment.startTime} - {appointment.endTime}</p>
              </div>
            </div>
          </div>

          {/* Psicólogo */}
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              
            </div>
          </div>
        </div>

        {/* Coluna Direita */}
        <div className="space-y-5">
          {/* Sala */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-orange-600 uppercase tracking-wide font-semibold">Sala</p>
                <p className="text-lg font-bold text-gray-900">{appointment.roomName}</p>
              </div>
            </div>
          </div>

          {/* Método de Pagamento */}
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-4 rounded-xl border border-rose-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-rose-600 uppercase tracking-wide font-semibold">Método de Pagamento</p>
                <p className="text-lg font-bold text-gray-900">
                  {appointment.paymentMethod === "private" ? "Particular" : `Convênio (${appointment.insuranceType})`}
                </p>
              </div>
            </div>
          </div>

          {/* Valor */}
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-emerald-600 uppercase tracking-wide font-semibold">Valor</p>
                <p className="text-2xl font-bold text-emerald-600">R$ {appointment.value.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Token input for insurance plans */}
      {shouldShowTokenInput && (
        <div className="pt-4 border-t border-gray-200">
          <div className="space-y-3">
            <Label htmlFor="insuranceToken">Token do Plano de Saúde</Label>
            <div className="flex space-x-2">
              <Input
                id="insuranceToken"
                value={insuranceToken}
                onChange={(e) => setInsuranceToken(e.target.value)}
                placeholder="Digite o código de autorização"
                className="flex-1"
              />
              <Button onClick={handleSaveToken} className="whitespace-nowrap">
                Salvar Token
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              O token é importante para controle e rastreamento dos atendimentos realizados via convênio.
            </p>
          </div>
        </div>
      )}

      {canManage && (
        <div className="pt-4 border-t border-gray-200">
          <div className="space-y-3">
            <Label htmlFor="status">Atualizar Status</Label>
            <Select
              defaultValue={appointment.status}
              onValueChange={(value) => handleStatusChange(value as any)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        {canManage && (
          <>
            <Button variant="outline" onClick={handleOpenReschedule}>
              Reagendar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Cancelar Agendamento
            </Button>
          </>
        )}
        <Button onClick={onClose}>Fechar</Button>
      </div>

      {/* Modal de reagendamento */}
      <Dialog open={isReschedulingOpen} onOpenChange={setIsReschedulingOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reagendar Agendamento</DialogTitle>
            <p className="text-sm text-gray-600">Selecione a nova data para este agendamento</p>
          </DialogHeader>
          <div className="space-y-6">
            {/* Informações do agendamento atual */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700">Paciente: </span>
                <span className="text-sm text-gray-900">{(appointment as any).patient?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Data atual: </span>
                <span className="text-sm text-gray-900">{format(new Date(appointment.date), "dd/MM/yyyy")}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Horário: </span>
                <span className="text-sm text-gray-900">{appointment.startTime} - {appointment.endTime}</span>
              </div>
            </div>

            {/* Campos para reagendamento */}
            <div className="space-y-4">
              <div>
                <label htmlFor="newDate" className="block text-sm font-medium text-gray-700 mb-2">Nova data:</label>
                <Input
                  id="newDate"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsReschedulingOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleReschedule}>
                Confirmar Reagendamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentDetails;
