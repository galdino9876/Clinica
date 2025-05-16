
export interface ConsultingRoom {
  id: string;
  name: string;
  description?: string;
}

export interface Patient {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  address?: string;
  birthdate?: string;
  active: boolean;
  deactivationReason?: string;
  deactivationDate?: string;
}

export type PaymentMethod = 'private' | 'insurance';
export type InsuranceType = 'Unimed' | 'SulAmérica' | 'Fusex' | 'Other' | null;
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'confirmed' | 'pending';
export type AppointmentType = 'presential' | 'online';

export interface Appointment {
  id: string;
  patient: Patient;
  psychologistId: string;
  psychologistName: string;
  roomId: string;
  roomName: string;
  date: string; // ISO date string
  startTime: string; // format: "HH:MM"
  endTime: string; // format: "HH:MM"
  status: AppointmentStatus;
  paymentMethod: PaymentMethod;
  insuranceType: InsuranceType;
  value: number;
  appointmentType: AppointmentType;
}

export interface PatientRecord {
  id: string;
  patientId: string;
  appointmentId: string;
  date: string; // ISO date string
  notes: string;
  createdBy: string; // psychologist ID
}

export interface PendingPatientsData {
  date: string;
  patients: Array<{
    name: string;
    phone: string;
    email: string;
    cpf: string;
    appointmentId: string;
    psychologistName: string;
    startTime: string;
  }>;
}
