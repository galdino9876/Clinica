import { addDays, format, isSaturday, isSunday, parseISO } from 'date-fns';

/**
 * Calcula o próximo dia útil
 * Se hoje for sábado, retorna segunda-feira (pula domingo)
 * Caso contrário, retorna o próximo dia
 */
export const getNextBusinessDay = (): string => {
  try {
    const today = new Date();
    
    if (isSaturday(today)) {
      // Se for sábado, pular domingo e ir para segunda
      const monday = addDays(today, 2);
      return format(monday, 'yyyy-MM-dd');
    } else {
      // Para outros dias, apenas adicionar 1 dia
      const nextDay = addDays(today, 1);
      return format(nextDay, 'yyyy-MM-dd');
    }
  } catch (error) {
    console.error('Erro ao calcular próximo dia útil:', error);
    // Fallback: retorna amanhã
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return format(tomorrow, 'yyyy-MM-dd');
  }
};

/**
 * Formata a data para exibição em português
 */
export const formatDateForDisplay = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return dateString; // Retorna a string original em caso de erro
  }
};

/**
 * Verifica se uma data é um dia útil (não é sábado nem domingo)
 */
export const isBusinessDay = (date: Date): boolean => {
  return !isSaturday(date) && !isSunday(date);
};
