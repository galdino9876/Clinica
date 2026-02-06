import { useState, useEffect, useMemo, useCallback } from "react";
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

import { Download, Edit, Save, Loader, DollarSign, CheckSquare, XSquare, Eye, AlertTriangle, Search, CalendarRange, Users, Calendar as CalendarIcon, TrendingUp, Trash2, Check, Upload } from "lucide-react";
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

  const { toast } = useToast();
  
  // Estados para relatórios
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("year");
  const [selectedPsychologist, setSelectedPsychologist] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [showYearSelector, setShowYearSelector] = useState(false);
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
  const [pixKey, setPixKey] = useState<string>("");
  const [showUploadModal, setShowUploadModal] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDownloadingComprovante, setIsDownloadingComprovante] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isAdmin = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";
  const isPsychologist = user?.role === "psychologist";
  const canManageFinance = isAdmin || isReceptionist;

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

        const fetchedPsychologists = userData
          .filter((user: any) => user.role === "psychologist")
          .map((user: any) => ({ id: String(user.id), name: user.name }));
        setPsychologists(fetchedPsychologists);

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
      if (effectivePsychologist === "all") {
        // OTIMIZAÇÃO: Requisições paralelas em vez de sequenciais
        const appointmentPromises = psychologists.map(psych => 
          fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/appointmens/${psych.id}`)
            .then(response => response.ok ? response.json() : [])
            .catch(error => {
              console.error(`Erro ao buscar appointments do psicólogo ${psych.id}:`, error);
              return [];
            })
        );
        
        const allResponses = await Promise.all(appointmentPromises);
        const allAppointments = allResponses.flat();
        setTransactions(allAppointments);
      } else {
        const url = `https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/appointmens/${effectivePsychologist}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error("Erro ao buscar appointments");
        }

        const data = await response.json();
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
      
      // Forçar nova requisição sem cache
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/payments_get", {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
        cache: "no-store" as RequestCache
      });
      
      console.log('Status da resposta:', response.status);
      console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok || response.status === 304) {
        let data;
        
        // Se for 304, tentar usar cache ou fazer nova requisição
        if (response.status === 304) {
          console.warn('Resposta 304 (Not Modified) - tentando forçar nova requisição');
          // Fazer nova requisição com timestamp para evitar cache
          const freshResponse = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/payments_get?t=${Date.now()}`, {
            method: "GET",
            headers: { 
              "Content-Type": "application/json",
              "Cache-Control": "no-cache"
            },
            cache: "no-store" as RequestCache
          });
          data = await freshResponse.json();
        } else {
          data = await response.json();
        }
        
        console.log('Dados brutos recebidos da API:', data);
        console.log('Tipo dos dados:', Array.isArray(data) ? 'Array' : typeof data);
        console.log('Quantidade de itens:', Array.isArray(data) ? data.length : 1);

        // Converter para array se for um objeto único
        const dataArray = Array.isArray(data) ? data : [data];
        console.log('Primeiro item do array:', dataArray[0]);
        console.log('Campos do primeiro item:', dataArray[0] ? Object.keys(dataArray[0]) : 'N/A');

        // Verificar se os dados têm o formato esperado
        if (dataArray.length > 0 && !dataArray[0].hasOwnProperty('control') && !dataArray[0].hasOwnProperty('payment_id')) {
          console.error('⚠️ FORMATO DE DADOS INCORRETO!');
          console.error('A API está retornando dados que não são lotes de pagamento.');
          console.error('Campos esperados: control, payment_id, psychologist_id, psychologist_name, etc.');
          console.error('Campos recebidos:', Object.keys(dataArray[0]));
          toast({
            title: "Erro no formato de dados",
            description: "A API retornou dados em formato incorreto. Verifique o console para mais detalhes.",
            variant: "destructive",
          });
          setPaymentLots([]);
          return;
        }

        // Filtrar lotes com control: 'payments_created' OU 'payments_finish'
        const filteredLots = dataArray.filter((lot: any) => {
          const hasValidControl = lot.control === 'payments_created' || lot.control === 'payments_finish';
          console.log(`Item com control "${lot.control}":`, hasValidControl, lot);
          return hasValidControl;
        });
        
        console.log('Lotes filtrados:', filteredLots);
        console.log('Quantidade de lotes filtrados:', filteredLots.length);
        console.log('=== FIM CARREGAMENTO ===');

        setPaymentLots(filteredLots);
      } else {
        console.error('Erro na resposta da API de lotes:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Corpo da resposta de erro:', errorText);
        toast({
          title: "Erro ao carregar lotes",
          description: `Erro ${response.status}: ${response.statusText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar lotes de pagamento:", error);
      toast({
        title: "Erro ao carregar lotes",
        description: "Não foi possível carregar os lotes de pagamento. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    }
  };

  // Função para agrupar lotes por payment_id e calcular totais
  const getGroupedPaymentLots = () => {
    console.log('=== AGRUPANDO LOTES ===');
    console.log('paymentLots recebidos:', paymentLots);
    console.log('Quantidade de paymentLots:', paymentLots.length);
    
    const grouped: { [key: string]: any } = {};
    
    paymentLots.forEach((lot, index) => {
      console.log(`Processando lote ${index + 1}:`, lot);
      const key = lot.payment_id; // Usar payment_id para agrupar
      console.log(`payment_id (chave): ${key}`);
      
      if (!grouped[key]) {
        console.log(`Criando novo grupo para payment_id: ${key}`);
        grouped[key] = {
          id: lot.payment_id,
          payment_id: lot.payment_id, // Manter payment_id para exclusão
          psychologist_name: lot.psychologist_name,
          psychologist_id: lot.psychologist_id, // Adicionar psychologist_id
          payment_created_at: lot.created_at, // Usar created_at da API
          status: lot.control, // Usar control como status
          pix: lot.pix, // Campo PIX da API
          comprovante: lot.comprovante, // Campo comprovante da API
          appointments: [],
          total_value: 0
        };
      }
      
      const appointment = {
        patient_name: lot.name, // Usar 'name' em vez de 'patient_name'
        date: lot.date,
        value: parseFloat(lot.value || 0), // Converter string para number
        commission: parseFloat(lot.value || 0) * 0.5, // 50% de comissão
        insurance_type: lot.insurance_type || 'Particular',
        appointment_type: lot.appointment_type || 'presential',
        patient_id: lot.patient_id,
        appointment_id: lot.appointment_id
      };
      
      console.log(`Adicionando atendimento ao grupo ${key}:`, appointment);
      grouped[key].appointments.push(appointment);
      grouped[key].total_value += parseFloat(lot.value || 0);
    });
    
    const result = Object.values(grouped);
    console.log('Lotes agrupados (resultado):', result);
    console.log('Quantidade de grupos:', result.length);
    console.log('=== FIM AGRUPAMENTO ===');

    return result;
  };

  // Função para filtrar lotes de pagamento por psicólogo
  const getPsychologistPaymentLots = (psychologistId: string) => {
    console.log('=== FILTRANDO LOTES POR PSICÓLOGO ===');
    console.log('psychologistId recebido:', psychologistId);
    console.log('Tipo do psychologistId:', typeof psychologistId);
    
    const allLots = getGroupedPaymentLots();
    console.log('Total de lotes agrupados:', allLots.length);
    console.log('Lotes agrupados:', allLots);
    
    const filteredLots = allLots.filter(lot => {
      console.log(`Comparando lot.psychologist_id (${lot.psychologist_id}, tipo: ${typeof lot.psychologist_id}) com psychologistId (${psychologistId}, tipo: ${typeof psychologistId})`);
      console.log(`Status do lote: ${lot.status}`);
      console.log(`Lote completo:`, lot);
      
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
      setSelectedAppointments(filteredAppointments.map(app => String(app.id)));
    } else {
      setSelectedAppointments([]);
    }
  };

  const handleCreatePayment = async () => {
    // console.log('=== INÍCIO handleCreatePayment ===');
    // console.log('selectedAppointments:', selectedAppointments);
    // console.log('user:', user);
    
    if (selectedAppointments.length === 0 || !user) {
      // console.log('Erro: Nenhuma consulta selecionada ou usuário não encontrado');
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

      // console.log('=== DADOS DE PAGAMENTO ===');
      // console.log('selectedApps:', selectedApps);
      // console.log('psychologist:', psychologist);
      // console.log('totalGross:', totalGross);
      // console.log('totalNet:', totalNet);
      // console.log('user:', user);
      // console.log('paymentData:', paymentData);
      // console.log('Body JSON:', JSON.stringify(paymentData));
      // console.log('URL da API:', 'https://webhook.essenciasaudeintegrada.com.br/webhook/payments_created');

      // Enviar para a nova API

      
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/payments_created', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });
      


      // Tentar ler a resposta da API
      try {
        const responseText = await response.text();
        let responseData = null;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
        }
      } catch (readError) {
        console.error('Erro ao ler resposta da API:', readError);
      }

      if (response.ok) {
        // Limpar estados
        setSelectedAppointments([]);
        setSelectedPaymentPsychologist("");
        setShowPaymentAppointments(false);
        setPatientSearchTerm("");
        setPaymentDateRange(undefined);
        
        // Recarregar lotes de pagamento
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
    
    // console.log('=== FIM handleCreatePayment ===');
  };

  const handleMarkAsPaid = async (batchId: string) => {
    try {
      const response = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/payment-batches/${batchId}/mark-paid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        loadPaymentBatches();
        toast({
          title: "Pagamento processado",
          description: "O pagamento foi marcado como pago.",
        });
      } else {
        throw new Error('Erro ao marcar pagamento como pago');
      }
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
    // console.log('=== INICIALIZAÇÃO PSICÓLOGO ===');
    // console.log('isPsychologist:', isPsychologist);
    // console.log('user?.id:', user?.id);
    // console.log('user?.role:', user?.role);
    // console.log('selectedPsychologist atual:', selectedPsychologist);
    // console.log('effectivePsychologist:', effectivePsychologist);
    
    if (isPsychologist && user?.id) {
      // console.log('Definindo selectedPsychologist para:', user.id);
      setSelectedPsychologist(String(user.id));
    }
  }, [isPsychologist, user?.id, user?.role]);

  useEffect(() => {
    if (psychologists.length > 0) {
      fetchAppointments();
    }
  }, [effectivePsychologist, psychologists]);

  // Fechar seletor de mês e ano quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMonthSelector || showYearSelector) {
        const target = event.target as HTMLElement;
        if (showMonthSelector && !target.closest('.month-selector-container')) {
          setShowMonthSelector(false);
        }
        if (showYearSelector && !target.closest('.year-selector-container')) {
          setShowYearSelector(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMonthSelector, showYearSelector]);

  // Mostrar atendimentos automaticamente quando selecionar período
  useEffect(() => {
    if (selectedPaymentPsychologist && paymentDateRange?.from && paymentDateRange?.to) {
      setShowPaymentAppointments(true);
      setSelectedAppointments([]); // Limpar seleções anteriores
      setPatientSearchTerm(""); // Limpar busca de paciente
      setEditingPatientHeader(false); // Limpar edição do cabeçalho
    }
  }, [selectedPaymentPsychologist, paymentDateRange]);

  // Retorna o range de datas e aplica filtros base (data + psicólogo)
  const getBaseFilteredAppointmentsForReports = () => {
    // console.log("=== FILTRO RELATÓRIOS SIMPLIFICADO ===");
    // console.log("filterPeriod:", filterPeriod);
    // console.log("selectedPsychologist:", selectedPsychologist);
    // console.log("isPsychologist:", isPsychologist);
    // console.log("user?.id:", user?.id);
    
    // Para psicólogos, usar sempre o ID do usuário logado
    const effectivePsychologist = isPsychologist ? String(user?.id) : selectedPsychologist;
    // console.log("effectivePsychologist:", effectivePsychologist);
    
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
        const yearDate = new Date(selectedYear, 0, 1);
        startDate = startOfYear(yearDate);
        endDate = endOfYear(yearDate);
        break;
      default:
        startDate = subDays(today, 30);
        endDate = today;
    }

    // Filtro simplificado - mesma lógica que funciona para admin
    const filtered = transactions.filter((appointment) => {
      // Normalizar data do atendimento para evitar problemas de timezone
      let appointmentDate: Date;
      
      if (typeof appointment.date === 'string') {
        // Se a data vem como string "YYYY-MM-DD", criar Date sem timezone
        const appointmentDateStr = appointment.date;
        const appointmentDateParts = appointmentDateStr.split('-');
        
        if (appointmentDateParts.length === 3) {
          // Formato YYYY-MM-DD
          appointmentDate = new Date(
            parseInt(appointmentDateParts[0]), // ano
            parseInt(appointmentDateParts[1]) - 1, // mês (0-indexed)
            parseInt(appointmentDateParts[2]) // dia
          );
        } else {
          // Tentar parsear como Date normal
          appointmentDate = new Date(appointmentDateStr);
        }
      } else {
        // Se já é um Date object
        appointmentDate = new Date(appointment.date);
      }
      
      // Normalizar startDate e endDate para comparação (remover horas)
      const startDateNormalized = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDateNormalized = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const appointmentDateNormalized = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
      
      const matchesDate = appointmentDateNormalized >= startDateNormalized && appointmentDateNormalized <= endDateNormalized;
      const matchesPsychologist = effectivePsychologist === "all" || String(appointment.psychologist_id) === effectivePsychologist;

      return matchesDate && matchesPsychologist;
    });

    // console.log(`=== RESULTADO FILTRO ${filterPeriod.toUpperCase()} ===`);
    // console.log('startDate:', format(startDate, "dd/MM/yyyy"));
    // console.log('endDate:', format(endDate, "dd/MM/yyyy"));
    // console.log('totalTransactions:', transactions.length);
    // console.log('filteredCount:', filtered.length);
    // console.log('effectivePsychologist:', effectivePsychologist);

    return filtered;
  };

  // Listas filtradas por status para relatórios
  const baseFilteredAppointmentsForReports = getBaseFilteredAppointmentsForReports();
  const filteredAppointmentsCompletedForReports = baseFilteredAppointmentsForReports.filter(a => a.status === "completed");
  const filteredAppointmentsConfirmedForReports = baseFilteredAppointmentsForReports.filter(a => a.status === "confirmed");

  // Mantém compatibilidade: usar completed como default para gráficos/tabelas existentes
  const filteredAppointmentsForReports = filteredAppointmentsCompletedForReports;

  const calculateFinancialsFrom = (list: Appointment[]) => {
    // console.log('=== CÁLCULO DE RECEITAS ===');
    // console.log('filteredAppointmentsForReports:', filteredAppointmentsForReports);
    // console.log('Quantidade de appointments filtrados:', filteredAppointmentsForReports?.length || 0);
    
    let totalRevenue = 0;
    let psychologistCommission = 0;
    let clinicRevenue = 0;

    if (!list || list.length === 0) {
      // console.log('Nenhum appointment encontrado para cálculo');
      return { totalRevenue: 0, psychologistCommission: 0, clinicRevenue: 0 };
    }

    list.forEach((appointment, index) => {
      const value = Number(appointment.value) || 0;
      totalRevenue += value;

      const commissionPercentage = 50; // ou buscar do contexto do usuário
      const commission = (value * commissionPercentage) / 100;
      psychologistCommission += commission;
      clinicRevenue += value - commission;
      

    });

    const result = {
      totalRevenue: Number(totalRevenue) || 0,
      psychologistCommission: Number(psychologistCommission) || 0,
      clinicRevenue: Number(clinicRevenue) || 0,
    };
    
    // console.log('Resultado final do cálculo:', result);
    return result;
  };

  // OTIMIZAÇÃO: Memoizar cálculos financeiros para evitar recálculos desnecessários
  const financialTotalsCompleted = useMemo(() => {
    return calculateFinancialsFrom(filteredAppointmentsCompletedForReports);
  }, [filteredAppointmentsCompletedForReports]);

  const financialTotalsConfirmed = useMemo(() => {
    return calculateFinancialsFrom(filteredAppointmentsConfirmedForReports);
  }, [filteredAppointmentsConfirmedForReports]);

  const { totalRevenue: totalRevenueCompleted, psychologistCommission: psychologistCommissionCompleted, clinicRevenue: clinicRevenueCompleted } = financialTotalsCompleted;
  const { totalRevenue: totalRevenueConfirmed, psychologistCommission: psychologistCommissionConfirmed, clinicRevenue: clinicRevenueConfirmed } = financialTotalsConfirmed;




  // OTIMIZAÇÃO: Memoizar geração de dados do gráfico
  const chartData = useMemo(() => {
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
  }, [filteredAppointmentsForReports, effectivePsychologist, psychologists, filterPeriod]);

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

          // console.log('Enviando dados para API:', appointmentData);

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
    doc.text(`Status: ${lotDetails.status === 'payments_created' ? 'Pagamento Criado' : lotDetails.status === 'payments_finish' ? 'Pagamento Realizado' : lotDetails.status}`, 14, 37);
    doc.text(`Valor Total: R$ ${lotDetails.total_value.toFixed(2)}`, 14, 44);
    // Set text color to green for "Valor a Receber -6%"
    doc.setTextColor(0, 128, 0);
    doc.text(`Valor a Receber -6% (Imposto): R$ ${((lotDetails.total_value * 0.94) * 0.5).toFixed(2)}`, 14, 51);
    // Reset text color to black
    doc.setTextColor(0, 0, 0);
    doc.text(`Total de Consultas: ${lotDetails.appointments.length}`, 14, 58);
    doc.text(`Data de Criação: ${format(new Date(lotDetails.payment_created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 65);
    
    doc.text(
      `Data de Geração: ${format(new Date(), "dd/MM/yyyy HH:mm", {
        locale: ptBR,
      })}`,
      14,
      72
    );

    const tableData = lotDetails.appointments.map((appointment: any) => {
      return [
        appointment.patient_name,
        formatDate(appointment.date),
        appointment.insurance_type || 'Particular',
        appointment.appointment_type === 'online' ? 'Online' : 'Presencial',
        `R$ ${appointment.value.toFixed(2)}`,
        `R$ ${appointment.commission.toFixed(2)}`,
        `R$ ${(appointment.commission * 0.94).toFixed(2)}`,
      ];
    });

    (doc as any).autoTable({
      startY: 80,
      head: [["Paciente", "Data", "Plano", "Tipo", "Valor Bruto", "Comissão", "Valor a Receber -6%"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [0, 123, 255], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 30 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 30 },
      },
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
      // console.log('=== EXCLUINDO LOTE DE PAGAMENTO ===');
      // console.log('Lot completo:', lot);
      // console.log('Lot.payment_id:', lot.payment_id);
      // console.log('Lot.id:', lot.id);
      // console.log('Tipo do payment_id:', typeof lot.payment_id);
      // console.log('URL da API:', 'https://webhook.essenciasaudeintegrada.com.br/webhook/payments_delete');

      // Verificar se payment_id existe e não é undefined/null
      if (!lot.payment_id) {
        console.error('ERRO: payment_id não encontrado no objeto lot');
        console.error('Objeto lot recebido:', JSON.stringify(lot, null, 2));
        return;
      }

      const requestBody = {
        payment_id: lot.payment_id
      };

      // console.log('Body da requisição:', JSON.stringify(requestBody));

      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/payments_delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // console.log('Resposta da API:', response.status);
      // console.log('Resposta completa:', await response.text());
      
      if (response.ok) {
        // console.log('Lote de pagamento excluído com sucesso');
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

  const uploadComprovante = async () => {
    if (!selectedFile || !showUploadModal) {
      toast({
        title: "Arquivo não selecionado",
        description: "Por favor, selecione um arquivo para upload.",
        variant: "destructive",
      });
      return;
    }

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo JPG, PNG ou PDF.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('payment_id', showUploadModal.payment_id);
      formData.append('lot_id', showUploadModal.id || showUploadModal.payment_id); // ID do lote de pagamento
      formData.append('psychologist_name', showUploadModal.psychologist_name);
      formData.append('psychologist_id', showUploadModal.psychologist_id);

      console.log('Enviando comprovante com dados:', {
        payment_id: showUploadModal.payment_id,
        lot_id: showUploadModal.id,
        psychologist_id: showUploadModal.psychologist_id
      });

      const response = await fetch('https://n8n.essenciasaudeintegrada.com.br/webhook/comprovante', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Comprovante anexado",
          description: "Comprovante de pagamento anexado com sucesso!",
        });
        // Recarregar lotes
        loadPaymentBatches();
        // Fechar modal
        setShowUploadModal(null);
        setSelectedFile(null);
      } else {
        toast({
          title: "Erro ao anexar",
          description: "Não foi possível anexar o comprovante. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao enviar comprovante:', error);
      toast({
        title: "Erro ao anexar",
        description: "Ocorreu um erro ao processar o comprovante.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadComprovante = async (lot: any) => {
    if (!lot.comprovante) {
      toast({
        title: "Comprovante não disponível",
        description: "Este lote não possui comprovante disponível.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloadingComprovante(true);

    // Mostrar alerta de início do download
    toast({
      title: "Iniciando download",
      description: "Buscando comprovante...",
    });

    try {
      // Fazer POST para a API com o valor do comprovante
      const response = await fetch('https://n8n.essenciasaudeintegrada.com.br/webhook/get_comprovante', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comprovante: lot.comprovante
        }),
      });

      if (response.ok) {
        // Tentar baixar o arquivo
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `comprovante_${lot.payment_id}_${lot.psychologist_name}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Download concluído",
          description: "Comprovante baixado com sucesso!",
        });
      } else {
        toast({
          title: "Erro ao baixar",
          description: "Não foi possível baixar o comprovante. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao baixar comprovante:', error);
      toast({
        title: "Erro ao baixar",
        description: "Ocorreu um erro ao processar o download.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingComprovante(false);
    }
  };

  const approvePaymentLot = async (lot: any) => {
    try {
      // Validar se a chave PIX foi informada
      if (!pixKey || pixKey.trim() === "") {
        toast({
          title: "Chave PIX obrigatória",
          description: "Por favor, informe a chave PIX para receber o pagamento.",
          variant: "destructive",
        });
        return;
      }

      // Verificar se payment_id existe e não é undefined/null
      if (!lot.payment_id) {
        console.error('ERRO: payment_id não encontrado no objeto lot');
        console.error('Objeto lot recebido:', JSON.stringify(lot, null, 2));
        toast({
          title: "Erro ao aprovar",
          description: "Não foi possível encontrar o ID do pagamento.",
          variant: "destructive",
        });
        return;
      }

      const requestBody = {
        payment_id: lot.payment_id,
        pix_key: pixKey.trim()
      };

      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/payments_aprove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (response.ok) {
        toast({
          title: "Lote aprovado",
          description: "Pagamento aprovado com sucesso!",
        });
        // Recarregar a lista de lotes
        loadPaymentBatches();
        // Fechar modais e limpar PIX
        setSelectedLotDetails(null);
        setShowApproveConfirm(null);
        setPixKey("");
      } else {
        console.error('Erro ao aprovar lote de pagamento:', response.status);
        toast({
          title: "Erro ao aprovar",
          description: "Não foi possível aprovar o lote. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao aprovar lote de pagamento:', error);
      toast({
        title: "Erro ao aprovar",
        description: "Ocorreu um erro ao processar a aprovação.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-bold">Finanças</h1>
        {(loading || isLoading) && <Loader className="h-5 w-5 animate-spin" />}
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row gap-2 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === "charts" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("charts")}
          className="flex-1 text-xs sm:text-sm"
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
          className="flex-1 text-xs sm:text-sm"
        >
          <DollarSign className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">{isPsychologist ? "Meus Pagamentos" : "Pagamentos"}</span>
          <span className="sm:hidden">Pagamentos</span>
        </Button>
        {canManageFinance && (
          <Button
            variant={activeTab === "dashboard" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("dashboard")}
            className="flex-1 text-xs sm:text-sm"
          >
            Dashboard
          </Button>
        )}
      </div>

      {activeTab === "payments" && (
        <>
          {canManageFinance && (
            <div className="space-y-6">
              {/* Payment Management for Admin and Receptionist */}
              <Card>
                <CardHeader>
                  <CardTitle>Criar Novo Pagamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div>
                      <label className="text-xs md:text-sm font-medium">Psicólogo</label>
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
                      <label className="text-xs md:text-sm font-medium">Período</label>
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
                            numberOfMonths={isMobile ? 1 : 2}
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
                          // console.log('=== BOTÃO CLICADO ===');
                          // console.log('selectedAppointments.length:', selectedAppointments.length);
                          // console.log('totalNet:', totalNet);
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
                  {/* Desktop Table View */}
                  <div className="hidden md:block rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Psicólogo</TableHead>
                          <TableHead>Data Criação</TableHead>
                          <TableHead>Valor A receber (-6%)</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações/Comprovante</TableHead>
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
                              <TableCell>R$ {((lot.total_value * 0.94) * 0.5).toFixed(2)}</TableCell>
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
                                  {canManageFinance && !lot.comprovante && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowUploadModal(lot)}
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      title="Importar comprovante"
                                    >
                                      <Upload className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {lot.comprovante && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => downloadComprovante(lot)}
                                      disabled={isDownloadingComprovante}
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      title="Baixar comprovante"
                                    >
                                      {isDownloadingComprovante ? (
                                        <Loader className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Download className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
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

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {getGroupedPaymentLots().length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        Nenhum lote de pagamento encontrado
                      </div>
                    ) : (
                      getGroupedPaymentLots().map(lot => (
                        <div 
                          key={lot.id}
                          className={`border rounded-lg p-4 ${lot.status === 'payments_finish' ? 'bg-green-50' : ''}`}
                        >
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs text-gray-500">Psicólogo:</span>
                              <p className="font-medium">{lot.psychologist_name}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Data Criação:</span>
                              <p className="text-sm">{format(new Date(lot.payment_created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Valor A receber (-6%):</span>
                              <p className="font-medium text-green-600">R$ {((lot.total_value * 0.94) * 0.5).toFixed(2)}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Status:</span>
                              <div className="mt-1">
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
                              </div>
                            </div>
                            <div className="pt-2 border-t flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedLotDetails(lot)}
                                className="text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Ver
                              </Button>
                              {canManageFinance && !lot.comprovante && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowUploadModal(lot)}
                                  className="text-xs text-blue-600"
                                >
                                  <Upload className="h-3 w-3 mr-1" />
                                  Comprovante
                                </Button>
                              )}
                              {lot.comprovante && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadComprovante(lot)}
                                  disabled={isDownloadingComprovante}
                                  className="text-xs text-green-600"
                                >
                                  {isDownloadingComprovante ? (
                                    <Loader className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Download className="h-3 w-3 mr-1" />
                                  )}
                                  Baixar
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(lot)}
                                className="text-xs text-red-600"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Excluir
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
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
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden md:block rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data Criação</TableHead>
                              <TableHead>Valor Total</TableHead>
                              <TableHead>Valor A receber (-6%)</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Atendimentos</TableHead>
                              <TableHead>Ações/Comprovante</TableHead>
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
                                <TableCell>R$ {((lot.total_value * 0.94) * 0.5).toFixed(2)}</TableCell>
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
                                  {/* Botão Aprovar - apenas quando status é payments_created */}
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
                                  {/* Botão Baixar Comprovante - quando há comprovante */}
                                  {lot.comprovante && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => downloadComprovante(lot)}
                                      disabled={isDownloadingComprovante}
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      title="Baixar comprovante"
                                    >
                                      {isDownloadingComprovante ? (
                                        <Loader className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Download className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden space-y-3">
                        {getPsychologistPaymentLots(String(user?.id) || "").map(lot => (
                          <div 
                            key={lot.id}
                            className={`border rounded-lg p-4 ${lot.status === 'payments_finish' ? 'bg-green-50' : ''}`}
                          >
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs text-gray-500">Data Criação:</span>
                                <p className="text-sm">{format(new Date(lot.payment_created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500">Valor Total:</span>
                                <p className="font-medium">R$ {lot.total_value.toFixed(2)}</p>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500">Valor A receber (-6%):</span>
                                <p className="font-medium text-green-600">R$ {((lot.total_value * 0.94) * 0.5).toFixed(2)}</p>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500">Status:</span>
                                <div className="mt-1">
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
                                </div>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500">Atendimentos:</span>
                                <p className="text-sm">{lot.appointments.length} atendimento(s)</p>
                              </div>
                              <div className="pt-2 border-t flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedLotDetails(lot)}
                                  className="text-xs"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver
                                </Button>
                                {lot.status === 'payments_created' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowApproveConfirm(lot)}
                                    className="text-xs text-green-600"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Aprovar
                                  </Button>
                                )}
                                {lot.comprovante && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadComprovante(lot)}
                                    disabled={isDownloadingComprovante}
                                    className="text-xs text-green-600"
                                  >
                                    {isDownloadingComprovante ? (
                                      <Loader className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <Download className="h-3 w-3 mr-1" />
                                    )}
                                    Baixar
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                    )}
                  </CardContent>
                </Card>
            </div>
          )}
        </>
      )}

      {activeTab === "dashboard" && canManageFinance && (
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
            <div className="relative year-selector-container">
              <Button
                variant={filterPeriod === "year" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setFilterPeriod("year");
                  setShowYearSelector(!showYearSelector);
                }}
              >
                Ano
              </Button>
              {showYearSelector && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-10 p-2 min-w-[200px]">
                  <div className="text-sm font-medium mb-2">Selecionar Ano:</div>
                  <div className="grid grid-cols-3 gap-1 max-h-[200px] overflow-y-auto">
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - 5 + i;
                      const isSelected = selectedYear === year;
                      return (
                        <button
                          key={year}
                          className={`px-2 py-1 text-xs rounded ${
                            isSelected 
                              ? "bg-blue-500 text-white" 
                              : "bg-gray-100 hover:bg-gray-200"
                          }`}
                          onClick={() => {
                            setSelectedYear(year);
                            setSelectedMonth(new Date(year, selectedMonth.getMonth(), 1));
                            setShowYearSelector(false);
                          }}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {canManageFinance && (
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
                Receitas por Status ({getPeriodName()})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6 justify-between">
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Finalizados</p>
                  <div className="text-2xl font-bold">R$ {totalRevenueCompleted.toFixed(2)}</div>
                  <p className="text-xs text-gray-500">{filteredAppointmentsCompletedForReports.length} consultas</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Aguardando relatório</p>
                  <div className="text-2xl font-bold">R$ {totalRevenueConfirmed.toFixed(2)}</div>
                  <p className="text-xs text-gray-500">{filteredAppointmentsConfirmedForReports.length} consultas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {canManageFinance && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">
                    Receita da Clínica -6% (Imposto)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    R$ {(clinicRevenueCompleted * 0.94).toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">
                    Comissões dos Psicólogos -6% (Imposto)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    R$ {(psychologistCommissionCompleted * 0.94).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!canManageFinance && isPsychologist && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">
                  Minha Comissão -6% (Imposto)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  R$ {(psychologistCommissionCompleted * 0.94).toFixed(2)}
                </div>
                
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
                {canManageFinance && (
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
                    {canManageFinance && <TableHead className="text-right">Comissão</TableHead>}
                    {canManageFinance && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={canManageFinance ? 9 : 7} className="text-center py-4">
                        <Loader className="h-5 w-5 animate-spin mx-auto" />
                        <p className="mt-2 text-gray-500">Carregando dados iniciais...</p>
                      </TableCell>
                    </TableRow>
                  ) : loading ? (
                    <TableRow>
                      <TableCell colSpan={canManageFinance ? 9 : 7} className="text-center py-4">
                        <Loader className="h-5 w-5 animate-spin mx-auto" />
                        <p className="mt-2 text-gray-500">Carregando transações...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredAppointmentsForReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManageFinance ? 9 : 7} className="text-center py-4 text-gray-500">
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
                        // console.log(`Appointment ${appointment.id} tem control: ${appointment.control}`);
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
                          {canManageFinance && (
                            <TableCell className="text-right font-medium">
                              R$ {commission.toFixed(2)} ({commissionPercentage}%)
                            </TableCell>
                          )}
                          {canManageFinance && (
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

      {(canManageFinance && effectivePsychologist !== "all") || (isPsychologist && effectivePsychologist !== "all") && (
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
                      ? (totalRevenueCompleted / filteredAppointmentsForReports.length).toFixed(2)
                      : "0.00"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Percentual de Comissão:</p>
                  <p className="font-medium">50%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Receita Total:</p>
                  <p className="font-medium">R$ {totalRevenueCompleted.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Comissão Total -6%:</p>
                  <p className="font-medium">R$ {(psychologistCommissionCompleted * 0.94).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Receita da Clínica -6%:</p>
                  <p className="font-medium">R$ {(clinicRevenueCompleted * 0.94).toFixed(2)}</p>
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
                      {/* {batch.appointmentIds?.map((appointmentId, index) => (
                        <TableRow key={appointmentId}>
                          <TableCell>Consulta {index + 1}</TableCell>
                          <TableCell>ID: {appointmentId}</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                      ))} */}
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
                    {selectedLotDetails.status === 'payments_created' ? 'Pagamento Criado' : selectedLotDetails.status === 'payments_finish' ? 'Pagamento Realizado' : selectedLotDetails.status}
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
                <div>
                  <p className="text-sm text-gray-500">Valor a Receber -6% (Imposto)</p>
                  <p className="font-medium text-green-600">R$ {((selectedLotDetails.total_value * 0.94) * 0.5).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total de Consultas</p>
                  <p className="font-medium">{selectedLotDetails.appointments.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Chave PIX</p>
                  <p className="font-medium break-all">{selectedLotDetails.pix || "—"}</p>
                </div>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor Bruto</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>-6% (Imposto)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedLotDetails.appointments.map((appointment: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{appointment.patient_name}</TableCell>
                        <TableCell>{formatDate(appointment.date)}</TableCell>
                        <TableCell>{appointment.insurance_type}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={appointment.appointment_type === 'online' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                            {appointment.appointment_type === 'online' ? 'Online' : 'Presencial'}
                          </Badge>
                        </TableCell>
                        <TableCell>R$ {appointment.value.toFixed(2)}</TableCell>
                        <TableCell>R$ {appointment.commission.toFixed(2)}</TableCell>
                        <TableCell className="text-green-600 font-medium">R$ {(appointment.commission * 0.94).toFixed(2)}</TableCell>
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
      <Dialog open={!!showApproveConfirm} onOpenChange={() => {
        setShowApproveConfirm(null);
        setPixKey(""); // Limpar chave PIX ao fechar o modal
      }}>
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
                  <strong>Tem certeza que deseja aprovar o lote de pagamento?</strong>
                </p>
                
                
              </div>
            </div>

            {/* Campo de Chave PIX */}
            <div className="space-y-2 pt-2 border-t">
              <label htmlFor="pixKey" className="text-sm font-medium text-gray-700">
                Chave PIX para Recebimento <span className="text-red-500">*</span>
              </label>
              <Input
                id="pixKey"
                placeholder="Digite sua chave PIX (CPF, telefone, e-mail ou chave aleatória)"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                A chave PIX será utilizada para o processamento do pagamento.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowApproveConfirm(null);
              setPixKey("");
            }}>
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

      {/* Upload Comprovante Dialog */}
      <Dialog open={!!showUploadModal} onOpenChange={() => {
        setShowUploadModal(null);
        setSelectedFile(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Comprovante de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Selecione o arquivo do comprovante de pagamento para o lote de <strong>{showUploadModal?.psychologist_name}</strong>
              </p>
              <p className="text-xs text-gray-500">
                Formatos aceitos: JPG, PNG ou PDF
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="fileInput" className="text-sm font-medium text-gray-700">
                Arquivo do Comprovante <span className="text-red-500">*</span>
              </label>
              <Input
                id="fileInput"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                  }
                }}
              />
              {selectedFile && (
                <p className="text-xs text-green-600">
                  Arquivo selecionado: {selectedFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowUploadModal(null);
                setSelectedFile(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white" 
              onClick={uploadComprovante}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Comprovante
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceCharts;
