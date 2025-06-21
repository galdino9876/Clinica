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

interface AppointmentFormProps {
  selectedDate: Date;
  onClose: () => void;
}

const AppointmentForm = ({ selectedDate: initialDate, onClose }: AppointmentFormProps) => {
  const { toast } = useToast();
  const [isPatientFormOpen, setIsPatientFormOpen] = React.useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [rooms, setRooms] = useState<ConsultingRoom[]>([]);
  const [psychologists, setPsychologists] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Estado de carregamento
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate); // Estado local para a data

  const formMethods: UseFormReturn<AppointmentFormData> = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      psychologistId: "",
      appointmentType: "presential",
      roomId: "",
      startTime: "09:00",
      endTime: "10:00",
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = formMethods;

  const appointmentType = watch("appointmentType");

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
      value: 200.0,
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
            options={["09:00", "09:30", "10:00", "10:30", "11:00"].map((time) => ({
              id: time,
              label: time,
            }))}
            placeholder="Selecione o horário"
            required
            errors={errors}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <SelectDynamic
            name="endTime"
            control={control}
            label="Horário de Término"
            options={["10:00", "10:30", "11:00", "11:30", "12:00"].map((time) => ({
              id: time,
              label: time,
            }))}
            placeholder="Selecione o horário"
            required
            errors={errors}
            disabled={isLoading}
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
