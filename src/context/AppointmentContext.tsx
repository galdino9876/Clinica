
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { 
  Appointment, 
  ConsultingRoom, 
  Patient,
  PatientRecord
} from '@/types/appointment';
import { useToast } from '@/components/ui/use-toast';

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
  { id: "p1", name: "Maria Silva", cpf: "123.456.789-00", phone: "(11) 98765-4321", email: "maria@email.com" },
  { id: "p2", name: "João Oliveira", cpf: "987.654.321-00", phone: "(11) 91234-5678", email: "joao@email.com" },
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
    status: "scheduled",
    paymentMethod: "private",
    insuranceType: null,
    value: 200.0,
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
    status: "scheduled",
    paymentMethod: "insurance",
    insuranceType: "Unimed",
    value: 150.0,
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
  addPatient: (patient: Omit<Patient, 'id'>) => void;
  updatePatient: (patient: Patient) => void;
  deletePatient: (id: string) => void;
  addPatientRecord: (record: Omit<PatientRecord, 'id'>) => void;
  updatePatientRecord: (record: PatientRecord) => void;
  deletePatientRecord: (id: string) => void;
  getPatientRecordsForPatient: (patientId: string) => PatientRecord[];
  getPatientById: (id: string) => Patient | undefined;
  getRoomById: (id: string) => ConsultingRoom | undefined;
  getPsychologistAppointments: (psychologistId: string) => Appointment[];
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export const AppointmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [rooms, setRooms] = useState<ConsultingRoom[]>(initialRooms);
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [patientRecords, setPatientRecords] = useState<PatientRecord[]>(initialPatientRecords);
  const { toast } = useToast();

  const addAppointment = (appointmentData: Omit<Appointment, 'id'>) => {
    const newAppointment: Appointment = {
      id: generateId(),
      ...appointmentData
    };
    setAppointments(prev => [...prev, newAppointment]);
    toast({
      title: "Appointment created",
      description: `Appointment for ${appointmentData.patient.name} has been scheduled.`
    });
  };

  const updateAppointment = (appointment: Appointment) => {
    setAppointments(prev => 
      prev.map(a => a.id === appointment.id ? appointment : a)
    );
    toast({
      title: "Appointment updated",
      description: `Appointment for ${appointment.patient.name} has been updated.`
    });
  };

  const deleteAppointment = (id: string) => {
    const appointmentToDelete = appointments.find(a => a.id === id);
    setAppointments(prev => prev.filter(a => a.id !== id));
    if (appointmentToDelete) {
      toast({
        title: "Appointment deleted",
        description: `Appointment for ${appointmentToDelete.patient.name} has been removed.`
      });
    }
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
      ...patientData
    };
    setPatients(prev => [...prev, newPatient]);
    toast({
      title: "Patient added",
      description: `Patient ${patientData.name} has been added.`
    });
    return newPatient;
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

  const deletePatient = (id: string) => {
    const patientToDelete = patients.find(p => p.id === id);
    const hasAppointments = appointments.some(a => a.patient.id === id);
    
    if (hasAppointments) {
      toast({
        title: "Cannot delete patient",
        description: `Patient ${patientToDelete?.name} has scheduled appointments.`,
        variant: "destructive"
      });
      return;
    }
    
    setPatients(prev => prev.filter(p => p.id !== id));
    if (patientToDelete) {
      toast({
        title: "Patient deleted",
        description: `Patient ${patientToDelete.name} has been removed.`
      });
    }
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
        deletePatient,
        addPatientRecord,
        updatePatientRecord,
        deletePatientRecord,
        getPatientRecordsForPatient,
        getPatientById,
        getRoomById,
        getPsychologistAppointments
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
