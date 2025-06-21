// types/patient.ts
export interface Patient {
  id: number;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  address?: string | null; // Opcional, pode ser NULL
  birthdate?: Date | null; // Opcional, pode ser NULL
  active: boolean; // tinyInt(1), default 1 (true)
  deactivationReason?: string | null; // Opcional, pode ser NULL
  deactivationDate?: Date | null; // Opcional, pode ser NULL
  identityDocument?: string | null; // Opcional, pode ser NULL
  insuranceDocument?: string | null; // Opcional, pode ser NULL
  createdAt: Date; // timestamp com CURRENT_TIMESTAMP
  updatedAt?: Date | null; // Opcional, pode ser NULL, atualizado com ON UPDATE CURRENT_TIMESTAMP
}
