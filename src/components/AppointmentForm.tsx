
import { useState } from "react";
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
import { format } from "date-fns";
import { Patient } from "@/types/appointment";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PatientForm from "./PatientForm";

interface AppointmentFormProps {
  selectedDate: Date;
  onClose: () => void;
  existingAppointment?: any; // For editing existing appointments
}

const AppointmentForm = ({ selectedDate, onClose, existingAppointment }: AppointmentFormProps) => {
  const { addAppointment, updateAppointment, patients, rooms } = useAppointments();
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>(existingAppointment?.patient.id || "");
  const [psychologistId, setPsychologistId] = useState(existingAppointment?.psychologistId || "");
  const [roomId, setRoomId] = useState(existingAppointment?.roomId || "");
  const [startTime, setStartTime] = useState(existingAppointment?.startTime || "09:00");
  const [endTime, setEndTime] = useState(existingAppointment?.endTime || "10:00");
  const [paymentMethod, setPaymentMethod] = useState(existingAppointment?.paymentMethod || "private");
  const [insuranceType, setInsuranceType] = useState(existingAppointment?.insuranceType || null);
  const [value, setValue] = useState(existingAppointment?.value?.toString() || "200");

  // Mock psychologists for demonstration
  const psychologists = [
    { id: "3", name: "Dr. John Smith" },
    { id: "4", name: "Dr. Sarah Johnson" },
  ];

  const generateTimeOptions = () => {
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

  const timeOptions = generateTimeOptions();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedPatientData = patients.find((p) => p.id === selectedPatient);
    if (!selectedPatientData) return;

    const selectedRoom = rooms.find((r) => r.id === roomId);
    if (!selectedRoom) return;

    const selectedPsychologist = psychologists.find((p) => p.id === psychologistId);
    if (!selectedPsychologist) return;

    const appointmentData = {
      patient: selectedPatientData,
      psychologistId,
      psychologistName: selectedPsychologist.name,
      roomId,
      roomName: selectedRoom.name,
      date: format(selectedDate, "yyyy-MM-dd"),
      startTime,
      endTime,
      status: "scheduled" as const,
      paymentMethod: paymentMethod as "private" | "insurance",
      insuranceType: paymentMethod === "insurance" ? insuranceType as any : null,
      value: parseFloat(value),
    };

    if (existingAppointment) {
      updateAppointment({
        ...appointmentData,
        id: existingAppointment.id,
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
                {patients.map((patient) => (
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
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            type="date"
            value={format(selectedDate, "yyyy-MM-dd")}
            disabled
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="psychologist">Psicólogo</Label>
          <Select value={psychologistId} onValueChange={setPsychologistId} required>
            <SelectTrigger id="psychologist">
              <SelectValue placeholder="Selecione o psicólogo" />
            </SelectTrigger>
            <SelectContent>
              {psychologists.map((psychologist) => (
                <SelectItem key={psychologist.id} value={psychologist.id}>
                  {psychologist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

        <div className="space-y-2">
          <Label htmlFor="startTime">Horário de Início</Label>
          <Select value={startTime} onValueChange={setStartTime} required>
            <SelectTrigger id="startTime">
              <SelectValue placeholder="Selecione o horário" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((time) => (
                <SelectItem key={`start-${time}`} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">Horário de Término</Label>
          <Select value={endTime} onValueChange={setEndTime} required>
            <SelectTrigger id="endTime">
              <SelectValue placeholder="Selecione o horário" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((time) => (
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
        <Button type="submit">
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
