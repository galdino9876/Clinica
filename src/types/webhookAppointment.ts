export interface WebhookAppointment {
  id: number;
  patient_id: number;
  patient_name: string;
  psychologist_id: number;
  psychologist_name: string;
  room_id: number | null;
  date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  payment_method: "private" | "insurance";
  insurance_type: string | null;
  insurance_token: string | null;
  value: string;
  appointment_type: "presential" | "online";
  is_recurring: number;
  recurrence_type: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface PatientData {
  patient_id: number;
  patient_name: string;
  psychologist_id: number;
  psychologist_name: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed";
  appointment_type: "presential" | "online";
  room_id: number | null;
  value: string;
  insurance_type: string | null;
}

export interface AppointmentGroup {
  date: string;
  patients: PatientData[];
}

export interface LembretePayload {
  date: string;
  patients: PatientData[];
}
