import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  RefreshCw,
  Filter,
  Download,
  Eye,
  Plus,
  AlertTriangle,
  FileText,
  Edit,
  CalendarDays
} from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast, Toaster } from "sonner";

interface Appointment {
  id: number;
  patient_id: number;
  patient_name: string;
  psychologist_id: number;
  psychologist_name: string;
  room_id: number | null;
  date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  payment_method: "private" | "insurance";
  insurance_type: string | null;
  insurance_token: string | null;
  value: string;
  appointment_type: "presential" | "online";
  is_recurring: number;
  recurrence_type: string | null;
  created_at: string;
  updated_at: string | null;
}

interface GuideData {
  id: number;
  id_patient: number;
  numero_prestador: string;
  date_1: string | null;
  date_2: string | null;
  date_3: string | null;
  date_4: string | null;
  date_5: string | null;
}

interface PatientSessionInfo {
  patient_id: number;
  patient_name: string;
  psychologist_name: string;
  total_appointments: number;
  monthly_appointments: string[];
  guide_dates: string[];
  appointment_dates: string[];
  appointment_statuses?: Map<string, string>;
  last_guide_date: string | null;
  needs_new_guide: boolean;
  weeks_until_expiry: number | null;
  status: 'ok' | 'warning' | 'urgent' | 'no_guides' | 'incomplete';
  monthly_guide_status: 'ok' | 'pending';
  needs_next_month_guide: boolean;
}

interface DashboardStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  thisWeek: number;
  today: number;
  tomorrow: number;
}

