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
  CalendarDays,
  Upload,
  FileCheck
} from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast, Toaster } from "sonner";
import { useAuth } from "@/context/AuthContext";
import GuideStatsChart from "@/components/GuideStatsChart";

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
  name?: string;
}

interface CompletedGuide {
  id: number;
  id_patient: number;
  numero_prestador: string;
  existe_pdf_assinado: number; // Manter para compatibilidade
  existe_guia_autorizada: number;
  existe_guia_assinada: number;
  existe_guia_assinada_psicologo: number;
  date_1: string | null;
  date_2: string | null;
  date_3: string | null;
  date_4: string | null;
  date_5: string | null;
  name: string;
}

interface PatientSessionInfo {
  patient_id: number;
  patient_name: string;
  psychologist_name: string;
  payment_method: "private" | "insurance";
  insurance_type: string | null;
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
  // Novos campos para análise de padrões semanais
  weekly_pattern?: 'weekly' | null;
  suggested_dates: string[];
  missing_appointments: string[];
  missing_guides: string[];
  expected_dates: string[];
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
  const { user } = useAuth();
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
  const [activeTab, setActiveTab] = useState<'control' | 'completed'>('control');
  const [completedGuides, setCompletedGuides] = useState<CompletedGuide[]>([]);
  const [loadingCompletedGuides, setLoadingCompletedGuides] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedGuideForUpload, setSelectedGuideForUpload] = useState<CompletedGuide | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'autorizada' | 'assinada' | 'assinada_psicologo' | null>(null);
  const [selectedCompletedMonth, setSelectedCompletedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingEverything, setDownloadingEverything] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    remaining: 0
  });
  const [downloadEverythingProgress, setDownloadEverythingProgress] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    remaining: 0,
    currentStep: '',
    currentGuide: ''
  });

  // Verificação de permissões do usuário
  const isAdmin = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";
  const isPsychologist = user?.role === "psychologist";
  const canViewAlerts = isAdmin || isReceptionist; // Apenas admin e recepcionista podem ver alertas

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculatePatientSessions();
  }, [appointments, guideData, selectedMonth]);

  useEffect(() => {
    if (activeTab === 'completed') {
      getCompletedGuidesForCurrentMonth();
    }
  }, [activeTab, selectedCompletedMonth]);


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

  // Função para detectar padrões semanais e sugerir datas faltantes
  const detectWeeklyPatternAndSuggestDates = (appointmentDates: string[], guideDates: string[], month: number, year: number) => {
    if (appointmentDates.length === 0) return { pattern: null, suggestedDates: [], missingAppointments: [], missingGuides: [] };

    // Converter para objetos Date e ordenar
    const sortedAppointments = appointmentDates
      .map(date => ({ date, dateObj: parseISO(date) }))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    let isWeeklyPattern = false;
    let expectedDates: string[] = [];

    if (appointmentDates.length === 1) {
      // Para casos com apenas 1 agendamento, verificar se há espaço para mais semanas no mês
      const firstDate = sortedAppointments[0].dateObj;
      const monthEnd = new Date(year, month, 0); // Último dia do mês
      
      // Calcular quantas semanas cabem no mês a partir da primeira data
      const weeksFromFirstDate = Math.floor((monthEnd.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      
      // Se há pelo menos 1 semana disponível após a primeira data, assumir padrão semanal
      if (weeksFromFirstDate >= 1) {
        isWeeklyPattern = true;
        
        // Gerar datas semanais a partir da primeira data até o final do mês
        const currentDate = new Date(firstDate);
        
        while (currentDate <= monthEnd) {
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          const [dateYear, dateMonth] = dateStr.split('-').map(Number);
          
          if (dateYear === year && dateMonth === month) {
            expectedDates.push(dateStr);
          }
          
          currentDate.setDate(currentDate.getDate() + 7);
        }
      }
    } else {
      // Para casos com 2+ agendamentos, verificar padrão semanal
      const intervals = [];
      for (let i = 1; i < sortedAppointments.length; i++) {
        const diffDays = differenceInDays(sortedAppointments[i].dateObj, sortedAppointments[i-1].dateObj);
        intervals.push(diffDays);
      }

      // Verificar se há padrão semanal consistente (intervalos de 7 dias)
      isWeeklyPattern = intervals.every(interval => interval === 7);
      
      if (isWeeklyPattern) {
        // Calcular datas esperadas baseadas no padrão semanal
        const firstDate = sortedAppointments[0].dateObj;
        
        // Gerar todas as datas semanais do mês baseadas no padrão
        const currentDate = new Date(firstDate);
        const monthEnd = new Date(year, month, 0); // Último dia do mês
        
        while (currentDate <= monthEnd) {
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          const [dateYear, dateMonth] = dateStr.split('-').map(Number);
          
          if (dateYear === year && dateMonth === month) {
            expectedDates.push(dateStr);
          }
          
          currentDate.setDate(currentDate.getDate() + 7);
        }
      }
    }

    if (!isWeeklyPattern) return { pattern: null, suggestedDates: [], missingAppointments: [], missingGuides: [] };

    // Identificar agendamentos faltantes
    const missingAppointments = expectedDates.filter(expectedDate => 
      !appointmentDates.includes(expectedDate)
    );

    // Identificar guias faltantes
    const missingGuides = appointmentDates.filter(appointmentDate => 
      !guideDates.includes(appointmentDate)
    );

    // Sugerir próximas datas baseadas no padrão
    const suggestedDates = [];
    if (expectedDates.length > 0) {
      const lastExpectedDate = parseISO(expectedDates[expectedDates.length - 1]);
      for (let i = 1; i <= 4; i++) { // Sugerir próximas 4 semanas
        const nextDate = addDays(lastExpectedDate, 7 * i);
        const nextDateStr = format(nextDate, 'yyyy-MM-dd');
        const [nextYear, nextMonth] = nextDateStr.split('-').map(Number);
        
        // Incluir apenas se for do mês atual ou próximo
        if ((nextYear === year && nextMonth === month) || 
            (nextYear === year && nextMonth === month + 1) ||
            (month === 12 && nextYear === year + 1 && nextMonth === 1)) {
          suggestedDates.push(nextDateStr);
        }
      }
    }

    return {
      pattern: isWeeklyPattern ? 'weekly' : null,
      suggestedDates,
      missingAppointments,
      missingGuides,
      expectedDates
    };
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
          payment_method: appointment.payment_method,
          insurance_type: appointment.insurance_type,
          total_appointments: 0,
          monthly_appointments: [],
          guide_dates: [],
          appointment_dates: [],
          last_guide_date: null,
          needs_new_guide: false,
          weeks_until_expiry: null,
          status: 'ok',
          monthly_guide_status: 'pending',
          needs_next_month_guide: false,
          weekly_pattern: null,
          suggested_dates: [],
          missing_appointments: [],
          missing_guides: [],
          expected_dates: []
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
        
        // Acumular as datas das guias (não sobrescrever)
        patient.guide_dates = [...patient.guide_dates, ...monthlyGuideDates];
        patient.last_guide_date = monthlyGuideDates[monthlyGuideDates.length - 1] || patient.last_guide_date;
      }
    });

    // Calcular status e alertas
    patientMap.forEach(patient => {
      // Ordenar datas
      patient.appointment_dates.sort();
      patient.guide_dates.sort();
      patient.monthly_appointments.sort();

      // Analisar padrões semanais e sugerir datas
      const patternAnalysis = detectWeeklyPatternAndSuggestDates(
        patient.monthly_appointments, 
        patient.guide_dates, 
        month, 
        year
      );
      
      patient.weekly_pattern = patternAnalysis.pattern;
      patient.suggested_dates = patternAnalysis.suggestedDates;
      patient.missing_appointments = patternAnalysis.missingAppointments;
      patient.missing_guides = patternAnalysis.missingGuides;
      patient.expected_dates = patternAnalysis.expectedDates;

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
    
    // Auto-sugerir datas baseadas no padrão semanal
    const patient = patientSessions.find(p => p.patient_id === patientId);
    if (patient && patient.weekly_pattern === 'weekly' && patient.suggested_dates.length > 0) {
      // Sugerir até 5 datas das sugestões automáticas
      const suggestedDates = patient.suggested_dates.slice(0, 5);
      setSelectedDates(suggestedDates);
    }
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

      // Preencher as datas restantes com null
      for (let i = selectedDates.length; i < 5; i++) {
        payload[`date_${i + 1}`] = null;
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

  const getCompletedGuidesForCurrentMonth = async () => {
    try {
      setLoadingCompletedGuides(true);
      
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/return_date_guias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar guias: ${response.status}`);
      }

      const allGuides: CompletedGuide[] = await response.json();
      
      // Filtrar guias do mês selecionado
      const [selectedYear, selectedMonth] = selectedCompletedMonth.split('-').map(Number);
      
      const filteredGuides = allGuides.filter(guide => {
        // Verificar se alguma das datas da guia está no mês selecionado
        const guideDates = [guide.date_1, guide.date_2, guide.date_3, guide.date_4, guide.date_5]
          .filter(date => date !== null) as string[];
        
        return guideDates.some(date => {
          const [year, month] = date.split('-').map(Number);
          return year === selectedYear && month === selectedMonth;
        });
      });

      setCompletedGuides(filteredGuides);
    } catch (error) {
      console.error('Erro ao buscar guias concluídas:', error);
      toast.error('Erro ao carregar guias concluídas');
      setCompletedGuides([]);
    } finally {
      setLoadingCompletedGuides(false);
    }
  };

  const handleUploadGuide = (guide: CompletedGuide, type: 'autorizada' | 'assinada' | 'assinada_psicologo') => {
    setSelectedGuideForUpload(guide);
    setUploadFile(null);
    setUploadType(type);
    setIsUploadModalOpen(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar se é PDF
      if (file.type !== 'application/pdf') {
        toast.error('Somente arquivos PDF são aceitos');
        return;
      }
      
      // Validar tamanho (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB em bytes
      if (file.size > maxSize) {
        toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
        return;
      }
      
      setUploadFile(file);
    }
  };

  const handleSubmitUpload = async () => {
    if (!selectedGuideForUpload || !uploadFile || !uploadType) {
      toast.error('Selecione um arquivo para upload');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('documento', uploadFile);
      formData.append('id_patient', selectedGuideForUpload.id_patient.toString());
      formData.append('nome_patient', selectedGuideForUpload.name);
      formData.append('numero_prestador', selectedGuideForUpload.numero_prestador);
      
      // Adicionar command baseado no tipo de upload
      let command = '';
      switch (uploadType) {
        case 'autorizada':
          command = 'Guia-autorizada';
          break;
        case 'assinada':
          command = 'Guia-assinada';
          break;
        case 'assinada_psicologo':
          command = 'Guia-assinada-psicologo';
          break;
      }
      formData.append('command', command);

      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/insert_guia_completed', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Erro no upload: ${response.status}`);
      }

      toast.success(`Guia ${uploadType === 'autorizada' ? 'autorizada' : 
                            uploadType === 'assinada' ? 'assinada' : 
                            uploadType === 'assinada_psicologo' ? 'assinada pelo psicólogo' : 
                            ''} importada com sucesso!`);
      setIsUploadModalOpen(false);
      setSelectedGuideForUpload(null);
      setUploadFile(null);
      setUploadType(null);
      // Recarregar dados para atualizar o status
      getCompletedGuidesForCurrentMonth();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar guia. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadGuide = async (guide: CompletedGuide, type: 'autorizada' | 'assinada' | 'assinada_psicologo') => {
    try {
      // Determinar command baseado no tipo
      let command = '';
      switch (type) {
        case 'autorizada':
          command = 'Guia-autorizada';
          break;
        case 'assinada':
          command = 'Guia-assinada';
          break;
        case 'assinada_psicologo':
          command = 'Guia-assinada-psicologo';
          break;
      }

      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/get_guia_completed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_patient: guide.id_patient,
          nome_patient: guide.name,
          numero_prestador: guide.numero_prestador,
          command: command
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao baixar guia: ${response.status}`);
      }

      // Verificar se a resposta é JSON com dados do arquivo
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        // Resposta JSON com informações do arquivo
        const fileData = await response.json();
        
        if (fileData.data) {
          // Extrair dados do arquivo da resposta
          const fileName = fileData.data['File Name:'] || `Guia-${guide.name}-${guide.numero_prestador}`;
          const fileExtension = fileData.data['File Extension:'] || 'pdf';
          const mimeType = fileData.data['Mime Type:'] || 'application/pdf';
          const fileSize = fileData.data['File Size:'] || 'N/A';
          
          // Se a API retornar o conteúdo do arquivo em base64 ou outro formato
          // você precisará ajustar esta parte conforme a estrutura real da resposta
          console.log('Dados do arquivo:', fileData);
          
          // Por enquanto, vamos usar o nome do arquivo da resposta
          const fullFileName = `${fileName}.${fileExtension}`;
          
          // Se a API retornar o arquivo em base64, você pode fazer:
          // const binaryData = atob(fileData.data.content); // se for base64
          // const blob = new Blob([binaryData], { type: mimeType });
          
          // Por enquanto, vamos mostrar uma mensagem informativa
          toast.success(`Arquivo encontrado: ${fullFileName} (${fileSize})`);
          
          // TODO: Implementar download real quando a estrutura do arquivo for conhecida
          // Se a API retornar o arquivo diretamente, use o código abaixo:
          /*
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fullFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          */
        } else {
          throw new Error('Dados do arquivo não encontrados na resposta');
        }
      } else {
        // Resposta direta com o arquivo (blob)
        const blob = await response.blob();
        
        // Criar URL temporária para download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Nome do arquivo baseado no paciente e prestador
        const fileName = `Guia-${guide.name}-${guide.numero_prestador}.pdf`;
        link.download = fileName;
        
        // Trigger do download
        document.body.appendChild(link);
        link.click();
        
        // Limpeza
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success('Guia baixada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao baixar guia:', error);
      toast.error('Erro ao baixar guia. Tente novamente.');
    }
  };

  const handleDownloadAllGuidesByType = async (type: 'autorizada' | 'assinada' | 'assinada_psicologo') => {
    // Determinar campo e command baseado no tipo
    let fieldName = '';
    let command = '';
    let typeLabel = '';
    
    switch (type) {
      case 'autorizada':
        fieldName = 'existe_guia_autorizada';
        command = 'Guia-autorizada';
        typeLabel = 'autorizada';
        break;
      case 'assinada':
        fieldName = 'existe_guia_assinada';
        command = 'Guia-assinada';
        typeLabel = 'assinada';
        break;
      case 'assinada_psicologo':
        fieldName = 'existe_guia_assinada_psicologo';
        command = 'Guia-assinada-psicologo';
        typeLabel = 'assinada pelo psicólogo';
        break;
    }

    // Filtrar apenas guias com o tipo específico
    const guidesToDownload = completedGuides.filter(guide => guide[fieldName as keyof CompletedGuide] === 1);
    
    if (guidesToDownload.length === 0) {
      toast.info(`Nenhuma guia ${typeLabel} encontrada para download`);
      return;
    }

    setDownloadingAll(true);
    setDownloadProgress({
      total: guidesToDownload.length,
      completed: 0,
      failed: 0,
      remaining: guidesToDownload.length
    });

    let completed = 0;
    let failed = 0;

    // Processar cada guia sequencialmente para evitar sobrecarga
    for (let i = 0; i < guidesToDownload.length; i++) {
      const guide = guidesToDownload[i];
      
      try {
        const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/get_guia_completed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id_patient: guide.id_patient,
            nome_patient: guide.name,
            numero_prestador: guide.numero_prestador,
            command: command
          })
        });

        if (!response.ok) {
          throw new Error(`Erro ao baixar guia: ${response.status}`);
        }

        // Verificar se a resposta é JSON com dados do arquivo
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const fileData = await response.json();
          
          if (fileData.data) {
            const fileName = fileData.data['File Name:'] || `Guia-${guide.name}-${guide.numero_prestador}`;
            const fileExtension = fileData.data['File Extension:'] || 'pdf';
            const fileSize = fileData.data['File Size:'] || 'N/A';
            
            console.log(`Download ${i + 1}/${guidesToDownload.length}: ${fileName}.${fileExtension} (${fileSize})`);
            
            // TODO: Implementar download real quando a estrutura do arquivo for conhecida
            // Por enquanto, apenas simular o download
            completed++;
          } else {
            throw new Error('Dados do arquivo não encontrados na resposta');
          }
        } else {
          // Resposta direta com o arquivo (blob)
          const blob = await response.blob();
          
          // Criar URL temporária para download
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          
          // Nome do arquivo baseado no paciente e prestador
          const fileName = `Guia-${guide.name}-${guide.numero_prestador}-${typeLabel}.pdf`;
          link.download = fileName;
          
          // Trigger do download
          document.body.appendChild(link);
          link.click();
          
          // Limpeza
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          completed++;
        }
      } catch (error) {
        console.error(`Erro ao baixar guia ${i + 1}:`, error);
        failed++;
      }

      // Atualizar progresso
      const remaining = guidesToDownload.length - (completed + failed);
      setDownloadProgress({
        total: guidesToDownload.length,
        completed,
        failed,
        remaining
      });

      // Pequeno delay entre downloads para não sobrecarregar
      if (i < guidesToDownload.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setDownloadingAll(false);
    
    // Mostrar resultado final
    if (failed === 0) {
      toast.success(`Download concluído! ${completed} guias ${typeLabel} baixadas com sucesso.`);
    } else if (completed === 0) {
      toast.error(`Falha no download! ${failed} guias ${typeLabel} falharam.`);
    } else {
      toast.warning(`Download parcial! ${completed} guias ${typeLabel} baixadas, ${failed} falharam.`);
    }
  };

  // Funções específicas para cada tipo de download em massa
  const handleDownloadAllAutorizadas = () => handleDownloadAllGuidesByType('autorizada');
  const handleDownloadAllAssinadas = () => handleDownloadAllGuidesByType('assinada');
  const handleDownloadAllAssinadasPsicologo = () => handleDownloadAllGuidesByType('assinada_psicologo');

  // Função para baixar tudo (3 requests por guia)
  const handleDownloadEverything = async () => {
    // Filtrar apenas guias com guia assinada pelo psicólogo
    const guidesToDownload = completedGuides.filter(g => g.existe_guia_assinada_psicologo === 1);
    
    if (guidesToDownload.length === 0) {
      toast.info('Nenhuma guia assinada pelo psicólogo encontrada para download');
      return;
    }

    setDownloadingEverything(true);
    
    // Calcular total de requests (3 por guia)
    const totalRequests = guidesToDownload.length * 3;
    
    setDownloadEverythingProgress({
      total: totalRequests,
      completed: 0,
      failed: 0,
      remaining: totalRequests,
      currentStep: 'Iniciando downloads...',
      currentGuide: ''
    });

    let completed = 0;
    let failed = 0;

    try {
      for (let i = 0; i < guidesToDownload.length; i++) {
        const guide = guidesToDownload[i];
        
        setDownloadEverythingProgress(prev => ({
          ...prev,
          currentGuide: guide.name,
          currentStep: `Processando guia ${i + 1} de ${guidesToDownload.length}`
        }));

        // Request 1: Guia assinada pelo psicólogo
        try {
          setDownloadEverythingProgress(prev => ({
            ...prev,
            currentStep: `Baixando guia assinada pelo psicólogo - ${guide.name}`
          }));

          const response1 = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/get_guia_completed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              numero_prestador: guide.numero_prestador,
              command: 'Guia-assinada-psicologo'
            })
          });

          if (response1.ok) {
            const blob1 = await response1.blob();
            const url1 = window.URL.createObjectURL(blob1);
            const link1 = document.createElement('a');
            link1.href = url1;
            // Usar nome original do arquivo se disponível, senão usar nome padrão
            const contentDisposition = response1.headers.get('Content-Disposition');
            const filename1 = contentDisposition 
              ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
              : `Guia-Assinada-Psicologo-${guide.name}-${guide.numero_prestador}.pdf`;
            link1.download = filename1;
            document.body.appendChild(link1);
            link1.click();
            document.body.removeChild(link1);
            window.URL.revokeObjectURL(url1);
            completed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error('Erro ao baixar guia assinada pelo psicólogo:', error);
          failed++;
        }

        setDownloadEverythingProgress(prev => ({
          ...prev,
          completed: completed,
          failed: failed,
          remaining: totalRequests - completed - failed
        }));

        // Request 2: Documento pessoal
        try {
          setDownloadEverythingProgress(prev => ({
            ...prev,
            currentStep: `Baixando documento pessoal - ${guide.name}`
          }));

          const response2 = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/documento_pessoal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nome: guide.name
            })
          });

          if (response2.ok) {
            const blob2 = await response2.blob();
            const url2 = window.URL.createObjectURL(blob2);
            const link2 = document.createElement('a');
            link2.href = url2;
            // Usar nome original do arquivo se disponível, senão usar nome padrão
            const contentDisposition2 = response2.headers.get('Content-Disposition');
            const filename2 = contentDisposition2 
              ? contentDisposition2.split('filename=')[1]?.replace(/"/g, '') 
              : `Documento-Pessoal-${guide.name}.pdf`;
            link2.download = filename2;
            document.body.appendChild(link2);
            link2.click();
            document.body.removeChild(link2);
            window.URL.revokeObjectURL(url2);
            completed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error('Erro ao baixar documento pessoal:', error);
          failed++;
        }

        setDownloadEverythingProgress(prev => ({
          ...prev,
          completed: completed,
          failed: failed,
          remaining: totalRequests - completed - failed
        }));

        // Request 3: Relatório
        try {
          setDownloadEverythingProgress(prev => ({
            ...prev,
            currentStep: `Baixando relatório - ${guide.name}`
          }));

          const response3 = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/relatorio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nome: guide.name,
              titulo: 'RELATORIO PSICOLOGICO',
              cid: 'F-41',
              plano: 'PMDF'
            })
          });

          if (response3.ok) {
            const blob3 = await response3.blob();
            const url3 = window.URL.createObjectURL(blob3);
            const link3 = document.createElement('a');
            link3.href = url3;
            // Usar nome original do arquivo se disponível, senão usar nome padrão
            const contentDisposition3 = response3.headers.get('Content-Disposition');
            const filename3 = contentDisposition3 
              ? contentDisposition3.split('filename=')[1]?.replace(/"/g, '') 
              : `Relatorio-Psicologico-${guide.name}.pdf`;
            link3.download = filename3;
            document.body.appendChild(link3);
            link3.click();
            document.body.removeChild(link3);
            window.URL.revokeObjectURL(url3);
            completed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error('Erro ao baixar relatório:', error);
          failed++;
        }

        setDownloadEverythingProgress(prev => ({
          ...prev,
          completed: completed,
          failed: failed,
          remaining: totalRequests - completed - failed
        }));

        // Pequeno delay entre guias para não sobrecarregar
        if (i < guidesToDownload.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setDownloadingEverything(false);
      
      // Mostrar resultado final
      if (failed === 0) {
        toast.success(`Download concluído! ${completed} arquivos baixados com sucesso.`);
      } else if (completed === 0) {
        toast.error(`Falha no download! ${failed} arquivos falharam.`);
      } else {
        toast.warning(`Download parcial! ${completed} arquivos baixados, ${failed} falharam.`);
      }
    } catch (error) {
      console.error('Erro geral no download:', error);
      toast.error('Erro durante o download. Tente novamente.');
      setDownloadingEverything(false);
    }
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

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('control')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'control'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Controle de Guias
              </div>
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'completed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Guias Concluídas
              </div>
            </button>
          </nav>
        </div>

        {/* Conteúdo da aba Controle de Guias */}
        {activeTab === 'control' && (
          <>
            {/* Stats Cards - Apenas para Admin e Recepcionista */}
            {canViewAlerts && (
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
        )}

        {/* Dashboard de Sessões por Paciente - Apenas para Admin e Recepcionista */}
        {canViewAlerts && (
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
                    className={`flex items-center justify-between p-6 border rounded-lg transition-colors ${
                      patient.status === 'ok' 
                        ? 'bg-green-50 hover:bg-green-100 border-green-200' 
                        : patient.status === 'urgent' 
                          ? 'bg-red-50 hover:bg-red-100 border-red-200'
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-8">
                      {/* Coluna 1: Nome do paciente */}
                      <div className="w-48">
                        <p className="font-medium text-gray-900">{patient.patient_name}</p>
                        <p className="text-sm text-gray-600">{patient.psychologist_name}</p>
                        <p className="text-xs text-gray-500">
                          {patient.insurance_type 
                            ? `🏥 ${patient.insurance_type}` 
                            : '💰 Particular'
                          }
                        </p>
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
                                ? (() => {
                                    // Combinar agendamentos existentes com sugestões de agendamentos faltantes
                                    const allAppointmentDates = [...patient.monthly_appointments];
                                    
                                    // Adicionar agendamentos faltantes detectados pelo padrão semanal
                                    if (patient.weekly_pattern === 'weekly' && patient.missing_appointments.length > 0) {
                                      allAppointmentDates.push(...patient.missing_appointments);
                                    }
                                    
                                    // Ordenar todas as datas
                                    const sortedDates = allAppointmentDates.sort();
                                    
                                    return sortedDates.map(date => {
                                      const isMissingAppointment = patient.missing_appointments.includes(date);
                                      const status = patient.appointment_statuses?.get(date) || 'unknown';
                                      
                                      return (
                                        <span
                                          key={date}
                                          className={`px-1.5 py-0.5 rounded text-xs border whitespace-nowrap ${
                                            isMissingAppointment 
                                              ? 'bg-orange-100 text-orange-800 border-orange-300'
                                              : getAppointmentStatusColor(status)
                                          }`}
                                          title={isMissingAppointment ? 'Falta agendamento semanal' : ''}
                                        >
                                          {format(parseISO(date), 'dd/MM', { locale: ptBR })}
                                          {isMissingAppointment && ' - FALTA AGENDAMENTO'}
                                        </span>
                                      );
                                    });
                                  })()
                                : <span className="text-sm text-gray-700">Nenhum agendamento</span>
                              }
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded whitespace-nowrap flex-shrink-0">
                              ✅ Guias:
                            </span>
                            <div className="flex gap-1 whitespace-nowrap min-w-0 overflow-hidden">
                              {(() => {
                                // Combinar todas as datas (agendamentos + agendamentos faltantes + guias) e ordenar cronologicamente
                                const allDates = [...patient.monthly_appointments];
                                
                                // Adicionar agendamentos faltantes se houver padrão semanal
                                if (patient.weekly_pattern === 'weekly' && patient.missing_appointments.length > 0) {
                                  allDates.push(...patient.missing_appointments);
                                }
                                
                                // Adicionar todas as datas das guias do mês (mesmo sem agendamentos)
                                const monthlyGuideDates = patient.guide_dates.filter(date => {
                                  const [guideYear, guideMonth] = date.split('-').map(Number);
                                  const [currentYear, currentMonth] = selectedMonth.split('-').map(Number);
                                  return guideYear === currentYear && guideMonth === currentMonth;
                                });
                                
                                monthlyGuideDates.forEach(guideDate => {
                                  if (!allDates.includes(guideDate)) {
                                    allDates.push(guideDate);
                                  }
                                });
                                
                                const sortedDates = allDates.sort();
                                
                                return sortedDates.map(date => {
                                  const hasGuide = patient.guide_dates.includes(date);
                                  const hasAppointment = patient.monthly_appointments.includes(date);
                                  const isMissingAppointment = patient.missing_appointments.includes(date);
                                  
                                  return (
                                    <span
                                      key={date}
                                      className={`px-1.5 py-0.5 rounded text-xs border whitespace-nowrap ${
                                        hasGuide 
                                          ? 'bg-green-100 text-green-800 border-green-300'
                                          : 'bg-red-100 text-red-800 border-red-300'
                                      }`}
                                      title={
                                        hasGuide 
                                          ? 'Guia autorizada' 
                                          : isMissingAppointment 
                                            ? 'Sugestão: Falta guia para esta data (baseada no padrão semanal)'
                                            : hasAppointment
                                              ? 'Sugestão: Falta guia para este agendamento'
                                              : 'Sugestão: Falta guia para esta data'
                                      }
                                    >
                                      {hasGuide 
                                        ? format(parseISO(date), 'dd/MM', { locale: ptBR })
                                        : isMissingAppointment
                                          ? `${format(parseISO(date), 'dd/MM', { locale: ptBR })} - FALTA GUIA`
                                          : hasAppointment
                                            ? `(${format(parseISO(date), 'dd/MM', { locale: ptBR })}) - FALTA GUIA`
                                            : `(${format(parseISO(date), 'dd/MM', { locale: ptBR })}) - FALTA GUIA`
                                      }
                                    </span>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        </div>
                        
                        {/* Legenda para casos sem padrão semanal */}
                        {patient.weekly_pattern !== 'weekly' && patient.monthly_appointments.some(appDate => !patient.guide_dates.includes(appDate)) && (
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
        )}

            {/* Mensagem para Psicólogos */}
            {isPsychologist && (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      Acesso Restrito
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Esta página é destinada apenas para administradores e recepcionistas. 
                      Como psicólogo, você não tem permissão para visualizar os alertas de agendamentos e controle de guias.
                    </p>
                    <p className="text-sm text-gray-400">
                      Entre em contato com um administrador se precisar de acesso a essas informações.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Conteúdo da aba Guias Concluídas */}
        {activeTab === 'completed' && (
          <>
            {/* Gráfico de Estatísticas */}
            <GuideStatsChart completedGuides={completedGuides} />
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Guias Concluídas - {format(parseISO(selectedCompletedMonth + '-01'), 'MMMM yyyy', { locale: ptBR })}
                  </CardTitle>
                  <div className="flex gap-2">
                  <Button 
                    onClick={handleDownloadAllAutorizadas} 
                    variant="outline" 
                    size="sm"
                    disabled={downloadingAll || completedGuides.filter(g => g.existe_guia_autorizada === 1).length === 0}
                    className="flex items-center gap-2"
                  >
                    {downloadingAll ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Baixando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Baixar Guias Autorizadas
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleDownloadAllAssinadas} 
                    variant="outline" 
                    size="sm"
                    disabled={downloadingAll || completedGuides.filter(g => g.existe_guia_assinada === 1).length === 0}
                    className="flex items-center gap-2"
                  >
                    {downloadingAll ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Baixando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Baixar Guias Assinadas
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleDownloadAllAssinadasPsicologo} 
                    variant="outline" 
                    size="sm"
                    disabled={downloadingAll || completedGuides.filter(g => g.existe_guia_assinada_psicologo === 1).length === 0}
                    className="flex items-center gap-2"
                  >
                    {downloadingAll ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Baixando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Baixar Guias Assinadas pelo Psicólogo
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleDownloadEverything} 
                    variant="default" 
                    size="sm"
                    disabled={downloadingEverything || downloadingAll || completedGuides.filter(g => g.existe_guia_assinada_psicologo === 1).length === 0}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {downloadingEverything ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Baixando tudo...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Baixar tudo
                      </>
                    )}
                  </Button>
                  <Button onClick={getCompletedGuidesForCurrentMonth} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtro de mês para guias concluídas */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Filtrar por mês:</span>
                  </div>
                  <input
                    type="month"
                    value={selectedCompletedMonth}
                    onChange={(e) => setSelectedCompletedMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Mostrando:</span>
                  <span className="font-medium text-blue-600">
                    {format(parseISO(selectedCompletedMonth + '-01'), 'MMMM yyyy', { locale: ptBR })}
                  </span>
                </div>
              </div>

              {/* Indicador de progresso do download */}
              {downloadingAll && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-blue-900">Download em andamento...</h4>
                    <span className="text-sm text-blue-700">
                      {downloadProgress.completed + downloadProgress.failed} / {downloadProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${((downloadProgress.completed + downloadProgress.failed) / downloadProgress.total) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-blue-700">
                    <span>✅ Concluídas: {downloadProgress.completed}</span>
                    <span>❌ Falharam: {downloadProgress.failed}</span>
                    <span>⏳ Restantes: {downloadProgress.remaining}</span>
                  </div>
                </div>
              )}

              {/* Indicador de progresso do download tudo */}
              {downloadingEverything && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-green-900">Baixando tudo...</h4>
                    <span className="text-sm text-green-700">
                      {downloadEverythingProgress.completed + downloadEverythingProgress.failed} / {downloadEverythingProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${((downloadEverythingProgress.completed + downloadEverythingProgress.failed) / downloadEverythingProgress.total) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs text-green-700 font-medium">{downloadEverythingProgress.currentStep}</p>
                    {downloadEverythingProgress.currentGuide && (
                      <p className="text-xs text-green-600">Paciente: {downloadEverythingProgress.currentGuide}</p>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-green-700">
                    <span>✅ Concluídas: {downloadEverythingProgress.completed}</span>
                    <span>❌ Falharam: {downloadEverythingProgress.failed}</span>
                    <span>⏳ Restantes: {downloadEverythingProgress.remaining}</span>
                  </div>
                </div>
              )}

              {loadingCompletedGuides ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin mr-2" />
                  <span>Carregando dados...</span>
                </div>
              ) : completedGuides.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Nenhuma guia concluída encontrada
                  </h3>
                  <p className="text-gray-500">
                    Não há guias de atendimento para o mês atual
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    // Agrupar guias por paciente e número de prestador
                    const groupedGuides = completedGuides.reduce((acc, guide) => {
                      const key = `${guide.id_patient}-${guide.name}`;
                      if (!acc[key]) {
                        acc[key] = {
                          patient: { id: guide.id_patient, name: guide.name },
                          guides: []
                        };
                      }
                      acc[key].guides.push(guide);
                      return acc;
                    }, {} as Record<string, { patient: { id: number; name: string }; guides: CompletedGuide[] }>);

                    return Object.values(groupedGuides).map((group, groupIndex) => (
                      <div
                        key={`${group.patient.id}-${groupIndex}`}
                        className="border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="p-6">
                          <div className="flex items-center gap-4 mb-4">
                            <div>
                              <p className="font-medium text-gray-900">{group.patient.name}</p>
                              <p className="text-sm text-gray-600">ID: {group.patient.id}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {group.guides.map((guide, guideIndex) => {
                              const guideDates = [guide.date_1, guide.date_2, guide.date_3, guide.date_4, guide.date_5]
                                .filter(date => date !== null) as string[];
                              
                              return (
                                <div
                                  key={guide.id}
                                  className="flex items-center justify-between p-4 bg-gray-50 rounded-md"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-2">
                                      <div>
                                        <p className="text-sm font-medium text-gray-700">Número do Prestador:</p>
                                        <p className="text-sm text-gray-600">{guide.numero_prestador}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-700">Datas das guias:</span>
                                      <div className="flex gap-2">
                                        {guideDates.map((date, dateIndex) => (
                                          <span
                                            key={dateIndex}
                                            className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded border border-green-300"
                                          >
                                            {format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR })}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col gap-2">
                                    {/* Botão Guia Autorizada */}
                                    {guide.existe_guia_autorizada === 1 ? (
                                      <Button
                                        size="sm"
                                        onClick={() => handleDownloadGuide(guide, 'autorizada')}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                                      >
                                        <Download className="h-4 w-4" />
                                        Baixar Guia Autorizada
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() => handleUploadGuide(guide, 'autorizada')}
                                        className="flex items-center gap-2"
                                      >
                                        <Upload className="h-4 w-4" />
                                        Importar Guia Autorizada
                                      </Button>
                                    )}

                                    {/* Botão Guia Assinada */}
                                    {guide.existe_guia_assinada === 1 ? (
                                      <Button
                                        size="sm"
                                        onClick={() => handleDownloadGuide(guide, 'assinada')}
                                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                                      >
                                        <Download className="h-4 w-4" />
                                        Baixar Guia Assinada
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() => handleUploadGuide(guide, 'assinada')}
                                        className="flex items-center gap-2"
                                      >
                                        <Upload className="h-4 w-4" />
                                        Importar Guia Assinada
                                      </Button>
                                    )}

                                    {/* Botão Guia Assinada pelo Psicólogo */}
                                    {guide.existe_guia_assinada_psicologo === 1 ? (
                                      <Button
                                        size="sm"
                                        onClick={() => handleDownloadGuide(guide, 'assinada_psicologo')}
                                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                                      >
                                        <Download className="h-4 w-4" />
                                        Baixar Guia Assinada pelo Psicólogo
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() => handleUploadGuide(guide, 'assinada_psicologo')}
                                        className="flex items-center gap-2"
                                      >
                                        <Upload className="h-4 w-4" />
                                        Importar Guia Assinada pelo Psicólogo
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
          </>
        )}

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

              {/* Sugestões automáticas baseadas no padrão semanal */}
              {selectedPatientForGuide && (() => {
                const patient = patientSessions.find(p => p.patient_id === selectedPatientForGuide);
                return patient && patient.weekly_pattern === 'weekly' && patient.suggested_dates.length > 0 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-blue-800">💡 Sugestões Automáticas</span>
                      <span className="text-xs text-blue-600">(Padrão semanal detectado)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {patient.suggested_dates.slice(0, 5).map((date, index) => (
                        <span
                          key={date}
                          className={`px-2 py-1 rounded text-xs border cursor-pointer transition-colors ${
                            selectedDates.includes(date)
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                          }`}
                          onClick={() => handleDateSelect(date)}
                        >
                          {format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Clique nas datas sugeridas para selecioná-las automaticamente
                    </p>
                  </div>
                ) : null;
              })()}

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

        {/* Modal para Upload de Guia Assinada */}
        <Dialog open={isUploadModalOpen} onOpenChange={(open) => {
          setIsUploadModalOpen(open);
          if (!open) {
            setSelectedGuideForUpload(null);
            setUploadFile(null);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Importar {uploadType === 'autorizada' ? 'Guia Autorizada' : 
                         uploadType === 'assinada' ? 'Guia Assinada' : 
                         uploadType === 'assinada_psicologo' ? 'Guia Assinada pelo Psicólogo' : 
                         'Guia'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedGuideForUpload && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="font-medium text-gray-900 mb-2">Dados da Guia</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Paciente:</span> {selectedGuideForUpload.name}</p>
                    <p><span className="font-medium">ID:</span> {selectedGuideForUpload.id_patient}</p>
                    <p><span className="font-medium">Número do Prestador:</span> {selectedGuideForUpload.numero_prestador}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Selecionar Arquivo PDF</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tamanho máximo: 10MB
                </p>
              </div>

              {uploadFile && (
                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-sm text-green-800">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Arquivo selecionado: {uploadFile.name}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Tamanho: {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={uploading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitUpload}
                  disabled={!uploadFile || uploading}
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Enviar
                    </>
                  )}
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
