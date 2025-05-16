
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
import { Patient } from "@/types/appointment";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PatientForm from "./PatientForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PsychologistAvailabilityDatePicker from "./PsychologistAvailabilityDatePicker";

interface AppointmentFormProps {
  selectedDate: Date;
  onClose: () => void;
  existingAppointment?: any; // Para edição de agendamentos existentes
  onPsychologistSelected?: (psychologistId: string) => void;
}

const AppointmentForm = ({ 
  selectedDate, 
  onClose, 
  existingAppointment,
  onPsychologistSelected 
}: AppointmentFormProps) => {
  const { addAppointment, updateAppointment, patients, rooms, findNextAvailableSlot } = useAppointments();
  const { getPsychologists } = useAuth();
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
  
  // Obter a lista de psicólogos do sistema
  const psychologists = getPsychologists();

  // Determinar o dia da semana da data selecionada (0-6, onde 0 é domingo)
  const dayOfWeek = date.getDay();

  // Handle psychologist selection for calendar highlighting
  const handlePsychologistChange = (value: string) => {
    setPsychologistId(value);
    if (onPsychologistSelected) {
      onPsychologistSelected(value);
    }
  };

  // Efeito para encontrar o próximo horário disponível quando o psicólogo é selecionado
  useEffect(() => {
    if (psychologistId) {
      const slot = findNextAvailableSlot(psychologistId);
      setNextAvailableSlot(slot);
      
      // Se for um novo agendamento e houver um slot disponível, sugerimos automaticamente
      if (slot && !existingAppointment) {
        setDate(slot.date);
        setStartTime(slot.startTime);
        setEndTime(slot.endTime);
      }
    } else {
      setNextAvailableSlot(null);
    }
  }, [psychologistId, findNextAvailableSlot, existingAppointment]);

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

    // Gera opções de horário dentro do intervalo de trabalho do psicólogo
    const times = generateTimeOptionsInRange(availability.startTime, availability.endTime);
    setAvailableTimes(times);
    
    // Define um horário inicial válido
    if (times.length > 0 && !times.includes(startTime)) {
      setStartTime(times[0]);
      
      // Define o horário de término como 1 hora após o início
      const startHour = parseInt(times[0].split(':')[0]);
      const startMinute = parseInt(times[0].split(':')[1]);
      let endHour = startHour + 1;
      const endTimeString = `${endHour.toString().padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}`;
      
      // Verifica se o horário de término está dentro do intervalo disponível
      if (times.includes(endTimeString)) {
        setEndTime(endTimeString);
      } else {
        // Se não estiver, usa o último horário disponível
        setEndTime(times[times.length - 1]);
      }
    }
  }, [psychologistId, dayOfWeek, date, psychologists]);

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
    
    let currentHour = startHour;
    let currentMinute = startMinute - (startMinute % 30); // Arredondar para intervalo de 30 minutos
    
    while (currentHour < endHour || (currentHour === endHour && currentMinute <= endMinute)) {
      const formattedHour = currentHour.toString().padStart(2, "0");
      const formattedMinute = currentMinute.toString().padStart(2, "0");
      times.push(`${formattedHour}:${formattedMinute}`);
      
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour += 1;
      }
    }
    
    return times;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedPatientData = patients.find((p) => p.id === selectedPatient);
    if (!selectedPatientData) return;

    const selectedPsychologist = psychologists.find((p) => p.id === psychologistId);
    if (!selectedPsychologist) return;

    let selectedRoom = rooms.find((r) => r.id === roomId);
    // Para consultas online, não precisamos de sala física
    if (appointmentType === "online" && !selectedRoom) {
      // Usar uma sala virtual
      selectedRoom = {
        id: "virtual",
        name: "Sala Virtual"
      };
    } else if (appointmentType === "presential" && !selectedRoom) {
      // Para consultas presenciais, precisamos de sala física
      return;
    }

    const appointmentData = {
      patient: selectedPatientData,
      psychologistId,
      psychologistName: selectedPsychologist.name,
      roomId: selectedRoom ? selectedRoom.id : "virtual",
      roomName: selectedRoom ? selectedRoom.name : "Sala Virtual",
      date: format(date, "yyyy-MM-dd"),
      startTime,
      endTime,
      status: "pending" as AppointmentStatus, // Fix: cast to AppointmentStatus
      paymentMethod: paymentMethod as "private" | "insurance",
      insuranceType: paymentMethod === "insurance" ? insuranceType as any : null,
      value: parseFloat(value),
      appointmentType: appointmentType as "presential" | "online"
    };

    if (existingAppointment) {
      updateAppointment({
        ...appointmentData,
        id: existingAppointment.id,
        status: existingAppointment.status // Manter o status existente
      });
    } else {
      addAppointment(appointmentData);
    }

    onClose();
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

  // Verifica se o psicólogo está disponível no dia selecionado
  const isPsychologistAvailable = (psychologistId: string): boolean => {
    const psychologist = psychologists.find(p => p.id === psychologistId);
    if (!psychologist || !psychologist.workingHours) return true;
    
    return psychologist.workingHours.some(wh => wh.dayOfWeek === dayOfWeek);
  };

  // Função para atualizar a data selecionada
  const handleDateChange = (newDate: Date) => {
    setDate(newDate);
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
              {psychologists.map((psychologist) => (
                <SelectItem 
                  key={psychologist.id} 
                  value={psychologist.id}
                >
                  {psychologist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {nextAvailableSlot && !isPsychologistAvailable(psychologistId) && (
          <div className="col-span-2">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription>
                O psicólogo selecionado não atende na data selecionada ({format(date, "dd/MM/yyyy")}). 
                Próximo horário disponível: {format(nextAvailableSlot.date, "dd/MM/yyyy")} às {nextAvailableSlot.startTime}.
                <Button type="button" variant="link" onClick={applyNextAvailableSlot} className="text-amber-600 pl-0">
                  Usar esse horário
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <PsychologistAvailabilityDatePicker
            date={date}
            onDateChange={handleDateChange}
            psychologistId={psychologistId}
          />
        </div>

        {appointmentType === "presential" && (
          <div className="space-y-2">
            <Label htmlFor="room">Consultório</Label>
            <Select value={roomId} onValueChange={setRoomId} required>
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
              {availableTimes.map((time) => (
                <SelectItem key={`start-${time}`} value={time}>
                  {time}
                </SelectItem>
              ))}
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
                .map((time) => (
                  <SelectItem key={`end-${time}`} value={time}>
                    {time}
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button 
          type="submit"
          disabled={availableTimes.length === 0 || !startTime || !endTime}
        >
          {existingAppointment ? "Atualizar" : "Agendar"} Consulta
        </Button>
      </div>

      {/* New Patient Modal */}
      <Dialog open={isPatientFormOpen} onOpenChange={setIsPatientFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Paciente</DialogTitle>
          </DialogHeader>
          <PatientForm onSave={handlePatientAdded} onCancel={() => setIsPatientFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </form>
  );
};

export default AppointmentForm;
