import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle
} from 'lucide-react';
import { useAuth } from "@/context/AuthContext";
import { isPsychologist } from "@/utils/roleUtils";

// Tipos para os dados dos webhooks
interface Psychologist {
  id: number;
  name: string;
}

interface Appointment {
  patient_name: string;
  psychologist_id: number;
  date: string;
  start_time: string;
  end_time: string;
}

interface WorkingHour {
  user_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

// Hook personalizado para buscar dados (sem fetch próprio para evitar CORS)
const useAppointmentData = (user: any) => {
  const [data, setData] = useState({
    appointments: [] as any[],
    workingHours: [] as any[],
    patients: [] as any[],
    users: [] as any[],
    rooms: [] as any[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRealData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const baseUrl = 'https://webhook.essenciasaudeintegrada.com.br/webhook';
      
      // Buscar dados em paralelo
      const [usersRes, workingHoursRes, appointmentsRes] = await Promise.all([
        fetch(`${baseUrl}/users`),
        fetch(`${baseUrl}/working_hours`),
        fetch(`${baseUrl}/appointmens`)
      ]);

      if (!usersRes.ok || !workingHoursRes.ok || !appointmentsRes.ok) {
        throw new Error('Erro ao buscar dados da API');
      }

      const [usersData, workingHoursData, appointmentsData] = await Promise.all([
        usersRes.json(),
        workingHoursRes.json(),
        appointmentsRes.json()
      ]);

      // Filtrar apenas psicólogos
      const psychologists = usersData.filter((user: any) => user.role === 'psychologist');

      setData({
        appointments: appointmentsData || [],
        workingHours: workingHoursData || [],
        patients: [],
        users: psychologists,
        rooms: []
      });

    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError('Erro ao carregar dados da API');
    } finally {
      setLoading(false);
    }
  };

  // Dados mock para fallback (caso a API falhe)
  const mockData = {
    appointments: [
      // Segunda-feira - Jessica
      {
        id: 67,
        patient_id: 89,
        patient_name: "ANA CLARA VIANA DE ASSUNÇÃO",
        psychologist_id: 20,
        psychologist_name: "Jessica de Santana Alves",
        room_id: 1,
        date: "2025-08-04",
        start_time: "09:00:00",
        end_time: "10:00:00",
        status: "completed"
      },
      {
        id: 68,
        patient_id: 90,
        patient_name: "MARCELA GOMES MIGUEL",
        psychologist_id: 20,
        psychologist_name: "Jessica de Santana Alves",
        room_id: 1,
        date: "2025-08-04",
        start_time: "10:00:00",
        end_time: "11:00:00",
        status: "completed"
      },
      // Terça-feira - Jessica
      {
        id: 69,
        patient_id: 89,
        patient_name: "ANA CLARA VIANA DE ASSUNÇÃO",
        psychologist_id: 20,
        psychologist_name: "Jessica de Santana Alves",
        room_id: 1,
        date: "2025-08-05",
        start_time: "08:00:00",
        end_time: "09:00:00",
        status: "completed"
      },
      // Quarta-feira - Ana Paula
      {
        id: 70,
        patient_id: 90,
        patient_name: "MARCELA GOMES MIGUEL",
        psychologist_id: 21,
        psychologist_name: "Ana Paula Mendes de Sena",
        room_id: 2,
        date: "2025-08-06",
        start_time: "14:00:00",
        end_time: "15:00:00",
        status: "completed"
      },
      // Quinta-feira - Helen
      {
        id: 71,
        patient_id: 173,
        patient_name: "CECÍLIA RODRIGUES ALMEIDA",
        psychologist_id: 19,
        psychologist_name: "Helen Giovana de Melo Freire",
        room_id: 4,
        date: "2025-08-07",
        start_time: "14:00:00",
        end_time: "15:00:00",
        status: "pending"
      },
      // Sexta-feira - Helzir
      {
        id: 72,
        patient_id: 174,
        patient_name: "MOYSES GUTEMBERG BARROSO FARIA",
        psychologist_id: 24,
        psychologist_name: "Helzir Ramon de Mendonça",
        room_id: null,
        date: "2025-08-08",
        start_time: "18:00:00",
        end_time: "19:00:00",
        status: "completed"
      },
      // Sábado - Teste
      {
        id: 73,
        patient_id: 107,
        patient_name: "usuario teste",
        psychologist_id: 26,
        psychologist_name: "teste",
        room_id: null,
        date: "2025-08-09",
        start_time: "08:00:00",
        end_time: "08:30:00",
        status: "pending"
      },
      // Mais agendamentos para demonstrar disponibilidade
      {
        id: 74,
        patient_id: 95,
        patient_name: "PACIENTE EXEMPLO 1",
        psychologist_id: 20,
        psychologist_name: "Jessica de Santana Alves",
        room_id: 1,
        date: "2025-08-05",
        start_time: "10:00:00",
        end_time: "11:00:00",
        status: "completed"
      },
      {
        id: 75,
        patient_id: 96,
        patient_name: "PACIENTE EXEMPLO 2",
        psychologist_id: 21,
        psychologist_name: "Ana Paula Mendes de Sena",
        room_id: 2,
        date: "2025-08-06",
        start_time: "15:00:00",
        end_time: "16:00:00",
        status: "completed"
      },
      {
        id: 76,
        patient_id: 97,
        patient_name: "PACIENTE EXEMPLO 3",
        psychologist_id: 19,
        psychologist_name: "Helen Giovana de Melo Freire",
        room_id: 4,
        date: "2025-08-07",
        start_time: "15:00:00",
        end_time: "16:00:00",
        status: "pending"
      }
    ],
    workingHours: [
      // Jessica - Segunda a Sexta
      { user_id: 20, day_of_week: 1, start_time: "08:00:00", end_time: "12:00:00" },
      { user_id: 20, day_of_week: 2, start_time: "08:00:00", end_time: "12:00:00" },
      { user_id: 20, day_of_week: 3, start_time: "08:00:00", end_time: "12:00:00" },
      { user_id: 20, day_of_week: 4, start_time: "08:00:00", end_time: "12:00:00" },
      { user_id: 20, day_of_week: 5, start_time: "08:00:00", end_time: "12:00:00" },
      
      // Ana Paula - Segunda e Quarta (dados reais da API)
      { user_id: 21, day_of_week: 1, start_time: "14:00:00", end_time: "19:00:00" },
      { user_id: 21, day_of_week: 3, start_time: "14:00:00", end_time: "15:00:00" },
      
      // Helen - Terça a Sexta
      { user_id: 19, day_of_week: 2, start_time: "14:00:00", end_time: "18:00:00" },
      { user_id: 19, day_of_week: 3, start_time: "14:00:00", end_time: "18:00:00" },
      { user_id: 19, day_of_week: 4, start_time: "14:00:00", end_time: "18:00:00" },
      { user_id: 19, day_of_week: 5, start_time: "14:00:00", end_time: "18:00:00" },
      
      // Helzir - Quarta a Sábado
      { user_id: 24, day_of_week: 3, start_time: "18:00:00", end_time: "22:00:00" },
      { user_id: 24, day_of_week: 4, start_time: "18:00:00", end_time: "22:00:00" },
      { user_id: 24, day_of_week: 5, start_time: "18:00:00", end_time: "22:00:00" },
      { user_id: 24, day_of_week: 6, start_time: "18:00:00", end_time: "22:00:00" },
      
      // Teste - Segunda a Sábado
      { user_id: 26, day_of_week: 1, start_time: "08:00:00", end_time: "12:00:00" },
      { user_id: 26, day_of_week: 2, start_time: "08:00:00", end_time: "12:00:00" },
      { user_id: 26, day_of_week: 3, start_time: "08:00:00", end_time: "12:00:00" },
      { user_id: 26, day_of_week: 4, start_time: "08:00:00", end_time: "12:00:00" },
      { user_id: 26, day_of_week: 5, start_time: "08:00:00", end_time: "12:00:00" },
      { user_id: 26, day_of_week: 6, start_time: "08:00:00", end_time: "12:00:00" }
    ],
    users: [
      {
        id: 20,
        name: "Jessica de Santana Alves",
        role: "psychologist"
      },
      {
        id: 21,
        name: "Ana Paula Mendes de Sena",
        role: "psychologist"
      },
      {
        id: 19,
        name: "Helen Giovana de Melo Freire",
        role: "psychologist"
      },
      {
        id: 24,
        name: "Helzir Ramon de Mendonça",
        role: "psychologist"
      },
      {
        id: 26,
        name: "teste",
        role: "psychologist"
      }
    ],
    patients: [],
    rooms: []
  };

  const refetch = async () => {
    await fetchRealData();
  };

  useEffect(() => {
    // Carregar dados iniciais da API
    fetchRealData();
  }, [user]);

  return { ...data, loading, error, refetch };
};

interface AvailabilitySlot {
  psychologist_id: number;
  psychologist_name: string;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  appointment_count: number;
  appointment_type: 'presential' | 'online';
}

interface DayAvailability {
  day_of_week: number;
  day_name: string;
  total_slots: number;
  available_slots: number;
  occupied_slots: number;
  psychologists: AvailabilitySlot[];
}

const DAYS_OF_WEEK = [
  { id: 1, name: 'Segunda-feira', short: 'Seg' },
  { id: 2, name: 'Terça-feira', short: 'Ter' },
  { id: 3, name: 'Quarta-feira', short: 'Qua' },
  { id: 4, name: 'Quinta-feira', short: 'Qui' },
  { id: 5, name: 'Sexta-feira', short: 'Sex' },
  { id: 6, name: 'Sábado', short: 'Sáb' }
];

interface PsychologistAvailabilityDashboardProps {
  appointments?: any[];
  workingHours?: any[];
  users?: any[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

const PsychologistAvailabilityDashboard: React.FC<PsychologistAvailabilityDashboardProps> = ({
  appointments = [],
  workingHours = [],
  users = [],
  loading = false,
  error = null,
  onRefresh
}) => {
  const { user } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = semana atual
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true); // Mostrar apenas horários livres por padrão

  // Se não receber dados como props, usar dados mock
  const { appointments: mockAppointments, workingHours: mockWorkingHours, users: mockUsers, loading: mockLoading, error: mockError, refetch } = useAppointmentData(user);
  
  // Usar dados recebidos como props ou dados mock
  const finalAppointments = appointments.length > 0 ? appointments : mockAppointments;
  const finalWorkingHours = workingHours.length > 0 ? workingHours : mockWorkingHours;
  const finalUsers = users.length > 0 ? users : mockUsers;
  const finalLoading = loading || mockLoading;
  const finalError = error || mockError;

  // Filtrar apenas psicólogos dos usuários
  const psychologists = useMemo(() => {
    return Array.isArray(finalUsers) 
      ? finalUsers.filter((user: any) => user.role === 'psychologist')
      : [];
  }, [finalUsers]);

  // Função para calcular horários disponíveis
  const calculateAvailability = useMemo(() => {
    if (!psychologists.length || !finalWorkingHours.length) return [];

    const availability: DayAvailability[] = [];

    // Calcular a semana atual baseada no selectedWeek
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay() + 1 + (selectedWeek * 7)); // Segunda-feira da semana
    currentWeekStart.setHours(0, 0, 0, 0);

    // Para cada dia da semana
    DAYS_OF_WEEK.forEach(day => {
      const dayWorkingHours = finalWorkingHours.filter(wh => wh.day_of_week === day.id);
      
      if (dayWorkingHours.length === 0) return;

      // Calcular a data específica para este dia da semana
      const specificDate = new Date(currentWeekStart);
      specificDate.setDate(currentWeekStart.getDate() + (day.id - 1)); // day.id - 1 porque segunda = 1
      const dateString = specificDate.toISOString().split('T')[0]; // YYYY-MM-DD

      const dayAvailability: DayAvailability = {
        day_of_week: day.id,
        day_name: day.name,
        total_slots: 0,
        available_slots: 0,
        occupied_slots: 0,
        psychologists: []
      };

      // Para cada psicólogo
      psychologists.forEach(psychologist => {
        const psychologistWorkingHours = dayWorkingHours.filter(wh => wh.user_id === psychologist.id);
        
        if (psychologistWorkingHours.length === 0) return;

        // Para cada horário de trabalho do psicólogo
        psychologistWorkingHours.forEach(wh => {
          const startHour = parseInt(wh.start_time.split(':')[0]);
          const endHour = parseInt(wh.end_time.split(':')[0]);
          const appointmentType = wh.appointment_type || 'presential'; // Default para presencial
          
          // Gerar slots de 1 hora
          for (let hour = startHour; hour < endHour; hour++) {
            const slotStartTime = `${hour.toString().padStart(2, '0')}:00`;
            const slotEndTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
            
            // Verificar se há agendamentos neste horário para este psicólogo nesta data específica
            const hasAppointment = finalAppointments.some(apt => {
              const aptDate = apt.date ? apt.date.split('T')[0] : null; // Garantir formato YYYY-MM-DD
              const aptStartTime = apt.start_time || apt.startTime;
              const aptStartTimeFormatted = aptStartTime ? aptStartTime.substring(0, 5) : null; // HH:MM
              
              return apt.psychologist_id === psychologist.id &&
                     aptDate === dateString &&
                     aptStartTimeFormatted === slotStartTime;
            });

            const appointmentCount = finalAppointments.filter(apt => {
              const aptDate = apt.date ? apt.date.split('T')[0] : null;
              const aptStartTime = apt.start_time || apt.startTime;
              const aptStartTimeFormatted = aptStartTime ? aptStartTime.substring(0, 5) : null;
              
              return apt.psychologist_id === psychologist.id &&
                     aptDate === dateString &&
                     aptStartTimeFormatted === slotStartTime;
            }).length;

            dayAvailability.psychologists.push({
              psychologist_id: psychologist.id,
              psychologist_name: psychologist.name,
              day_of_week: day.id,
              day_name: day.name,
              start_time: slotStartTime,
              end_time: slotEndTime,
              is_available: !hasAppointment,
              appointment_count: appointmentCount,
              appointment_type: appointmentType
            });

            dayAvailability.total_slots++;
            if (!hasAppointment) {
              dayAvailability.available_slots++;
            } else {
              dayAvailability.occupied_slots++;
            }
          }
        });
      });

      if (dayAvailability.total_slots > 0) {
        availability.push(dayAvailability);
      }
    });

    // Ordenar por dia da semana (Segunda a Sábado)
    return availability.sort((a, b) => {
      return a.day_of_week - b.day_of_week;
    });
  }, [psychologists, finalAppointments, finalWorkingHours, selectedWeek]);

  // Função para navegar entre semanas
  const navigateWeek = (direction: number) => {
    setSelectedWeek(prev => prev + direction);
  };

  // Função para obter estatísticas gerais
  const getGeneralStats = useMemo(() => {
    const totalSlots = calculateAvailability.reduce((sum, day) => sum + day.total_slots, 0);
    const availableSlots = calculateAvailability.reduce((sum, day) => sum + day.available_slots, 0);
    const occupiedSlots = calculateAvailability.reduce((sum, day) => sum + day.occupied_slots, 0);
    const availabilityRate = totalSlots > 0 ? (availableSlots / totalSlots) * 100 : 0;

    return {
      totalSlots,
      availableSlots,
      occupiedSlots,
      availabilityRate,
      totalPsychologists: psychologists.length
    };
  }, [calculateAvailability, psychologists.length]);

  if (finalLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando disponibilidade dos psicólogos...</p>
        </div>
      </div>
    );
  }

  if (finalError) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 mb-4">
          <p className="font-medium">Erro ao carregar dados</p>
          <p className="text-sm">{finalError}</p>
        </div>
        <Button onClick={onRefresh || refetch} variant="outline">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Horários</p>
                <p className="text-2xl font-bold text-gray-900">{getGeneralStats.totalSlots}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Horários Livres</p>
                <p className="text-2xl font-bold text-green-600">{getGeneralStats.availableSlots}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Horários Ocupados</p>
                <p className="text-2xl font-bold text-orange-600">{getGeneralStats.occupiedSlots}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Disponibilidade</p>
                <p className="text-2xl font-bold text-purple-600">
                  {getGeneralStats.availabilityRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navegação de semanas */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek(-1)}
            className="flex items-center space-x-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Semana Anterior</span>
          </Button>
          
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Disponibilidade dos Psicólogos
            </h3>
            <p className="text-sm text-gray-600">
              {psychologists.length} psicólogos cadastrados
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek(1)}
            className="flex items-center space-x-2"
          >
            <span>Próxima Semana</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showOnlyAvailable"
              checked={showOnlyAvailable}
              onChange={(e) => setShowOnlyAvailable(e.target.checked)}
              className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="showOnlyAvailable" className="text-sm font-medium text-gray-700">
              Apenas horários livres
            </label>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh || refetch}
            className="flex items-center space-x-2"
          >
            <Calendar className="h-4 w-4" />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Grid de disponibilidade por dia */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        {calculateAvailability.map((day) => (
          <Card key={day.day_of_week} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="text-lg">{day.day_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    {day.available_slots} livres
                  </Badge>
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    {day.occupied_slots} ocupados
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {day.psychologists.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Nenhum psicólogo disponível neste dia
                </p>
              ) : (
                <div className="space-y-2">
                  {day.psychologists
                    .filter(slot => showOnlyAvailable ? slot.is_available : true)
                    .map((slot, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border transition-colors ${
                        slot.is_available
                          ? 'bg-green-50 border-green-200 hover:bg-green-100'
                          : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-1 bg-white rounded-full">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-900">
                              {slot.psychologist_name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {slot.start_time} - {slot.end_time}
                            </p>
                            <p className="text-xs text-blue-600 font-medium">
                              {slot.appointment_type === 'online' ? '🌐 Online' : '🏢 Presencial'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {slot.is_available ? (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-100">
                              Disponível
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-100">
                              {slot.appointment_count} agendamento(s)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {day.psychologists.filter(slot => showOnlyAvailable ? slot.is_available : true).length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      {showOnlyAvailable ? 'Nenhum horário livre disponível' : 'Nenhum horário encontrado'}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumo por psicólogo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Resumo por Psicólogo</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {psychologists.map((psychologist) => {
              const psychologistSlots = calculateAvailability
                .flatMap(day => day.psychologists)
                .filter(slot => slot.psychologist_id === psychologist.id);
              
              const availableSlots = psychologistSlots.filter(slot => slot.is_available).length;
              const totalSlots = psychologistSlots.length;
              const availabilityRate = totalSlots > 0 ? (availableSlots / totalSlots) * 100 : 0;

              return (
                <div
                  key={psychologist.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{psychologist.name}</p>
                      <p className="text-sm text-gray-600">ID: {psychologist.id}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Horários livres:</span>
                      <span className="font-medium text-green-600">{availableSlots}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total de horários:</span>
                      <span className="font-medium text-gray-900">{totalSlots}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Disponibilidade:</span>
                      <span className="font-medium text-blue-600">
                        {availabilityRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PsychologistAvailabilityDashboard;
