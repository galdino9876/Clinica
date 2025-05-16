
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
}

export type PaymentMethod = 'private' | 'insurance';
export type InsuranceType = 'Unimed' | 'SulAmérica' | 'Fusex' | 'Other' | null;

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
  status: 'scheduled' | 'completed' | 'cancelled';
  paymentMethod: PaymentMethod;
  insuranceType: InsuranceType;
  value: number;
}

export interface PatientRecord {
  id: string;
  patientId: string;
  appointmentId: string;
  date: string; // ISO date string
  notes: string;
  createdBy: string; // psychologist ID
}
