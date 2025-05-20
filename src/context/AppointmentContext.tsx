
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { 
  Appointment, 
  ConsultingRoom, 
  Patient,
  PatientRecord,
  AppointmentStatus,
  PendingPatientsData
} from '@/types/appointment';
import { useToast } from '@/components/ui/use-toast';
import { format, addDays, parse, isAfter, isBefore, isEqual } from 'date-fns';
import { useAuth } from './AuthContext';
import { User } from '@/types/user';

// Function to generate random ID
const generateId = (): string => Math.random().toString(36).substring(2, 11);

// Sample data
const initialRooms: ConsultingRoom[] = [
  { id: "room1", name: "Room 101" },
  { id: "room2", name: "Room 102" },
  { id: "room3", name: "Room 103" },
  { id: "room4", name: "Room 104" },
  { id: "room5", name: "Room 105" },
];

const initialPatients: Patient[] = [
  { 
    id: "p1", 
    name: "Maria Silva", 
    cpf: "123.456.789-00", 
    phone: "(11) 98765-4321", 
    email: "maria@email.com",
    active: true 
  },
  { 
    id: "p2", 
    name: "João Oliveira", 
    cpf: "987.654.321-00", 
    phone: "(11) 91234-5678", 
    email: "joao@email.com",
    active: true 
  },
];

const initialAppointments: Appointment[] = [
  {
    id: "a1",
    patient: initialPatients[0],
    psychologistId: "3",
    psychologistName: "Dr. John Smith",
    roomId: "room1",
    roomName: "Room 101",
    date: new Date().toISOString().split('T')[0],
    startTime: "09:00",
    endTime: "10:00",
    status: "confirmed",
    paymentMethod: "private",
    insuranceType: null,
    value: 200.0,
    appointmentType: "presential"
  },
  {
    id: "a2",
    patient: initialPatients[1],
    psychologistId: "4",
    psychologistName: "Dr. Sarah Johnson",
    roomId: "room2",
    roomName: "Room 102",
    date: new Date().toISOString().split('T')[0],
    startTime: "10:00",
    endTime: "11:00",
    status: "pending",
    paymentMethod: "insurance",
    insuranceType: "Unimed",
    value: 150.0,
    appointmentType: "presential"
  }
];

const initialPatientRecords: PatientRecord[] = [
  {
    id: "record1",
    patientId: "p1",
    appointmentId: "a1",
    date: new Date().toISOString().split('T')[0],
    notes: "Initial consultation. Patient reported mild anxiety symptoms.",
    createdBy: "3",
  }
];

