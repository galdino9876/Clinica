import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Calendar, Clock, Users, CheckCircle, AlertCircle } from "lucide-react";
import { format, addDays, isSaturday } from "date-fns";

interface DashboardAppointment {
  id: number;
  patient_name: string;
  psychologist_name: string;
  start_time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  appointment_type: "presential" | "online";
  room_id: number | null;
}

interface DashboardData {
  today: {
    pending: DashboardAppointment[];
    confirmed: DashboardAppointment[];
    total: number;
  };
  tomorrow: {
    pending: DashboardAppointment[];
    confirmed: DashboardAppointment[];
    total: number;
  };
}

const AppointmentsDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    today: { pending: [], confirmed: [], total: 0 },
    tomorrow: { pending: [], confirmed: [], total: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getTodayDate = (): string => {
    return format(new Date(), 'yyyy-MM-dd');
  };

  const getTomorrowDate = (): string => {
    const today = new Date();
    
    // Se for sábado, pular domingo e ir para segunda-feira
    if (isSaturday(today)) {
      const monday = addDays(today, 2);
      return format(monday, 'yyyy-MM-dd');
    } else {
      // Para outros dias, apenas adicionar 1 dia
      const tomorrow = addDays(today, 1);
      return format(tomorrow, 'yyyy-MM-dd');
    }
  };

  const getTomorrowLabel = (): string => {
    const today = new Date();
    
    // Se for sábado, mostrar "Segunda-feira"
    if (isSaturday(today)) {
      const monday = addDays(today, 2);
      return format(monday, 'dd/MM/yyyy');
    } else {
      // Para outros dias, mostrar "Amanhã"
      const tomorrow = addDays(today, 1);
      return format(tomorrow, 'dd/MM/yyyy');
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/appointmens');
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados: ${response.status}`);
      }
      
      const appointments: any[] = await response.json();
      
      const todayDate = getTodayDate();
      const tomorrowDate = getTomorrowDate();
      
      // Filtrar dados de hoje
      const todayAppointments = appointments.filter(app => app.date === todayDate);
      const todayPending = todayAppointments.filter(app => app.status === "pending");
      const todayConfirmed = todayAppointments.filter(app => app.status === "confirmed");
      
      // Filtrar dados de amanhã
      const tomorrowAppointments = appointments.filter(app => app.date === tomorrowDate);
      const tomorrowPending = tomorrowAppointments.filter(app => app.status === "pending");
      const tomorrowConfirmed = tomorrowAppointments.filter(app => app.status === "confirmed");
      
      setDashboardData({
        today: {
          pending: todayPending,
          confirmed: todayConfirmed,
          total: todayAppointments.length
        },
        tomorrow: {
          pending: tomorrowPending,
          confirmed: tomorrowConfirmed,
          total: tomorrowAppointments.length
        }
      });
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: "pending" | "confirmed") => {
    if (status === "pending") {
      return <Badge variant="destructive" className="bg-red-500 text-xs">Pendente</Badge>;
    }
    return <Badge variant="default" className="bg-green-500 text-xs">Confirmado</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Carregando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Dashboard de Hoje */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
            Hoje - {format(new Date(), 'dd/MM/yyyy')}
            <Badge variant="outline" className="ml-auto">
              {dashboardData.today.total} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">Pendentes</p>
                <p className="text-lg font-bold text-red-600">{dashboardData.today.pending.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Confirmados</p>
                <p className="text-lg font-bold text-green-600">{dashboardData.today.confirmed.length}</p>
              </div>
            </div>
          </div>

          {/* Lista de pacientes pendentes */}
          {dashboardData.today.pending.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Pendentes de Confirmação
              </h4>
              <div className="space-y-2">
                {dashboardData.today.pending.slice(0, 3).map((appointment, index) => (
                  <div key={`today-pending-${appointment.id}-${index}`} className="flex items-center justify-between p-2 bg-red-50 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-gray-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">{appointment.patient_name}</span>
                        <span className="text-[11px] text-gray-600">{appointment.psychologist_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span className="text-xs">{appointment.start_time}</span>
                      <span className="text-[10px] text-gray-500">
                        ({appointment.appointment_type === 'online' ? 'online' : 'presencial'})
                      </span>
                      {getStatusBadge(appointment.status)}
                    </div>
                  </div>
                ))}
                {dashboardData.today.pending.length > 3 && (
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <p className="text-xs text-gray-500 text-center cursor-default">
                        +{dashboardData.today.pending.length - 3} mais pendentes
                      </p>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        {dashboardData.today.pending.slice(3).map((appointment, index) => (
                          <div key={`today-pending-extra-${appointment.id}-${index}`} className="flex items-center justify-between text-sm">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800">{appointment.patient_name}</span>
                              <span className="text-[11px] text-gray-600">{appointment.psychologist_name}</span>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <span>{appointment.start_time}</span>
                                <span className="text-[10px] text-gray-500">
                                  ({appointment.appointment_type === 'online' ? 'online' : 'presencial'})
                                </span>
                              </div>
                            </div>
                            <div>
                              {getStatusBadge(appointment.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                )}
              </div>
            </div>
          )}

          {/* Lista de pacientes confirmados */}
          {dashboardData.today.confirmed.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Confirmados
              </h4>
              <div className="space-y-2">
                {dashboardData.today.confirmed.slice(0, 3).map((appointment, index) => (
                  <div key={`appointment-${appointment.id}-${index}`} className="flex items-center justify-between p-2 bg-green-50 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-gray-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">{appointment.patient_name}</span>
                        <span className="text-[11px] text-gray-600">{appointment.psychologist_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span className="text-xs">{appointment.start_time}</span>
                      <span className="text-[10px] text-gray-500">
                        ({appointment.appointment_type === 'online' ? 'online' : 'presencial'})
                      </span>
                      {getStatusBadge(appointment.status)}
                    </div>
                  </div>
                ))}
                {dashboardData.today.confirmed.length > 3 && (
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <p className="text-xs text-gray-500 text-center cursor-default">
                        +{dashboardData.today.confirmed.length - 3} mais confirmados
                      </p>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        {dashboardData.today.confirmed.slice(3).map((appointment, index) => (
                          <div key={`appointment-${appointment.id}-${index}`} className="flex items-center justify-between text-sm">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800">{appointment.patient_name}</span>
                              <span className="text-[11px] text-gray-600">{appointment.psychologist_name}</span>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <span>{appointment.start_time}</span>
                                <span className="text-[10px] text-gray-500">
                                  ({appointment.appointment_type === 'online' ? 'online' : 'presencial'})
                                </span>
                              </div>
                            </div>
                            <div>
                              {getStatusBadge(appointment.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dashboard de Amanhã */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-purple-600" />
            {isSaturday(new Date()) ? 'Segunda-feira' : 'Amanhã'} - {getTomorrowLabel()}
            <Badge variant="outline" className="ml-auto">
              {dashboardData.tomorrow.total} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">Pendentes</p>
                <p className="text-lg font-bold text-red-600">{dashboardData.tomorrow.pending.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Confirmados</p>
                <p className="text-lg font-bold text-green-600">{dashboardData.tomorrow.confirmed.length}</p>
              </div>
            </div>
          </div>

          {/* Lista de pacientes pendentes */}
          {dashboardData.tomorrow.pending.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Pendentes de Confirmação
              </h4>
              <div className="space-y-2">
                {dashboardData.tomorrow.pending.slice(0, 3).map((appointment, index) => (
                  <div key={`appointment-${appointment.id}-${index}`} className="flex items-center justify-between p-2 bg-red-50 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-gray-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">{appointment.patient_name}</span>
                        <span className="text-[11px] text-gray-600">{appointment.psychologist_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span className="text-xs">{appointment.start_time}</span>
                      <span className="text-[10px] text-gray-500">
                        ({appointment.appointment_type === 'online' ? 'online' : 'presencial'})
                      </span>
                      {getStatusBadge(appointment.status)}
                    </div>
                  </div>
                ))}
                {dashboardData.tomorrow.pending.length > 3 && (
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <p className="text-xs text-gray-500 text-center cursor-default">
                        +{dashboardData.tomorrow.pending.length - 3} mais pendentes
                      </p>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        {dashboardData.tomorrow.pending.slice(3).map((appointment, index) => (
                          <div key={`appointment-${appointment.id}-${index}`} className="flex items-center justify-between text-sm">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800">{appointment.patient_name}</span>
                              <span className="text-[11px] text-gray-600">{appointment.psychologist_name}</span>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <span>{appointment.start_time}</span>
                                <span className="text-[10px] text-gray-500">
                                  ({appointment.appointment_type === 'online' ? 'online' : 'presencial'})
                                </span>
                              </div>
                            </div>
                            <div>
                              {getStatusBadge(appointment.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                )}
              </div>
            </div>
          )}

          {/* Lista de pacientes confirmados */}
          {dashboardData.tomorrow.confirmed.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Confirmados
              </h4>
              <div className="space-y-2">
                {dashboardData.tomorrow.confirmed.slice(0, 3).map((appointment, index) => (
                  <div key={`appointment-${appointment.id}-${index}`} className="flex items-center justify-between p-2 bg-green-50 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-gray-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">{appointment.patient_name}</span>
                        <span className="text-[11px] text-gray-600">{appointment.psychologist_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span className="text-xs">{appointment.start_time}</span>
                      <span className="text-[10px] text-gray-500">
                        ({appointment.appointment_type === 'online' ? 'online' : 'presencial'})
                      </span>
                      {getStatusBadge(appointment.status)}
                    </div>
                  </div>
                ))}
                {dashboardData.tomorrow.confirmed.length > 3 && (
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <p className="text-xs text-gray-500 text-center cursor-default">
                        +{dashboardData.tomorrow.confirmed.length - 3} mais confirmados
                      </p>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        {dashboardData.tomorrow.confirmed.slice(3).map((appointment, index) => (
                          <div key={`appointment-${appointment.id}-${index}`} className="flex items-center justify-between text-sm">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800">{appointment.patient_name}</span>
                              <span className="text-[11px] text-gray-600">{appointment.psychologist_name}</span>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <span>{appointment.start_time}</span>
                                <span className="text-[10px] text-gray-500">
                                  ({appointment.appointment_type === 'online' ? 'online' : 'presencial'})
                                </span>
                              </div>
                            </div>
                            <div>
                              {getStatusBadge(appointment.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentsDashboard;
