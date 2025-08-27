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
  identityDocument?: File | string; // Added for identity document
  insuranceDocument?: File | string; // Added for insurance document
  psychologist_name?: string; // Nome do psicólogo responsável
}

export type PaymentMethod = "private" | "insurance";
export type InsuranceType = "Unimed" | "SulAmérica" | "Fusex" | "Other" | null;
export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "confirmed" | "pending";
export type AppointmentType = "presential" | "online";
export type RecurrenceType = "weekly" | "biweekly" | null;

export interface Appointment {
  id: string;
  patient_id: string; // Referência a Patient.id
  psychologist_id: string; // Referência a psychologist.id (tabela separada)
  room_id: string | null; // Referência a ConsultingRoom.id
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
  recurrence_group_id?: string; // Referência a um grupo de recorrência
  created_at: string; // timestamp
  updated_at: string | null; // timestamp
}

// Interface estendida para uso nos componentes (com dados relacionados)
export interface AppointmentWithDetails extends Appointment {
  // Propriedades relacionadas ao paciente
  patient: Patient;
  
  // Propriedades relacionadas ao psicólogo
  psychologistId: string;
  psychologistName: string;
  
  // Propriedades relacionadas à sala
  roomId: string;
  roomName: string;
  
  // Propriedades de horário em camelCase para compatibilidade
  startTime: string;
  endTime: string;
  
  // Propriedades de pagamento em camelCase para compatibilidade
  paymentMethod: PaymentMethod;
  insuranceType: InsuranceType;
  insuranceToken?: string;
  
  // Propriedades de tipo em camelCase para compatibilidade
  appointmentType: AppointmentType;
  
  // Propriedades de recorrência em camelCase para compatibilidade
  isRecurring: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceGroupId?: number;
  
  // Propriedades de data em camelCase para compatibilidade
  createdAt: string;
  updatedAt: string | null;
  
  // Garantir que status está disponível
  status: AppointmentStatus;
}

export interface PatientRecord {
  id: number;
  patient_id: string;
  appointment_id: string | null;
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
    appointmentId: string;
    psychologistName: string;
    startTime: string;
  }>;
}