interface AppointmentContextType {
  appointments: Appointment[];
  rooms: ConsultingRoom[];
  patients: Patient[];
  patientRecords: PatientRecord[];
  addAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  updateAppointment: (appointment: Appointment) => void;
  deleteAppointment: (id: string) => void;
  addRoom: (room: Omit<ConsultingRoom, 'id'>) => void;
  updateRoom: (room: ConsultingRoom) => void;
  deleteRoom: (id: string) => void;
  addPatient: (patient: Omit<Patient, 'id'>) => Patient;
  updatePatient: (patient: Patient) => void;
  deactivatePatient: (id: string, reason: string) => void;
  reactivatePatient: (id: string) => void;
  addPatientRecord: (record: Omit<PatientRecord, 'id'>) => void;
  updatePatientRecord: (record: PatientRecord) => void;
  deletePatientRecord: (id: string) => void;
  getPatientRecordsForPatient: (patientId: string) => PatientRecord[];
  getPatientById: (id: string) => Patient | undefined;
  getRoomById: (id: string) => ConsultingRoom | undefined;
  getPsychologistAppointments: (psychologistId: string) => Appointment[];
  updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) => void;
  findNextAvailableSlot: (psychologistId: string) => { date: Date, startTime: string, endTime: string } | null;
  rescheduleAppointment: (appointmentId: string, newDate: string, newStartTime: string, newEndTime: string) => void;
  getPendingAppointmentsByDate: () => PendingPatientsData[];
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export const AppointmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [rooms, setRooms] = useState<ConsultingRoom[]>(initialRooms);
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [patientRecords, setPatientRecords] = useState<PatientRecord[]>(initialPatientRecords);
  const { toast } = useToast();
  const { users } = useAuth();

  const addAppointment = (appointmentData: Omit<Appointment, 'id'>) => {
    const newAppointment: Appointment = {
      id: generateId(),
      ...appointmentData,
      status: appointmentData.status || "pending", // Default to pending if not provided
    };
    setAppointments(prev => [...prev, newAppointment]);
    toast({
      title: "Consulta agendada",
      description: `Agendamento para ${appointmentData.patient.name} foi criado.`
    });
  };

  const updateAppointment = (appointment: Appointment) => {
    setAppointments(prev => 
      prev.map(a => a.id === appointment.id ? appointment : a)
    );
    toast({
      title: "Agendamento atualizado",
      description: `Agendamento para ${appointment.patient.name} foi atualizado.`
    });
  };

  const deleteAppointment = (id: string) => {
    const appointmentToDelete = appointments.find(a => a.id === id);
    setAppointments(prev => prev.filter(a => a.id !== id));
    if (appointmentToDelete) {
      toast({
        title: "Agendamento excluído",
        description: `Agendamento para ${appointmentToDelete.patient.name} foi removido.`
      });
    }
  };

  const updateAppointmentStatus = (appointmentId: string, status: AppointmentStatus) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    const updatedAppointment = { ...appointment, status };
    updateAppointment(updatedAppointment);
    
    toast({
      title: "Status atualizado",
      description: `O status do agendamento foi alterado para ${status === 'confirmed' ? 'confirmado' : status === 'pending' ? 'pendente' : status}.`
    });
  };

  const findNextAvailableSlot = (psychologistId: string) => {
    // Encontre o psicólogo
    const psychologist = users.find(u => u.id === psychologistId) as User;
    if (!psychologist || !psychologist.workingHours || psychologist.workingHours.length === 0) {
      return null;
    }

    const today = new Date();
    let currentDate = today;
    let found = false;
    let resultDate, resultStartTime, resultEndTime;

    // Verifica por até 60 dias no futuro
    for (let dayOffset = 0; dayOffset < 60 && !found; dayOffset++) {
      const checkDate = addDays(today, dayOffset);
      const dayOfWeek = checkDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      
      // Verifica se o psicólogo trabalha neste dia da semana
      const workingHoursForDay = psychologist.workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
      
      if (workingHoursForDay) {
        const { startTime, endTime } = workingHoursForDay;
        const dateString = format(checkDate, 'yyyy-MM-dd');
        
        // Pega todos os agendamentos deste psicólogo nesta data
        const psychologistAppointmentsOnDate = appointments.filter(
          a => a.psychologistId === psychologistId && a.date === dateString
        );
        
        // Gere slots de tempo a cada 30 min entre o início e fim do expediente
        const availableSlots = generateTimeSlots(startTime, endTime, 60); // 60 minutos por consulta
        
        // Para cada slot de tempo potencial, verifique se está disponível
        for (const slot of availableSlots) {
          const [slotStartTime, slotEndTime] = slot;
          
          // Verifique se o slot já está ocupado
          const isSlotTaken = psychologistAppointmentsOnDate.some(appointment => {
            return isOverlapping(appointment.startTime, appointment.endTime, slotStartTime, slotEndTime);
          });
          
          // Se o slot estiver livre e for futuro (ou hoje, mas horário futuro)
          if (!isSlotTaken) {
            const slotDateTime = combineDateTime(checkDate, slotStartTime);
            
            // Se o slot for no futuro
            if (isAfter(slotDateTime, new Date())) {
              resultDate = checkDate;
              resultStartTime = slotStartTime;
              resultEndTime = slotEndTime;
              found = true;
              break;
            }
          }
        }
        
        if (found) break;
      }
    }
    
    if (found) {
      return { 
        date: resultDate!, 
        startTime: resultStartTime!, 
        endTime: resultEndTime! 
      };
    }
    
    return null;
  };

  const rescheduleAppointment = (appointmentId: string, newDate: string, newStartTime: string, newEndTime: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    const updatedAppointment = { 
      ...appointment, 
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      status: "pending" as AppointmentStatus // Reset to pending when rescheduled
    };
    
    updateAppointment(updatedAppointment);
    
    toast({
      title: "Consulta reagendada",
      description: `A consulta foi remarcada para ${format(new Date(newDate), 'dd/MM/yyyy')} às ${newStartTime}.`
    });
  };

  const getPendingAppointmentsByDate = (): PendingPatientsData[] => {
    // Get all pending appointments
    const pendingAppointments = appointments.filter(
      app => app.status === "pending"
    ).sort((a, b) => {
      // Sort by date first
      const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      
      // If same date, sort by time
      return a.startTime.localeCompare(b.startTime);
    });
    
    // Group by date
    const groupedByDate: Record<string, PendingPatientsData> = {};
    
    pendingAppointments.forEach(app => {
      if (!groupedByDate[app.date]) {
        groupedByDate[app.date] = {
          date: app.date,
          patients: []
        };
      }
      
      groupedByDate[app.date].patients.push({
        name: app.patient.name,
        phone: app.patient.phone,
        email: app.patient.email,
        cpf: app.patient.cpf,
        appointmentId: app.id,
        psychologistName: app.psychologistName,
        startTime: app.startTime
      });
    });
    
    // Convert to array
    return Object.values(groupedByDate);
  };

  // Funções auxiliares
  
  const isOverlapping = (existingStart: string, existingEnd: string, newStart: string, newEnd: string) => {
    // Converte para minutos desde 00:00 para comparação
    const existingStartMin = timeToMinutes(existingStart);
    const existingEndMin = timeToMinutes(existingEnd);
    const newStartMin = timeToMinutes(newStart);
    const newEndMin = timeToMinutes(newEnd);
    
    return (
      (newStartMin >= existingStartMin && newStartMin < existingEndMin) || // new start is during existing
      (newEndMin > existingStartMin && newEndMin <= existingEndMin) || // new end is during existing
      (newStartMin <= existingStartMin && newEndMin >= existingEndMin) // new contains existing
    );
  };

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const generateTimeSlots = (startTime: string, endTime: string, durationMinutes: number) => {
    const slots = [];
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    
    for (let currentMin = startMin; currentMin + durationMinutes <= endMin; currentMin += 30) {
      const slotStartTime = minutesToTime(currentMin);
      const slotEndTime = minutesToTime(currentMin + durationMinutes);
      slots.push([slotStartTime, slotEndTime]);
    }
    
    return slots;
  };

  const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const combineDateTime = (date: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  };

  const addRoom = (roomData: Omit<ConsultingRoom, 'id'>) => {
    const newRoom: ConsultingRoom = {
      id: generateId(),
      ...roomData
    };
    setRooms(prev => [...prev, newRoom]);
    toast({
      title: "Room added",
      description: `Room ${roomData.name} has been added.`
    });
  };

  const updateRoom = (room: ConsultingRoom) => {
    setRooms(prev => 
      prev.map(r => r.id === room.id ? room : r)
    );
    toast({
      title: "Room updated",
      description: `Room ${room.name} has been updated.`
    });
  };

  const deleteRoom = (id: string) => {
    const roomToDelete = rooms.find(r => r.id === id);
    const hasAppointments = appointments.some(a => a.roomId === id);
    
    if (hasAppointments) {
      toast({
        title: "Cannot delete room",
        description: `Room ${roomToDelete?.name} has scheduled appointments.`,
        variant: "destructive"
      });
      return;
    }
    
    setRooms(prev => prev.filter(r => r.id !== id));
    if (roomToDelete) {
      toast({
        title: "Room deleted",
        description: `Room ${roomToDelete.name} has been removed.`
      });
    }
  };

  const addPatient = (patientData: Omit<Patient, 'id'>) => {
    const newPatient: Patient = {
      id: generateId(),
      ...patientData,
      active: true
    };
    setPatients(prev => [...prev, newPatient]);
    toast({
      title: "Patient added",
      description: `Patient ${patientData.name} has been added.`
    });
    return newPatient; // Explicitly return the new patient object
  };

  const updatePatient = (patient: Patient) => {
    setPatients(prev => 
      prev.map(p => p.id === patient.id ? patient : p)
    );
    toast({
      title: "Patient updated",
      description: `Patient ${patient.name} has been updated.`
    });
  };

  const deactivatePatient = (id: string, reason: string) => {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;
    
    const updatedPatient = { 
      ...patient, 
      active: false,
      deactivationReason: reason,
      deactivationDate: new Date().toISOString().split('T')[0]
    };
    
    updatePatient(updatedPatient);
    
    // Cancel all future appointments for this patient
    const patientAppointments = appointments.filter(
      app => app.patient.id === id && 
      // Only cancel future appointments or those on the same day
      (new Date(app.date) >= new Date(new Date().setHours(0, 0, 0, 0))) &&
      // Only cancel pending or confirmed appointments
      (app.status === "pending" || app.status === "confirmed")
    );
    
    if (patientAppointments.length > 0) {
      // Update all of these appointments to cancelled
      patientAppointments.forEach(app => {
        updateAppointment({
          ...app,
          status: "cancelled" as AppointmentStatus
        });
      });
      
      toast({
        title: `${patientAppointments.length} agendamentos cancelados`,
        description: `Os agendamentos futuros do paciente ${patient.name} foram cancelados automaticamente.`,
      });
    }
    
    toast({
      title: "Paciente desativado",
      description: `O paciente ${patient.name} foi desativado com sucesso.`
    });
  };

  const reactivatePatient = (id: string) => {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;
    
    const updatedPatient = { 
      ...patient, 
      active: true,
      deactivationReason: undefined,
      deactivationDate: undefined
    };
    
    updatePatient(updatedPatient);
    
    toast({
      title: "Paciente reativado",
      description: `O paciente ${patient.name} foi reativado com sucesso.`
    });
  };

  const addPatientRecord = (recordData: Omit<PatientRecord, 'id'>) => {
    const newRecord: PatientRecord = {
      id: generateId(),
      ...recordData
    };
    setPatientRecords(prev => [...prev, newRecord]);
    toast({
      title: "Record added",
      description: `Patient record has been added.`
    });
  };

  const updatePatientRecord = (record: PatientRecord) => {
    setPatientRecords(prev => 
      prev.map(r => r.id === record.id ? record : r)
    );
    toast({
      title: "Record updated",
      description: `Patient record has been updated.`
    });
  };

  const deletePatientRecord = (id: string) => {
    setPatientRecords(prev => prev.filter(r => r.id !== id));
    toast({
      title: "Record deleted",
      description: `Patient record has been removed.`
    });
  };

  const getPatientRecordsForPatient = (patientId: string) => {
    return patientRecords.filter(record => record.patientId === patientId);
  };

  const getPatientById = (id: string) => {
    return patients.find(patient => patient.id === id);
  };

  const getRoomById = (id: string) => {
    return rooms.find(room => room.id === id);
  };

  const getPsychologistAppointments = (psychologistId: string) => {
    return appointments.filter(app => app.psychologistId === psychologistId);
  };

  return (
    <AppointmentContext.Provider
      value={{
        appointments,
        rooms,
        patients,
        patientRecords,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        addRoom,
        updateRoom,
        deleteRoom,
        addPatient,
        updatePatient,
        deactivatePatient,
        reactivatePatient,
        addPatientRecord,
        updatePatientRecord,
        deletePatientRecord,
        getPatientRecordsForPatient,
        getPatientById,
        getRoomById,
        getPsychologistAppointments,
        updateAppointmentStatus,
        findNextAvailableSlot,
        rescheduleAppointment,
        getPendingAppointmentsByDate
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
};

export const useAppointments = () => {
  const context = useContext(AppointmentContext);
  if (context === undefined) {
    throw new Error('useAppointments must be used within an AppointmentProvider');
  }
  return context;
};
