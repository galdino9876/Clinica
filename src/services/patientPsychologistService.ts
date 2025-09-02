// Serviço para gerenciar dados de pacientes e psicólogos
// Em uma implementação real, estes dados viriam de APIs ou banco de dados

export interface PatientInfo {
  name: string;
  phone: string;
  email: string;
}

export interface PsychologistInfo {
  name: string;
  specialization?: string;
}

// Mapeamento de IDs de psicólogos para dados
export const psychologistData: Record<number, PsychologistInfo> = {
  19: { name: "Dr. João Silva", specialization: "Psicologia Clínica" },
  20: { name: "Dra. Maria Santos", specialization: "Terapia Cognitivo-Comportamental" },
  21: { name: "Dr. Pedro Costa", specialization: "Psicologia Organizacional" },
  24: { name: "Dra. Ana Oliveira", specialization: "Psicologia Infantil" },
  26: { name: "Dr. Carlos Lima", specialization: "Psicologia Social" }
};

// Mapeamento de IDs de pacientes para dados
export const patientData: Record<number, PatientInfo> = {
  89: { name: "Paciente 89", phone: "(11) 99999-9999", email: "paciente89@email.com" },
  90: { name: "Paciente 90", phone: "(11) 88888-8888", email: "paciente90@email.com" },
  92: { name: "Paciente 92", phone: "(11) 77777-7777", email: "paciente92@email.com" },
  93: { name: "Paciente 93", phone: "(11) 66666-6666", email: "paciente93@email.com" },
  96: { name: "Paciente 96", phone: "(11) 55555-5555", email: "paciente96@email.com" },
  102: { name: "Paciente 102", phone: "(11) 44444-4444", email: "paciente102@email.com" },
  115: { name: "Paciente 115", phone: "(11) 33333-3333", email: "paciente115@email.com" },
  116: { name: "Paciente 116", phone: "(11) 22222-2222", email: "paciente116@email.com" },
  117: { name: "Paciente 117", phone: "(11) 11111-1111", email: "paciente117@email.com" }
};

export const getPatientInfo = (patientId: number): PatientInfo | null => {
  return patientData[patientId] || null;
};

export const getPsychologistInfo = (psychologistId: number): PsychologistInfo | null => {
  return psychologistData[psychologistId] || null;
};

export const getPsychologistName = (psychologistId: number): string => {
  const info = getPsychologistInfo(psychologistId);
  return info?.name || `Psicólogo ID: ${psychologistId}`;
};
