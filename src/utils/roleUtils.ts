/**
 * Utilitários para verificação de roles de usuário
 */

/**
 * Verifica se o usuário é psicólogo de forma robusta
 * @param role - Role do usuário
 * @returns true se for psicólogo
 */
export const isPsychologist = (role: string | undefined | null): boolean => {
  if (!role) return false;
  
  return role === 'psychologist' || 
         role.toLowerCase() === 'psychologist' ||
         role.trim() === 'psychologist' ||
         role.includes('psychologist');
};

/**
 * Verifica se o usuário é admin de forma robusta
 * @param role - Role do usuário
 * @returns true se for admin
 */
export const isAdmin = (role: string | undefined | null): boolean => {
  if (!role) return false;
  
  return role === 'admin' || 
         role.toLowerCase() === 'admin' ||
         role.trim() === 'admin';
};

/**
 * Verifica se o usuário é recepcionista de forma robusta
 * @param role - Role do usuário
 * @returns true se for recepcionista
 */
export const isReceptionist = (role: string | undefined | null): boolean => {
  if (!role) return false;
  
  return role === 'receptionist' || 
         role.toLowerCase() === 'receptionist' ||
         role.trim() === 'receptionist';
};

/**
 * Verifica se o usuário tem permissões administrativas (admin ou recepcionista)
 * @param role - Role do usuário
 * @returns true se tiver permissões administrativas
 */
export const hasAdminPermissions = (role: string | undefined | null): boolean => {
  return isAdmin(role) || isReceptionist(role);
};