const GuideControl = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [guideData, setGuideData] = useState<GuideData[]>([]);
  const [patientSessions, setPatientSessions] = useState<PatientSessionInfo[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddGuideModalOpen, setIsAddGuideModalOpen] = useState(false);
  const [selectedPatientForGuide, setSelectedPatientForGuide] = useState<number | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [prestadorNumber, setPrestadorNumber] = useState<string>("");
  const [patientGuides, setPatientGuides] = useState<GuideData[]>([]);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [editingGuide, setEditingGuide] = useState<GuideData | null>(null);
  const [editFormData, setEditFormData] = useState({
    numero_prestador: '',
    date_1: '',
    date_2: '',
    date_3: '',
    date_4: '',
    date_5: ''
  });
  const [editSelectedDates, setEditSelectedDates] = useState<string[]>([]);
  const [editCalendarMonth, setEditCalendarMonth] = useState(new Date());
  const [addGuideCalendarMonth, setAddGuideCalendarMonth] = useState(new Date());
  const [showExistingGuides, setShowExistingGuides] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    thisWeek: 0,
    today: 0,
    tomorrow: 0
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'no_guides' | 'incomplete'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculatePatientSessions();
  }, [appointments, guideData, selectedMonth]);


  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar agendamentos (GET) e guias (POST) em paralelo
      const [appointmentsResponse, guidesResponse] = await Promise.all([
        fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/appointmens'),
        fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/return_date_guias', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        })
      ]);
      
      if (!appointmentsResponse.ok) {
        throw new Error(`Erro ao buscar agendamentos: ${appointmentsResponse.status}`);
      }
      
      if (!guidesResponse.ok) {
        throw new Error(`Erro ao buscar guias: ${guidesResponse.status}`);
      }
      
      const appointmentsData: Appointment[] = await appointmentsResponse.json();
      const guidesData: GuideData[] = await guidesResponse.json();
      
      setAppointments(appointmentsData);
      setGuideData(guidesData);
      calculateStats(appointmentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Appointment[]) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const weekDates = weekDays.map(day => format(day, 'yyyy-MM-dd'));

    const newStats: DashboardStats = {
      total: data.length,
      pending: data.filter(app => app.status === "pending").length,
      confirmed: data.filter(app => app.status === "confirmed").length,
      completed: data.filter(app => app.status === "completed").length,
      cancelled: data.filter(app => app.status === "cancelled").length,
      thisWeek: data.filter(app => weekDates.includes(app.date)).length,
      today: data.filter(app => app.date === today).length,
      tomorrow: data.filter(app => app.date === tomorrow).length
    };

    setStats(newStats);
  };

  const calculatePatientSessions = () => {
    const patientMap = new Map<number, PatientSessionInfo>();
    
    // Criar datas de forma mais robusta
    const [year, month] = selectedMonth.split('-').map(Number);
    const selectedMonthStart = new Date(year, month - 1, 1);
    const selectedMonthEnd = new Date(year, month, 0); // Último dia do mês
    const nextMonthStart = new Date(year, month, 1);


    // Agrupar agendamentos por paciente (todos os status)
    appointments.forEach(appointment => {
      const patientId = appointment.patient_id;
      
      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          patient_id: patientId,
          patient_name: appointment.patient_name,
          psychologist_name: appointment.psychologist_name,
          total_appointments: 0,
          monthly_appointments: [],
          guide_dates: [],
          appointment_dates: [],
          last_guide_date: null,
          needs_new_guide: false,
          weeks_until_expiry: null,
          status: 'ok',
          monthly_guide_status: 'pending',
          needs_next_month_guide: false
        });
      }

      const patient = patientMap.get(patientId)!;
      patient.total_appointments++;
      patient.appointment_dates.push(appointment.date);
      
      // Filtrar agendamentos do mês selecionado usando comparação de strings
      const appointmentDateStr = appointment.date; // formato: "2025-09-01"
      const appointmentYear = parseInt(appointmentDateStr.split('-')[0]);
      const appointmentMonth = parseInt(appointmentDateStr.split('-')[1]);
      
      
      if (appointmentYear === year && appointmentMonth === month) {
        patient.monthly_appointments.push(appointment.date);
        // Armazenar também o status do agendamento para colorização
        if (!patient.appointment_statuses) {
          patient.appointment_statuses = new Map();
        }
        patient.appointment_statuses.set(appointment.date, appointment.status);
      }
    });

    // Adicionar dados das guias
    guideData.forEach(guide => {
      const patientId = guide.id_patient;
      if (patientMap.has(patientId)) {
        const patient = patientMap.get(patientId)!;
        const allGuideDates = [guide.date_1, guide.date_2, guide.date_3, guide.date_4, guide.date_5]
          .filter(date => date !== null) as string[];
        
        // Filtrar apenas as datas do mês selecionado
        const monthlyGuideDates = allGuideDates.filter(date => {
          const [guideYear, guideMonth] = date.split('-').map(Number);
          return guideYear === year && guideMonth === month;
        });
        
        patient.guide_dates = monthlyGuideDates;
        patient.last_guide_date = monthlyGuideDates[monthlyGuideDates.length - 1] || null;
      }
    });

    // Calcular status e alertas
    patientMap.forEach(patient => {
      // Ordenar datas
      patient.appointment_dates.sort();
      patient.guide_dates.sort();
      patient.monthly_appointments.sort();

      // Verificar se tem agendamentos do mês selecionado
      if (patient.monthly_appointments.length === 0) {
        patient.status = 'ok';
        patient.monthly_guide_status = 'pending';
        patient.needs_new_guide = false;
        patient.needs_next_month_guide = false;
        return;
      }

      // Verificar se tem guias para o mês selecionado
      const monthlyGuideDates = patient.guide_dates.filter(date => {
        const [guideYear, guideMonth] = date.split('-').map(Number);
        return guideYear === year && guideMonth === month;
      });

      // Verificar se tem guias para o mês seguinte
      const nextMonthGuideDates = patient.guide_dates.filter(date => {
        const [guideYear, guideMonth] = date.split('-').map(Number);
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        return guideYear === nextYear && guideMonth === nextMonth;
      });

      // Comparar datas do mês - verificar se todas as datas de agendamento têm guias correspondentes
      const hasAllMonthlyGuides = patient.monthly_appointments.every(appDate => 
        monthlyGuideDates.some(guideDate => guideDate === appDate)
      );

      // Verificar se tem agendamentos sem guias (incompleto)
      const appointmentsWithoutGuides = patient.monthly_appointments.filter(appDate => 
        !monthlyGuideDates.some(guideDate => guideDate === appDate)
      );

      // Verificar agendamentos urgentes (próximos 5 dias sem guia)
      const today = new Date();
      const urgentAppointments = patient.monthly_appointments.filter(appDate => {
        const appointmentDate = new Date(appDate);
        const daysDifference = Math.ceil((appointmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysDifference <= 5 && daysDifference >= 0 && !monthlyGuideDates.some(guideDate => guideDate === appDate);
      });

      if (patient.guide_dates.length === 0) {
        // Sem guias autorizadas para o mês
        patient.status = 'no_guides';
        patient.monthly_guide_status = 'pending';
        patient.needs_new_guide = true;
        patient.needs_next_month_guide = false;
      } else if (urgentAppointments.length > 0) {
        // Tem agendamentos urgentes (próximos 5 dias sem guia)
        patient.status = 'urgent';
        patient.monthly_guide_status = 'pending';
        patient.needs_new_guide = true;
        patient.needs_next_month_guide = false;
      } else if (appointmentsWithoutGuides.length > 0) {
        // Tem agendamentos sem guias correspondentes (incompleto)
        patient.status = 'incomplete';
        patient.monthly_guide_status = 'pending';
        patient.needs_new_guide = true;
        patient.needs_next_month_guide = false;
      } else if (hasAllMonthlyGuides) {
        // Todas as datas têm guias correspondentes
        patient.monthly_guide_status = 'ok';
        patient.status = 'ok';
        patient.needs_new_guide = false;
        
        // Verificar se precisa de guia do mês seguinte (só na última semana do mês)
        const lastWeekOfMonth = new Date(selectedMonthEnd.getFullYear(), selectedMonthEnd.getMonth(), selectedMonthEnd.getDate() - 7);
        const isLastWeekOfMonth = today >= lastWeekOfMonth;
        
        patient.needs_next_month_guide = isLastWeekOfMonth && nextMonthGuideDates.length === 0;
      } else {
        // Caso padrão
        patient.status = 'ok';
        patient.monthly_guide_status = 'pending';
        patient.needs_new_guide = false;
        patient.needs_next_month_guide = false;
      }
    });

    const sessions = Array.from(patientMap.values());
    setPatientSessions(sessions);
  };


  const handleAddGuide = async (patientId: number) => {
    setSelectedPatientForGuide(patientId);
    setSelectedDates([]);
    setPrestadorNumber("");
    setIsAddGuideModalOpen(true);
    
    // Buscar guias do paciente
    await fetchPatientGuides(patientId);
  };

  const fetchPatientGuides = async (patientId: number) => {
    try {
      setLoadingGuides(true);
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/return_data_guias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_patient: patientId })
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar guias: ${response.status}`);
      }

      const guidesData: GuideData[] = await response.json();
      
      // Mostrar todas as guias do paciente, sem filtragem por mês
      // Ordenar da mais recente para a mais antiga
      const sortedGuides = guidesData.sort((a, b) => {
        const dateA = new Date(a.date_1 || '');
        const dateB = new Date(b.date_1 || '');
        return dateB.getTime() - dateA.getTime();
      });
      setPatientGuides(sortedGuides);
    } catch (error) {
      console.error('Erro ao buscar guias do paciente:', error);
      setPatientGuides([]);
    } finally {
      setLoadingGuides(false);
    }
  };

  const handleDateSelect = (date: string) => {
    if (selectedDates.includes(date)) {
      setSelectedDates(selectedDates.filter(d => d !== date));
    } else if (selectedDates.length < 5) {
      setSelectedDates([...selectedDates, date].sort());
    }
  };

  const handleSubmitGuide = async () => {
    if (!selectedPatientForGuide || selectedDates.length === 0 || !prestadorNumber) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const payload: any = {
        numero_prestador: prestadorNumber,
        id_patient: selectedPatientForGuide
      };

      // Adicionar as datas selecionadas
      selectedDates.forEach((date, index) => {
        payload[`date_${index + 1}`] = date;
      });

      // Preencher as datas restantes com a última data selecionada
      for (let i = selectedDates.length; i < 5; i++) {
        payload[`date_${i + 1}`] = selectedDates[selectedDates.length - 1];
      }

      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/insert_date_guias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Erro ao inserir guias: ${response.status}`);
      }

      toast.success("Guias inseridas com sucesso!");
      setIsAddGuideModalOpen(false);
      fetchData(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao inserir guias:', error);
      toast.error("Erro ao inserir guias. Tente novamente.");
    }
  };

  const handleEditGuide = (guide: GuideData) => {
    setEditingGuide(guide);
    setEditFormData({
      numero_prestador: guide.numero_prestador || '',
      date_1: guide.date_1 || '',
      date_2: guide.date_2 || '',
      date_3: guide.date_3 || '',
      date_4: guide.date_4 || '',
      date_5: guide.date_5 || ''
    });
    
    // Preencher as datas selecionadas com as datas existentes da guia
    const existingDates = [guide.date_1, guide.date_2, guide.date_3, guide.date_4, guide.date_5]
      .filter(date => date && date !== null && date !== '')
      .sort();
    setEditSelectedDates(existingDates);
    
    // Definir o mês do calendário baseado na primeira data existente ou mês atual
    if (existingDates.length > 0) {
      const firstDate = parseISO(existingDates[0]);
      setEditCalendarMonth(new Date(firstDate.getFullYear(), firstDate.getMonth(), 1));
    } else {
      setEditCalendarMonth(new Date());
    }
  };

  const handleSubmitEditGuide = async () => {
    if (!editingGuide || !editFormData.numero_prestador) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      const payload = {
        numero_prestador: editFormData.numero_prestador,
        id_patient: editingGuide.id_patient,
        date_1: editSelectedDates[0] || '',
        date_2: editSelectedDates[1] || '',
        date_3: editSelectedDates[2] || '',
        date_4: editSelectedDates[3] || '',
        date_5: editSelectedDates[4] || ''
      };

      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/insert_date_guias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Guia editada com sucesso!');
        setEditingGuide(null);
        setEditFormData({
          numero_prestador: '',
          date_1: '',
          date_2: '',
          date_3: '',
          date_4: '',
          date_5: ''
        });
        setEditSelectedDates([]);
        setEditCalendarMonth(new Date());
        fetchData(); // Recarregar dados
      } else {
        toast.error('Erro ao editar guia');
      }
    } catch (error) {
      console.error('Erro ao editar guia:', error);
      toast.error('Erro ao editar guia');
    }
  };

  const handleEditDateSelect = (date: string) => {
    if (editSelectedDates.includes(date)) {
      // Remover data se já estiver selecionada
      setEditSelectedDates(editSelectedDates.filter(d => d !== date));
    } else if (editSelectedDates.length < 5) {
      // Adicionar data se ainda não tiver 5 selecionadas
      setEditSelectedDates([...editSelectedDates, date].sort());
    }
  };

  const handleEditPreviousMonth = () => {
    setEditCalendarMonth(new Date(editCalendarMonth.getFullYear(), editCalendarMonth.getMonth() - 1, 1));
  };

  const handleEditNextMonth = () => {
    setEditCalendarMonth(new Date(editCalendarMonth.getFullYear(), editCalendarMonth.getMonth() + 1, 1));
  };

  const handleAddGuidePreviousMonth = () => {
    setAddGuideCalendarMonth(new Date(addGuideCalendarMonth.getFullYear(), addGuideCalendarMonth.getMonth() - 1, 1));
  };

  const handleAddGuideNextMonth = () => {
    setAddGuideCalendarMonth(new Date(addGuideCalendarMonth.getFullYear(), addGuideCalendarMonth.getMonth() + 1, 1));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-500", text: "Pendente" },
      confirmed: { color: "bg-green-500", text: "Confirmado" },
      completed: { color: "bg-blue-500", text: "Concluído" },
      cancelled: { color: "bg-red-500", text: "Cancelado" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  const getAppointmentStatusColor = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      confirmed: "bg-green-100 text-green-800 border-green-300",
      completed: "bg-purple-100 text-purple-800 border-purple-300",
      cancelled: "bg-red-100 text-red-800 border-red-300"
    };
    
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getAppointmentStatusForDate = (date: string, patientId: number) => {
    const appointment = appointments.find(app => 
      app.patient_id === patientId && app.date === date
    );
    return appointment?.status || 'unknown';
  };

  const getSessionStatusBadge = (status: string) => {
    const statusConfig = {
      ok: { color: "bg-green-500", text: "OK", icon: CheckCircle },
      warning: { color: "bg-yellow-500", text: "Atenção", icon: AlertTriangle },
      urgent: { color: "bg-red-500", text: "Urgente", icon: AlertCircle },
      no_guides: { color: "bg-gray-500", text: "Sem Guias", icon: FileText },
      incomplete: { color: "bg-yellow-500", text: "Incompleto", icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ok;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const generateDateOptions = () => {
    const currentMonth = addGuideCalendarMonth.getMonth();
    const currentYear = addGuideCalendarMonth.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = startOfWeek(firstDay, { weekStartsOn: 0 });
    const endDate = endOfWeek(lastDay, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => ({
      value: format(day, 'yyyy-MM-dd'),
      label: format(day, 'dd/MM/yyyy', { locale: ptBR }),
      day: day
    }));
  };


  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando dados...</span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6 bg-red-50 border border-red-200 rounded-md text-center">
          <p className="text-red-600">Erro: {error}</p>
        <Button onClick={fetchData} className="mt-4">
          Tentar Novamente
        </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Controle de Guias</h1>
            <p className="text-gray-600 mt-1">Monitoramento de agendamentos e atendimentos</p>
          </div>
          <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.thisWeek} esta semana
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              activeFilter === 'incomplete' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => setActiveFilter(activeFilter === 'incomplete' ? 'all' : 'incomplete')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pacientes com agendamento e faltando pelo menos 1 guia</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {patientSessions.filter(p => p.status === 'incomplete' || p.status === 'urgent').length}
              </div>
              <p className="text-xs text-muted-foreground">
                {patientSessions.filter(p => p.status === 'incomplete').length} precisam completar guias
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              activeFilter === 'urgent' ? 'ring-2 ring-red-500 bg-red-50' : ''
            }`}
            onClick={() => setActiveFilter(activeFilter === 'urgent' ? 'all' : 'urgent')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgentes</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {patientSessions.filter(p => p.status === 'urgent').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Próximos 5 dias sem guia autorizada
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              activeFilter === 'no_guides' ? 'ring-2 ring-gray-500 bg-gray-50' : ''
            }`}
            onClick={() => setActiveFilter(activeFilter === 'no_guides' ? 'all' : 'no_guides')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sem Guias</CardTitle>
              <FileText className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {patientSessions.filter(p => p.status === 'no_guides').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Agendamentos sem nenhuma guia autorizada para aquele mês
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard de Sessões por Paciente */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Controle de Sessões por Paciente
              </CardTitle>
              {activeFilter !== 'all' && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    {activeFilter === 'urgent' && '🔴 Urgentes'}
                    {activeFilter === 'no_guides' && '⚫ Sem Guias'}
                    {activeFilter === 'incomplete' && '🟡 Incompletos'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveFilter('all')}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtro simples de mês/ano */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Filtrar por mês:</span>
                </div>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Mostrando:</span>
                <span className="font-medium text-blue-600">
                  {format(parseISO(selectedMonth + '-01'), 'MMMM yyyy', { locale: ptBR })}
                </span>
              </div>
            </div>

            {(() => {
              const filteredSessions = patientSessions.filter(p => {
                if (p.monthly_appointments.length === 0) return false;
                
                switch (activeFilter) {
                  case 'urgent':
                    return p.status === 'urgent';
                  case 'no_guides':
                    return p.status === 'no_guides';
                  case 'incomplete':
                    return p.status === 'incomplete' || p.status === 'urgent';
                  default:
                    return true;
                }
              });
              
              return filteredSessions.length === 0;
            })() ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Nenhum agendamento encontrado
                </h3>
                <p className="text-gray-500">
                  Não há agendamentos para o período selecionado
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {patientSessions
                  .filter(p => {
                    if (p.monthly_appointments.length === 0) return false;
                    
                    switch (activeFilter) {
                      case 'urgent':
                        return p.status === 'urgent';
                      case 'no_guides':
                        return p.status === 'no_guides';
                      case 'incomplete':
                        return p.status === 'incomplete' || p.status === 'urgent';
                      default:
                        return true;
                    }
                  })
                  .map((patient) => (
                  <div
                    key={patient.patient_id}
                    className="flex items-center justify-between p-6 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-8">
                      {/* Coluna 1: Nome do paciente */}
                      <div className="w-48">
                        <p className="font-medium text-gray-900">{patient.patient_name}</p>
                        <p className="text-sm text-gray-600">{patient.psychologist_name}</p>
                      </div>
                      
                      {/* Coluna 2: Agendamentos e Guias */}
                      <div className="flex-1 min-w-0 px-4">
                        <p className="text-sm font-medium text-gray-900">
                          {patient.monthly_appointments.length} agendamentos em {format(parseISO(selectedMonth + '-01'), 'MM/yyyy', { locale: ptBR })}
                        </p>
                        
                        <div className="space-y-1 mt-2">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded whitespace-nowrap flex-shrink-0">
                              📅 Agendamentos:
                            </span>
                            <div className="flex gap-1 whitespace-nowrap min-w-0 overflow-hidden">
                              {patient.monthly_appointments.length > 0 
                                ? patient.monthly_appointments.map(date => {
                                    const status = patient.appointment_statuses?.get(date) || 'unknown';
                                    return (
                                      <span
                                        key={date}
                                        className={`px-1.5 py-0.5 rounded text-xs border whitespace-nowrap ${getAppointmentStatusColor(status)}`}
                                      >
                                        {format(parseISO(date), 'dd/MM', { locale: ptBR })}
                                      </span>
                                    );
                                  })
                                : <span className="text-sm text-gray-700">Nenhum agendamento</span>
                              }
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded whitespace-nowrap flex-shrink-0">
                              ✅ Guias:
                            </span>
                            <div className="flex gap-1 whitespace-nowrap min-w-0 overflow-hidden">
                              {patient.guide_dates.length > 0 
                                ? patient.guide_dates.map(date => (
                                    <span
                                      key={date}
                                      className="px-1.5 py-0.5 rounded text-xs border bg-green-100 text-green-800 border-green-300 whitespace-nowrap"
                                    >
                                      {format(parseISO(date), 'dd/MM', { locale: ptBR })}
                                    </span>
                                  ))
                                : <span className="text-sm text-gray-700"></span>
                              }
                              {/* Mostrar datas que precisam de guia */}
                              {patient.monthly_appointments
                                .filter(appDate => !patient.guide_dates.includes(appDate))
                                .map(date => (
                                  <span
                                    key={`missing-${date}`}
                                    className="px-1.5 py-0.5 rounded text-xs border bg-red-100 text-red-800 border-red-300 whitespace-nowrap"
                                    title="Precisa solicitar guia para esta data"
                                  >
                                    ({format(parseISO(date), 'dd/MM', { locale: ptBR })})
                                  </span>
                                ))
                              }
                            </div>
                          </div>
                        </div>
                        
                        {/* Legenda simples */}
                        {patient.monthly_appointments.some(appDate => !patient.guide_dates.includes(appDate)) && (
                          <div className="mt-2 text-xs text-red-600">
                            <span className="font-medium">📋 Legenda:</span> Falta solicitar guia para: {patient.monthly_appointments
                              .filter(appDate => !patient.guide_dates.includes(appDate))
                              .map(date => format(parseISO(date), 'dd/MM', { locale: ptBR }))
                              .join(', ')}
                          </div>
                        )}
                        
                      </div>
                      
                      {/* Coluna 3: Status e Ações (canto direito) */}
                      <div className="w-48 flex flex-col items-end justify-start">
                        {patient.needs_next_month_guide && (
                          <div className="bg-orange-100 border border-orange-300 rounded-md p-2 mb-3 w-full">
                            <p className="text-sm font-medium text-orange-800">
                              ⚠️ Guia do mês seguinte pendente
                            </p>
                          </div>
                        )}
                        
                        <div className="flex flex-col items-end gap-2">
                          {getSessionStatusBadge(patient.status)}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAddGuide(patient.patient_id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Guias
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>


        {/* Modal para Adicionar Guias */}
        <Dialog open={isAddGuideModalOpen} onOpenChange={(open) => {
          setIsAddGuideModalOpen(open);
          if (!open) {
            setShowExistingGuides(false);
          }
        }}>
          <DialogContent className="max-w-4xl w-full">
            <DialogHeader>
              <DialogTitle>Adicionar Guias para Paciente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Número do Prestador</label>
                <input
                  type="text"
                  value={prestadorNumber}
                  onChange={(e) => setPrestadorNumber(e.target.value)}
                  placeholder="Digite o número do prestador"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Selecionar Datas (máximo 5)
                </label>
                <div className="border border-gray-200 rounded-md p-4">
                  {/* Cabeçalho do calendário com navegação */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={handleAddGuidePreviousMonth}
                      className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h3 className="text-sm font-medium text-gray-900">
                      {format(addGuideCalendarMonth, 'MMMM yyyy', { locale: ptBR })}
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddGuideNextMonth}
                      className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
                    <div>Dom</div>
                    <div>Seg</div>
                    <div>Ter</div>
                    <div>Qua</div>
                    <div>Qui</div>
                    <div>Sex</div>
                    <div>Sáb</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {generateDateOptions().map((option) => {
                      const today = new Date();
                      const currentMonth = addGuideCalendarMonth.getMonth();
                      const isCurrentMonth = option.day.getMonth() === currentMonth;
                      const isSelected = selectedDates.includes(option.value);
                      const isToday = format(option.day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
                      const isDisabled = !isSelected && selectedDates.length >= 5;
                      
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleDateSelect(option.value)}
                          disabled={!isCurrentMonth || isDisabled}
                          className={`
                            h-8 w-8 text-xs rounded-md transition-colors
                            ${!isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : ''}
                            ${isCurrentMonth && !isSelected && !isDisabled ? 'hover:bg-gray-100 text-gray-700' : ''}
                            ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                            ${isToday && !isSelected ? 'bg-gray-200 text-gray-900' : ''}
                            ${isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
                          `}
                        >
                          {format(option.day, 'd')}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedDates.length}/5 datas selecionadas
                </p>
              </div>

              {selectedDates.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm font-medium mb-2">Datas Selecionadas:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDates.map((date, index) => (
                      <span
                        key={date}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                      >
                        {format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões de ação - Movidos para logo após o calendário */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddGuideModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitGuide}
                  disabled={selectedDates.length === 0 || !prestadorNumber}
                >
                  Adicionar Guias
                </Button>
              </div>

              {/* Botão para mostrar guias existentes */}
              <div className="border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowExistingGuides(!showExistingGuides);
                    if (!showExistingGuides && selectedPatientForGuide) {
                      fetchPatientGuides(selectedPatientForGuide);
                    }
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 w-full justify-start"
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left">
                    {showExistingGuides ? 'Ocultar' : 'Mostrar'} Guias Existentes do Paciente
                  </span>
                  {showExistingGuides ? (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </Button>
              </div>

              {/* Lista de Guias Existentes - Só aparece quando acionado */}
              {showExistingGuides && (
                <div>
                <div className="border border-gray-200 rounded-md p-4 max-h-48 overflow-y-auto">
                  {loadingGuides ? (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-gray-500">Carregando guias...</span>
                    </div>
                  ) : patientGuides.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-medium text-gray-700">GUIA</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-700">Nº PRESTADOR</th>
                            <th className="text-center py-2 px-3 font-medium text-gray-700">DATA 1</th>
                            <th className="text-center py-2 px-3 font-medium text-gray-700">DATA 2</th>
                            <th className="text-center py-2 px-3 font-medium text-gray-700">DATA 3</th>
                            <th className="text-center py-2 px-3 font-medium text-gray-700">DATA 4</th>
                            <th className="text-center py-2 px-3 font-medium text-gray-700">DATA 5</th>
                            <th className="text-center py-2 px-3 font-medium text-gray-700">AÇÕES</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patientGuides.map((guide, index) => (
                            <tr key={guide.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 px-3 font-medium text-gray-900">
                                {guide.id}
                              </td>
                              <td className="py-2 px-3 text-gray-600">
                                {guide.numero_prestador}
                              </td>
                              {[guide.date_1, guide.date_2, guide.date_3, guide.date_4, guide.date_5].map((date, dateIndex) => {
                                const status = date ? getAppointmentStatusForDate(date, guide.id_patient) : 'unknown';
                                return (
                                  <td key={dateIndex} className="py-2 px-3 text-center">
                                    {date ? (
                                      <span className={`px-2 py-1 rounded text-xs border ${getAppointmentStatusColor(status)}`}>
                                        {format(parseISO(date), 'dd/MM', { locale: ptBR })}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="py-2 px-3 text-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditGuide(guide)}
                                  className="h-8 px-3"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Editar
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">Nenhuma guia encontrada para este paciente</p>
                    </div>
                  )}
                </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal para Editar Guia */}
        <Dialog open={editingGuide !== null} onOpenChange={() => {
          setEditingGuide(null);
          setEditSelectedDates([]);
          setEditCalendarMonth(new Date());
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Guia do Paciente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Número do Prestador</label>
                <input
                  type="text"
                  value={editFormData.numero_prestador}
                  onChange={(e) => setEditFormData({...editFormData, numero_prestador: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite o número do prestador"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Selecionar Datas (máximo 5)</label>
                <div className="border border-gray-200 rounded-md p-4">
                  {/* Cabeçalho do calendário com navegação */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={handleEditPreviousMonth}
                      className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h3 className="text-sm font-medium text-gray-900">
                      {format(editCalendarMonth, 'MMMM yyyy', { locale: ptBR })}
                    </h3>
                    <button
                      type="button"
                      onClick={handleEditNextMonth}
                      className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
                    <div>Dom</div>
                    <div>Seg</div>
                    <div>Ter</div>
                    <div>Qua</div>
                    <div>Qui</div>
                    <div>Sex</div>
                    <div>Sáb</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      const today = new Date();
                      const currentMonth = editCalendarMonth.getMonth();
                      const currentYear = editCalendarMonth.getFullYear();
                      const firstDay = new Date(currentYear, currentMonth, 1);
                      const lastDay = new Date(currentYear, currentMonth + 1, 0);
                      const startDate = startOfWeek(firstDay, { weekStartsOn: 0 });
                      const endDate = endOfWeek(lastDay, { weekStartsOn: 0 });
                      const days = eachDayOfInterval({ start: startDate, end: endDate });
                      
                      return days.map((day) => {
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const isCurrentMonth = day.getMonth() === currentMonth;
                        const isSelected = editSelectedDates.includes(dayStr);
                        const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
                        
                        return (
                          <button
                            key={dayStr}
                            type="button"
                            onClick={() => handleEditDateSelect(dayStr)}
                            disabled={!isCurrentMonth}
                            className={`
                              h-8 w-8 text-xs rounded-md transition-colors
                              ${!isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : ''}
                              ${isCurrentMonth && !isSelected ? 'hover:bg-gray-100 text-gray-700' : ''}
                              ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                              ${isToday && !isSelected ? 'bg-gray-200 text-gray-900' : ''}
                            `}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
                
                {editSelectedDates.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Datas selecionadas:</p>
                    <div className="flex flex-wrap gap-2">
                      {editSelectedDates.map((date, index) => (
                        <span
                          key={date}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                        >
                          {format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR })} (Data {index + 1})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingGuide(null)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitEditGuide}
                  disabled={!editFormData.numero_prestador || editSelectedDates.length === 0}
                >
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <Toaster position="bottom-right" />
      </div>
    </Layout>
  );
};

export default GuideControl;
