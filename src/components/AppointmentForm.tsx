import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Patient, AppointmentStatus } from "@/types/appointment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PatientForm from "./PatientForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PsychologistAvailabilityDatePicker from "./PsychologistAvailabilityDatePicker";
import { useToast } from "@/hooks/use-toast";

interface AppointmentFormProps {
  selectedDate: Date;
  onClose: () => void;
  existingAppointment?: any; // Para edição de agendamentos existentes
  onPsychologistSelected?: (psychologistId: string) => void;
  lockDate?: boolean; // New prop to lock the date field
  independentMode?: boolean; // New prop to indicate independent mode (not calendar-triggered)
}

const AppointmentForm = ({ 
  selectedDate, 
  onClose, 
  existingAppointment,
  onPsychologistSelected,
  lockDate = false, // Default to false (date is changeable)
  independentMode = false // Default to false (calendar-triggered)
}: AppointmentFormProps) => {
  const { addAppointment, updateAppointment, patients, rooms, findNextAvailableSlot, appointments } = useAppointments();
  const { getPsychologists, users } = useAuth();
  const { toast } = useToast();
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>(existingAppointment?.patient.id || "");
  const [psychologistId, setPsychologistId] = useState(existingAppointment?.psychologistId || "");
  const [roomId, setRoomId] = useState(existingAppointment?.roomId || "");
  const [date, setDate] = useState<Date>(selectedDate);
  const [startTime, setStartTime] = useState(existingAppointment?.startTime || "09:00");
  const [endTime, setEndTime] = useState(existingAppointment?.endTime || "10:00");
  const [paymentMethod, setPaymentMethod] = useState(existingAppointment?.paymentMethod || "private");
  const [insuranceType, setInsuranceType] = useState(existingAppointment?.insuranceType || null);
  const [value, setValue] = useState(existingAppointment?.value?.toString() || "200");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [nextAvailableSlot, setNextAvailableSlot] = useState<{ date: Date, startTime: string, endTime: string } | null>(null);
  const [appointmentType, setAppointmentType] = useState(existingAppointment?.appointmentType || "presential");
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [availablePsychologists, setAvailablePsychologists] = useState<any[]>([]);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  // Update date when selectedDate changes (only if not in independent mode)
  useEffect(() => {
    if (!independentMode) {
      setDate(selectedDate);
    }
  }, [selectedDate, independentMode]);
  
  // Obter a lista de psicólogos do sistema
  const psychologists = getPsychologists();

  // Determinar o dia da semana da data selecionada (0-6, onde 0 é domingo)
  const dayOfWeek = date.getDay();

  // Find available psychologists for the selected date
  useEffect(() => {
    if (date) {
      const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      const available = psychologists.filter(psychologist => 
        psychologist.workingHours?.some(wh => wh.dayOfWeek === dayOfWeek)
      );
      setAvailablePsychologists(available);
      
      // If previously selected psychologist is not available for this date, clear selection
      if (psychologistId) {
        const isAvailable = isPsychologistAvailable(psychologistId);
        if (!isAvailable) {
          // Clear psychologist selection if not available
          setPsychologistId("");
          
          // Show toast notification
          const psychologist = psychologists.find(p => p.id === psychologistId);
          if (psychologist) {
            toast({
              title: "Psicólogo indisponível",
              description: `${psychologist.name} não atende na data ${format(date, "dd/MM/yyyy")}. Selecione um psicólogo disponível.`,
              variant: "destructive",
            });
          }
        }
      }
    }
  }, [date, psychologists, psychologistId, toast]);

  // Handle psychologist selection for calendar highlighting
  const handlePsychologistChange = (value: string) => {
    setPsychologistId(value);
    
    // Check if the selected psychologist is available on the selected date
    const psychologist = psychologists.find(p => p.id === value);
    if (psychologist) {
      // No independent mode, we need to find the next available slot regardless of current date
      if (independentMode) {
        // In independent mode, we always look for the next available slot
        const slot = findNextAvailableSlot(value);
        if (slot) {
          // Set date to the suggested slot date
          setDate(slot.date);
          setStartTime(slot.startTime);
          setEndTime(slot.endTime);
          
          toast({
            title: "Próxima disponibilidade encontrada",
            description: `Sugerindo ${format(slot.date, "dd/MM/yyyy")} às ${slot.startTime} para consulta com ${psychologist.name}.`,
          });
        }
      } else {
        // In calendar mode, we check if psychologist is available on selected date
        const isAvailable = isPsychologistAvailable(value);
        
        if (!isAvailable) {
          toast({
            title: "Psicólogo indisponível",
            description: `${psychologist.name} não atende neste dia da semana. Sugerimos escolher outra data ou outro psicólogo.`,
            variant: "destructive",
          });
        } else if (!lockDate) {
          // If psychologist is available and date is not locked, find next available slot on the current date
          const slot = findNextAvailableSlot(value);
          if (slot) {
            setDate(slot.date);
            setStartTime(slot.startTime);
            setEndTime(slot.endTime);
          }
        }
      }
    }
    
    if (onPsychologistSelected) {
      onPsychologistSelected(value);
    }
  };

  // Modified effect to consider the independentMode prop when finding available slots
  useEffect(() => {
    if (psychologistId) {
      // In independent mode, always find and suggest the next available slot
      if (independentMode) {
        const slot = findNextAvailableSlot(psychologistId);
        setNextAvailableSlot(slot);
        
        // Se houver um slot disponível, sugerimos automaticamente
        if (slot) {
          setDate(slot.date);
          setStartTime(slot.startTime);
          setEndTime(slot.endTime);
        }
      } else {
        // In calendar mode, respect the lockDate prop
        if (!lockDate) {
          const slot = findNextAvailableSlot(psychologistId);
          setNextAvailableSlot(slot);
          
          // Se for um novo agendamento e houver um slot disponível, sugerimos automaticamente
          if (slot && !existingAppointment) {
            setDate(slot.date);
            setStartTime(slot.startTime);
            setEndTime(slot.endTime);
          }
        } else {
          // When date is locked, we don't need to find the next available slot
          // We just need to check if there are available times on the selected date
          setNextAvailableSlot(null);
        }
      }
    } else {
      setNextAvailableSlot(null);
    }
  }, [psychologistId, findNextAvailableSlot, existingAppointment, lockDate, independentMode]);

  // Função para verificar se um horário já está ocupado pelo psicólogo
  const isTimeSlotOccupied = (psychologistId: string, date: Date, startTime: string, endTime: string) => {
    // Correção: Antes de verificar conflitos, certifique-se de que os parâmetros são válidos
    if (!psychologistId || !date || !startTime || !endTime) {
      return false;
    }
    
    const dateString = format(date, 'yyyy-MM-dd');
    
    // Ignorar o próprio agendamento se estiver editando
    const existingAppointments = appointments.filter(app => 
      app.psychologistId === psychologistId && 
      app.date === dateString && 
      (existingAppointment ? app.id !== existingAppointment.id : true)
    );

    // Verifica se há sobreposição com algum agendamento existente
    return existingAppointments.some(appointment => {
      const appStartMinutes = timeToMinutes(appointment.startTime);
      const appEndMinutes = timeToMinutes(appointment.endTime);
      const newStartMinutes = timeToMinutes(startTime);
      const newEndMinutes = timeToMinutes(endTime);

      // Verifica se há sobreposição
      return (
        (newStartMinutes >= appStartMinutes && newStartMinutes < appEndMinutes) || // Novo início dentro de existente
        (newEndMinutes > appStartMinutes && newEndMinutes <= appEndMinutes) || // Novo fim dentro de existente
        (newStartMinutes <= appStartMinutes && newEndMinutes >= appEndMinutes) // Novo engloba existente
      );
    });
  };

  // Helper function to convert time strings to minutes for comparison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Função para calcular horários disponíveis com base no psicólogo selecionado
  useEffect(() => {
    if (!psychologistId) {
      setAvailableTimes([]);
      return;
    }

    const psychologist = psychologists.find(p => p.id === psychologistId);
    if (!psychologist || !psychologist.workingHours) {
      setAvailableTimes(generateDefaultTimeOptions());
      return;
    }

    // Procura pela disponibilidade no dia da semana
    const availability = psychologist.workingHours.find(
      wh => wh.dayOfWeek === dayOfWeek
    );

    if (!availability) {
      setAvailableTimes([]);
      setStartTime("");
      setEndTime("");
      return;
    }

    console.log(`Verificando horários disponíveis para data ${format(date, "dd/MM/yyyy")} entre ${availability.startTime} e ${availability.endTime}`);

    // Gera opções de horário dentro do intervalo de trabalho do psicólogo
    const times = generateTimeOptionsInRange(availability.startTime, availability.endTime);
    console.log("Horários potenciais:", times);
    
    // Filtra os horários ocupados
    const dateString = format(date, 'yyyy-MM-dd');
    const occupiedSlots = appointments
      .filter(app => 
        app.psychologistId === psychologistId && 
        app.date === dateString && 
        (existingAppointment ? app.id !== existingAppointment.id : true)
      )
      .map(app => ({ start: app.startTime, end: app.endTime }));
    
    console.log("Horários ocupados:", occupiedSlots);
    
    // Verificar cada horário individualmente se é válido para início de uma consulta
    const availableStartTimes = times.filter(time => {
      // Calculando horário de término (consulta de 1 hora)
      const startMinutes = timeToMinutes(time);
      const endMinutes = startMinutes + 60; // 1 hora depois
      
      // Converter de volta para string formato HH:MM para verificação de conflito
      const hours = Math.floor(endMinutes / 60);
      const minutes = endMinutes % 60;
      const endTimeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      
      // Verificar se este horário não tem conflito com agendamentos existentes
      const hasConflict = isTimeSlotOccupied(psychologistId, date, time, endTimeStr);
      
      // Verificar também se o horário de término não ultrapassa o horário de trabalho do psicólogo
      const endTimeInWorkingHours = timeToMinutes(endTimeStr) <= timeToMinutes(availability.endTime);
      
      return !hasConflict && endTimeInWorkingHours;
    });
    
    console.log("Horários disponíveis para início:", availableStartTimes);
    setAvailableTimes(availableStartTimes);
    
    // Define um horário inicial válido se necessário
    if (availableStartTimes.length > 0 && (!startTime || !availableStartTimes.includes(startTime))) {
      setStartTime(availableStartTimes[0]);
      
      // Define o horário de término como 1 hora após o início
      const startMinutes = timeToMinutes(availableStartTimes[0]);
      const endMinutes = startMinutes + 60;
      const hours = Math.floor(endMinutes / 60);
      const minutes = endMinutes % 60;
      const endTimeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      
      setEndTime(endTimeString);
    }
  }, [psychologistId, dayOfWeek, date, psychologists, appointments, existingAppointment]);

  // Efeito para verificar conflitos de horário quando mudam os horários selecionados
  useEffect(() => {
    if (!psychologistId || !startTime || !endTime) {
      setConflictError(null);
      return;
    }

    // CORREÇÃO: Verificar corretamente se o horário atual tem conflito com a agenda existente
    const hasConflict = isTimeSlotOccupied(psychologistId, date, startTime, endTime);
    
    if (hasConflict) {
      setConflictError(`O psicólogo já possui um agendamento entre ${startTime} e ${endTime} nesta data.`);
    } else {
      setConflictError(null);
    }
  }, [psychologistId, date, startTime, endTime]);

  // Função para gerar opções de horário padrão (das 8:00 às 20:00)
  const generateDefaultTimeOptions = () => {
    const times = [];
    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMinute = minute.toString().padStart(2, "0");
        times.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    return times;
  };

  // Função para gerar opções de horário dentro de um intervalo específico
  const generateTimeOptionsInRange = (start: string, end: string) => {
    const times = [];
    const startHour = parseInt(start.split(':')[0]);
    const startMinute = parseInt(start.split(':')[1]);
    const endHour = parseInt(end.split(':')[0]);
    const endMinute = parseInt(end.split(':')[1]);
    
    // CORREÇÃO: Melhorar a geração de horários para incluir todos os horários disponíveis
    let currentHour = startHour;
    let currentMinute = startMinute - (startMinute % 30); // Arredondar para intervalo de 30 minutos
    
    // Gera opções em intervalos de 30 minutos até no máximo 1 hora antes do fim do expediente
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    // Percorre em intervalos de 30 minutos
    for (let currentMinutes = startMinutes; currentMinutes <= endMinutes - 60; currentMinutes += 30) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      const formattedHour = hours.toString().padStart(2, "0");
      const formattedMinute = minutes.toString().padStart(2, "0");
      times.push(`${formattedHour}:${formattedMinute}`);
    }
    
    return times;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setSubmissionError(null);
    
    // Add debug logs
    console.log("Form submission: ", {
      selectedPatient,
      psychologistId,
      roomId: appointmentType === "online" ? "virtual" : roomId,
      date: format(date, "yyyy-MM-dd"),
      startTime,
      endTime,
      appointmentType
    });

    // Check for required fields
    if (!selectedPatient) {
      setSubmissionError("Por favor, selecione um paciente.");
      return;
    }

    if (!psychologistId) {
      setSubmissionError("Por favor, selecione um psicólogo.");
      return;
    }

    if (appointmentType === "presential" && !roomId) {
      setSubmissionError("Por favor, selecione um consultório para a consulta presencial.");
      return;
    }

    if (!startTime || !endTime) {
      setSubmissionError("Por favor, selecione os horários de início e término.");
      return;
    }

    // CORREÇÃO: Verifica novamente se há conflitos de horário para o horário atual
    // Isso garantirá que não haja erro ao tentar marcar horários disponíveis no fim do dia
    if (isTimeSlotOccupied(psychologistId, date, startTime, endTime)) {
      setSubmissionError(`O psicólogo já possui um agendamento entre ${startTime} e ${endTime} nesta data.`);
      return;
    }

    // Verifica se o psicólogo está disponível na data selecionada
    if (!isPsychologistAvailable(psychologistId)) {
      toast({
        title: "Psicólogo indisponível",
        description: `O psicólogo selecionado não atende na data escolhida. Por favor, selecione outra data ou outro psicólogo.`,
        variant: "destructive",
      });
      return;
    }

    const selectedPatientData = patients.find((p) => p.id === selectedPatient);
    if (!selectedPatientData) {
      setSubmissionError("Erro: Dados do paciente não encontrados.");
      return;
    }

    const selectedPsychologist = psychologists.find((p) => p.id === psychologistId);
    if (!selectedPsychologist) {
      setSubmissionError("Erro: Dados do psicólogo não encontrados.");
      return;
    }

    let selectedRoom = rooms.find((r) => r.id === roomId);
    // Para consultas online, não precisamos de sala física
    if (appointmentType === "online") {
      // Usar uma sala virtual
      selectedRoom = {
        id: "virtual",
        name: "Sala Virtual"
      };
    } else if (appointmentType === "presential" && !selectedRoom) {
      setSubmissionError("Por favor, selecione um consultório para a consulta presencial.");
      return;
    }

    // FIX: Ensure we're using the correct date format by using format() directly on the date object
    const formattedDate = format(date, "yyyy-MM-dd");
    
    const appointmentData = {
      patient: selectedPatientData,
      psychologistId,
      psychologistName: selectedPsychologist.name,
      roomId: selectedRoom ? selectedRoom.id : "virtual",
      roomName: selectedRoom ? selectedRoom.name : "Sala Virtual",
      date: formattedDate, // Using the formatted date
      startTime,
      endTime,
      status: "pending" as AppointmentStatus,
      paymentMethod: paymentMethod as "private" | "insurance",
      insuranceType: paymentMethod === "insurance" ? insuranceType as any : null,
      value: parseFloat(value),
      appointmentType: appointmentType as "presential" | "online"
    };

    try {
      if (existingAppointment) {
        updateAppointment({
          ...appointmentData,
          id: existingAppointment.id,
          status: existingAppointment.status // Manter o status existente
        });
        toast({
          title: "Agendamento atualizado",
          description: `Agendamento para ${selectedPatientData.name} atualizado com sucesso.`,
        });
      } else {
        addAppointment(appointmentData);
        toast({
          title: "Agendamento criado",
          description: `Nova consulta para ${selectedPatientData.name} agendada com sucesso.`,
        });
      }
      
      // Limpar o formulário e fechar
      onClose();
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      setSubmissionError("Ocorreu um erro ao salvar o agendamento. Tente novamente.");
    }
  };

  const handleNewPatient = () => {
    setIsPatientFormOpen(true);
  };

  const handlePatientAdded = (newPatient: Patient) => {
    setSelectedPatient(newPatient.id);
    setIsPatientFormOpen(false);
  };

  // Usar o próximo slot disponível
  const applyNextAvailableSlot = () => {
    if (nextAvailableSlot) {
      setDate(nextAvailableSlot.date);
      setStartTime(nextAvailableSlot.startTime);
      setEndTime(nextAvailableSlot.endTime);
    }
  };

  // Função para verificar se o psicólogo está disponível no dia selecionado
  const isPsychologistAvailable = (psychologistId: string): boolean => {
    const psychologist = psychologists.find(p => p.id === psychologistId);
    if (!psychologist || !psychologist.workingHours) return true;
    
    return psychologist.workingHours.some(wh => wh.dayOfWeek === dayOfWeek);
  };

  // Função para atualizar a data selecionada
  const handleDateChange = (newDate: Date) => {
    // Only allow date changes if the date is not locked
    if (lockDate) return;
    
    console.log("Data alterada para:", format(newDate, "dd/MM/yyyy"));
    setDate(newDate);
    
    // Verificar se o psicólogo atual está disponível na nova data
    if (psychologistId) {
      const psychologist = psychologists.find(p => p.id === psychologistId);
      const isAvailable = isPsychologistAvailable(psychologistId);
      
      if (!isAvailable && psychologist) {
        toast({
          title: "Psicólogo indisponível",
          description: `${psychologist.name} não atende neste dia da semana. Existem ${availablePsychologists.length} outros psicólogos disponíveis neste dia.`,
          variant: "destructive",
        });
        
        // Clear the psychologist selection
        setPsychologistId("");
      }
    }
  };

  // Função para alternar para outro psicólogo disponível
  const switchToAvailablePsychologist = () => {
    if (availablePsychologists.length > 0 && psychologistId) {
      // Encontrar o próximo psicólogo disponível diferente do atual
      const nextPsychologist = availablePsychologists.find(p => p.id !== psychologistId);
      if (nextPsychologist) {
        setPsychologistId(nextPsychologist.id);
        toast({
          title: "Psicólogo alterado",
          description: `Alterado para ${nextPsychologist.name} que está disponível na data selecionada.`,
        });
      }
    }
  };

  // CORREÇÃO: Adicionar botão para sugerir próximo horário disponível
  const suggestNextAvailableSlot = () => {
    if (nextAvailableSlot) {
      setDate(nextAvailableSlot.date);
      setStartTime(nextAvailableSlot.startTime);
      setEndTime(nextAvailableSlot.endTime);
      toast({
        title: "Próximo horário disponível",
        description: `Horário sugerido para ${format(nextAvailableSlot.date, "dd/MM/yyyy")} às ${nextAvailableSlot.startTime}.`,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="patient">Paciente</Label>
          <div className="flex gap-2">
            <Select value={selectedPatient} onValueChange={setSelectedPatient} required>
              <SelectTrigger id="patient" className="w-full">
                <SelectValue placeholder="Selecione o paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.filter(p => p.active).map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={handleNewPatient}>
              Novo
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="psychologist">Psicólogo</Label>
          <Select value={psychologistId} onValueChange={handlePsychologistChange} required>
            <SelectTrigger id="psychologist">
              <SelectValue placeholder="Selecione o psicólogo" />
            </SelectTrigger>
            <SelectContent>
              {/* No independent mode, we show all psychologists */}
              {independentMode ? (
                psychologists.map((psychologist) => (
                  <SelectItem 
                    key={psychologist.id} 
                    value={psychologist.id}
                  >
                    {psychologist.name}
                  </SelectItem>
                ))
              ) : (
                // In calendar mode, we filter to those available on the selected date
                availablePsychologists.length > 0 ? (
                  availablePsychologists.map((psychologist) => (
                    <SelectItem 
                      key={psychologist.id} 
                      value={psychologist.id}
                    >
                      {psychologist.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-available" disabled>
                    Nenhum psicólogo disponível nesta data
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          {independentMode && psychologistId && (
            <div className="text-xs text-green-600 mt-1">
              Selecione um psicólogo para ver sua próxima data disponível
            </div>
          )}
          {!independentMode && availablePsychologists.length > 0 && (
            <div className="text-xs text-green-600 mt-1">
              {availablePsychologists.length} psicólogo(s) disponível(is) na data selecionada
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="appointmentType">Tipo de Atendimento</Label>
          <Select value={appointmentType} onValueChange={setAppointmentType} required>
            <SelectTrigger id="appointmentType">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="presential">Presencial</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <PsychologistAvailabilityDatePicker
            date={date}
            onDateChange={handleDateChange}
            psychologistId={psychologistId}
            disabled={lockDate}
            onPsychologistChange={lockDate ? undefined : handlePsychologistChange}
          />
          {lockDate && (
            <div className="text-xs text-blue-600 mt-1">
              Data fixa selecionada do calendário
            </div>
          )}
          {independentMode && psychologistId && nextAvailableSlot && (
            <div className="text-xs text-green-600 mt-1">
              Próxima data disponível para este psicólogo
            </div>
          )}
        </div>

        {appointmentType === "presential" && (
          <div className="space-y-2">
            <Label htmlFor="room">Consultório</Label>
            <Select value={roomId} onValueChange={setRoomId} required={appointmentType === "presential"}>
              <SelectTrigger id="room">
                <SelectValue placeholder="Selecione o consultório" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="startTime">Horário de Início</Label>
          <Select 
            value={startTime} 
            onValueChange={setStartTime} 
            required
            disabled={availableTimes.length === 0}
          >
            <SelectTrigger id="startTime">
              <SelectValue placeholder="Selecione o horário" />
            </SelectTrigger>
            <SelectContent>
              {availableTimes.length > 0 ? (
                availableTimes.map((time) => (
                  <SelectItem key={`start-${time}`} value={time}>
                    {time}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-time-available" disabled>
                  Sem horários disponíveis
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">Horário de Término</Label>
          <Select 
            value={endTime} 
            onValueChange={setEndTime} 
            required
            disabled={availableTimes.length === 0}
          >
            <SelectTrigger id="endTime">
              <SelectValue placeholder="Selecione o horário" />
            </SelectTrigger>
            <SelectContent>
              {availableTimes
                .filter(time => time > startTime) // Apenas horários após o início
                .length > 0 ? (
                  availableTimes
                    .filter(time => time > startTime)
                    .map((time) => (
                      <SelectItem key={`end-${time}`} value={time}>
                        {time}
                      </SelectItem>
                    ))
                ) : (
                  <SelectItem value="no-end-time" disabled>
                    Selecione um horário de início primeiro
                  </SelectItem>
                )
              }
            </SelectContent>
          </Select>
        </div>

        {(conflictError || submissionError) && (
          <div className="col-span-2">
            <Alert variant="destructive">
              <AlertDescription>{conflictError || submissionError}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Método de Pagamento</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
            <SelectTrigger id="paymentMethod">
              <SelectValue placeholder="Selecione o método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Particular</SelectItem>
              <SelectItem value="insurance">Convênio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {paymentMethod === "insurance" && (
          <div className="space-y-2">
            <Label htmlFor="insuranceType">Plano de Saúde</Label>
            <Select
              value={insuranceType || ""}
              onValueChange={setInsuranceType}
              required
            >
              <SelectTrigger id="insuranceType">
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Unimed">Unimed</SelectItem>
                <SelectItem value="SulAmérica">SulAmérica</SelectItem>
                <SelectItem value="Fusex">Fusex</SelectItem>
                <SelectItem value="Other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="value">Valor (R$)</Label>
          <Input
            id="value"
            type="number"
            step="0.01"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </div>
      </div>

      {nextAvailableSlot && !lockDate && !independentMode && (
        <div className="flex justify-center mb-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={applyNextAvailableSlot}
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            Sugerir próximo horário disponível ({format(nextAvailableSlot.date, "dd/MM/yyyy")} às {nextAvailableSlot.startTime})
          </Button>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button 
          type="submit"
          disabled={
            formSubmitted ||
            availableTimes.length === 0 || 
            !startTime || 
            !endTime || 
            !!conflictError || 
            !isPsychologistAvailable(psychologistId) ||
            !selectedPatient ||
            (appointmentType === "presential" && !roomId)
          }
        >
          {existingAppointment ? "Atualizar" : "Agendar"} Consulta
        </Button>
      </div>

      {/* New Patient Modal */}
      <Dialog open={isPatientFormOpen} onOpenChange={setIsPatientFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Paciente</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo paciente
            </DialogDescription>
          </DialogHeader>
          <PatientForm onSave={handlePatientAdded} onCancel={() => setIsPatientFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </form>
  );
};

export default AppointmentForm;
