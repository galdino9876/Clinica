
export type UserRole = 'admin' | 'receptionist' | 'psychologist';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
