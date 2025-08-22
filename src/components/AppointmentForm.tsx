"use client";

import React, { useEffect, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PatientForm from "./PatientForm";
import { useToast } from "@/hooks/use-toast";
import { Patient, Appointment, AppointmentStatus } from "@/types/appointment";
import { ConsultingRoom } from "@/types/consulting_rooms";
import PsychologistAvailabilityDatePicker from "./PsychologistAvailabilityDatePicker";
import { format } from "date-fns";
import { SelectDynamic } from "./Selectsn";
import { appointmentSchema, AppointmentFormData } from "@/zod/appointmentSchema"; // Ajuste o caminho
import { InputDynamic } from "./inputDin";

interface AppointmentFormProps {
  selectedDate: Date;
  onClose: () => void;
}

interface WorkingHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const AppointmentForm = ({ selectedDate: initialDate, onClose }: AppointmentFormProps) => {
  const { toast } = useToast();
  const [isPatientFormOpen, setIsPatientFormOpen] = React.useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [rooms, setRooms] = useState<ConsultingRoom[]>([]);
  const [psychologists, setPsychologists] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Estado de carregamento
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate); // Estado local para a data
  
  // Novos estados para horários do psicólogo
  const [psychologistWorkingHours, setPsychologistWorkingHours] = useState<WorkingHour[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isLoadingPsychologistHours, setIsLoadingPsychologistHours] = useState(false);

  const formMethods: UseFormReturn<AppointmentFormData> = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      psychologistId: "",
      appointmentType: "presential",
      roomId: "",
      startTime: "09:00",
      endTime: "10:00",
      value: 200.0,
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = formMethods;

  const appointmentType = watch("appointmentType");
  const selectedPsychologistId = watch("psychologistId");

  // Função para buscar horários de trabalho do psicólogo
  const fetchPsychologistWorkingHours = async (psychologistId: string) => {
    if (!psychologistId) {
      setPsychologistWorkingHours([]);
      setAvailableTimeSlots([]);
      return;
    }

    setIsLoadingPsychologistHours(true);
    try {
      const response = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/working_hours/${psychologistId}`);
      
      if (response.ok) {
        const data = await response.json();
        const fetchedWorkingHours = Array.isArray(data) ? data : data.data || [];
        setPsychologistWorkingHours(fetchedWorkingHours);
        
        // Gerar slots de horário disponíveis baseado nos horários de trabalho
        const timeSlots: string[] = [];
        fetchedWorkingHours.forEach(wh => {
          const startHour = parseInt(wh.start_time.split(':')[0]);
          const endHour = parseInt(wh.end_time.split(':')[0]);
          
          for (let hour = startHour; hour < endHour; hour++) {
            const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
            if (!timeSlots.includes(timeSlot)) {
              timeSlots.push(timeSlot);
            }
          }
        });
        
        // Ordenar horários
        timeSlots.sort((a, b) => a.localeCompare(b));
        setAvailableTimeSlots(timeSlots);
        
        // Preencher automaticamente os campos de horário com o primeiro e segundo horário disponível
        if (timeSlots.length >= 2) {
          setValue("startTime", timeSlots[0]);
          setValue("endTime", timeSlots[1]);
        } else if (timeSlots.length === 1) {
          setValue("startTime", timeSlots[0]);
          // Para o horário de término, adicionar 1 hora ao horário de início
          const startHour = parseInt(timeSlots[0].split(':')[0]);
          const endHour = startHour + 1;
          const endTime = `${endHour.toString().padStart(2, '0')}:00`;
          setValue("endTime", endTime);
        }
        
        console.log('Horários do psicólogo carregados:', fetchedWorkingHours);
        console.log('Slots de horário disponíveis:', timeSlots);
      } else {
        console.error('Erro ao buscar horários do psicólogo:', response.status);
        setPsychologistWorkingHours([]);
        setAvailableTimeSlots([]);
      }
    } catch (error) {
      console.error('Erro ao buscar horários do psicólogo:', error);
      setPsychologistWorkingHours([]);
      setAvailableTimeSlots([]);
    } finally {
      setIsLoadingPsychologistHours(false);
    }
  };

  // Monitorar mudanças no psicólogo selecionado
  useEffect(() => {
    if (selectedPsychologistId) {
      fetchPsychologistWorkingHours(selectedPsychologistId);
    } else {
      // Limpar horários quando nenhum psicólogo estiver selecionado
      setPsychologistWorkingHours([]);
      setAvailableTimeSlots([]);
      // Resetar para valores padrão
      setValue("startTime", "09:00");
      setValue("endTime", "10:00");
    }
  }, [selectedPsychologistId, setValue]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true); // Inicia o carregamento
      try {
        // Fetch pacientes
        const patientsResponse = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/patients", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (patientsResponse.ok) {
          const data = await patientsResponse.json();
          console.log("Resposta API pacientes (detalhada):", JSON.stringify(data, null, 2)); // Log mais detalhado
          const fetchedPatients: Patient[] = data.map((patient: any) => ({
            id: patient.id,
            name: patient.name,
            cpf: patient.cpf,
            phone: patient.phone,
            email: patient.email,
            birthdate: patient.birthdate ? new Date(patient.birthdate) : null,
            createdAt: patient.created_at ? new Date(patient.created_at) : new Date(),
            updatedAt: patient.updated_at ? new Date(patient.updated_at) : null,
            deactivationDate: patient.deactivation_date ? new Date(patient.deactivation_date) : null,
            deactivationReason: patient.deactivation_reason || null,
            address: patient.address || null,
            identityDocument: patient.identity_document || null,
            insuranceDocument: patient.insurance_document || null,
            active: patient.active === 1,
          }));
          setPatients(fetchedPatients);
          console.log("Pacientes carregados:", fetchedPatients); // Verifica os pacientes mapeados
        } else {
          console.error("Erro API pacientes:", patientsResponse.status, await patientsResponse.text());
        }

        // Fetch consultórios
        const roomsResponse = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/consulting_rooms", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (roomsResponse.ok) {
          const data = await roomsResponse.json();
          console.log("Resposta API consultórios (detalhada):", JSON.stringify(data, null, 2));
          const fetchedRooms: ConsultingRoom[] = data.map((room: any) => ({
            id: room.id,
            name: room.name,
            description: room.description || null,
            createdAt: room.created_at ? new Date(room.created_at) : new Date(),
            updatedAt: room.updated_at ? new Date(room.updated_at) : null,
          }));
          setRooms(fetchedRooms);
          console.log("Consultórios carregados:", fetchedRooms);
        } else {
          console.error("Erro API consultórios:", roomsResponse.status, await roomsResponse.text());
        }

        // Fetch psicólogos
        const usersResponse = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/users", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (usersResponse.ok) {
          const data = await usersResponse.json();
          console.log("Resposta API usuários (detalhada):", JSON.stringify(data, null, 2));
          const fetchedPsychologists = data
            .filter((user: any) => user.role === "psychologist")
            .map((user: any) => ({ id: user.id.toString(), name: user.name }));
          setPsychologists(fetchedPsychologists);
          console.log("Psicólogos carregados:", fetchedPsychologists);
        } else {
          console.error("Erro API usuários:", usersResponse.status, await usersResponse.text());
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setIsLoading(false); // Finaliza o carregamento
      }
    };
    fetchData();
  }, []);

  const onSubmit = async (data: AppointmentFormData) => {
    const appointmentData: Omit<Appointment, "id"> = {
      patient_id: parseInt(data.patientId),
      psychologist_id: parseInt(data.psychologistId),
      room_id: data.appointmentType === "online" ? null : data.roomId ? parseInt(data.roomId) : null,
      date: format(selectedDate, "yyyy-MM-dd"), // Usa o estado local da data
      start_time: data.startTime,
      end_time: data.endTime,
      status: "pending" as AppointmentStatus,
      appointment_type: data.appointmentType as "presential" | "online",
      created_at: new Date().toISOString(),
      updated_at: null,
      value: Number(data.value),
      payment_method: "private",
      insurance_type: null,
      is_recurring: false,
    };

    try {
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/schedule-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData),

      });
      if (response.ok) {
        toast({ title: "Sucesso", description: "Consulta agendada." });
        onClose();
      } else {
        throw new Error("Falha ao criar agendamento");
      }
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      toast({ title: "Erro", description: "Falha ao agendar. Tente novamente.", variant: "destructive" });
    }
  };

  const handleNewPatient = () => setIsPatientFormOpen(true);
  const handlePatientAdded = (newPatient: Patient) => {
    formMethods.setValue("patientId", newPatient.id.toString());
    setIsPatientFormOpen(false);
  };

  // Gerar opções de horário de término baseado no horário de início selecionado
  const generateEndTimeOptions = (startTime: string) => {
    if (!startTime || availableTimeSlots.length === 0) return [];
    
    const startHour = parseInt(startTime.split(':')[0]);
    return availableTimeSlots
      .filter(time => {
        const timeHour = parseInt(time.split(':')[0]);
        return timeHour > startHour;
      })
      .map(time => ({ id: time, label: time }));
  };

  const currentStartTime = watch("startTime");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <SelectDynamic
            name="patientId"
            control={control}
            label="Paciente"
            options={patients.map((patient) => ({
              id: patient.id.toString(),
              label: patient.name,
            }))}
            placeholder="Selecione o paciente"
            required
            errors={errors}
            disabled={isLoading}
            onClear={() => formMethods.setValue("patientId", "")}
          />
          <Button type="button" variant="outline" onClick={handleNewPatient} disabled={isLoading}>
            Novo
          </Button>
        </div>

        <div className="space-y-2">
          <SelectDynamic
            name="psychologistId"
            control={control}
            label="Psicólogo"
            options={psychologists.map((psychologist) => ({
              id: psychologist.id,
              label: psychologist.name,
            }))}
            placeholder="Selecione o psicólogo"
            required
            errors={errors}
            disabled={isLoading}
            onClear={() => formMethods.setValue("psychologistId", "")}
          />
          {isLoadingPsychologistHours && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              Carregando horários disponíveis...
            </div>
          )}
        </div>

        <div className="space-y-2">
          <SelectDynamic
            name="appointmentType"
            control={control}
            label="Tipo de Atendimento"
            options={[
              { id: "presential", label: "Presencial" },
              { id: "online", label: "Online" },
            ]}
            placeholder="Selecione o tipo"
            required
            errors={errors}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <PsychologistAvailabilityDatePicker
            date={selectedDate}
            onDateChange={(newDate: Date) => setSelectedDate(newDate)} // Atualiza o estado da data
            psychologistId={watch("psychologistId") || ""}
            disabled={isLoading}
          />
        </div>

        {appointmentType === "presential" && (
          <div className="space-y-2">
            <SelectDynamic
              name="roomId"
              control={control}
              label="Consultório"
              options={rooms.map((room) => ({
                id: room.id.toString(),
                label: room.name,
              }))}
              placeholder="Selecione o consultório"
              required
              errors={errors}
              disabled={isLoading}
              onClear={() => formMethods.setValue("roomId", "")}
            />
          </div>
        )}

        <div className="space-y-2">
          <SelectDynamic
            name="startTime"
            control={control}
            label="Horário de Início"
            options={availableTimeSlots.length > 0 
              ? availableTimeSlots.map((time) => ({ id: time, label: time }))
              : [{ id: "09:00", label: "09:00" }]
            }
            placeholder="Selecione o horário"
            required
            errors={errors}
            disabled={isLoading || !selectedPsychologistId || isLoadingPsychologistHours}
            onClear={() => formMethods.setValue("startTime", availableTimeSlots[0] || "09:00")}
          />
          {selectedPsychologistId && availableTimeSlots.length > 0 && (
            <div className="text-xs text-gray-500">
              Horários disponíveis: {availableTimeSlots.join(', ')}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <SelectDynamic
            name="endTime"
            control={control}
            label="Horário de Término"
            options={generateEndTimeOptions(currentStartTime)}
            placeholder="Selecione o horário"
            required
            errors={errors}
            disabled={isLoading || !selectedPsychologistId || isLoadingPsychologistHours || !currentStartTime}
            onClear={() => {
              const startHour = parseInt(currentStartTime.split(':')[0]);
              const endHour = startHour + 1;
              const endTime = `${endHour.toString().padStart(2, '0')}:00`;
              formMethods.setValue("endTime", endTime);
            }}
          />
        </div>

        <div className="space-y-2">
          <InputDynamic
            name="value"
            label="Valor do Atendimento (R$)"
            control={control}
            type="number"
            placeholder="200.00"
            required
            disabled={isLoading}
            errors={errors}
            onClear={() => formMethods.setValue("value", 200.0)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          Agendar
        </Button>
      </div>

      <Dialog open={isPatientFormOpen} onOpenChange={setIsPatientFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Paciente</DialogTitle>
            <DialogDescription>Preencha os dados do novo paciente</DialogDescription>
          </DialogHeader>
          <PatientForm onSave={handlePatientAdded} onCancel={() => setIsPatientFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </form>
  );
};

export default AppointmentForm;
