
export type UserRole = 'admin' | 'receptionist' | 'psychologist';

export interface WorkingHours {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo, 1 = segunda, etc.
  startTime: string; // formato "HH:MM"
  endTime: string; // formato "HH:MM"
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  workingHours?: WorkingHours[]; // Disponibilidade para psicólogos
}
