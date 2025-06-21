// types/consultingRoom.ts
export interface ConsultingRoom {
  id: number;
  name: string;
  description?: string | null; // Opcional, pode ser NULL
  createdAt: Date; // timestamp com CURRENT_TIMESTAMP
  updatedAt?: Date | null; // Opcional, pode ser NULL, atualizado com ON UPDATE CURRENT_TIMESTAMP
}
