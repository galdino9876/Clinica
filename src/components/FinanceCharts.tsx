import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/context/AuthContext";
import { useAppointments } from "@/context/AppointmentContext";
import { usePayments } from "@/context/PaymentContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PaymentBatch, PaymentItem } from "@/types/payment";
import { Appointment } from "@/types/appointment";
import { DateRange } from "react-day-picker";

import { Download, Edit, Save, Loader, DollarSign, CheckSquare, XSquare, Eye, AlertTriangle, Search, CalendarRange, Users, Calendar as CalendarIcon, TrendingUp, Trash2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type FilterPeriod = "day" | "week" | "month" | "year";

interface FinanceTransaction {
  id: number;
  appointment_id: number;
  patient_id: number;
  psychologist_id: number;
  transaction_date: string;
  amount: number;
  commission_percentage: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// Interface removida - usando da importação

interface Psychologist {
  id: string;
  name: string;
}

interface Patient {
  id: number;
  name?: string;
  nome?: string;
  email: string;
  phone?: string;
  telefone?: string;
  // Adicione outros campos conforme a resposta da API
}

const FinanceCharts = () => {
  const { user, users } = useAuth();
  const { appointments } = useAppointments();
  const { createPaymentBatch, markPaymentAsPaid, getPaymentItemsByBatch, getPsychologistPayments } = usePayments();
  const { toast } = useToast();
  
  // Estados para relatórios
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("year");
  const [selectedPsychologist, setSelectedPsychologist] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [showPaymentAppointments, setShowPaymentAppointments] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [editingPatientHeader, setEditingPatientHeader] = useState(false);
  const [showReportTable, setShowReportTable] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editTransactionValue, setEditTransactionValue] = useState<number>(0);
  const [editTransactionInsuranceType, setEditTransactionInsuranceType] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditingLoading, setIsEditingLoading] = useState<boolean>(false);
  
  // Estados para pagamentos
  const [activeTab, setActiveTab] = useState<"charts" | "payments" | "dashboard">("charts");
  const [paymentDateRange, setPaymentDateRange] = useState<DateRange | undefined>();
  const [selectedPaymentPsychologist, setSelectedPaymentPsychologist] = useState<string>("");
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [showBatchDetails, setShowBatchDetails] = useState<string | null>(null);
  const [showContestDialog, setShowContestDialog] = useState<string | null>(null);
  const [contestReason, setContestReason] = useState("");
  const [paymentBatches, setPaymentBatches] = useState<PaymentBatch[]>([]);
  const [paymentLots, setPaymentLots] = useState<any[]>([]); // Lotes da nova API
  const [selectedLotDetails, setSelectedLotDetails] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<any | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState<any | null>(null);

  const isAdmin = user?.role === "admin";
  const isPsychologist = user?.role === "psychologist";

  const effectivePsychologist = isPsychologist ? user?.id : selectedPsychologist;

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch psicólogos
      const usersResponse = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/users", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (usersResponse.ok) {
        const userData = await usersResponse.json();
        console.log("Resposta API usuários (detalhada):", JSON.stringify(userData, null, 2));
        const fetchedPsychologists = userData
          .filter((user: any) => user.role === "psychologist")
          .map((user: any) => ({ id: String(user.id), name: user.name }));
        setPsychologists(fetchedPsychologists);
        console.log("Psicólogos carregados:", fetchedPsychologists);
      } else {
        console.error("Erro API usuários:", usersResponse.status, await usersResponse.text());
        toast({
          title: "Erro ao carregar psicólogos",
          description: "Não foi possível carregar a lista de psicólogos.",
          variant: "destructive",
        });
      }

      // Fetch pacientes usando a mesma URL do PatientsTable
      const patientsResponse = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/patients?id=${user?.id}&role=${user?.role}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (patientsResponse.ok) {
        const patientData = await patientsResponse.json();
        console.log("Resposta API pacientes (detalhada):", JSON.stringify(patientData, null, 2));
        // Tratamento similar ao PatientsTable - aceita array direto ou propriedades aninhadas
        const processedPatients = Array.isArray(patientData) ? patientData : patientData.patients || patientData.data || [];
        setPatients(processedPatients);
      } else {
        console.error("Erro API pacientes:", patientsResponse.status, await patientsResponse.text());
        setPatients([]);
        toast({
          title: "Erro ao carregar pacientes",
          description: "Não foi possível carregar a lista de pacientes.",
          variant: "destructive",
        });
      }

      // Lotes de pagamento serão carregados quando clicar na aba "Pagamentos"
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      toast({
        title: "Erro ao carregar dados",
        description: "Ocorreu um erro ao carregar os dados iniciais.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let url = "";

      if (effectivePsychologist === "all") {
        const allAppointments: any[] = [];
        for (const psych of psychologists) {
          const response = await fetch(
            `https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/appointmens/${psych.id}`
          );
          if (response.ok) {
            const data = await response.json();
            allAppointments.push(...data);
          }
        }
        setTransactions(allAppointments);
      } else {
        url = `https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/appointmens/${effectivePsychologist}`;
        console.log('=== FETCH APPOINTMENTS ===');
        console.log('URL:', url);
        console.log('effectivePsychologist:', effectivePsychologist);
        
        const response = await fetch(url);
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
          throw new Error("Erro ao buscar appointments");
        }

        const data = await response.json();
        console.log('Dados recebidos da API:', data);
        console.log('Quantidade de appointments:', data.length);
        console.log('Sample appointments:', data.slice(0, 3).map((t: any) => ({
          id: t.id,
          psychologist_id: t.psychologist_id,
          status: t.status,
          date: t.date,
          value: t.value
        })));
        
        setTransactions(data);
      }
    } catch (error) {
      console.error("Erro ao buscar appointments:", error);
      setTransactions([]);
      toast({
        title: "Erro ao carregar agendamentos",
        description: "Não foi possível carregar os agendamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentBatches = async () => {
    try {
      console.log('=== CARREGANDO LOTES DE PAGAMENTO ===');
      console.log('URL da API:', 'https://webhook.essenciasaudeintegrada.com.br/webhook/payments_get');
      
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/payments_get", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      console.log('Resposta da API de lotes:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Dados brutos da API:', data);
        console.log('Tipo dos dados:', Array.isArray(data) ? 'Array' : 'Object');
        console.log('Quantidade de itens:', Array.isArray(data) ? data.length : 1);
        
        // Converter para array se for um objeto único
        const dataArray = Array.isArray(data) ? data : [data];
        console.log('Dados convertidos para array:', dataArray);
        
        // Filtrar lotes com control: 'payments_created' OU 'payments_finish'
        const filteredLots = dataArray.filter((lot: any) => {
          const hasValidControl = lot.control === 'payments_created' || lot.control === 'payments_finish';
          console.log(`Lote ${lot.id}: control = "${lot.control}", payment_id = ${lot.payment_id}, incluído: ${hasValidControl}`);
          return hasValidControl;
        });
        
        console.log('Lotes filtrados (payments_created + payments_finish):', filteredLots);
        console.log('Quantidade de lotes filtrados:', filteredLots.length);
        setPaymentLots(filteredLots);
      } else {
        console.error('Erro na resposta da API de lotes:', response.status, response.statusText);
      }
    } catch (error) {
      console.error("Erro ao carregar lotes de pagamento:", error);
    }
  };

  // Função para agrupar lotes por payment_id e calcular totais
  const getGroupedPaymentLots = () => {
    console.log('=== INÍCIO getGroupedPaymentLots ===');
    console.log('paymentLots recebidos:', paymentLots);
    console.log('Quantidade de paymentLots:', paymentLots.length);
    
    const grouped: { [key: string]: any } = {};
    
    paymentLots.forEach((lot, index) => {
      console.log(`Processando lote ${index + 1}:`, lot);
      const key = lot.payment_id; // Usar payment_id para agrupar
      console.log(`Chave de agrupamento (payment_id): ${key}`);
      
      if (!grouped[key]) {
        console.log(`Criando novo grupo para payment_id: ${key}`);
        grouped[key] = {
          id: lot.payment_id,
          payment_id: lot.payment_id, // Manter payment_id para exclusão
          psychologist_name: lot.psychologist_name,
          psychologist_id: lot.psychologist_id, // Adicionar psychologist_id
          payment_created_at: lot.created_at, // Usar created_at da API
          status: lot.control, // Usar control como status
          appointments: [],
          total_value: 0
        };
      }
      
      const appointment = {
        patient_name: lot.name, // Usar 'name' em vez de 'patient_name'
        date: lot.date,
        value: parseFloat(lot.value), // Converter string para number
        commission: parseFloat(lot.value) * 0.5 // 50% de comissão
      };
      
      console.log(`Adicionando appointment ao grupo ${key}:`, appointment);
      grouped[key].appointments.push(appointment);
      grouped[key].total_value += parseFloat(lot.value);
      console.log(`Total atual do grupo ${key}: ${grouped[key].total_value}`);
    });
    
    const result = Object.values(grouped);
    console.log('Lotes agrupados (resultado final):', result);
    console.log('Quantidade de lotes agrupados:', result.length);
    console.log('=== FIM getGroupedPaymentLots ===');
    return result;
  };

  // Função para filtrar lotes de pagamento por psicólogo
  const getPsychologistPaymentLots = (psychologistId: string) => {
    console.log('=== FILTRANDO LOTES POR PSICÓLOGO ===');
    console.log('Psychologist ID:', psychologistId);
    console.log('Tipo do ID:', typeof psychologistId);
    
    const allLots = getGroupedPaymentLots();
    console.log('Todos os lotes:', allLots);
    console.log('Detalhes de cada lote:');
    allLots.forEach((lot, index) => {
      console.log(`Lote ${index + 1}:`, {
        id: lot.id,
        payment_id: lot.payment_id,
        psychologist_id: lot.psychologist_id,
        psychologist_name: lot.psychologist_name,
        status: lot.status,
        appointments_count: lot.appointments.length
      });
    });
    
    const filteredLots = allLots.filter(lot => {
      console.log(`Comparando lot.psychologist_id (${lot.psychologist_id}) com psychologistId (${psychologistId})`);
      console.log(`Tipo lot.psychologist_id: ${typeof lot.psychologist_id}`);
      console.log(`Tipo psychologistId: ${typeof psychologistId}`);
      console.log(`Status do lote: ${lot.status}`);
      
      const matches = String(lot.psychologist_id) === String(psychologistId);
      console.log(`Match: ${matches}`);
      return matches;
    });
    
    console.log('Lotes filtrados para o psicólogo:', filteredLots);
    console.log('Quantidade de lotes filtrados:', filteredLots.length);
    console.log('=== FIM FILTRO POR PSICÓLOGO ===');
    
    return filteredLots;
  };

  // Funções para pagamentos
  const getFilteredAppointments = () => {
    if (!selectedPaymentPsychologist || !showPaymentAppointments) {
      return [];
    }
    
    const filtered = transactions.filter(app => {
      const matchesPsychologist = String(app.psychologist_id) === selectedPaymentPsychologist;
      const isCompleted = app.status === "completed";
      
      // Check if appointment is not already in a payment batch
      const notInBatch = !paymentBatches.some(batch => 
        batch.appointmentIds?.includes(String(app.id)) && 
        (batch.status === 'pending' || batch.status === 'approved' || batch.status === 'paid')
      );
      
      let matchesDateRange = true;
      
      // Se período foi selecionado, aplicar filtro de data
      if (paymentDateRange?.from && paymentDateRange?.to) {
        // Converter data da API para Date (formato YYYY-MM-DD)
        const appointmentDate = new Date(app.date + "T00:00:00");
        
        // Converter datas do range para Date
        const fromDate = new Date(paymentDateRange.from);
        const toDate = new Date(paymentDateRange.to);
        
        // Normalizar datas para comparação (remover timezone)
        const appointmentDateNormalized = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
        const fromDateNormalized = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
        const toDateNormalized = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
        
        matchesDateRange = appointmentDateNormalized >= fromDateNormalized && appointmentDateNormalized <= toDateNormalized;
        
        // Debug log para verificar comparação de datas
        if (app.id === "139" || app.id === "149" || app.id === "255") { // Log para alguns IDs específicos
          console.log('Debug data:', {
            appointmentId: app.id,
            appointmentDate: app.date,
            appointmentDateNormalized: appointmentDateNormalized.toISOString().split('T')[0],
            fromDateNormalized: fromDateNormalized.toISOString().split('T')[0],
            toDateNormalized: toDateNormalized.toISOString().split('T')[0],
            matchesDateRange,
            fromDateStr: paymentDateRange.from,
            toDateStr: paymentDateRange.to
          });
        }
      }
      
      // Filtro por nome do paciente
      let matchesPatient = true;
      if (patientSearchTerm.trim()) {
        const patient = patients.find(p => String(p.id) === String(app.patient_id));
        const patientName = (patient?.name || patient?.nome || "").toLowerCase();
        matchesPatient = patientName.includes(patientSearchTerm.toLowerCase());
      }
      
      // Filtro por control (NULL ou pending)
      const hasValidControl = (app as any).control === "NULL" || (app as any).control === "pending" || (app as any).control === null;
      
      return matchesPsychologist && matchesDateRange && isCompleted && notInBatch && matchesPatient && hasValidControl;
    });
    
    console.log('Filtro de pagamentos:', {
      selectedPsychologist: selectedPaymentPsychologist,
      dateRange: paymentDateRange,
      patientSearchTerm: patientSearchTerm,
      totalTransactions: transactions.length,
      filteredCount: filtered.length,
      sampleAppointments: transactions.slice(0, 3).map(t => ({
        id: t.id,
        date: t.date,
        status: t.status,
        psychologist_id: t.psychologist_id,
        control: (t as any).control
      }))
    });
    
    return filtered;
  };

  const filteredAppointments = getFilteredAppointments();

  // Calculate totals for selected appointments
  const calculateTotals = () => {
    const selectedApps = filteredAppointments.filter(app => selectedAppointments.includes(String(app.id)));
    const totalGross = selectedApps.reduce((sum, app) => sum + (Number(app.value) || 0), 0);
    const psychologist = psychologists.find(p => p.id === selectedPaymentPsychologist);
    const commissionPercentage = 50; // Comissão fixa de 50%
    const totalNet = selectedApps.reduce((sum, app) => sum + ((Number(app.value) || 0) * commissionPercentage / 100), 0);
    
    return { totalGross, totalNet, commissionPercentage };
  };

  const { totalGross, totalNet, commissionPercentage } = calculateTotals();

  // Função helper para formatar data sem problemas de timezone
  const formatDate = (dateString: string) => {
    return dateString.split('-').reverse().join('/');
  };

  const handleSearchAppointments = () => {
    if (!selectedPaymentPsychologist) {
      toast({
        title: "Selecione um psicólogo",
        description: "Por favor, selecione um psicólogo antes de buscar atendimentos.",
        variant: "destructive",
      });
      return;
    }
    
    setShowPaymentAppointments(true);
    setSelectedAppointments([]); // Limpar seleções anteriores
    setPatientSearchTerm(""); // Limpar busca de paciente
    setEditingPatientHeader(false); // Limpar edição do cabeçalho
  };

  const handleSelectAppointment = (appointmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedAppointments(prev => [...prev, appointmentId]);
    } else {
      setSelectedAppointments(prev => prev.filter(id => id !== appointmentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAppointments(filteredAppointments.map(app => app.id));
    } else {
      setSelectedAppointments([]);
    }
  };

  const handleCreatePayment = async () => {
    console.log('=== INÍCIO handleCreatePayment ===');
    console.log('selectedAppointments:', selectedAppointments);
    console.log('user:', user);
    
    if (selectedAppointments.length === 0 || !user) {
      console.log('Erro: Nenhuma consulta selecionada ou usuário não encontrado');
      toast({
        title: "Nenhuma consulta selecionada",
        description: "Selecione pelo menos uma consulta para criar o lote de pagamento.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const selectedApps = filteredAppointments.filter(app => selectedAppointments.includes(String(app.id)));
      const psychologist = psychologists.find(p => p.id === selectedPaymentPsychologist);
      
      if (!psychologist) {
        toast({
          title: "Psicólogo não encontrado",
          description: "Não foi possível encontrar o psicólogo selecionado.",
          variant: "destructive",
        });
        return;
      }

      // Preparar dados para a API
      const paymentData = {
        psychologist_id: selectedPaymentPsychologist,
        psychologist_name: psychologist.name,
        appointment_ids: selectedApps.map(app => app.id),
        total_gross_value: totalGross,
        total_net_value: totalNet,
        commission_percentage: commissionPercentage,
        created_by: user.name,
        created_by_id: user.id,
        status: "pending",
        created_at: new Date().toISOString()
      };

      console.log('=== DADOS DE PAGAMENTO ===');
      console.log('selectedApps:', selectedApps);
      console.log('psychologist:', psychologist);
      console.log('totalGross:', totalGross);
      console.log('totalNet:', totalNet);
      console.log('user:', user);
      console.log('paymentData:', paymentData);
      console.log('Body JSON:', JSON.stringify(paymentData));
      console.log('URL da API:', 'https://webhook.essenciasaudeintegrada.com.br/webhook/payments_created');

      // Enviar para a nova API
      console.log('=== EXECUTANDO FETCH ===');
      console.log('Método: POST');
      console.log('Headers:', {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      });
      console.log('Body final:', JSON.stringify(paymentData));
      
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/payments_created', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });
      
      console.log('=== FETCH EXECUTADO ===');

      console.log('Resposta da API:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      // Tentar ler a resposta da API
      try {
        const responseText = await response.text();
        console.log('Resposta completa da API:', responseText);
        
        let responseData = null;
        try {
          responseData = JSON.parse(responseText);
          console.log('Resposta JSON da API:', responseData);
        } catch (parseError) {
          console.log('Resposta não é JSON válido:', responseText);
        }
      } catch (readError) {
        console.error('Erro ao ler resposta da API:', readError);
      }

      if (response.ok) {
        setSelectedAppointments([]);
        await loadPaymentBatches();
        
        toast({
          title: "Lote criado com sucesso",
          description: "O lote de pagamento foi criado e enviado para aprovação do psicólogo.",
        });
      } else {
        throw new Error(`Erro na API: ${response.status}`);
      }
    } catch (error) {
      console.error("=== ERRO ao criar lote ===", error);
      console.error("Tipo do erro:", typeof error);
      console.error("Mensagem do erro:", error instanceof Error ? error.message : 'Erro desconhecido');
      
      toast({
        title: "Erro ao criar lote",
        description: `Não foi possível criar o lote de pagamento. Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    }
    
    console.log('=== FIM handleCreatePayment ===');
  };

  const handleMarkAsPaid = async (batchId: string) => {
    try {
      await markPaymentAsPaid(batchId);
      loadPaymentBatches();
      toast({
        title: "Pagamento processado",
        description: "O pagamento foi marcado como pago.",
      });
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
      toast({
        title: "Erro ao processar pagamento",
        description: "Não foi possível marcar o pagamento como pago.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800", 
      contested: "bg-red-100 text-red-800",
      paid: "bg-blue-100 text-blue-800"
    };
    
    const labels = {
      pending: "Pendente",
      approved: "Aprovado",
      contested: "Contestado",
      paid: "Pago"
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const psychologistBatches = paymentBatches.filter(batch => 
    !selectedPaymentPsychologist || batch.psychologistId === selectedPaymentPsychologist
  );

  const getDateRangeText = () => {
    if (!paymentDateRange?.from || !paymentDateRange?.to) return "";
    return `${format(paymentDateRange.from, "dd/MM/yyyy", { locale: ptBR })} a ${format(paymentDateRange.to, "dd/MM/yyyy", { locale: ptBR })}`;
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Inicializar selectedPsychologist para psicólogos
  useEffect(() => {
    console.log('=== INICIALIZAÇÃO PSICÓLOGO ===');
    console.log('isPsychologist:', isPsychologist);
    console.log('user?.id:', user?.id);
    console.log('user?.role:', user?.role);
    console.log('selectedPsychologist atual:', selectedPsychologist);
    console.log('effectivePsychologist:', effectivePsychologist);
    
    if (isPsychologist && user?.id) {
      console.log('Definindo selectedPsychologist para:', user.id);
      setSelectedPsychologist(String(user.id));
    }
  }, [isPsychologist, user?.id, user?.role]);

  useEffect(() => {
    if (psychologists.length > 0) {
      fetchAppointments();
    }
  }, [effectivePsychologist, psychologists]);

  // Fechar seletor de mês quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMonthSelector) {
        const target = event.target as HTMLElement;
        if (!target.closest('.month-selector-container')) {
          setShowMonthSelector(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMonthSelector]);

  // Mostrar atendimentos automaticamente quando selecionar período
  useEffect(() => {
    if (selectedPaymentPsychologist && paymentDateRange?.from && paymentDateRange?.to) {
      setShowPaymentAppointments(true);
      setSelectedAppointments([]); // Limpar seleções anteriores
      setPatientSearchTerm(""); // Limpar busca de paciente
      setEditingPatientHeader(false); // Limpar edição do cabeçalho
    }
  }, [selectedPaymentPsychologist, paymentDateRange]);

  const getFilteredAppointmentsForReports = () => {
    console.log("=== FILTRO RELATÓRIOS SIMPLIFICADO ===");
    console.log("filterPeriod:", filterPeriod);
    console.log("selectedPsychologist:", selectedPsychologist);
    console.log("isPsychologist:", isPsychologist);
    console.log("user?.id:", user?.id);
    
    // Para psicólogos, usar sempre o ID do usuário logado
    const effectivePsychologist = isPsychologist ? String(user?.id) : selectedPsychologist;
    console.log("effectivePsychologist:", effectivePsychologist);
    
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (filterPeriod) {
      case "day":
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "week":
        startDate = startOfWeek(today, { weekStartsOn: 1 });
        endDate = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case "month":
        startDate = startOfMonth(selectedMonth);
        endDate = endOfMonth(selectedMonth);
        break;
      case "year":
        startDate = startOfYear(today);
        endDate = endOfYear(today);
        break;
      default:
        startDate = subDays(today, 30);
        endDate = today;
    }

    // Filtro simplificado - mesma lógica que funciona para admin
    const filtered = transactions.filter((appointment) => {
      const appointmentDate = new Date(appointment.date);
      const matchesDate = appointmentDate >= startDate && appointmentDate <= endDate;
      const isCompleted = appointment.status === "completed";
      const matchesPsychologist = effectivePsychologist === "all" || String(appointment.psychologist_id) === effectivePsychologist;

      return matchesDate && isCompleted && matchesPsychologist;
    });

    console.log(`=== RESULTADO FILTRO ${filterPeriod.toUpperCase()} ===`);
    console.log('startDate:', format(startDate, "dd/MM/yyyy"));
    console.log('endDate:', format(endDate, "dd/MM/yyyy"));
    console.log('totalTransactions:', transactions.length);
    console.log('filteredCount:', filtered.length);
    console.log('effectivePsychologist:', effectivePsychologist);

    return filtered;
  };

  const filteredAppointmentsForReports = getFilteredAppointmentsForReports();

  const calculateFinancials = () => {
    console.log('=== CÁLCULO DE RECEITAS ===');
    console.log('filteredAppointmentsForReports:', filteredAppointmentsForReports);
    console.log('Quantidade de appointments filtrados:', filteredAppointmentsForReports?.length || 0);
    
    let totalRevenue = 0;
    let psychologistCommission = 0;
    let clinicRevenue = 0;

    if (!filteredAppointmentsForReports || filteredAppointmentsForReports.length === 0) {
      console.log('Nenhum appointment encontrado para cálculo');
      return { totalRevenue: 0, psychologistCommission: 0, clinicRevenue: 0 };
    }

    filteredAppointmentsForReports.forEach((appointment, index) => {
      const value = Number(appointment.value) || 0;
      totalRevenue += value;

      const commissionPercentage = 50; // ou buscar do contexto do usuário
      const commission = (value * commissionPercentage) / 100;
      psychologistCommission += commission;
      clinicRevenue += value - commission;
      
      console.log(`Appointment ${index + 1} (ID: ${appointment.id}):`, {
        value: appointment.value,
        parsedValue: value,
        commission,
        totalRevenue,
        psychologistCommission,
        clinicRevenue
      });
    });

    const result = {
      totalRevenue: Number(totalRevenue) || 0,
      psychologistCommission: Number(psychologistCommission) || 0,
      clinicRevenue: Number(clinicRevenue) || 0,
    };
    
    console.log('Resultado final do cálculo:', result);
    return result;
  };

  const { totalRevenue, psychologistCommission, clinicRevenue } = calculateFinancials();




  const generateChartData = () => {
    if (!filteredAppointmentsForReports || filteredAppointmentsForReports.length === 0) return [];

    if (effectivePsychologist === "all") {
      const dataByPsychologist = psychologists.map((psych) => {
        const psychAppointments = filteredAppointmentsForReports.filter(
          (appointment) => String(appointment.psychologist_id) === psych.id
        );

        const totalValue = psychAppointments.reduce((sum, appointment) => sum + (Number(appointment.value) || 0), 0);
        const commissionPercentage = 50;
        const commission = (totalValue * commissionPercentage) / 100;
        const clinicValue = totalValue - commission;

        return {
          name: psych.name,
          valor: Number(totalValue) || 0,
          comissao: Number(commission) || 0,
          clinica: Number(clinicValue) || 0,
          consultas: psychAppointments.length,
        };
      });

      return dataByPsychologist.filter((item) => item.consultas > 0);
    } else {
      const dateGroups: Record<string, { date: string; valor: number; comissao: number; clinica: number; consultas: number }> = {};

      filteredAppointmentsForReports.forEach((appointment) => {
        let groupKey: string;

        switch (filterPeriod) {
          case "day":
            groupKey = format(new Date(appointment.date), "HH:00", { locale: ptBR });
            break;
          case "week":
            groupKey = format(new Date(appointment.date), "EEE", { locale: ptBR });
            break;
          case "month":
            groupKey = format(new Date(appointment.date), "dd/MM", { locale: ptBR });
            break;
          case "year":
            groupKey = format(new Date(appointment.date), "MMM", { locale: ptBR });
            break;
          default:
            groupKey = appointment.date;
        }

        if (!dateGroups[groupKey]) {
          dateGroups[groupKey] = { date: groupKey, valor: 0, comissao: 0, clinica: 0, consultas: 0 };
        }

        const value = Number(appointment.value) || 0;
        const commissionPercentage = 50;
        const commission = (value * commissionPercentage) / 100;
        const clinicValue = value - commission;

        dateGroups[groupKey].valor += value;
        dateGroups[groupKey].comissao += commission;
        dateGroups[groupKey].clinica += clinicValue;
        dateGroups[groupKey].consultas += 1;
      });

      return Object.values(dateGroups);
    }
  };

  const chartData = generateChartData();

  const getPeriodName = () => {
    switch (filterPeriod) {
      case "day":
        return "Hoje";
      case "week":
        return "Esta Semana";
      case "month":
        return format(selectedMonth, "MMMM yyyy", { locale: ptBR });
      case "year":
        return "Este Ano";
      default:
        return "";
    }
  };

  const handleEditTransaction = (transactionId: string, currentValue: number, currentInsuranceType: string) => {
    setEditingTransactionId(transactionId);
    setEditTransactionValue(currentValue);
    setEditTransactionInsuranceType(currentInsuranceType);
    setIsEditModalOpen(true);
  };

  const handleSaveTransactionValue = async () => {
    if (editingTransactionId) {
      setIsEditingLoading(true);
      try {
        // Encontrar o agendamento que está sendo editado
        const appointmentToEdit = transactions.find(
          (appointment) => String(appointment.id) === editingTransactionId
        );

        if (appointmentToEdit) {
          // Preparar apenas os dados obrigatórios para enviar para a API
          const appointmentData = {
            id: appointmentToEdit.id,
            payment_method: appointmentToEdit.payment_method,
            insurance_type: editTransactionInsuranceType,
            value: editTransactionValue
          };

          console.log('Enviando dados para API:', appointmentData);

          // Enviar requisição POST para a API
          const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/appointmens_edit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(appointmentData)
          });

          if (response.ok) {
            // Atualizar o estado local após sucesso na API
            setTransactions((prev) =>
              prev.map((appointment) =>
                String(appointment.id) === editingTransactionId
                  ? { ...appointment, value: editTransactionValue, insurance_type: editTransactionInsuranceType as "Unimed" | "SulAmérica" | "Fusex" | "Other" }
                  : appointment
              )
            );

            // Mostrar toast de sucesso no canto inferior direito
            toast({
              title: "Edição realizada com sucesso!",
              description: `Valor da consulta foi atualizado para R$ ${editTransactionValue.toFixed(2)}`,
              variant: "default",
            });
          } else {
            console.error('Erro na API:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Detalhes do erro:', errorText);
            throw new Error(`Erro na API: ${response.status} - ${errorText}`);
          }
        }
      } catch (error) {
        console.error("Erro ao atualizar valor e tipo de convênio da consulta:", error);
        
        // Mostrar toast de erro no canto inferior direito
        toast({
          title: "Erro ao salvar edição",
          description: "Ocorreu um erro ao tentar salvar as alterações. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsEditingLoading(false);
      }
    }
    setIsEditModalOpen(false);
    setEditingTransactionId(null);
  };

  const generatePaymentLotPDF = (lotDetails: any) => {
    const doc = new jsPDF();

    const title = `Detalhes do Lote de Pagamento`;
    doc.setFontSize(18);
    doc.text(title, 14, 20);

    doc.setFontSize(12);
    doc.text(`Psicólogo: ${lotDetails.psychologist_name}`, 14, 30);
    doc.text(`Status: ${lotDetails.status === 'payments_created' ? 'Criado' : lotDetails.status}`, 14, 37);
    doc.text(`Valor Total: R$ ${lotDetails.total_value.toFixed(2)}`, 14, 44);
    doc.text(`Data de Criação: ${format(new Date(lotDetails.payment_created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 51);
    
    doc.text(
      `Data de Geração: ${format(new Date(), "dd/MM/yyyy HH:mm", {
        locale: ptBR,
      })}`,
      14,
      58
    );

    const tableData = lotDetails.appointments.map((appointment: any) => {
      return [
        appointment.patient_name,
        formatDate(appointment.date),
        appointment.insurance_type || 'Particular',
        `R$ ${appointment.value.toFixed(2)}`,
        `R$ ${appointment.commission.toFixed(2)}`,
      ];
    });

    (doc as any).autoTable({
      startY: 65,
      head: [["Paciente", "Data", "Plano", "Valor Bruto", "Comissão"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [0, 123, 255], textColor: 255 },
      styles: { fontSize: 10 },
    });

    const reportName = `lote-pagamento-${lotDetails.psychologist_name.replace(/\s+/g, '-')}-${format(
      new Date(),
      "yyyyMMdd",
      { locale: ptBR }
    )}.pdf`;
    doc.save(reportName);
  };

  const deletePaymentLot = async (lot: any) => {
    try {
      console.log('=== EXCLUINDO LOTE DE PAGAMENTO ===');
      console.log('Lot completo:', lot);
      console.log('Lot.payment_id:', lot.payment_id);
      console.log('Lot.id:', lot.id);
      console.log('Tipo do payment_id:', typeof lot.payment_id);
      console.log('URL da API:', 'https://webhook.essenciasaudeintegrada.com.br/webhook/payments_delete');

      // Verificar se payment_id existe e não é undefined/null
      if (!lot.payment_id) {
        console.error('ERRO: payment_id não encontrado no objeto lot');
        console.error('Objeto lot recebido:', JSON.stringify(lot, null, 2));
        return;
      }

      const requestBody = {
        payment_id: lot.payment_id
      };

      console.log('Body da requisição:', JSON.stringify(requestBody));

      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/payments_delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Resposta da API:', response.status);
      console.log('Resposta completa:', await response.text());
      
      if (response.ok) {
        console.log('Lote de pagamento excluído com sucesso');
        // Recarregar a lista de lotes
        loadPaymentBatches();
        // Fechar modais
        setSelectedLotDetails(null);
        setShowDeleteConfirm(null);
      } else {
        console.error('Erro ao excluir lote de pagamento:', response.status);
      }
    } catch (error) {
      console.error('Erro ao excluir lote de pagamento:', error);
    }
  };

  const approvePaymentLot = async (lot: any) => {
    try {
      console.log('=== APROVANDO LOTE DE PAGAMENTO ===');
      console.log('Lot completo:', lot);
      console.log('Lot.payment_id:', lot.payment_id);
      console.log('Lot.id:', lot.id);
      console.log('Tipo do payment_id:', typeof lot.payment_id);
      console.log('URL da API:', 'https://webhook.essenciasaudeintegrada.com.br/webhook/payments_aprove');

      // Verificar se payment_id existe e não é undefined/null
      if (!lot.payment_id) {
        console.error('ERRO: payment_id não encontrado no objeto lot');
        console.error('Objeto lot recebido:', JSON.stringify(lot, null, 2));
        return;
      }

      const requestBody = {
        payment_id: lot.payment_id
      };

      console.log('Body da requisição:', JSON.stringify(requestBody));

      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/payments_aprove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Resposta da API:', response.status);
      console.log('Resposta completa:', await response.text());
      
      if (response.ok) {
        console.log('Lote de pagamento aprovado com sucesso');
        // Recarregar a lista de lotes
        loadPaymentBatches();
        // Fechar modais
        setSelectedLotDetails(null);
        setShowApproveConfirm(null);
      } else {
        console.error('Erro ao aprovar lote de pagamento:', response.status);
      }
    } catch (error) {
      console.error('Erro ao aprovar lote de pagamento:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Finanças</h1>
        {(loading || isLoading) && <Loader className="h-5 w-5 animate-spin" />}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === "charts" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("charts")}
          className="flex-1"
        >
          Relatórios
        </Button>
        <Button
          variant={activeTab === "payments" ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            setActiveTab("payments");
            loadPaymentBatches(); // Carregar lotes quando clicar na aba
          }}
          className="flex-1"
        >
          <DollarSign className="h-4 w-4 mr-2" />
          {isPsychologist ? "Meus Pagamentos" : "Pagamentos"}
        </Button>
        {isAdmin && (
          <Button
            variant={activeTab === "dashboard" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("dashboard")}
            className="flex-1"
          >
            Dashboard
          </Button>
        )}
      </div>

      {activeTab === "payments" && (
        <>
          {isAdmin && (
            <div className="space-y-6">
              {/* Payment Management for Admin */}
              <Card>
                <CardHeader>
                  <CardTitle>Criar Novo Pagamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Psicólogo</label>
                      <Select value={selectedPaymentPsychologist} onValueChange={(value) => {
                        setSelectedPaymentPsychologist(value);
                        setSelectedAppointments([]);
                        setShowPaymentAppointments(false); // Limpar busca anterior
                        setPatientSearchTerm(""); // Limpar busca de paciente
                        setEditingPatientHeader(false); // Limpar edição do cabeçalho
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um psicólogo" />
                        </SelectTrigger>
                        <SelectContent>
                          {psychologists.map(psych => (
                            <SelectItem key={psych.id} value={psych.id}>
                              {psych.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Período</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !paymentDateRange?.from && "text-muted-foreground"
                            )}
                          >
                            <CalendarRange className="mr-2 h-4 w-4" />
                            {paymentDateRange?.from ? (
                              paymentDateRange.to ? (
                                `${format(paymentDateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(paymentDateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
                              ) : (
                                format(paymentDateRange.from, "dd/MM/yyyy", { locale: ptBR })
                              )
                            ) : (
                              "Selecione o período"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={paymentDateRange?.from}
                            selected={paymentDateRange}
                            onSelect={(range) => {
                              setPaymentDateRange(range);
                              setSelectedAppointments([]);
                            }}
                            numberOfMonths={2}
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex items-end">
                      <Button 
                        variant="outline"
                        onClick={handleSearchAppointments}
                        className="flex items-center gap-2"
                        disabled={!selectedPaymentPsychologist}
                      >
                        <Search className="h-4 w-4" />
                        Buscar Atendimentos
                      </Button>
                    </div>
                  </div>



                  {/* Show message when filters are set but no appointments found */}
                  {selectedPaymentPsychologist && showPaymentAppointments && filteredAppointments.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <p className="text-sm text-yellow-800">
                        Nenhum atendimento realizado encontrado para {psychologists.find(p => p.id === selectedPaymentPsychologist)?.name} {paymentDateRange?.from && paymentDateRange?.to ? `no período ${getDateRangeText()}` : ''} {patientSearchTerm ? `com paciente contendo "${patientSearchTerm}"` : ''} ou todos os atendimentos já foram incluídos em lotes de pagamento.
                      </p>
                    </div>
                  )}

                  {/* Show initial message when no search has been performed */}
                  {selectedPaymentPsychologist && !showPaymentAppointments && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <p className="text-sm text-blue-800">
                        Selecione um período ou clique em "Buscar Atendimentos" para visualizar os atendimentos de {psychologists.find(p => p.id === selectedPaymentPsychologist)?.name}.
                      </p>
                    </div>
                  )}

                  {/* Show appointments table when found */}
                  {showPaymentAppointments && filteredAppointments.length > 0 && (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-md p-4">
                        <p className="text-sm text-green-800">
                          Encontrados {filteredAppointments.length} atendimento(s) realizado(s) para {psychologists.find(p => p.id === selectedPaymentPsychologist)?.name} {paymentDateRange?.from && paymentDateRange?.to ? `no período ${getDateRangeText()}` : ''} {patientSearchTerm ? `com paciente contendo "${patientSearchTerm}"` : ''}.
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedAppointments.length === filteredAppointments.length && filteredAppointments.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                          <span className="text-sm">Selecionar todos</span>
                          {patientSearchTerm && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPatientSearchTerm("")}
                              className="text-gray-500 hover:text-gray-700 ml-2"
                            >
                              Limpar filtro de paciente
                            </Button>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          Total: R$ {totalGross.toFixed(2)} | Líquido: R$ {totalNet.toFixed(2)} ({commissionPercentage}%)
                        </div>
                      </div>

                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => setEditingPatientHeader(true)}
                              >
                                {editingPatientHeader ? (
                                  <Input
                                    placeholder="Buscar paciente..."
                                    value={patientSearchTerm}
                                    onChange={(e) => setPatientSearchTerm(e.target.value)}
                                    onBlur={() => setEditingPatientHeader(false)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        setEditingPatientHeader(false);
                                      }
                                      if (e.key === 'Escape') {
                                        setPatientSearchTerm("");
                                        setEditingPatientHeader(false);
                                      }
                                    }}
                                    autoFocus
                                    className="border-none p-0 h-auto bg-transparent font-medium"
                                  />
                                ) : (
                                  <span className="text-blue-600 hover:text-blue-800">
                                    {patientSearchTerm ? `Filtrando: "${patientSearchTerm}"` : "Paciente"}
                                  </span>
                                )}
                              </TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Horário</TableHead>
                              <TableHead>Valor Bruto</TableHead>
                              <TableHead>Comissão ({commissionPercentage}%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredAppointments.map(appointment => {
                              const commission = ((Number(appointment.value) || 0) * commissionPercentage) / 100;
                              const patient = patients.find(p => String(p.id) === String(appointment.patient_id));
                              return (
                                <TableRow key={appointment.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedAppointments.includes(String(appointment.id))}
                                      onCheckedChange={(checked) => handleSelectAppointment(String(appointment.id), checked as boolean)}
                                    />
                                  </TableCell>
                                  <TableCell>{patient?.name || patient?.nome || "N/A"}</TableCell>
                                  <TableCell>{formatDate(appointment.date)}</TableCell>
                                  <TableCell>{appointment.start_time} - {appointment.end_time}</TableCell>
                                  <TableCell>R$ {(Number(appointment.value) || 0).toFixed(2)}</TableCell>
                                  <TableCell>R$ {commission.toFixed(2)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      <Button 
                        onClick={() => {
                          console.log('=== BOTÃO CLICADO ===');
                          console.log('selectedAppointments.length:', selectedAppointments.length);
                          console.log('totalNet:', totalNet);
                          handleCreatePayment();
                        }}
                        disabled={selectedAppointments.length === 0}
                        className="w-full"
                      >
                        Criar Lote de Pagamento (R$ {totalNet.toFixed(2)})
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Payment Batches */}
              <Card>
                <CardHeader>
                  <CardTitle>Lotes de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Psicólogo</TableHead>
                          <TableHead>Data Criação</TableHead>
                          <TableHead>Valor Líquido</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getGroupedPaymentLots().length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                              Nenhum lote de pagamento encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          getGroupedPaymentLots().map(lot => (
                            <TableRow 
                              key={lot.id}
                              className={lot.status === 'payments_finish' ? 'bg-green-50 hover:bg-green-100' : ''}
                            >
                              <TableCell>{lot.psychologist_name}</TableCell>
                              <TableCell>
                                {format(new Date(lot.payment_created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </TableCell>
                              <TableCell>R$ {lot.total_value.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge className={
                                  lot.status === 'payments_created' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : lot.status === 'payments_finish'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }>
                                  {lot.status === 'payments_created' 
                                    ? 'Criado' 
                                    : lot.status === 'payments_finish'
                                    ? 'Finalizado'
                                    : lot.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedLotDetails(lot)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowDeleteConfirm(lot)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {isPsychologist && (
            <div className="space-y-6">
              {/* Psychologist Payments View */}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Meus Pagamentos</h2>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">Lotes Pendentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      R$ {getPsychologistPaymentLots(String(user?.id) || "").filter(p => p.status === 'payments_created').reduce((sum, p) => sum + p.total_value, 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getPsychologistPaymentLots(String(user?.id) || "").filter(p => p.status === 'payments_created').length} lote(s) aguardando aprovação
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">Lotes Aprovados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      R$ {getPsychologistPaymentLots(String(user?.id) || "").filter(p => p.status === 'payments_finish').reduce((sum, p) => sum + p.total_value, 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getPsychologistPaymentLots(String(user?.id) || "").filter(p => p.status === 'payments_finish').length} lote(s) aprovado(s)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">Total de Atendimentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {getPsychologistPaymentLots(String(user?.id) || "").reduce((sum, p) => sum + p.appointments.length, 0)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      atendimentos nos lotes
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Batches */}
              <Card>
                <CardHeader>
                  <CardTitle>Meus Lotes de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  {getPsychologistPaymentLots(String(user?.id) || "").length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum lote de pagamento encontrado
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data Criação</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Comissão (50%)</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Atendimentos</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getPsychologistPaymentLots(String(user?.id) || "").map(lot => (
                            <TableRow 
                              key={lot.id}
                              className={lot.status === 'payments_finish' ? 'bg-green-50 hover:bg-green-100' : ''}
                            >
                              <TableCell>
                                {format(new Date(lot.payment_created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </TableCell>
                              <TableCell>R$ {lot.total_value.toFixed(2)}</TableCell>
                              <TableCell>R$ {(lot.total_value * 0.5).toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge className={
                                  lot.status === 'payments_created' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : lot.status === 'payments_finish'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }>
                                  {lot.status === 'payments_created' 
                                    ? 'Criado' 
                                    : lot.status === 'payments_finish'
                                    ? 'Finalizado'
                                    : lot.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-gray-600">
                                  {lot.appointments.length} atendimento(s)
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedLotDetails(lot)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {lot.status === 'payments_created' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowApproveConfirm(lot)}
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      title="Aprovar lote de pagamento"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {activeTab === "dashboard" && isAdmin && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Dashboard de Pagamentos</h2>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total de Lotes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paymentBatches.length}</div>
                <p className="text-xs text-gray-500">
                  {Array.from(new Set(paymentBatches.map(p => p.psychologistId))).length} psicólogos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {paymentBatches.filter(b => b.status === 'pending').length}
                </div>
                <p className="text-xs text-gray-500">
                  R$ {paymentBatches.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.totalNetValue, 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Aprovados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {paymentBatches.filter(b => b.status === 'approved').length}
                </div>
                <p className="text-xs text-gray-500">
                  R$ {paymentBatches.filter(b => b.status === 'approved').reduce((sum, b) => sum + b.totalNetValue, 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pagos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {paymentBatches.filter(b => b.status === 'paid').length}
                </div>
                <p className="text-xs text-gray-500">
                  R$ {paymentBatches.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.totalNetValue, 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentBatches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum pagamento encontrado
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Psicólogo</TableHead>
                        <TableHead>Data Criação</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado por</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentBatches
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .slice(0, 10)
                        .map(batch => (
                        <TableRow key={batch.id}>
                          <TableCell className="font-medium">{batch.psychologistName}</TableCell>
                          <TableCell>
                            {format(new Date(batch.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>R$ {batch.totalNetValue.toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(batch.status)}</TableCell>
                          <TableCell>{batch.createdByName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

            {activeTab === "charts" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="flex space-x-2 mb-4">
            <Button
              variant={filterPeriod === "day" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPeriod("day")}
            >
              Dia
            </Button>
            <Button
              variant={filterPeriod === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPeriod("week")}
            >
              Semana
            </Button>
            <div className="relative month-selector-container">
            <Button
              variant={filterPeriod === "month" ? "default" : "outline"}
              size="sm"
                onClick={() => {
                  setFilterPeriod("month");
                  setShowMonthSelector(!showMonthSelector);
                }}
            >
              Mês
            </Button>
              {showMonthSelector && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-10 p-2">
                  <div className="text-sm font-medium mb-2">Selecionar Mês:</div>
                  <div className="grid grid-cols-3 gap-1">
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = new Date(selectedMonth.getFullYear(), i, 1);
                      const isSelected = selectedMonth.getMonth() === i;
                      return (
                        <button
                          key={i}
                          className={`px-2 py-1 text-xs rounded ${
                            isSelected 
                              ? "bg-blue-500 text-white" 
                              : "bg-gray-100 hover:bg-gray-200"
                          }`}
                          onClick={() => {
                            setSelectedMonth(month);
                            setShowMonthSelector(false);
                          }}
                        >
                          {format(month, "MMM", { locale: ptBR })}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex gap-1">
                      <button
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                        onClick={() => {
                          setSelectedMonth(new Date(selectedMonth.getFullYear() - 1, selectedMonth.getMonth(), 1));
                        }}
                      >
                        ←
                      </button>
                      <span className="px-2 py-1 text-xs font-medium">
                        {selectedMonth.getFullYear()}
                      </span>
                      <button
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                        onClick={() => {
                          setSelectedMonth(new Date(selectedMonth.getFullYear() + 1, selectedMonth.getMonth(), 1));
                        }}
                      >
                        →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant={filterPeriod === "year" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPeriod("year")}
            >
              Ano
            </Button>
          </div>

          {isAdmin && (
            <div className="mb-4">
              <Select
                value={selectedPsychologist}
                onValueChange={setSelectedPsychologist}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um psicólogo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Psicólogos</SelectItem>
                  {psychologists.map((psych) => (
                    <SelectItem key={psych.id} value={psych.id}>
                      {psych.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 md:col-span-1 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">
                Receita Total ({getPeriodName()})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500">
                {filteredAppointmentsForReports.length} consultas confirmadas
              </p>
            </CardContent>
          </Card>

          {isAdmin && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">
                    Receita da Clínica
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    R$ {clinicRevenue.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">
                    Comissões dos Psicólogos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    R$ {psychologistCommission.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!isAdmin && isPsychologist && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">
                  Minha Comissão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  R$ {psychologistCommission.toFixed(2)}
                </div>
                <p className="text-xs text-gray-500">
                  Baseado nos percentuais individuais
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {effectivePsychologist === "all"
              ? "Receita por Psicólogo"
              : `Receita ${getPeriodName()}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={effectivePsychologist === "all" ? "name" : "date"} />
                <YAxis />
                <Tooltip
                  formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Valor"]}
                />
                <Legend />
                <Bar
                  name="Valor Total (R$)"
                  dataKey="valor"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                />
                {isAdmin && (
                  <>
                    <Bar
                      name="Receita da Clínica (R$)"
                      dataKey="clinica"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      name="Comissões (R$)"
                      dataKey="comissao"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                  </>
                )}
                {isPsychologist && (
                  <Bar
                    name="Minha Comissão (R$)"
                    dataKey="comissao"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Relatório de Atendimentos</CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReportTable(!showReportTable)}
            >
              {showReportTable ? "Ocultar Detalhes" : "Mostrar Detalhes"}
            </Button>

          </div>
        </CardHeader>
        <CardContent>
          {showReportTable && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Psicólogo</TableHead>
                    <TableHead>Método de Pagamento</TableHead>
                    <TableHead>Tipo de Convênio</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    {isAdmin && <TableHead className="text-right">Comissão</TableHead>}
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 9 : 7} className="text-center py-4">
                        <Loader className="h-5 w-5 animate-spin mx-auto" />
                        <p className="mt-2 text-gray-500">Carregando dados iniciais...</p>
                      </TableCell>
                    </TableRow>
                  ) : loading ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 9 : 7} className="text-center py-4">
                        <Loader className="h-5 w-5 animate-spin mx-auto" />
                        <p className="mt-2 text-gray-500">Carregando transações...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredAppointmentsForReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 9 : 7} className="text-center py-4 text-gray-500">
                        Nenhuma consulta confirmada encontrada para este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAppointmentsForReports.map((appointment) => {
                      const commissionPercentage = 50;
                      const commission = ((Number(appointment.value) || 0) * commissionPercentage) / 100;
                      const patient = patients.find((p) => String(p.id) === String(appointment.patient_id));
                      const psychologist = psychologists.find((p) => p.id === String(appointment.psychologist_id));
                      
                      // Log para verificar se o campo control está presente
                      if (appointment.control) {
                        console.log(`Appointment ${appointment.id} tem control: ${appointment.control}`);
                      }

                      return (
                        <TableRow 
                          key={appointment.id}
                          className={appointment.control === 'payments_finish' ? 'bg-green-50 hover:bg-green-100' : ''}
                        >
                          <TableCell>{patient?.name || patient?.nome || "Paciente não encontrado"}</TableCell>
                          <TableCell>
                            {formatDate(appointment.date)}
                          </TableCell>
                          <TableCell>
                            {appointment.start_time} - {appointment.end_time}
                          </TableCell>
                          <TableCell>{psychologist?.name || "Psicólogo não encontrado"}</TableCell>
                          <TableCell>
                            {appointment.payment_method === 'private' ? 'Particular' : 'Convênio'}
                          </TableCell>
                          <TableCell>
                            {appointment.insurance_type || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {(Number(appointment.value) || 0).toFixed(2)}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right font-medium">
                              R$ {commission.toFixed(2)} ({commissionPercentage}%)
                            </TableCell>
                          )}
                          {isAdmin && (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditTransaction(String(appointment.id), appointment.value, appointment.insurance_type || "")}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {(isAdmin && effectivePsychologist !== "all") || (isPsychologist && effectivePsychologist !== "all") && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Psicólogo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Profissional:</p>
                <p className="font-medium">
                  {psychologists.find((p) => p.id === String(effectivePsychologist))?.name || ""}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total de Consultas:</p>
                  <p className="font-medium">{filteredAppointmentsForReports.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Média por Consulta:</p>
                  <p className="font-medium">
                    R$ {filteredAppointmentsForReports.length > 0
                      ? (totalRevenue / filteredAppointmentsForReports.length).toFixed(2)
                      : "0.00"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Percentual de Comissão:</p>
                  <p className="font-medium">50%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Receita Total:</p>
                  <p className="font-medium">R$ {totalRevenue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Comissão Total:</p>
                  <p className="font-medium">R$ {psychologistCommission.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Receita da Clínica:</p>
                  <p className="font-medium">R$ {clinicRevenue.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Valor da Consulta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Novo Valor (R$):</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editTransactionValue}
                onChange={(e) => setEditTransactionValue(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Novo Tipo de Convênio:</label>
              <Input
                type="text"
                value={editTransactionInsuranceType}
                onChange={(e) => setEditTransactionInsuranceType(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTransactionValue} className="flex items-center gap-1" disabled={isEditingLoading}>
              {isEditingLoading ? <Loader className="h-4 w-4" /> : <Save className="h-4 w-4" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      )}

      {/* Batch Details Dialog */}
      <Dialog open={!!showBatchDetails} onOpenChange={() => setShowBatchDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Lote de Pagamento</DialogTitle>
          </DialogHeader>
          {showBatchDetails && (() => {
            const batch = paymentBatches.find(b => b.id === showBatchDetails);
            const items = getPaymentItemsByBatch(showBatchDetails);
            
            if (!batch) return null;
            
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Psicólogo</p>
                    <p className="font-medium">{batch.psychologistName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    {getStatusBadge(batch.status)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Valor Total</p>
                    <p className="font-medium">R$ {batch.totalNetValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Criado por</p>
                    <p className="font-medium">{batch.createdByName}</p>
                  </div>
                </div>
                
                {batch.contestationReason && (
                  <div>
                    <p className="text-sm text-gray-500">Motivo da Contestação</p>
                    <p className="text-red-600">{batch.contestationReason}</p>
                  </div>
                )}
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor Bruto</TableHead>
                        <TableHead>Comissão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.patientName}</TableCell>
                          <TableCell>
                            {format(new Date(item.appointmentDate), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>R$ {item.grossValue.toFixed(2)}</TableCell>
                          <TableCell>R$ {item.netValue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Payment Lot Details Dialog */}
      <Dialog open={!!selectedLotDetails} onOpenChange={() => setSelectedLotDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Lote de Pagamento</DialogTitle>
            {selectedLotDetails && (
              <Button
                onClick={() => generatePaymentLotPDF(selectedLotDetails)}
                className="flex items-center gap-1"
                size="sm"
                variant="outline"
              >
                <Download className="h-4 w-4" /> Exportar PDF
              </Button>
            )}
          </DialogHeader>
          {selectedLotDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Psicólogo</p>
                  <p className="font-medium">{selectedLotDetails.psychologist_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className="bg-blue-100 text-blue-800">
                    {selectedLotDetails.status === 'payments_created' ? 'Criado' : selectedLotDetails.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valor Total</p>
                  <p className="font-medium">R$ {selectedLotDetails.total_value.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Data de Criação</p>
                  <p className="font-medium">
                    {format(new Date(selectedLotDetails.payment_created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor Bruto</TableHead>
                      <TableHead>Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedLotDetails.appointments.map((appointment: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{appointment.patient_name}</TableCell>
                        <TableCell>{formatDate(appointment.date)}</TableCell>
                        <TableCell>R$ {appointment.value.toFixed(2)}</TableCell>
                        <TableCell>R$ {appointment.commission.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contest Dialog */}
      <Dialog open={!!showContestDialog} onOpenChange={() => setShowContestDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar Contestação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivo da Contestação</label>
              <Textarea
                value={contestReason}
                onChange={(e) => setContestReason(e.target.value)}
                placeholder="Descreva as correções necessárias..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContestDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={() => showContestDialog && setShowContestDialog(null)}>
              Enviar Correção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Tem certeza que deseja excluir o lote de pagamento do psicólogo <strong>{showDeleteConfirm?.psychologist_name}</strong>?
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (showDeleteConfirm) {
                  deletePaymentLot(showDeleteConfirm);
                }
              }}
            >
              Excluir Lote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={!!showApproveConfirm} onOpenChange={() => setShowApproveConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Aprovação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Tem certeza que deseja aprovar o lote de pagamento do psicólogo <strong>{showApproveConfirm?.psychologist_name}</strong>?
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Valor total: <strong>R$ {showApproveConfirm?.total_value?.toFixed(2)}</strong>
                </p>
                <p className="text-xs text-gray-500">
                  Comissão (50%): <strong>R$ {(showApproveConfirm?.total_value * 0.5)?.toFixed(2)}</strong>
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveConfirm(null)}>
              Cancelar
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white" 
              onClick={() => {
                if (showApproveConfirm) {
                  approvePaymentLot(showApproveConfirm);
                }
              }}
            >
              Aprovar Lote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceCharts;
