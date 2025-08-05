export interface ConsultingRoom {
  id: number;
  name: string;
  description?: string;
}

export interface Patient {
  id: number;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  address?: string;
  birthdate?: string;
  active: boolean;
  deactivationReason?: string;
  deactivationDate?: string;
  identityDocument?: File | string; // Added for identity document
  insuranceDocument?: File | string; // Added for insurance document
}

export type PaymentMethod = "private" | "insurance";
export type InsuranceType = "Unimed" | "SulAmérica" | "Fusex" | "Other" | null;
export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "confirmed" | "pending";
export type AppointmentType = "presential" | "online";
export type RecurrenceType = "weekly" | "biweekly" | null;

export interface Appointment {
  id: number;
  patient_id: number; // Referência a Patient.id
  psychologist_id: number; // Referência a psychologist.id (tabela separada)
  room_id: number | null; // Referência a ConsultingRoom.id
  date: string; // ISO date string (ex.: "2025-06-10")
  start_time: string; // format: "HH:MM" (ex.: "14:00")
  end_time: string; // format: "HH:MM" (ex.: "15:00")
  status: AppointmentStatus;
  payment_method: PaymentMethod;
  insurance_type: InsuranceType;
  insurance_token?: string; // varchar(50), nulo permitido
  value: number; // decimal(10,2)
  appointment_type: AppointmentType;
  is_recurring: boolean; // tinyint(1), mapeado de 0/1 para boolean
  recurrence_type?: RecurrenceType;
  recurrence_group_id?: number; // Referência a um grupo de recorrência
  created_at: string; // timestamp
  updated_at: string | null; // timestamp
}

export interface PatientRecord {
  id: string;
  patient_id: number;
  appointment_id: number;
  date: string; // ISO date string
  notes: string;
  created_by: number; // psychologist ID
}

export interface PendingPatientsData {
  date: string;
  patients: Array<{
    name: string;
    phone: string;
    email: string;
    cpf: string;
    appointmentId: number;
    psychologistName: string;
    startTime: string;
  }>;
}
