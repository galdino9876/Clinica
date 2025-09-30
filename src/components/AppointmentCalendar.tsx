import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, MapPin, X, Loader2, Plus } from 'lucide-react';
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AppointmentForm from "./AppointmentForm";
import { useToast } from "@/components/ui/use-toast";
import { isPsychologist } from "@/utils/roleUtils";

// Tipos para melhorar a tipagem
interface Appointment {
  id: string;
  date: string;
  appointment_date?: string;
  scheduled_date?: string;
  start_time: string;
  end_time: string;
  patient_id: string;
  psychologist_id: string;
  room_id?: string;
  status: 'pending' | 'confirmed' | 'canceled' | 'completed';
  value?: number;
  // Campos alternativos que podem vir da API
  endTime?: string;
  startTime?: string;
  time?: string;
  price?: number;
  // Campo da guia
  guia?: string | null;
}

interface WorkingHour {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  appointment_type?: "presential" | "online";
}

interface Patient {
  id: string;
  nome?: string;
  name?: string;
}

interface User {
  id: string;
  nome?: string;
  name?: string;
}

interface DayStatus {
  status: 'none' | 'available' | 'confirmed' | 'pending' | 'full';
  color: string;
}

interface DayDetails {
  date: string;
  appointments: Appointment[];
  workingHours: WorkingHour[];
}

interface TimeSlot {
  time: string;
  appointments: Appointment[];
  hasAppointments: boolean;
  availablePsychologists?: Array<{
    id: string;
    name: string;
    workingHours: WorkingHour[];
  }>;
}

// Constantes para melhorar manutenibilidade
const STATUS_COLORS = {
  pending: 'bg-amber-500',
  confirmed: 'bg-emerald-600',
  canceled: 'bg-rose-600',
  completed: 'bg-purple-600'
} as const;

const STATUS_LABELS = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  canceled: 'Cancelado',
  completed: 'Atendimento realizado - Aguardando pagamento'
} as const;

const STATUS_BADGE_COLORS = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  canceled: 'bg-rose-100 text-rose-800 border-rose-200',
  completed: 'bg-purple-100 text-purple-800 border-purple-200'
} as const;

// Cores para os dias do calendário
const DAY_STATUS_COLORS = {
  none: '',
  available: 'bg-sky-100 text-sky-800 border border-sky-200 hover:bg-sky-200',
  confirmed: 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200',
  pending: '',
  full: 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200'
} as const;

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

