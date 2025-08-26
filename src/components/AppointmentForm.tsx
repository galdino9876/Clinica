"use client";

import React, { useEffect, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PatientForm from "./PatientForm";
import { useToast } from "@/hooks/use-toast";
import { Patient, Appointment, AppointmentStatus, PaymentMethod } from "@/types/appointment";
import { ConsultingRoom } from "@/types/consulting_rooms";
import PsychologistAvailabilityDatePicker from "./PsychologistAvailabilityDatePicker";
import { format } from "date-fns";
import { SelectDynamic } from "./Selectsn";
import { appointmentSchema, AppointmentFormData } from "@/zod/appointmentSchema"; // Ajuste o caminho
import { InputDynamic } from "./inputDin";

interface AppointmentFormProps {
  selectedDate: Date;
  onClose: () => void;
  onAppointmentCreated?: () => void; // Nova prop para notificar criação
}

interface WorkingHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const AppointmentForm = ({ selectedDate: initialDate, onClose, onAppointmentCreated }: AppointmentFormProps) => {
  const { toast } = useToast();
  const [isPatientFormOpen, setIsPatientFormOpen] = React.useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [rooms, setRooms] = useState<ConsultingRoom[]>([]);
  const [psychologists, setPsychologists] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Estado de carregamento
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate); // Estado local para a data
  const [selectedDates, setSelectedDates] = useState<Date[]>([]); // Estado para múltiplas datas
  
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

  // Limpar consultório quando mudar para online
  useEffect(() => {
    if (appointmentType === "online") {
      setValue("roomId", "");
    }
  }, [appointmentType, setValue]);

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
          
          // Gerar horários de 30 em 30 minutos dentro do período de trabalho
          for (let hour = startHour; hour <= endHour; hour++) {
            // Horário cheio (ex: 10:00)
            const timeSlotFull = `${hour.toString().padStart(2, '0')}:00`;
            if (!timeSlots.includes(timeSlotFull)) {
              timeSlots.push(timeSlotFull);
            }
            
            // Horário de meia hora (ex: 10:30) - exceto para o último horário
            if (hour < endHour) {
              const timeSlotHalf = `${hour.toString().padStart(2, '0')}:30`;
              if (!timeSlots.includes(timeSlotHalf)) {
                timeSlots.push(timeSlotHalf);
              }
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
          const startHour = parseInt(timeSlots[0].split(':')[0]);
          const startMinute = timeSlots[0].includes(':30') ? 30 : 0;
          
          if (startMinute === 0) {
            // Se início é 20:00, término será 20:30
            const endTime = `${startHour.toString().padStart(2, '0')}:30`;
            setValue("endTime", endTime);
          } else {
            // Se início é 20:30, término será 21:00
            const endHour = startHour + 1;
            const endTime = `${endHour.toString().padStart(2, '0')}:00`;
            setValue("endTime", endTime);
          }
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
      // Limpar datas selecionadas
      setSelectedDates([]);
      setSelectedDate(null);
    }
  }, [selectedPsychologistId, setValue]);

  // Efeito para ajustar a data inicial se necessário quando o psicólogo for selecionado
  useEffect(() => {
    if (selectedPsychologistId && psychologistWorkingHours.length > 0) {
      // Não definir data automaticamente - deixar o usuário escolher
      // Verificar se a data atual é um dia disponível para o psicólogo
      // const currentDayOfWeek = selectedDate.getDay();
      // const isCurrentDayAvailable = psychologistWorkingHours.some(wh => wh.day_of_week === currentDayOfWeek);
      
      // console.log('Verificando disponibilidade da data inicial:', selectedDate);
      // console.log('Dia da semana da data inicial:', currentDayOfWeek);
      // console.log('Horários disponíveis para este dia:', psychologistWorkingHours.filter(wh => wh.day_of_week === currentDayOfWeek));
      // console.log('Data inicial é disponível?', isCurrentDayAvailable);
      
      // Se a data atual não for disponível, encontrar a próxima data disponível
      // if (!isCurrentDayAvailable) {
      //   console.log('Data inicial não é disponível, procurando próxima data disponível...');
      //   const today = new Date();
      //   let nextAvailableDate = new Date(today);
      //   
      //   // Procurar pelos próximos 30 dias, começando pela data atual
      //   for (let i = 0; i < 30; i++) {
      //     const checkDate = new Date(today);
      //     checkDate.setDate(today.getDate() + i);
      //     
      //     const dayOfWeek = checkDate.getDay();
      //     const isWorkingDay = psychologistWorkingHours.some(wh => wh.day_of_week === dayOfWeek);
      //     
      //     if (isWorkingDay) {
      //       nextAvailableDate = checkDate;
      //       console.log(`Encontrada data disponível no dia ${i + 1}:`, nextAvailableDate);
      //       break;
      //     }
      //   }
      //   
      //   // Atualizar a data selecionada para o próximo dia disponível
      //   setSelectedDate(nextAvailableDate);
      //   
      //   console.log('Data inicial ajustada para próximo dia disponível:', nextAvailableDate);
      // }
    }
  }, [selectedPsychologistId, psychologistWorkingHours]);

  // Monitorar mudanças na data selecionada para atualizar os horários
  useEffect(() => {
    if (selectedPsychologistId && psychologistWorkingHours.length > 0 && selectedDate) {
      // Verificar se a nova data selecionada é um dia disponível para o psicólogo
      const selectedDayOfWeek = selectedDate.getDay();
      const isSelectedDayAvailable = psychologistWorkingHours.some(wh => wh.day_of_week === selectedDayOfWeek);
      
      console.log('Verificando disponibilidade da nova data:', selectedDate);
      console.log('Dia da semana da nova data:', selectedDayOfWeek);
      console.log('Horários disponíveis para este dia:', psychologistWorkingHours.filter(wh => wh.day_of_week === selectedDayOfWeek));
      console.log('Nova data é disponível?', isSelectedDayAvailable);
      
      if (!isSelectedDayAvailable) {
        // Se a data selecionada não for disponível, não definir automaticamente
        // Deixar o usuário escolher uma data válida
        console.log('Data selecionada não é disponível. Usuário deve escolher uma data válida.');
        return;
      } else {
        // A data selecionada é disponível, usar ela normalmente
        const dayWorkingHours = psychologistWorkingHours.filter(wh => wh.day_of_week === selectedDayOfWeek);
        
        console.log('Data mudou para:', selectedDate);
        console.log('Novo dia da semana:', selectedDayOfWeek);
        console.log('Horários de trabalho para este dia:', dayWorkingHours);
        
        // Regenerar horários quando a data mudar
        const timeSlots: string[] = [];
        dayWorkingHours.forEach(wh => {
          const startHour = parseInt(wh.start_time.split(':')[0]);
          const endHour = parseInt(wh.end_time.split(':')[0]);
          
          // Gerar horários de 30 em 30 minutos dentro do período de trabalho
          for (let hour = startHour; hour <= endHour; hour++) {
            // Horário cheio (ex: 10:00)
            const timeSlotFull = `${hour.toString().padStart(2, '0')}:00`;
            if (!timeSlots.includes(timeSlotFull)) {
              timeSlots.push(timeSlotFull);
            }
            
            // Horário de meia hora (ex: 10:30) - exceto para o último horário
            if (hour < endHour) {
              const timeSlotHalf = `${hour.toString().padStart(2, '0')}:30`;
              if (!timeSlots.includes(timeSlotHalf)) {
                timeSlots.push(timeSlotHalf);
              }
            }
          }
        });
        
        // Ordenar horários
        timeSlots.sort((a, b) => a.localeCompare(b));
        setAvailableTimeSlots(timeSlots);
        
        // Resetar horários selecionados quando a data mudar
        if (timeSlots.length >= 2) {
          setValue("startTime", timeSlots[0]);
          setValue("endTime", timeSlots[1]);
        } else if (timeSlots.length === 1) {
          setValue("startTime", timeSlots[0]);
          const startHour = parseInt(timeSlots[0].split(':')[0]);
          const startMinute = timeSlots[0].includes(':30') ? 30 : 0;
          
          if (startMinute === 0) {
            const endTime = `${startHour.toString().padStart(2, '0')}:30`;
            setValue("endTime", endTime);
          } else {
            const endHour = startHour + 1;
            const endTime = `${endHour.toString().padStart(2, '0')}:00`;
            setValue("endTime", endTime);
          }
        } else {
          // Se não há horários disponíveis para este dia
          setValue("startTime", "09:00");
          setValue("endTime", "10:00");
        }
        
        console.log('Horários atualizados para a nova data:', timeSlots);
      }
    }
  }, [selectedDate, psychologistWorkingHours, selectedPsychologistId, setValue]);

  // Adicionar useEffect para sincronizar selectedDate com selectedDates
  useEffect(() => {
    // Se selectedDate mudar e não estiver em selectedDates, adicionar
    // MAS apenas se não for a inicialização inicial do componente
    if (selectedDate && !selectedDates.some(date => date.toDateString() === selectedDate.toDateString())) {
      // Verificar se não é a data inicial que foi passada como prop
      if (selectedDate.toDateString() !== initialDate.toDateString()) {
        setSelectedDates(prev => [...prev, selectedDate].sort((a, b) => a.getTime() - b.getTime()));
      }
    }
  }, [selectedDate, selectedDates, initialDate]);

  // Inicializar selectedDates quando o componente montar
  useEffect(() => {
    // Não inicializar com a data atual, deixar vazio para o usuário selecionar
    setSelectedDates([]);
  }, []);

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
            id: String(patient.id),
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
            id: String(room.id),
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
            .map((user: any) => ({ id: String(user.id), name: user.name }));
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
    // Verificar se há datas selecionadas
    if (selectedDates.length === 0) {
      toast({ 
        title: "Erro", 
        description: "Selecione pelo menos uma data para o agendamento.", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Criar agendamentos para cada data selecionada
      for (const appointmentDate of selectedDates) {
        try {
          const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/schedule-appointment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patient_id: Number(data.patientId),
              psychologist_id: Number(data.psychologistId),
              room_id: data.appointmentType === "online" ? null : (data.roomId && data.roomId.trim() !== "") ? Number(data.roomId) : null,
              date: format(appointmentDate, "yyyy-MM-dd"),
              start_time: data.startTime,
              end_time: data.endTime,
              status: "pending",
              appointment_type: data.appointmentType,
              created_at: new Date().toISOString(),
              updated_at: null,
              value: Number(data.value),
              payment_method: "private",
              insurance_type: null,
              is_recurring: false,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Erro ao agendar para ${format(appointmentDate, "dd/MM/yyyy")}:`, response.status);
          }
        } catch (error) {
          errorCount++;
          console.error(`Erro ao agendar para ${format(appointmentDate, "dd/MM/yyyy")}:`, error);
        }
      }

      // Mostrar resultado
      if (successCount > 0) {
        const message = errorCount > 0 
          ? `${successCount} agendamento(s) criado(s) com sucesso. ${errorCount} falha(s).`
          : `${successCount} agendamento(s) criado(s) com sucesso!`;
        
        toast({ 
          title: "Sucesso", 
          description: message,
          variant: errorCount > 0 ? "default" : "default"
        });
        
        // Disparar evento customizado para notificar o calendário
        const event = new CustomEvent('appointmentCreated', {
          detail: { success: true, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
        
        // Notificar que novos agendamentos foram criados
        if (onAppointmentCreated) {
          onAppointmentCreated();
        }
        onClose();
      } else {
        toast({ 
          title: "Erro", 
          description: "Falha ao criar todos os agendamentos. Tente novamente.", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("Erro geral ao salvar agendamentos:", error);
      toast({ 
        title: "Erro", 
        description: "Falha ao processar agendamentos. Tente novamente.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
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
    const startMinute = startTime.includes(':30') ? 30 : 0;
    
    // Gerar opções de término com intervalos de 30 min
    const endTimeOptions: string[] = [];
    
    // Opção 1: 30 minutos após o início (se disponível)
    if (startMinute === 0) {
      // Se início é 15:00, término pode ser 15:30
      const sameHourHalf = `${startTime.split(':')[0]}:30`;
      if (availableTimeSlots.includes(sameHourHalf)) {
        endTimeOptions.push(sameHourHalf);
      }
    } else {
      // Se início é 15:30, término pode ser 16:00
      const nextHourFull = `${(startHour + 1).toString().padStart(2, '0')}:00`;
      if (availableTimeSlots.includes(nextHourFull)) {
        endTimeOptions.push(nextHourFull);
      }
    }
    
    // Opção 2: 1 hora após o início (se disponível)
    const nextHour = startHour + 1;
    const nextHourFull = `${nextHour.toString().padStart(2, '0')}:00`;
    if (availableTimeSlots.includes(nextHourFull)) {
      endTimeOptions.push(nextHourFull);
    }
    
    // Opção 3: 1h30 após o início (se disponível)
    if (startMinute === 0) {
      const nextHourHalf = `${nextHour.toString().padStart(2, '0')}:30`;
      if (availableTimeSlots.includes(nextHourHalf)) {
        endTimeOptions.push(nextHourHalf);
      }
    }
    
    // Opção 4: Todos os horários futuros disponíveis (máximo até o último horário)
    availableTimeSlots.forEach(time => {
      const timeHour = parseInt(time.split(':')[0]);
      const timeMinute = time.includes(':30') ? 30 : 0;
      
      // Incluir horários que são posteriores ao horário de início
      if (timeHour > startHour || (timeHour === startHour && timeMinute > startMinute)) {
        if (!endTimeOptions.includes(time)) {
          endTimeOptions.push(time);
        }
      }
    });
    
    // Ordenar opções
    endTimeOptions.sort((a, b) => a.localeCompare(b));
    
    return endTimeOptions.map(time => ({ id: time, label: time }));
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
            selectedDates={selectedDates}
            onDatesChange={(dates: Date[]) => setSelectedDates(dates)}
            psychologistId={watch("psychologistId") || ""}
            disabled={isLoading}
          />
          {selectedDates.length > 0 && (
            <div className="text-xs text-green-600">
              ✓ {selectedDates.length} data(s) selecionada(s): {selectedDates.map(date => format(date, "dd/MM")).join(", ")}
            </div>
          )}
        </div>

        {appointmentType === "presential" && (
          <div className="space-y-2">
            <SelectDynamic
              name="roomId"
              control={control}
              label="Consultório *"
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
            {errors.roomId && (
              <p className="text-sm text-red-500">{errors.roomId.message}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <SelectDynamic
            name="startTime"
            control={control}
            label="Horário de Início"
            options={availableTimeSlots.length > 0 
              ? availableTimeSlots.slice(0, -1).map((time) => ({ id: time, label: time }))
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
              Horários disponíveis para início: {availableTimeSlots.slice(0, -1).join(', ')}
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
              // Se não houver horário de início, usar o primeiro disponível
              if (currentStartTime && availableTimeSlots.length > 0) {
                const startHour = parseInt(currentStartTime.split(':')[0]);
                const endHour = startHour + 1;
                const endTime = `${endHour.toString().padStart(2, '0')}:00`;
                formMethods.setValue("endTime", endTime);
              }
            }}
          />
          {selectedPsychologistId && currentStartTime && availableTimeSlots.length > 0 && (
            <div className="text-xs text-gray-500">
              Horários de término disponíveis: {generateEndTimeOptions(currentStartTime).map(opt => opt.label).join(', ')}
            </div>
          )}
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
        <Button type="submit" disabled={isLoading || selectedDates.length === 0}>
          {selectedDates.length > 1 ? `Agendar ${selectedDates.length} consultas` : "Agendar"}
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