// Hook customizado para gerenciar dados da API
const useAppointmentData = (user: any) => {
  const [data, setData] = useState({
    appointments: [] as Appointment[],
    workingHours: [] as WorkingHour[],
    patients: [] as Patient[],
    users: [] as User[],
    rooms: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const baseUrl = 'https://webhook.essenciasaudeintegrada.com.br/webhook';
      
      // Verificar se é psicólogo de forma mais robusta
      const isUserPsychologist = isPsychologist(user?.role);
      const psychologistId = isUserPsychologist ? user.id : null;

      // URLs baseadas no role do usuário
      const urls = {
        appointments: psychologistId
          ? `${baseUrl}/d52c9494-5de9-4444-877e-9e8d01662962/appointmens/${psychologistId}`
          : `${baseUrl}/appointmens`,
        workingHours: psychologistId
          ? `${baseUrl}/d52c9494-5de9-4444-877e-9e8d01662962/working_hours/${psychologistId}`
          : `${baseUrl}/working_hours`,
        patients: `${baseUrl}/patients`,
        users: `${baseUrl}/users`,
        rooms: `${baseUrl}/consulting_rooms`
      };

      // Fetch paralelo para melhor performance com timeout
      const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), 30000); // 30s timeout

      const [appointmentsRes, workingHoursRes, patientsRes, usersRes, roomsRes] = await Promise.all([
        fetch(urls.appointments, { signal: abortControllerRef.current.signal }),
        fetch(urls.workingHours, { signal: abortControllerRef.current.signal }),
        fetch(urls.patients, { signal: abortControllerRef.current.signal }),
        fetch(urls.users, { signal: abortControllerRef.current.signal }),
        fetch(urls.rooms, { signal: abortControllerRef.current.signal })
      ]);

      clearTimeout(timeoutId);

      // Verificar se as respostas são válidas
      if (!appointmentsRes.ok || !workingHoursRes.ok || !patientsRes.ok || !usersRes.ok || !roomsRes.ok) {
        throw new Error(`Erro na API: ${appointmentsRes.status} ${workingHoursRes.status} ${patientsRes.status} ${usersRes.status} ${roomsRes.status}`);
      }

      // Processar respostas
      const [appointmentsData, workingHoursData, patientsData, usersData, roomsData] = await Promise.all([
        appointmentsRes.json(),
        workingHoursRes.json(),
        patientsRes.json(),
        usersRes.json(),
        roomsRes.json()
      ]);

      // Validar e normalizar os dados dos agendamentos
      const normalizedAppointments = (Array.isArray(appointmentsData) ? appointmentsData : appointmentsData.data || [])
        .filter(apt => apt && apt.id) // Filtrar dados inválidos
        .map(apt => {
          return {
            ...apt,
            // Garantir que end_time seja sempre o campo correto para horário de término
            end_time: apt.end_time || apt.endTime || '00:00',
            // Usar o status diretamente da API (pending, confirmed, canceled)
            status: apt.status || 'pending',
            // Garantir que start_time seja sempre o campo correto para horário de início
            start_time: apt.start_time || apt.startTime || apt.time || '00:00',
            // Garantir que date seja sempre o campo correto para data
            date: apt.date || apt.appointment_date || apt.scheduled_date || new Date().toISOString().split('T')[0],
            // Garantir que value seja sempre um número válido
            value: Math.max(0, parseFloat(String(apt.value || apt.price || 0)) || 0)
          };
        });

      // Verificar se há duplicação por ID
      const appointmentIds = normalizedAppointments.map(apt => apt.id);
      const uniqueIds = new Set(appointmentIds);

      if (appointmentIds.length !== uniqueIds.size) {
        // Remover duplicatas mantendo apenas o primeiro de cada ID
        const seenIds = new Set();
        const deduplicatedAppointments = normalizedAppointments.filter(apt => {
          if (seenIds.has(apt.id)) {
            return false;
          }
          seenIds.add(apt.id);
          return true;
        });

        normalizedAppointments.length = 0;
        normalizedAppointments.push(...deduplicatedAppointments);
      }

      setData({
        appointments: normalizedAppointments,
        workingHours: Array.isArray(workingHoursData) ? workingHoursData : workingHoursData.data || [],
        patients: Array.isArray(patientsData) ? patientsData : patientsData.data || [],
        users: Array.isArray(usersData) ? usersData : usersData.data || [],
        rooms: Array.isArray(roomsData) ? roomsData : roomsData.data || []
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Requisição foi cancelada, não é um erro
        return;
      }
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();

    // Cleanup function para cancelar requisições pendentes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return { ...data, loading, error, refetch: fetchData };
};

// Hook customizado para formatação de datas
const useDateUtils = () => {
  const formatDate = useCallback((date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const getDaysInMonth = useCallback((date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }, []);

  const getFirstDayOfMonth = useCallback((date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }, []);

  const formatDisplayDate = useCallback((dateString: string): string => {
    try {
      // Tentar diferentes formatos de data
      let date: Date;

      if (dateString.includes('T')) {
        // Formato ISO (2024-01-01T00:00:00.000Z)
        date = new Date(dateString);
      } else if (dateString.includes('-')) {
        // Formato YYYY-MM-DD (2024-01-01)
        date = new Date(dateString + 'T00:00:00');
      } else {
        // Formato DD/MM/YYYY ou outro
        date = new Date(dateString);
      }

      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }

      const formattedDate = date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      return formattedDate;

    } catch (error) {
      return 'Erro na formatação da data';
    }
  }, []);

  return { formatDate, getDaysInMonth, getFirstDayOfMonth, formatDisplayDate };
};

// Hook customizado para lógica de status dos dias
const useDayStatus = (appointments: Appointment[], workingHours: WorkingHour[]) => {
  const getDayStatus = useCallback((day: number, currentDate: Date, formatDate: (date: Date) => string): DayStatus => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateString = formatDate(date);
    const dayOfWeek = date.getDay();

    const dayAppointments = appointments.filter(apt => {
      const aptDate = apt.date || apt.appointment_date || apt.scheduled_date;
      return aptDate === dateString;
    });
    const dayWorkingHours = workingHours.filter(wh => wh.day_of_week === dayOfWeek);

    // Se não há horários configurados para este dia, retorna sem status
    if (dayWorkingHours.length === 0) {
      return { status: 'none', color: '' };
    }

    // Calcular total de slots disponíveis para este dia
    const totalSlots = dayWorkingHours.reduce((total, wh) => {
      const startHour = parseInt(wh.start_time.split(':')[0]);
      const endHour = parseInt(wh.end_time.split(':')[0]);
      // Considerar que cada hora é um slot disponível
      return total + Math.max(0, endHour - startHour);
    }, 0);

    const occupiedSlots = dayAppointments.length;
    const confirmedAppointments = dayAppointments.filter(apt => apt.status === 'confirmed');

    // Se todos os horários estão agendados
    if (occupiedSlots >= totalSlots && totalSlots > 0) {
      // Se todos os agendamentos estão confirmados = VERDE (Confirmados)
      if (confirmedAppointments.length === occupiedSlots && occupiedSlots > 0) {
        return { status: 'confirmed', color: '' };
      } else {
        // Se nem todos estão confirmados = VERMELHO (Totalmente agendado)
        return { status: 'full', color: '' };
      }
    } else if (dayWorkingHours.length > 0 && totalSlots > 0) {
      // Se há horários disponíveis = AZUL (Disponibilidade)
      return { status: 'available', color: '' };
    }

    // Caso padrão
    return { status: 'none', color: '' };
  }, [appointments, workingHours]);

  return { getDayStatus };
};

// Componente para a legenda do calendário
const CalendarLegend = () => (
  <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-sky-500 border border-sky-600"></div>
        <span className="text-gray-700">Horário Livre</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-emerald-600 border border-emerald-700"></div>
        <span className="text-gray-700">Confirmado</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600"></div>
        <span className="text-gray-700">Pendente</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-rose-600 border border-rose-700"></div>
        <span className="text-gray-700">Cancelado</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600"></div>
        <span className="text-gray-700">Indicador de Agendamento</span>
      </div>
    </div>
  </div>
);

// Componente para navegação do calendário
const CalendarNavigation = ({
  currentDate,
  onNavigate
}: {
  currentDate: Date;
  onNavigate: (direction: number) => void;
}) => (
  <div className="px-6 py-4 flex justify-between items-center border-b bg-gradient-to-r from-gray-50 to-gray-100">
    <button
      onClick={() => onNavigate(-1)}
      className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg transition-all duration-200 ease-in-out border border-gray-200 hover:border-gray-300 hover:shadow-md font-medium text-sm"
    >
      <ChevronLeft size={18} />
      Mês Anterior
    </button>

    <div className="text-center">
      <h3 className="text-xl font-bold text-gray-800 capitalize">
        {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
      </h3>
      <p className="text-xs text-gray-500 mt-1">Navegue pelos meses para visualizar os agendamentos</p>
    </div>

    <button
      onClick={() => onNavigate(1)}
      className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg transition-all duration-200 ease-in-out border border-gray-200 hover:border-gray-300 hover:shadow-md font-medium text-sm"
    >
      Próximo Mês
      <ChevronRight size={18} />
    </button>
  </div>
);

// Componente para o cabeçalho dos dias da semana
const CalendarHeader = () => (
  <div className="grid grid-cols-7 gap-1 mb-2">
    {DAYS_OF_WEEK.map((day) => (
      <div
        key={day}
        className="p-2 text-center text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg"
      >
        {day}
      </div>
    ))}
  </div>
);

// Componente para um slot de horário
const TimeSlot = ({
  slot,
  getPatientName,
  getPsychologistName,
  getRoomName,
  userRole,
  onStatusChange,
  onAttendanceCompleted,
  availablePsychologists,
  onEditAppointment,
  toast,
  formatDisplayDate,
  onRescheduleSuccess
}: {
  slot: TimeSlot;
  getPatientName: (id: string) => string;
  getPsychologistName: (id: string) => string;
  getRoomName: (roomId: string | null | undefined) => string;
  userRole?: string;
  onStatusChange: (appointmentId: string, action: 'confirmar' | 'cancelar') => Promise<void>;
  onAttendanceCompleted: (appointment: Appointment) => void;
  availablePsychologists: Array<{ id: string, name: string, workingHours: WorkingHour[] }>;
  onEditAppointment: (appointment: Appointment) => void;
  toast: any;
  formatDisplayDate: (dateString: string) => string;
  onRescheduleSuccess: () => Promise<void>;
}) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
      <div className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        <Clock className="w-5 h-5 text-gray-600" />
        {slot.time}
      </div>
    </div>

    <div className="p-4">
      {slot.hasAppointments ? (
        <div className="space-y-3">
          {slot.appointments.map((apt: Appointment, aptIndex: number) => (
            <AppointmentCard
              key={aptIndex}
              appointment={apt}
              getPatientName={getPatientName}
              getPsychologistName={getPsychologistName}
              getRoomName={getRoomName}
              userRole={userRole}
              onStatusChange={onStatusChange}
              onAttendanceCompleted={onAttendanceCompleted}
              onEditAppointment={onEditAppointment}
              toast={toast}
              formatDisplayDate={formatDisplayDate}
              onRescheduleSuccess={onRescheduleSuccess}
            />
          ))}

          {/* Mostrar psicólogos ainda disponíveis para este horário mesmo com agendamentos existentes */}
          {(() => {
            const currentHour = parseInt(slot.time.split(':')[0]);

            // Filtrar psicólogos que têm horário disponível para este slot específico
            // MAS que NÃO têm agendamentos neste horário
            const availablePsychsForThisSlot = availablePsychologists.filter(psych => {
              // Verificar se o psicólogo tem horário disponível para este slot
              const hasWorkingHours = psych.workingHours.some(wh => {
                const startHour = parseInt(wh.start_time.split(':')[0]);
                const endHour = parseInt(wh.end_time.split(':')[0]);
                return currentHour >= startHour && currentHour < endHour;
              });

              if (!hasWorkingHours) return false;

              // Verificar se o psicólogo já tem agendamento neste horário
              const hasAppointment = slot.appointments.some(apt => apt.psychologist_id === psych.id);

              // Retornar true se tem horário disponível E não tem agendamento
              return !hasAppointment;
            });

            if (availablePsychsForThisSlot.length > 0) {
              return (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-sky-500 border border-sky-600"></div>
                    <div className="text-sm font-medium text-sky-700">Outros psicólogos disponíveis:</div>
                  </div>

                  <div className="pl-6 mt-2">
                    <div className="space-y-1">
                      {availablePsychsForThisSlot.map((psych) => {
                        // Encontrar o horário específico deste psicólogo para este slot
                        const relevantWorkingHour = psych.workingHours.find(wh => {
                          const startHour = parseInt(wh.start_time.split(':')[0]);
                          const endHour = parseInt(wh.end_time.split(':')[0]);
                          return currentHour >= startHour && currentHour < endHour;
                        });

                        return (
                          <div key={psych.id} className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-gray-700 font-medium">{psych.name}</span>
                            {relevantWorkingHour && (
                              <span className="text-xs text-gray-500 ml-2">
                                ({relevantWorkingHour.start_time} - {relevantWorkingHour.end_time}) - {relevantWorkingHour.appointment_type === "presential" ? "presencial" : relevantWorkingHour.appointment_type === "online" ? "online" : "presencial"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-sky-500 border border-sky-600"></div>
            <div className="text-lg font-medium text-sky-700 font-semibold">Horário Livre</div>
          </div>

          {/* Mostrar psicólogos disponíveis para este horário específico */}
          {(() => {
            // Filtrar psicólogos que têm horário disponível para este slot específico
            const currentHour = parseInt(slot.time.split(':')[0]);
            const psychsForThisSlot = availablePsychologists.filter(psych => {
              return psych.workingHours.some(wh => {
                const startHour = parseInt(wh.start_time.split(':')[0]);
                const endHour = parseInt(wh.end_time.split(':')[0]);
                return currentHour >= startHour && currentHour < endHour;
              });
            });

            if (psychsForThisSlot.length > 0) {
              return (
                <div className="pl-6">
                  <p className="text-sm text-gray-600 mb-2">
                    {psychsForThisSlot.length === 1 ? 'Psicólogo disponível:' : 'Psicólogos disponíveis:'}
                  </p>
                  <div className="space-y-1">
                    {psychsForThisSlot.map((psych) => {
                      // Encontrar o horário específico deste psicólogo para este slot
                      const relevantWorkingHour = psych.workingHours.find(wh => {
                        const startHour = parseInt(wh.start_time.split(':')[0]);
                        const endHour = parseInt(wh.end_time.split(':')[0]);
                        return currentHour >= startHour && currentHour < endHour;
                      });

                      return (
                        <div key={psych.id} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-gray-700 font-medium">{psych.name}</span>
                          {relevantWorkingHour && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({relevantWorkingHour.start_time} - {relevantWorkingHour.end_time}) - {relevantWorkingHour.appointment_type === "presential" ? "presencial" : relevantWorkingHour.appointment_type === "online" ? "online" : "presencial"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}
    </div>
  </div>
);

// Componente para um card de agendamento
const AppointmentCard = React.memo(({
  appointment,
  getPatientName,
  getPsychologistName,
  getRoomName,
  userRole,
  onStatusChange,
  onAttendanceCompleted,
  onEditAppointment,
  toast,
  formatDisplayDate,
  onRescheduleSuccess
}: {
  appointment: Appointment;
  getPatientName: (id: string) => string;
  getPsychologistName: (id: string) => string;
  getRoomName: (roomId: string | null | undefined) => string;
  userRole?: string;
  onStatusChange: (appointmentId: string, action: 'confirmar' | 'cancelar') => Promise<void>;
  onAttendanceCompleted: (appointment: Appointment) => void;
  onEditAppointment: (appointment: Appointment) => void;
  toast: any;
  formatDisplayDate: (dateString: string) => string;
  onRescheduleSuccess: () => Promise<void>;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [selectedNewDate, setSelectedNewDate] = useState<Date | null>(null);
  const [newStartTime, setNewStartTime] = useState<string>('');
  const [newEndTime, setNewEndTime] = useState<string>('');

  const getStatusColor = useCallback((status: string) => {
    const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-500';
    return color;
  }, []);

  const getStatusLabel = useCallback((status: string) => {
    const label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
    return label;
  }, []);

  const getStatusBadgeColor = useCallback((status: string) => {
    const badgeColor = STATUS_BADGE_COLORS[status as keyof typeof STATUS_BADGE_COLORS] || 'bg-gray-100 text-gray-800';
    return badgeColor;
  }, []);

  const getGuiaColor = useCallback((guia?: string | null) => {
    return guia ? 'text-gray-800' : 'text-red-600';
  }, []);

  const handleConfirm = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onStatusChange(appointment.id, 'confirmar');
    } catch (error) {
      // Erro ao confirmar agendamento
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    setShowCancelDialog(true);
  };

  const handleReschedule = () => {
    setShowRescheduleDialog(true);
    setSelectedNewDate(null);
    setNewStartTime(appointment.start_time || appointment.startTime || '');
    setNewEndTime(appointment.end_time || appointment.endTime || '');
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedNewDate || !newStartTime || !newEndTime || isUpdating) return;
    
    // Mostrar toast de "aguarde"
    toast({
      title: "Reagendamento solicitado",
      description: "Aguarde enquanto processamos sua solicitação...",
      variant: "default",
    });
    
    setIsUpdating(true);
    try {
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/edit_appoitments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_id: appointment.id,
          data_now: appointment.date, // Data atual do agendamento
          data_new: selectedNewDate.toISOString().split('T')[0], // Nova data no formato YYYY-MM-DD
          start_time: newStartTime,
          end_time: newEndTime
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao reagendar: ${response.status}`);
      }

      // Aguardar a resposta da API
      const responseData = await response.json();

      // Fechar modal de reagendamento
      setShowRescheduleDialog(false);
      setSelectedNewDate(null);
      setNewStartTime('');
      setNewEndTime('');
      
      // Chamar callback para atualizar a página e reabrir modal
      await onRescheduleSuccess();
      
      // Mostrar toast de sucesso
      toast({
        title: "Reagendamento realizado com sucesso!",
        description: `Agendamento foi reagendado para ${formatDisplayDate(selectedNewDate.toISOString().split('T')[0])} às ${newStartTime}.`,
        variant: "default",
      });
      
    } catch (error) {
      
      // Mostrar toast de erro
      toast({
        title: "Erro ao reagendar",
        description: "Ocorreu um erro ao tentar reagendar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onStatusChange(appointment.id, 'cancelar');
    } catch (error) {
      // Erro ao cancelar agendamento
    } finally {
      setIsUpdating(false);
      setShowCancelDialog(false);
    }
  };

  const handleEdit = () => {
    onEditAppointment(appointment);
  };


  const showActionButtons = userRole && userRole !== 'psychologist';
  const showPsychologistButton = userRole === 'psychologist' && appointment.status === 'confirmed';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md">
      <div className="flex items-start justify-between">

        {/* Bloco da esquerda (paciente, status, etc) */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(appointment.status)}`}></div>
            <h5 className="text-lg font-semibold text-gray-900">
              {getPatientName(appointment.patient_id)}{" "}
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                  appointment.status
                )}`}
              >
                {getStatusLabel(appointment.status)}
              </span>
            </h5>
          </div>

          <div className="space-y-4">
            {/* Primeira linha: Psicólogo - Início - Plano */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Psicólogo
                  </span>
                  <p className="font-semibold text-gray-900">
                    {getPsychologistName(appointment.psychologist_id)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Início
                  </span>
                  <p className="font-semibold text-gray-900">
                    {(appointment as any).start_time || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-sm">📋</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Plano
                  </span>
                  <p className="font-semibold text-gray-900">
                    {(appointment as any).insurance_type || "Particular"}
                  </p>
                </div>
              </div>
            </div>

            {/* Segunda linha: Sala - Término - Valor */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Sala
                  </span>
                  <p className="font-semibold text-gray-900">
                    {getRoomName(appointment.room_id)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 rounded-lg">
                  <Clock className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Término
                  </span>
                  <p className="font-semibold text-gray-900">
                    {(appointment as any).end_time || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <span className="text-emerald-600 font-bold">R$</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Valor
                  </span>
                  <p className="text-lg font-bold text-emerald-600">
                    {typeof appointment.value === 'number' 
                      ? appointment.value.toFixed(2) 
                      : parseFloat(appointment.value || '0').toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de ação para usuários não-psicólogos */}
          {showActionButtons && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={isUpdating}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:cursor-not-allowed shadow-sm hover:shadow-md font-medium"
                  aria-label={`Confirmar agendamento de ${getPatientName(
                    appointment.patient_id
                  )}`}
                >
                  {isUpdating ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Confirmando...
                    </div>
                  ) : (
                    "Confirmar"
                  )}
                </button>
                <button
                  onClick={handleReschedule}
                  disabled={isUpdating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed shadow-sm hover:shadow-md font-medium"
                  aria-label={`Reagendar agendamento de ${getPatientName(
                    appointment.patient_id
                  )}`}
                >
                  {isUpdating ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Processando...
                    </div>
                  ) : (
                    "Reagendar"
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 disabled:cursor-not-allowed shadow-sm hover:shadow-md font-medium"
                  aria-label={`Cancelar agendamento de ${getPatientName(
                    appointment.patient_id
                  )}`}
                >
                  {isUpdating ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Cancelando...
                    </div>
                  ) : (
                    "Cancelar"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Botão para psicólogos */}
          {showPsychologistButton && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={() => onAttendanceCompleted(appointment)}
                  disabled={isUpdating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed shadow-sm hover:shadow-md font-medium"
                  aria-label={`Marcar atendimento realizado para ${getPatientName(
                    appointment.patient_id
                  )}`}
                >
                  {isUpdating ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Processando...
                    </div>
                  ) : (
                    "Atendimento Realizado"
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center opacity-75">
                Marque quando o atendimento for concluído
              </p>
            </div>
          )}

          {/* Dialog de confirmação para cancelar agendamento */}
          <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
                <AlertDialogDescription>
                  Deseja realmente cancelar este agendamento?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isUpdating}>Não</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmCancel}
                  disabled={isUpdating}
                  className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
                >
                  {isUpdating ? "Cancelando..." : "Sim"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Dialog de reagendamento */}
          <AlertDialog open={showRescheduleDialog} onOpenChange={(open) => {
            if (!isUpdating) {
              setShowRescheduleDialog(open);
            }
          }}>
            <AlertDialogContent className="max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>Reagendar Agendamento</AlertDialogTitle>
                <AlertDialogDescription>
                  Selecione a nova data e horário para este agendamento
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="py-4">
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="text-sm text-gray-600 space-y-1">
                    <div><strong>Paciente:</strong> {getPatientName(appointment.patient_id)}</div>
                    <div><strong>Data atual:</strong> {new Date(appointment.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                    <div><strong>Horário:</strong> {appointment.start_time} - {appointment.end_time}</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nova data:
                    </label>
                    <input
                      type="date"
                      value={selectedNewDate ? selectedNewDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setSelectedNewDate(e.target.value ? new Date(e.target.value) : null)}
                      min={new Date().toISOString().split('T')[0]} // Não permite datas passadas
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Novo Horário:
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Horário início</label>
                        <input
                          type="time"
                          value={newStartTime}
                          onChange={(e) => setNewStartTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Horário fim</label>
                        <input
                          type="time"
                          value={newEndTime}
                          onChange={(e) => setNewEndTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRescheduleSubmit}
                  disabled={isUpdating || !selectedNewDate || !newStartTime || !newEndTime}
                  className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-600"
                >
                  {isUpdating ? "Reagendando..." : "Reagendar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Botão Editar no canto superior direito */}
        {userRole && userRole !== "psychologist" && (
          <div className="flex flex-col items-end gap-2">
            {/* Exibir guia acima do botão Editar independente do status */}
            <div className={`text-xs font-medium ${getGuiaColor((appointment as any).guia)}`}>
              {((appointment as any).guia) ? `GUIA: ${(appointment as any).guia}` : 'Falta Guia'}
            </div>
            <button
              onClick={handleEdit}
              disabled={isUpdating}
              className="text-sm text-purple-600 hover:text-purple-800 disabled:text-gray-400 px-2 py-1 rounded-md transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-purple-400 disabled:cursor-not-allowed"
              aria-label={`Editar agendamento de ${getPatientName(
                appointment.patient_id
              )}`}
            >
              {isUpdating ? (
                <div className="flex items-center">
                  <Loader2 className="animate-spin h-3 w-3 mr-1" />
                  Editando...
                </div>
              ) : (
                "Editar"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

AppointmentCard.displayName = 'AppointmentCard';

// Componente principal do calendário
const AppointmentCalendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDateDetails, setSelectedDateDetails] = useState<DayDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [availablePsychologists, setAvailablePsychologists] = useState<Array<{ id: string, name: string, workingHours: WorkingHour[] }>>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [observationNotes, setObservationNotes] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPlano, setEditPlano] = useState('');
  const [editValor, setEditValor] = useState('');

  const { appointments, workingHours, patients, users, rooms, loading, error, refetch } = useAppointmentData(user);
  const { formatDate, getDaysInMonth, getFirstDayOfMonth, formatDisplayDate } = useDateUtils();
  const { getDayStatus } = useDayStatus(appointments, workingHours);
  const { toast } = useToast();

  // Atualizar automaticamente o calendário quando novos agendamentos forem criados
  useEffect(() => {
    // Se há um modal aberto e os dados mudaram, atualizar o modal
    if (showModal && selectedDateDetails) {
      const updatedDateString = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate!));

      // Buscar agendamentos atualizados para a data selecionada
      const updatedDayAppointments = appointments.filter(apt => {
        const aptDate = apt.date || apt.appointment_date || apt.scheduled_date;
        return aptDate === updatedDateString;
      }).map(apt => ({
        ...apt,
        end_time: apt.end_time || apt.endTime || '00:00',
        status: apt.status || 'pending',
        start_time: apt.start_time || apt.startTime || apt.time || '00:00',
        value: Math.max(0, parseFloat(String(apt.value || apt.price || 0)) || 0)
      }));

      // Atualizar apenas se houver mudanças
      if (JSON.stringify(updatedDayAppointments) !== JSON.stringify(selectedDateDetails.appointments)) {
        setSelectedDateDetails(prev => prev ? {
          ...prev,
          appointments: updatedDayAppointments
        } : null);
      }
    }
  }, [appointments, showModal, selectedDateDetails, currentDate, selectedDate, formatDate]);

  // Usar o sistema de eventos do contexto para atualizações automáticas
  useEffect(() => {
    // Se o contexto tiver o sistema de eventos, usar ele
    if (typeof refetch === 'function') {
      // Atualizar dados quando houver mudanças
      const unsubscribe = refetch;

      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [refetch]);

  // Listener para evento customizado de agendamento criado
  useEffect(() => {
    const handleAppointmentCreated = () => {
      // Atualizar dados do calendário quando um novo agendamento for criado
      refetch();
    };

    window.addEventListener('appointmentCreated', handleAppointmentCreated);

    return () => {
      window.removeEventListener('appointmentCreated', handleAppointmentCreated);
    };
  }, [refetch]);

  // Funções auxiliares memoizadas
  const getPatientName = useCallback((patientId: string): string => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? (patient.nome || patient.name || `Paciente ${patientId}`) : `Paciente ${patientId}`;
  }, [patients]);

  const getPsychologistName = useCallback((psychologistId: string): string => {
    const psychologist = users.find(u => u.id === psychologistId);
    return psychologist ? (psychologist.nome || psychologist.name || `Psicólogo ${psychologistId}`) : `Psicólogo ${psychologistId}`;
  }, [users]);

  const getRoomName = useCallback((roomId: string | null | undefined): string => {
    if (!roomId) return 'Online';
    const room = rooms.find(r => r.id === roomId);
    return room ? room.name : `Sala ${roomId}`;
  }, [rooms]);

  const navigateMonth = useCallback((direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  }, []);

  const handleDayClick = useCallback(async (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateString = formatDate(clickedDate);

    setSelectedDate(day);
    setShowModal(true);

    // Buscar detalhes da data
    try {
      setLoadingDetails(true);

      // Filtrar agendamentos para a data específica
      const dayAppointments = appointments.filter(apt => {
        const aptDate = apt.date || apt.appointment_date || apt.scheduled_date;
        return aptDate === dateString;
      }).map(apt => ({
        ...apt,
        // Garantir que os campos estejam corretos
        end_time: apt.end_time || apt.endTime || '00:00',
        // Usar o status diretamente da API (pending, confirmed, canceled)
        status: apt.status || 'pending',
        start_time: apt.start_time || apt.startTime || apt.time || '00:00',
        value: Math.max(0, parseFloat(String(apt.value || apt.price || 0)) || 0)
      }));


      const dayWorkingHours = workingHours.filter(wh => wh.day_of_week === clickedDate.getDay());

      setSelectedDateDetails({
        date: dateString,
        appointments: dayAppointments,
        workingHours: dayWorkingHours
      });

      // Buscar psicólogos disponíveis para esta data e seus horários de trabalho
      try {
        const psychologistsResponse = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/users');
        if (psychologistsResponse.ok) {
          const psychologistsData = await psychologistsResponse.json();
          let psychologists = psychologistsData.filter((user: any) => user.role === 'psychologist');

          // Se o usuário logado for psychologist, mostrar apenas ele mesmo
          if (isPsychologist(user?.role)) {
            psychologists = psychologists.filter((psych: any) => psych.id === user.id);
          }
          // Se for admin ou receptionist, mostrar todos os psicólogos
          // (não precisa fazer nada, já está mostrando todos)

          // Para cada psicólogo, buscar seus horários de trabalho
          const psychsWithWorkingHours = await Promise.all(
            psychologists.map(async (psych: any) => {
              try {
                const workingHoursResponse = await fetch(
                  `https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/working_hours/${psych.id}`
                );

                if (workingHoursResponse.ok) {
                  const workingHoursData = await workingHoursResponse.json();
                  const workingHours = Array.isArray(workingHoursData) ? workingHoursData : workingHoursData.data || [];

                  // Filtrar apenas horários para o dia da semana selecionado
                  const dayWorkingHours = workingHours.filter((wh: any) => wh.day_of_week === clickedDate.getDay());

                  if (dayWorkingHours.length > 0) {
                    return {
                      id: psych.id,
                      name: psych.nome || psych.name || `Psicólogo ${psych.id}`,
                      workingHours: dayWorkingHours
                    };
                  }
                }
              } catch (error) {
                // Erro ao buscar horários do psicólogo
              }
              return null;
            })
          );

          // Filtrar psicólogos que realmente têm horários para este dia
          const availablePsychs = psychsWithWorkingHours.filter(psych => psych !== null);
          setAvailablePsychologists(availablePsychs);
        }
      } catch (err) {
        setAvailablePsychologists([]);
      }
    } catch (err) {
      // Erro ao buscar detalhes da data
    } finally {
      setLoadingDetails(false);
    }
  }, [currentDate, formatDate, appointments, workingHours]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedDate(null);
    setSelectedDateDetails(null);
  }, []);

  // Função para alterar status do agendamento
  const handleStatusChange = useCallback(async (appointmentId: string, action: 'confirmar' | 'cancelar' | 'completed') => {
    try {
      // Mapear ações para valores do webhook
      let webhookAction: string;
      let statusUpdate: 'pending' | 'confirmed' | 'canceled' | 'completed';

      switch (action) {
        case 'confirmar':
          webhookAction = 'confirmed';
          statusUpdate = 'confirmed';
          break;
        case 'cancelar':
          webhookAction = 'canceled';
          statusUpdate = 'canceled';
          break;
        case 'completed':
          webhookAction = 'completed'; // Para atendimento realizado, enviar "completed"
          statusUpdate = 'completed';
          break;
        default:
          webhookAction = 'confirmed';
          statusUpdate = 'confirmed';
      }

      const webhookUrl = `https://webhook.essenciasaudeintegrada.com.br/webhook/appoiments?id=${appointmentId}&action=${webhookAction}`;

      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      // Atualizar os dados locais após sucesso
      await refetch();

      // Atualizar os dados locais após sucesso
      await refetch();

      // Atualizar os dados do modal em tempo real (sem fechar/reabrir)
      if (selectedDateDetails) {
        // Atualizar apenas o agendamento específico que foi modificado
        const updatedAppointments = selectedDateDetails.appointments.map(apt => {
          if (apt.id === appointmentId) {
            return {
              ...apt,
              // Atualizar status baseado na ação
              status: statusUpdate as any // Cast temporário para evitar erro de tipo
            };
          }
          return apt;
        });

        // Atualizar o estado local do modal com os dados atualizados
        setSelectedDateDetails({
          ...selectedDateDetails,
          appointments: updatedAppointments
        });
      }

    } catch (error) {
      throw error; // Re-throw para o componente filho tratar
    }
  }, [refetch, selectedDateDetails]);

  const handleAttendanceCompleted = useCallback((appointment: Appointment) => {
    // Abrir modal de observações
    setSelectedAppointment(appointment);
    setShowObservationModal(true);
  }, []);

  const handleSaveObservations = useCallback(async () => {
    if (!selectedAppointment || !observationNotes.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, descreva o que aconteceu no atendimento.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fazer fetch para o webhook com as observações
      const response = await fetch(
        'https://webhook.essenciasaudeintegrada.com.br/webhook/create-patients-records',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: selectedAppointment.patient_id,
            appointment_id: selectedAppointment.id,
            date: selectedAppointment.date || new Date().toISOString().split('T')[0],
            notes: observationNotes,
            created_by: selectedAppointment.psychologist_id,
            update_status: 'completed'
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao salvar observações do atendimento');
      }

      // Fechar modal e limpar observações
      setShowObservationModal(false);
      setObservationNotes('');
      setSelectedAppointment(null);

      // Atualizar status do agendamento para "completed"
      await handleStatusChange(selectedAppointment.id, 'completed');

      // Feedback de sucesso
      toast({
        title: "Atendimento realizado!",
        description: "Atendimento marcado como realizado com sucesso!",
        variant: "default",
      });

    } catch (error) {
      toast({
        title: "Erro ao salvar observações",
        description: "Erro ao salvar observações. Tente novamente.",
        variant: "destructive",
      });
    }
  }, [selectedAppointment, observationNotes, handleStatusChange, toast]);

  const handleEditSubmit = async () => {
    if (!selectedAppointment) return;

    try {
      // Enviar dados para o webhook
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/appointmens_edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: selectedAppointment.id,
          plano: editPlano,
          valor: parseFloat(editValor),
          patientName: getPatientName(selectedAppointment.patient_id),
          psychologistName: getPsychologistName(selectedAppointment.psychologist_id),
          date: selectedAppointment.date,
          startTime: selectedAppointment.start_time,
          endTime: selectedAppointment.end_time
        }),
      });

      if (response.ok) {
        // Atualizar os dados locais para refletir as mudanças imediatamente
        const updatedAppointment = {
          ...selectedAppointment,
          insurance_type: editPlano,
          value: parseFloat(editValor)
        };

        // Atualizar o agendamento na lista principal
        const updatedAppointments = appointments.map(apt =>
          apt.id === selectedAppointment.id ? updatedAppointment : apt
        );

        // Atualizar o agendamento no modal de detalhes se estiver aberto
        if (selectedDateDetails) {
          const updatedDateDetails = {
            ...selectedDateDetails,
            appointments: selectedDateDetails.appointments.map(apt =>
              apt.id === selectedAppointment.id ? updatedAppointment : apt
            )
          };
          setSelectedDateDetails(updatedDateDetails);
        }

        // Fechar modal e mostrar toast de sucesso
        setIsEditModalOpen(false);

        // Mostrar toast de sucesso no canto inferior direito
        toast({
          title: "Edição realizada com sucesso!",
          description: `Agendamento de ${getPatientName(selectedAppointment.patient_id)} foi atualizado.`,
          variant: "default",
        });

        // Atualizar o modal de agendamentos igual ao botão de confirmar
        await refetch();
      } else {
        throw new Error('Erro ao enviar dados para o webhook');
      }
    } catch (error) {
      // Mostrar toast de erro no canto inferior direito
      toast({
        title: "Erro ao salvar edição",
        description: "Ocorreu um erro ao tentar salvar as alterações. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEditAppointment = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setEditPlano((appointment as any).insurance_type || 'Particular');
    setEditValor(appointment.value?.toString() || '0');
    setIsEditModalOpen(true);
  }, []);

  const handleRescheduleSuccess = useCallback(async () => {
    // Simplesmente recarregar a página para garantir que todos os dados sejam atualizados
    window.location.reload();
  }, []);

  // Renderizar calendário memoizado
  const renderCalendar = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Dias vazios no início
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 bg-gray-50 rounded-lg border border-gray-100" aria-hidden="true"></div>);
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStatus = getDayStatus(day, currentDate, formatDate);
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateString = formatDate(date);
      const dayAppointments = appointments.filter(apt => {
        const aptDate = apt.date || apt.appointment_date || apt.scheduled_date;
        return aptDate === dateString;
      });
      const hasAppointments = dayAppointments.length > 0;

      days.push(
        <button
          key={day}
          onClick={() => handleDayClick(day)}
          className={`p-3 text-center cursor-pointer rounded-lg transition-all duration-200 ease-in-out ${DAY_STATUS_COLORS[dayStatus.status]} relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:scale-105 hover:shadow-md min-h-[80px] flex flex-col items-center justify-center`}
          aria-label={`${day} de ${currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}${hasAppointments ? ', com agendamentos' : ''}`}
          aria-pressed={selectedDate === day}
        >
          <div className="relative">
            <span className="text-lg font-medium">{day}</span>
            {hasAppointments && (
              <div
                className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2.5 h-2.5 bg-amber-500 rounded-full shadow-sm border border-amber-600"
                aria-label="Indicador de agendamento"
              ></div>
            )}
          </div>
        </button>
      );
    }

    return days;
  }, [currentDate, appointments, workingHours, getDayStatus, formatDate, handleDayClick, selectedDate]);

  // Gerar slots de horário para o modal memoizado
  const generateTimeSlots = useMemo(() => {
    if (!selectedDateDetails) return [];

    const allTimeSlots: TimeSlot[] = [];
    const processedAppointments = new Set<string>(); // Para evitar duplicação

    // Primeiro, criar slots baseados nos agendamentos existentes
    selectedDateDetails.appointments.forEach(apt => {
      const aptStartHour = parseInt(apt.start_time.split(':')[0]);
      const timeSlot = `${aptStartHour.toString().padStart(2, '0')}:00`;

      // Verificar se já existe um slot para este horário
      let existingSlot = allTimeSlots.find(slot => slot.time === timeSlot);

      if (!existingSlot) {
        existingSlot = {
          time: timeSlot,
          appointments: [],
          hasAppointments: false
        };
        allTimeSlots.push(existingSlot);
      }

      // Adicionar o agendamento apenas se não foi processado antes
      if (!processedAppointments.has(apt.id)) {
        existingSlot.appointments.push(apt);
        existingSlot.hasAppointments = true;
        processedAppointments.add(apt.id);
      }
    });

    // Adicionar slots vazios para horários de trabalho que não têm agendamentos
    selectedDateDetails.workingHours.forEach(wh => {
      const startHour = parseInt(wh.start_time.split(':')[0]);
      const endHour = parseInt(wh.end_time.split(':')[0]);

      for (let hour = startHour; hour < endHour; hour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;

        // Só adicionar se não existir um slot para este horário
        if (!allTimeSlots.some(slot => slot.time === timeSlot)) {
          allTimeSlots.push({
            time: timeSlot,
            appointments: [],
            hasAppointments: false
          });
        }
      }
    });

    return allTimeSlots.sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDateDetails]);

  // Loading state otimizado
  if (loading) {
    return (
      <div className="w-full mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-200">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar size={24} className="text-blue-600" />
                </div>
                Calendário de Agendamentos
              </h1>
            </div>
          </div>
          <div className="flex justify-center items-center h-64" role="status" aria-live="polite">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" aria-hidden="true"></div>
              <span className="text-lg text-gray-600 font-medium">Carregando calendário...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b border-red-200">
            <h2 className="text-xl font-semibold text-red-800 flex items-center gap-2">
              <Calendar size={24} />
              Erro no Calendário
            </h2>
          </div>
          <div className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <p className="text-lg font-medium">Erro ao carregar dados da API:</p>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={refetch}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-200">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar size={24} className="text-blue-600" />
              </div>
              Calendário de Agendamentos
            </h1>
            {(user?.role === "admin" || user?.role === "receptionist") && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-clinic-600 hover:bg-clinic-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                Novo Agendamento
              </Button>
            )}
          </div>
        </header>

        <CalendarLegend />
        <CalendarNavigation currentDate={currentDate} onNavigate={navigateMonth} />

        {/* Calendário */}
        <main className="px-4 py-2" role="main" aria-label="Calendário mensal">
          <CalendarHeader />
          <div
            className="grid grid-cols-7 gap-1"
            role="grid"
            aria-label="Dias do mês"
          >
            {renderCalendar}
          </div>
        </main>
      </div>

      {/* Modal para criar novo agendamento */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um novo agendamento.
              {" Selecione um psicólogo para que o sistema sugira automaticamente o próximo horário disponível."}
            </DialogDescription>
          </DialogHeader>
          <AppointmentForm
            selectedDate={new Date()}
            onClose={() => setIsCreateModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de detalhes */}
      {showModal && selectedDateDetails && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
          onClick={closeModal} // Fechar ao clicar no backdrop
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()} // Prevenir fechamento ao clicar no conteúdo
          >
            {/* Header do Modal */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 id="modal-title" className="text-2xl font-bold capitalize">
                    {formatDisplayDate(selectedDateDetails.date)}
                  </h2>
                  <p id="modal-description" className="text-blue-100 mt-1">
                    Detalhes dos agendamentos para esta data
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-white hover:text-blue-200 transition-all duration-200 p-2 rounded-full hover:bg-white hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 hover:scale-110"
                  aria-label="Fechar modal"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingDetails ? (
                <div className="flex justify-center items-center py-12" role="status" aria-live="polite">
                  <div className="text-center">
                    <Loader2 className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" aria-hidden="true" />
                    <span className="text-lg text-gray-600 font-medium">Carregando detalhes...</span>
                  </div>
                </div>
              ) : selectedDateDetails.workingHours.length > 0 ? (
                <section className="mb-6" aria-labelledby="appointments-title">
                  <h3 id="appointments-title" className="text-lg font-semibold text-gray-800 mb-4">
                    Agendamentos
                  </h3>
                  <div className="space-y-4">
                    {generateTimeSlots.map((slot, index) => (
                      <TimeSlot
                        key={`${slot.time}-${index}`}
                        slot={slot}
                        getPatientName={getPatientName}
                        getPsychologistName={getPsychologistName}
                        getRoomName={getRoomName}
                        userRole={user?.role}
                        onStatusChange={handleStatusChange}
                        onAttendanceCompleted={handleAttendanceCompleted}
                        availablePsychologists={availablePsychologists}
                        onEditAppointment={handleEditAppointment}
                        toast={toast}
                        formatDisplayDate={formatDisplayDate}
                        onRescheduleSuccess={handleRescheduleSuccess}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <div className="mx-auto mb-6 p-4 bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center">
                    <Calendar size={32} className="text-gray-400" aria-hidden="true" />
                  </div>
                  <p className="text-xl font-semibold text-gray-700 mb-2">Nenhum psicólogo disponível nesta data</p>
                  <p className="text-sm text-gray-500">Selecione outra data para ver os horários disponíveis</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Observações do Atendimento */}
      {showObservationModal && selectedAppointment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowObservationModal(false);
            setObservationNotes('');
            setSelectedAppointment(null);
          }} // Fechar ao clicar no backdrop
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()} // Prevenir fechamento ao clicar no conteúdo
          >
            {/* Header do Modal */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">
                  Observações do Atendimento
                </h3>
                <button
                  onClick={() => {
                    setShowObservationModal(false);
                    setObservationNotes('');
                    setSelectedAppointment(null);
                  }}
                  className="text-white hover:text-blue-200 transition-all duration-200 p-2 rounded-full hover:bg-white hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 hover:scale-110"
                  aria-label="Fechar modal"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-blue-100 mt-2">
                Descreva o que aconteceu no atendimento com {getPatientName(selectedAppointment.patient_id)}
              </p>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              <div className="mb-6">
                <label htmlFor="observation-notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Observações do Atendimento *
                </label>
                <textarea
                  id="observation-notes"
                  value={observationNotes}
                  onChange={(e) => setObservationNotes(e.target.value)}
                  placeholder="Descreva detalhadamente o que foi discutido, observado e as orientações dadas durante o atendimento..."
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  * Campo obrigatório para registrar o atendimento
                </p>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowObservationModal(false);
                    setObservationNotes('');
                    setSelectedAppointment(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveObservations}
                  disabled={!observationNotes.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 font-medium"
                >
                  Salvar e Marcar como Realizado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Agendamento */}
      {isEditModalOpen && selectedAppointment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsEditModalOpen(false)} // Fechar ao clicar no backdrop
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()} // Evitar fechamento ao clicar no modal
          >
            {/* Header do Modal */}
            <div className="bg-blue-600 text-white p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">
                  Editar Agendamento
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-white hover:text-blue-200 transition-all duration-200 p-2 rounded-full hover:bg-white hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 hover:scale-110"
                  aria-label="Fechar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-blue-100 mt-2">
                Edite as informações do agendamento para {getPatientName(selectedAppointment.patient_id)}
              </p>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              <div className="mb-6">
                <label htmlFor="edit-plano" className="block text-sm font-medium text-gray-700 mb-2">
                  Plano *
                </label>
                <input
                  id="edit-plano"
                  type="text"
                  value={editPlano}
                  onChange={(e) => setEditPlano(e.target.value)}
                  placeholder="Ex: Particular, Convênio, Outro"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  * Campo obrigatório para registrar o plano
                </p>
              </div>
              <div className="mb-6">
                <label htmlFor="edit-valor" className="block text-sm font-medium text-gray-700 mb-2">
                  Valor *
                </label>
                <input
                  id="edit-valor"
                  type="number"
                  value={editValor}
                  onChange={(e) => setEditValor(e.target.value)}
                  placeholder="Ex: 150.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  * Campo obrigatório para registrar o valor
                </p>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={!editPlano.trim() || !editValor.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 font-medium"
                >
                  Salvar Edição
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentCalendar;
