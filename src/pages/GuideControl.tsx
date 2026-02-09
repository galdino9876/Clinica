import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';

// Função para normalizar datas e evitar problemas de fuso horário
const normalizeDate = (dateStr: string): Date => {
  // Se a data já está no formato YYYY-MM-DD, usar diretamente
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T00:00:00');
  }
  
  // Para outros formatos, tentar parsear normalmente
  const date = new Date(dateStr);
  
  // Verificar se a data é válida
  if (isNaN(date.getTime())) {
    console.warn('Data inválida:', dateStr);
    return new Date();
  }
  
  return date;
};
import GuideModal from '@/components/GuideModal';
import EditPrestadorModal from '@/components/EditPrestadorModal';
import SolicitarGuiaModal from '@/components/SolicitarGuiaModal';
import { 
  User, 
  Calendar, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Plus,
  RefreshCw,
  Upload,
  DollarSign,
  Trash2,
  Edit,
  Search
} from "lucide-react";

interface PrestadorData {
  numero_prestador: number;
  datas: string[];
  existe_guia_autorizada: number;
  existe_guia_assinada: number;
  existe_guia_assinada_psicologo: number;
  date_faturado: string | null;
  faturado: number;
  data_vencimento: string | null;
  data_validade: string | null;
  status_guia?: string | null; // Status da guia: "Autorizada", "Negada", "EM ANALISE", etc.
}

interface GuideData {
  data: string;
  agendamento: string;
  guia: string;
  numero_prestador: number | string | null;
}

interface PatientData {
  patient_id: number;
  paciente_nome: string;
  appointment_id: number | null;
  status: "pending" | "confirmed" | "completed" | "cancelled" | null;
  payment_method: "private" | "insurance" | null;
  insurance_type: string | null;
  appointment_type: "presential" | "online" | null;
  existe_guia_autorizada: number | null;
  existe_guia_assinada: number | null;
  existe_guia_assinada_psicologo: number | null;
  date_faturado: string | null;
  faturado: number | null;
  mensagem?: string;
  date_apointments?: string; // String com datas separadas por vírgula
  prestadores: string; // JSON string que precisa ser parseado
  datas?: GuideData[]; // Array de datas com status de agendamento e guia
  active?: number; // Campo para indicar se o paciente está ativo (1) ou desativado (0)
}

const GuideControl: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientsData, setPatientsData] = useState<PatientData[]>([]);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [showSolicitarGuiaModal, setShowSolicitarGuiaModal] = useState(false);
  const [solicitarGuiaData, setSolicitarGuiaData] = useState<{
    patient: PatientData;
    datesToShow: string[];
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [prestadorToDelete, setPrestadorToDelete] = useState<number | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [downloadingEverything, setDownloadingEverything] = useState(false);
  const [downloadEverythingProgress, setDownloadEverythingProgress] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    remaining: 0,
    currentStep: '',
    currentGuide: ''
  });
  const [downloadingSignedGuides, setDownloadingSignedGuides] = useState(false);
  const [downloadSignedGuidesProgress, setDownloadSignedGuidesProgress] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    remaining: 0,
    currentStep: '',
    currentGuide: ''
  });
  const [showDownloadComplete, setShowDownloadComplete] = useState(false);
  const [downloadResult, setDownloadResult] = useState({
    completed: 0,
    failed: 0,
    message: ''
  });
  const [uploadingDocument, setUploadingDocument] = useState<{
    patientName: string;
    documentType: string;
  } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPrestador, setEditingPrestador] = useState<PrestadorData | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'no-guide' | 'no-appointment' | 'guias-nao-assinadas' | 'guias-assinadas' | 'faturado' | 'falta-importar-guia'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Inicializar com o mês atual no formato YYYY-MM
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Função para salvar posição de scroll
  const saveScrollPosition = () => {
    setScrollPosition(window.scrollY);
  };

  // Função para restaurar posição de scroll
  const restoreScrollPosition = () => {
    // Usar requestAnimationFrame para garantir que o DOM foi atualizado
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
        // Tentar novamente após um pequeno delay caso a primeira tentativa não funcione
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition);
        });
      }, 50);
    });
  };

  // Função para normalizar dados dos prestadores após o parse do JSON
  const normalizePrestadoresData = (parsed: any): PrestadorData[] => {
    if (!Array.isArray(parsed)) return [];
    
    return parsed.map((p: any) => ({
      numero_prestador: p.numero_prestador,
      datas: p.datas || [],
      existe_guia_autorizada: p.existe_guia_autorizada || 0,
      existe_guia_assinada: p.existe_guia_assinada || 0,
      existe_guia_assinada_psicologo: p.existe_guia_assinada_psicologo || 0,
      date_faturado: p.date_faturado || null,
      faturado: p.faturado || 0,
      data_vencimento: p.data_vencimento || p.date_vencimento || null,
      data_validade: p.data_validade || p.date_validade || null,
      status_guia: p.status_guia || null,
    }));
  };

  // Função para obter a cor do badge baseado no status da guia
  const getStatusGuiaColor = (status: string | null | undefined): string => {
    if (!status) return "bg-gray-100 text-gray-700";
    
    const statusLower = status.toLowerCase();
    if (statusLower === "autorizada") {
      return "bg-green-100 text-green-800";
    } else if (statusLower === "negada") {
      return "bg-red-100 text-red-800";
    } else if (statusLower.includes("analise") || statusLower.includes("análise")) {
      return "bg-yellow-100 text-yellow-800";
    }
    return "bg-gray-100 text-gray-700";
  };

  // Função para determinar a cor da data baseada nas regras de negócio
  const getDateColor = (data: GuideData, patient: PatientData, fieldType: 'agendamentos' | 'guias' = 'agendamentos') => {
    const hasAgendamento = data.agendamento === "ok";
    const hasGuia = data.guia === "ok";
    const hasPrestador = data.numero_prestador !== null && data.numero_prestador !== "null";
    
    if (fieldType === 'agendamentos') {
      // Para o campo Agendamentos
      if (hasAgendamento) {
        return 'bg-green-100 text-green-800 border border-green-200'; // Verde para agendamentos confirmados
      } else {
        // Mostrar em vermelho para indicar falta de agendamento
        return 'bg-red-100 text-red-800 border border-red-200';
      }
    } else {
      // Para o campo Guias
      if (hasGuia && hasPrestador) {
        return 'bg-green-100 text-green-800 border border-green-200'; // Verde para guias completas
      } else if (hasAgendamento && !hasPrestador) {
        return 'bg-red-100 text-red-800 border border-red-200'; // Vermelho para agendamentos sem guia
      } else if (!hasAgendamento && !hasPrestador) {
        // Mostrar em vermelho para indicar falta de guia
        return 'bg-red-100 text-red-800 border border-red-200';
      } else {
        return 'bg-gray-100 text-gray-800 border border-gray-200'; // Cinza para outros casos
      }
    }
  };

  // Função para converter data DD/MM/YYYY para formato Date
  const parseDate = (dateStr: string): Date => {
    // Se a data está no formato YYYY-MM-DD, usar diretamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr + 'T00:00:00');
    }
    // Se a data está no formato DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    // Tentar parsear normalmente
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Date();
    }
    return date;
  };

  // Função para verificar se uma data está no mês selecionado
  const isDateInSelectedMonth = (dateStr: string): boolean => {
    if (!dateStr || !selectedMonth) return false;
    const date = parseDate(dateStr);
    const [year, month] = selectedMonth.split('-');
    return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month) - 1;
  };

  // Função para filtrar prestadores com base no mês selecionado
  const filterPrestadoresByMonth = (prestadoresData: PrestadorData[], patient: PatientData): PrestadorData[] => {
    return prestadoresData.filter(prestador => {
      // Verificar se alguma data do prestador está no mês selecionado
      // IMPORTANTE: Só considera datas que têm o numero_prestador IGUAL ao prestador atual
      const hasDataInSelectedMonth = patient.datas?.some(data => {
        // Converter ambos para string para comparação consistente
        const prestadorStr = String(prestador.numero_prestador);
        const dataPrestadorStr = String(data.numero_prestador || '');
        
        // Verifica se o numero_prestador da data corresponde ao prestador atual
        const dataMatchesPrestador = dataPrestadorStr === prestadorStr && dataPrestadorStr !== '' && dataPrestadorStr !== 'null';
        return dataMatchesPrestador && isDateInSelectedMonth(data.data);
      });
      
      return hasDataInSelectedMonth;
    });
  };

  // Função para filtrar datas que pertencem a um prestador específico
  const filterDatasByPrestador = (prestadorNumero: number | string, datas: GuideData[]): GuideData[] => {
    return datas.filter(data => {
      // Converter ambos para string para comparação consistente
      const prestadorStr = String(prestadorNumero);
      const dataPrestadorStr = String(data.numero_prestador || '');
      
      // Comparar como strings para evitar problemas de tipo
      return dataPrestadorStr === prestadorStr && dataPrestadorStr !== '' && dataPrestadorStr !== 'null';
    });
  };

  // Função para obter todas as datas que devem ser exibidas para um prestador
  // Inclui as datas do prestador + datas do mês selecionado que estão sem prestador (como sugestões)
  const getAllDatasForPrestador = (prestadorNumero: number | string, datas: GuideData[]): GuideData[] => {
    // Primeiro pega as datas que pertencem ao prestador
    const prestadorDatas = filterDatasByPrestador(prestadorNumero, datas);
    
    // Depois pega as datas do mês selecionado que estão sem prestador (numero_prestador null ou "null")
    const datasSemPrestadorNoMes = datas.filter(data => {
      const prestadorStr = String(data.numero_prestador || '');
      const isNullPrestador = !prestadorStr || prestadorStr === 'null' || prestadorStr === '';
      const isInSelectedMonth = isDateInSelectedMonth(data.data);
      return isNullPrestador && isInSelectedMonth;
    });
    
    // Combina e remove duplicatas
    const allDatas = [...prestadorDatas, ...datasSemPrestadorNoMes];
    
    // Remove duplicatas baseado na data
    const uniqueDatas = allDatas.filter((data, index, self) => 
      index === self.findIndex(d => d.data === data.data)
    );
    
    return uniqueDatas;
  };

  // Funções para calcular estatísticas do dashboard
  const getDashboardStats = () => {
    // Filtrar pacientes ativos (active === 1) ou inativos com guia autorizada (existe_guia_autorizada === 1)
    // com planos de saúde (excluir "Particular")
    const patientsWithInsurance = patientsData.filter(patient => {
      if (patient.insurance_type === "Particular") return false;
      // Mostrar pacientes ativos normalmente
      if (patient.active === 1) return true;
      // Mostrar pacientes inativos apenas se tiverem guia autorizada
      if (patient.active !== 1 && hasGuiaAutorizada(patient)) return true;
      return false;
    });
    
    const totalPatients = patientsWithInsurance.length;
    let patientsWithoutGuide = 0;
    let patientsWithoutAppointment = 0;
    let totalGuiasSemAssinatura = 0;
    let totalGuiasAssinadasPsicologo = 0; // Prontas para faturar (assinadas mas não faturadas)
    let totalGuiasFaturadas = 0;
    let totalFaltaImportarGuia = 0;

    patientsWithInsurance.forEach(patient => {
      let hasGuide = false;
      let hasAppointment = false;

      // Verificar se tem prestadores com guia
      if (patient.prestadores) {
        try {
          const parsed = JSON.parse(patient.prestadores);
          const prestadoresData: PrestadorData[] = normalizePrestadoresData(parsed);
          hasGuide = prestadoresData.length > 0;
          
          // Filtrar prestadores pelo mês selecionado
          const prestadoresDoMes = filterPrestadoresByMonth(prestadoresData, patient);
          
          // Contar guias sem assinatura, prontas para faturar e faturadas apenas do mês selecionado
          prestadoresDoMes.forEach(prestador => {
            if (prestador.existe_guia_assinada_psicologo === 0) {
              totalGuiasSemAssinatura++; // Conta apenas as sem assinatura (=== 0)
            }
            if (prestador.existe_guia_assinada_psicologo === 1 && prestador.faturado === 0) {
              totalGuiasAssinadasPsicologo++; // Conta apenas as assinadas pelo psicólogo e não faturadas (prontas para faturar)
            }
            if (prestador.faturado === 1) {
              totalGuiasFaturadas++; // Conta as faturadas
            }
            // Contar guias que faltam importar (existe_guia_assinada === 0, não têm documento assinado pelo psicólogo, 
            // tem número de prestador e não está faturado)
            if (prestador.existe_guia_assinada === 0 && 
                prestador.existe_guia_assinada_psicologo === 0 &&
                prestador.numero_prestador && 
                prestador.faturado !== 1) {
              totalFaltaImportarGuia++;
            }
          });
        } catch (error) {
          console.error('Erro ao parsear prestadores:', error);
        }
      }

      // Verificar se tem agendamentos
      if (patient.datas && patient.datas.length > 0) {
        hasAppointment = patient.datas.some(data => data.agendamento === "ok");
      }

      if (!hasGuide) {
        patientsWithoutGuide++;
      }

      // Para "Sem Agendamento", contar apenas pacientes ativos (active === 1)
      // Excluir pacientes desativados (active === 0)
      if (!hasAppointment && patient.active !== 0) {
        patientsWithoutAppointment++;
      }
    });

    return {
      total: totalPatients,
      withoutGuide: patientsWithoutGuide,
      withoutAppointment: patientsWithoutAppointment,
      totalGuiasSemAssinatura: totalGuiasSemAssinatura,
      totalGuiasAssinadasPsicologo: totalGuiasAssinadasPsicologo, // Prontas para faturar
      totalGuiasFaturadas: totalGuiasFaturadas,
      totalFaltaImportarGuia: totalFaltaImportarGuia
    };
  };

  // Função auxiliar para verificar se o paciente tem prestadores com guia assinada no mês selecionado
  const hasPrestadoresWithSignedGuideInMonth = (patient: PatientData): boolean => {
    if (!patient.prestadores) return false;
    try {
      const parsed = JSON.parse(patient.prestadores);
      const prestadoresData: PrestadorData[] = normalizePrestadoresData(parsed);
      const prestadoresNoMes = filterPrestadoresByMonth(prestadoresData, patient);
      return prestadoresNoMes.some(prestador => prestador.existe_guia_assinada_psicologo === 1);
    } catch (error) {
      return false;
    }
  };

  // Função auxiliar para verificar se o paciente tem guia autorizada (no nível do paciente ou nos prestadores)
  const hasGuiaAutorizada = (patient: PatientData): boolean => {
    // Verificar no nível do paciente
    if (patient.existe_guia_autorizada === 1) {
      return true;
    }
    
    // Verificar nos prestadores
    if (patient.prestadores) {
      try {
        const parsed = JSON.parse(patient.prestadores);
        const prestadoresData: PrestadorData[] = normalizePrestadoresData(parsed);
        return prestadoresData.some(prestador => prestador.existe_guia_autorizada === 1);
      } catch (error) {
        return false;
      }
    }
    
    return false;
  };

  // Função para filtrar pacientes baseado no tipo selecionado
  const getFilteredPatients = () => {
    // Primeiro filtrar pacientes ativos (active === 1) ou inativos com guia autorizada (existe_guia_autorizada === 1)
    // com planos de saúde (excluir "Particular")
    let patientsWithInsurance = patientsData.filter(patient => {
      if (patient.insurance_type === "Particular") return false;
      // Mostrar pacientes ativos normalmente
      if (patient.active === 1) return true;
      // Mostrar pacientes inativos apenas se tiverem guia autorizada
      if (patient.active !== 1 && hasGuiaAutorizada(patient)) return true;
      return false;
    });

    // Filtrar por termo de busca (nome)
    if (searchTerm.trim()) {
      patientsWithInsurance = patientsWithInsurance.filter(patient =>
        patient.paciente_nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType === 'all') {
      return patientsWithInsurance;
    }

    return patientsWithInsurance.filter(patient => {
      if (filterType === 'no-guide') {
        // Pacientes sem número de guia (sem prestadores)
        if (!patient.prestadores) return true;
        try {
          const parsed = JSON.parse(patient.prestadores);
          const prestadoresData: PrestadorData[] = normalizePrestadoresData(parsed);
          return prestadoresData.length === 0;
        } catch (error) {
          return true;
        }
      }

      if (filterType === 'no-appointment') {
        // Pacientes sem agendamento e que estão ativos (active === 1)
        // Excluir pacientes desativados (active === 0)
        if (patient.active === 0) return false;
        if (!patient.datas || patient.datas.length === 0) return true;
        return !patient.datas.some(data => data.agendamento === "ok");
      }

      if (filterType === 'guias-nao-assinadas') {
        // Pacientes com TODAS as guias sem assinatura pelo psicólogo (nenhuma com existe_guia_assinada_psicologo === 1)
        if (!patient.prestadores) return false;
        try {
          const parsed = JSON.parse(patient.prestadores);
          const prestadoresData: PrestadorData[] = normalizePrestadoresData(parsed);
          // Retorna true apenas se TODAS as guias têm existe_guia_assinada_psicologo === 0
          return prestadoresData.length > 0 && prestadoresData.every(prestador => prestador.existe_guia_assinada_psicologo === 0);
        } catch (error) {
          return false;
        }
      }

      if (filterType === 'guias-assinadas') {
        // Pacientes com guias assinadas pelo psicólogo e prontas para faturar (não faturadas) no mês selecionado
        if (!patient.prestadores) return false;
        try {
          const parsed = JSON.parse(patient.prestadores);
          const prestadoresData: PrestadorData[] = normalizePrestadoresData(parsed);
          const prestadoresNoMes = filterPrestadoresByMonth(prestadoresData, patient);
          return prestadoresNoMes.some(prestador => prestador.existe_guia_assinada_psicologo === 1 && prestador.faturado === 0);
        } catch (error) {
          return false;
        }
      }

      if (filterType === 'faturado') {
        // Pacientes com guias faturadas no mês selecionado
        if (!patient.prestadores) return false;
        try {
          const parsed = JSON.parse(patient.prestadores);
          const prestadoresData: PrestadorData[] = normalizePrestadoresData(parsed);
          const prestadoresNoMes = filterPrestadoresByMonth(prestadoresData, patient);
          return prestadoresNoMes.some(prestador => prestador.faturado === 1);
        } catch (error) {
          return false;
        }
      }

      if (filterType === 'falta-importar-guia') {
        // Pacientes com prestadores que têm existe_guia_assinada === 0, número de prestador, não estão faturados,
        // não têm documento assinado pelo psicólogo e não têm documento assinado pelo paciente
        if (!patient.prestadores) return false;
        try {
          const parsed = JSON.parse(patient.prestadores);
          const prestadoresData: PrestadorData[] = normalizePrestadoresData(parsed);
          const prestadoresNoMes = filterPrestadoresByMonth(prestadoresData, patient);
          return prestadoresNoMes.some(prestador => 
            prestador.existe_guia_assinada === 0 && 
            prestador.existe_guia_assinada_psicologo === 0 &&
            prestador.numero_prestador && 
            prestador.faturado !== 1
          );
        } catch (error) {
          return false;
        }
      }

      return true;
    });
  };

  // Ref para controlar se é o primeiro carregamento
  const isInitialMount = useRef(true);

  // Função para buscar dados da API
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Extrair o mês e ano do selectedMonth (formato YYYY-MM)
      const [year, monthStr] = selectedMonth.split('-');
      const month = parseInt(monthStr, 10); // Converte para número (1-12)
      const yearNum = parseInt(year, 10); // Converte o ano para número
      
      const response = await fetch(
        "https://webhook.essenciasaudeintegrada.com.br/webhook/return_date_guias",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mes: month,
            ano: yearNum
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados: ${response.status}`);
      }
      
      const data: PatientData[] = await response.json();
      
      setPatientsData(data);
      
      // Restaurar posição de scroll após carregar dados (apenas após o primeiro carregamento)
      if (!isInitialMount.current) {
        // Usar requestAnimationFrame para garantir que o DOM foi atualizado antes de restaurar scroll
        requestAnimationFrame(() => {
          restoreScrollPosition();
        });
      } else {
        isInitialMount.current = false;
      }
      
    } catch (e: any) {
      setError(e?.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados inicialmente e quando o mês selecionado mudar
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  // Função para importar PDF de guia
  const handleImportGuia = async (
    patientName: string, 
    numeroPrestador: number, 
    command: "Guia-autorizada" | "Guia-assinada" | "Guia-assinada-psicologo",
    file: File
  ) => {
    // Salvar posição de scroll antes do upload
    saveScrollPosition();
    
    // Mapear o comando para um nome amigável
    const documentTypeMap: Record<string, string> = {
      "Guia-autorizada": "Guia Autorizada",
      "Guia-assinada": "Guia Assinada Paciente",
      "Guia-assinada-psicologo": "Guia Assinada Psicólogo"
    };
    
    const documentType = documentTypeMap[command] || command;
    
    // Mostrar alerta de carregamento
    setUploadingDocument({
      patientName: patientName,
      documentType: documentType
    });
    
    try {
      const formData = new FormData();
      formData.append('command', command);
      formData.append('nome_patient', patientName);
      formData.append('numero_prestador', numeroPrestador.toString());
      formData.append('file', file);

      const response = await fetch(
        "https://webhook.essenciasaudeintegrada.com.br/webhook/insert_guia_completed",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao importar guia: ${response.status}`);
      }

      const result = await response.json();
      
      // Esconder alerta de carregamento
      setUploadingDocument(null);
      
      // Garantir que não é o primeiro carregamento para restaurar scroll
      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
      
      // Recarregar dados após importação (vai restaurar scroll automaticamente)
      await fetchData();
      
    } catch (error) {
      console.error('Erro ao importar guia:', error);
      
      // Esconder alerta de carregamento mesmo em caso de erro
      setUploadingDocument(null);
      
      alert('Erro ao importar guia. Tente novamente.');
    }
  };

  // Função para fazer download do arquivo
  const handleDownloadGuia = async (numeroPrestador: number, command: string) => {
    try {
      setDownloadingFile(`${command}_${numeroPrestador}`);
      
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/get_guia_completed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numero_prestador: numeroPrestador,
          command: command
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao baixar arquivo: ${response.status}`);
      }

      // Criar blob e fazer download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${command}_${numeroPrestador}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Esconder indicador após download iniciar
      setTimeout(() => {
        setDownloadingFile(null);
      }, 1000); // 1 segundo de delay para mostrar que o download foi iniciado
      
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      alert('Erro ao baixar arquivo. Tente novamente.');
      setDownloadingFile(null);
    }
  };

  // Função para faturar
  const handleFaturar = async (numeroPrestador: number) => {
    try {
      const response = await fetch(
        "https://webhook.essenciasaudeintegrada.com.br/webhook/insert_state_faturament",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            numero_prestador: numeroPrestador
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao faturar: ${response.status}`);
      }

      const result = await response.json();
      
      // Recarregar dados após faturamento
      fetchData();
      
    } catch (error) {
      console.error('Erro ao faturar:', error);
      alert('Erro ao faturar. Tente novamente.');
    }
  };

  // Função para lidar com upload de arquivo
  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    patientName: string,
    numeroPrestador: number,
    command: "Guia-autorizada" | "Guia-assinada" | "Guia-assinada-psicologo"
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImportGuia(patientName, numeroPrestador, command, file);
    }
  };

  // Função para abrir modal de guias
  const handleOpenGuideModal = (patient: PatientData) => {
    setSelectedPatient(patient);
    setIsGuideModalOpen(true);
  };

  // Função para fechar modal de guias
  const handleCloseGuideModal = () => {
    setIsGuideModalOpen(false);
    setSelectedPatient(null);
  };

  // Função para recarregar dados após sucesso
  const handleModalSuccess = () => {
    fetchData();
  };

  // Função para verificar se há agendamentos sem guia no mês selecionado
  const hasAppointmentsWithoutGuideInMonth = (patient: PatientData): boolean => {
    if (!patient.datas || patient.datas.length === 0) return false;
    
    return patient.datas.some(data => {
      const hasAgendamento = data.agendamento === "ok";
      const hasPrestador = data.numero_prestador !== null && data.numero_prestador !== "null";
      const isInSelectedMonth = isDateInSelectedMonth(data.data);
      
      return hasAgendamento && !hasPrestador && isInSelectedMonth;
    });
  };

  // Função para obter datas sem prestador no mês selecionado
  const getDatesWithoutPrestadorInMonth = (patient: PatientData): string[] => {
    if (!patient.datas || patient.datas.length === 0) return [];
    
    return patient.datas
      .filter(data => {
        const hasAgendamento = data.agendamento === "ok";
        const hasPrestador = data.numero_prestador !== null && data.numero_prestador !== "null";
        const isInSelectedMonth = isDateInSelectedMonth(data.data);
        
        return hasAgendamento && !hasPrestador && isInSelectedMonth;
      })
      .map(data => data.data); // Retorna no formato DD/MM/YYYY
  };

  // Função para abrir modal de solicitar guia
  const handleOpenSolicitarGuiaModal = (patient: PatientData) => {
    const datesToShow = getDatesWithoutPrestadorInMonth(patient);
    
    if (datesToShow.length === 0) {
      return; // Não deveria acontecer, mas por segurança
    }
    
    setSolicitarGuiaData({
      patient,
      datesToShow
    });
    setShowSolicitarGuiaModal(true);
  };

  // Função para fechar modal de solicitar guia
  const handleCloseSolicitarGuiaModal = () => {
    setShowSolicitarGuiaModal(false);
    setSolicitarGuiaData(null);
  };

  // Função para mostrar confirmação de exclusão
  const handleDeleteClick = (numeroPrestador: number) => {
    setPrestadorToDelete(numeroPrestador);
    setShowDeleteConfirm(true);
  };

  // Função para confirmar exclusão
  const handleConfirmDelete = async () => {
    if (!prestadorToDelete) return;

    try {
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/delete_prestador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero_prestador: prestadorToDelete
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao excluir prestador: ${response.status}`);
      }

      const result = await response.json();
      
      // Recarregar dados após exclusão
      fetchData();
      
    } catch (error) {
      console.error('Erro ao excluir prestador:', error);
      alert('Erro ao excluir prestador. Tente novamente.');
    } finally {
      setShowDeleteConfirm(false);
      setPrestadorToDelete(null);
    }
  };

  // Função para cancelar exclusão
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setPrestadorToDelete(null);
  };

  // Função para baixar tudo (3 requests por numero_prestador único)
  const handleDownloadEverything = async () => {
    // Filtrar prestadores com guia assinada pelo psicólogo E que não estão faturados
    const guidesToDownload: Array<{numero_prestador: number, paciente_nome: string}> = [];
    
    // Filtrar apenas pacientes com planos de saúde (excluir "Particular")
    const patientsWithInsurance = patientsData.filter(patient => 
      patient.insurance_type !== "Particular"
    );
    
    patientsWithInsurance.forEach(patient => {
      if (patient.prestadores) {
        try {
          const parsed = JSON.parse(patient.prestadores);
          const prestadoresData: PrestadorData[] = normalizePrestadoresData(parsed);
          // Filtrar prestadores pelo mês selecionado (mesma lógica do dashboard)
          const prestadoresDoMes = filterPrestadoresByMonth(prestadoresData, patient);
          prestadoresDoMes.forEach(prestador => {
            if (prestador.existe_guia_assinada_psicologo === 1 && prestador.faturado === 0) {
              guidesToDownload.push({
                numero_prestador: prestador.numero_prestador,
                paciente_nome: patient.paciente_nome
              });
            }
          });
        } catch (error) {
          console.error('Erro ao parsear prestadores:', error);
        }
      }
    });

    if (guidesToDownload.length === 0) {
      alert('Nenhuma guia assinada pelo psicólogo não faturada encontrada para download');
      return;
    }

    // Calcular total de requests (1 por numero_prestador único)
    const totalRequests = guidesToDownload.length;

    setDownloadingEverything(true);
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
          currentGuide: guide.paciente_nome,
          currentStep: `Processando prestador ${i + 1} de ${guidesToDownload.length}`
        }));

        // Request única: merge_guias
        try {
          setDownloadEverythingProgress(prev => ({
            ...prev,
            currentStep: `Baixando faturar+documentos - ${guide.paciente_nome}`
          }));

          const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/merge_guias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              numero_prestador: guide.numero_prestador
            })
          });

          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const contentDisposition = response.headers.get('Content-Disposition');
            const filename = contentDisposition 
              ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
              : `Faturar-Documentos-${guide.paciente_nome}-${guide.numero_prestador}.pdf`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            completed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error('Erro ao baixar faturar+documentos:', error);
          failed++;
        }

        setDownloadEverythingProgress(prev => ({
          ...prev,
          completed: completed,
          failed: failed,
          remaining: totalRequests - completed - failed
        }));

        // Pequeno delay entre prestadores para não sobrecarregar
        if (i < guidesToDownload.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setDownloadingEverything(false);

      // Mostrar resultado final com toast
      let message = '';
      if (failed === 0) {
        message = `Download concluído! ${completed} arquivos baixados com sucesso.`;
      } else if (completed === 0) {
        message = `Falha no download! ${failed} arquivos falharam.`;
      } else {
        message = `Download parcial! ${completed} arquivos baixados, ${failed} falharam.`;
      }
      
      setDownloadResult({
        completed,
        failed,
        message
      });
      setShowDownloadComplete(true);
      
      // Esconder toast após 5 segundos
      setTimeout(() => {
        setShowDownloadComplete(false);
      }, 5000);
      
    } catch (error) {
      console.error('Erro geral no download:', error);
      setDownloadResult({
        completed: 0,
        failed: 0,
        message: 'Erro durante o download. Tente novamente.'
      });
      setShowDownloadComplete(true);
      setDownloadingEverything(false);
      
      // Esconder toast após 5 segundos
      setTimeout(() => {
        setShowDownloadComplete(false);
      }, 5000);
    }
  };

  // Função para baixar guias assinadas (existe_guia_assinada === 1, existe_guia_assinada_psicologo === 0, faturado === 0)
  const handleDownloadSignedGuides = async () => {
    // Filtrar prestadores com guia assinada mas não assinada pelo psicólogo e não faturados
    const guidesToDownload: Array<{numero_prestador: number, paciente_nome: string}> = [];
    
    // Filtrar apenas pacientes com planos de saúde (excluir "Particular")
    const patientsWithInsurance = patientsData.filter(patient => 
      patient.insurance_type !== "Particular"
    );
    
    patientsWithInsurance.forEach(patient => {
      if (patient.prestadores) {
        try {
          const parsed = JSON.parse(patient.prestadores);
          const prestadoresData: PrestadorData[] = normalizePrestadoresData(parsed);
          // Filtrar prestadores pelo mês selecionado (mesma lógica do dashboard)
          const prestadoresDoMes = filterPrestadoresByMonth(prestadoresData, patient);
          prestadoresDoMes.forEach(prestador => {
            if (prestador.existe_guia_assinada === 1 && 
                prestador.existe_guia_assinada_psicologo === 0 && 
                prestador.faturado === 0) {
              guidesToDownload.push({
                numero_prestador: prestador.numero_prestador,
                paciente_nome: patient.paciente_nome
              });
            }
          });
        } catch (error) {
          console.error('Erro ao parsear prestadores:', error);
        }
      }
    });

    if (guidesToDownload.length === 0) {
      alert('Nenhuma guia assinada (não assinada pelo psicólogo) não faturada encontrada para download');
      return;
    }

    // Total de requests (1 por numero_prestador)
    const totalRequests = guidesToDownload.length;

    setDownloadingSignedGuides(true);
    setDownloadSignedGuidesProgress({
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

        setDownloadSignedGuidesProgress(prev => ({
          ...prev,
          currentGuide: guide.paciente_nome,
          currentStep: `Processando prestador ${i + 1} de ${guidesToDownload.length}`
        }));

        // Request: Guia assinada
        try {
          setDownloadSignedGuidesProgress(prev => ({
            ...prev,
            currentStep: `Baixando guia assinada - ${guide.paciente_nome}`
          }));

          const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/get_guia_completed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              numero_prestador: guide.numero_prestador,
              command: 'Guia-assinada'
            })
          });

          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const contentDisposition = response.headers.get('Content-Disposition');
            const filename = contentDisposition 
              ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
              : `Guia-Assinada-${guide.paciente_nome}-${guide.numero_prestador}.pdf`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            completed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error('Erro ao baixar guia assinada:', error);
          failed++;
        }

        setDownloadSignedGuidesProgress(prev => ({
          ...prev,
          completed: completed,
          failed: failed,
          remaining: totalRequests - completed - failed
        }));

        // Pequeno delay entre prestadores para não sobrecarregar
        if (i < guidesToDownload.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setDownloadingSignedGuides(false);

      // Mostrar resultado final com toast
      let message = '';
      if (failed === 0) {
        message = `Download concluído! ${completed} arquivos baixados com sucesso.`;
      } else if (completed === 0) {
        message = `Falha no download! ${failed} arquivos falharam.`;
      } else {
        message = `Download parcial! ${completed} arquivos baixados, ${failed} falharam.`;
      }
      
      setDownloadResult({
        completed,
        failed,
        message
      });
      setShowDownloadComplete(true);
      
      // Esconder toast após 5 segundos
      setTimeout(() => {
        setShowDownloadComplete(false);
      }, 5000);
      
    } catch (error) {
      console.error('Erro geral no download:', error);
      setDownloadResult({
        completed: 0,
        failed: 0,
        message: 'Erro durante o download. Tente novamente.'
      });
      setShowDownloadComplete(true);
      setDownloadingSignedGuides(false);
      
      // Esconder toast após 5 segundos
      setTimeout(() => {
        setShowDownloadComplete(false);
      }, 5000);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Guias Concluídas</h1>
            <p className="text-gray-600 mt-1">Gestão de guias médicas finalizadas</p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button 
              onClick={handleDownloadEverything} 
              disabled={loading || downloadingEverything || downloadingSignedGuides}
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 cursor-pointer [&>*]:cursor-pointer"
            >
              <Upload className="h-4 w-4 mr-2" />
              {downloadingEverything ? 'Baixando...' : 'Todas faturar+documentos'}
            </Button>
            <Button 
              onClick={handleDownloadSignedGuides} 
              disabled={loading || downloadingSignedGuides || downloadingEverything}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 cursor-pointer [&>*]:cursor-pointer"
            >
              <Upload className="h-4 w-4 mr-2" />
              {downloadingSignedGuides ? 'Baixando...' : 'Todas Guias para PSI assinar'}
            </Button>
            <Button onClick={fetchData} variant="outline" disabled={loading} className="cursor-pointer [&>*]:cursor-pointer">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filtro por Mês */}
        {!loading && !error && patientsData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                <span className="font-semibold text-gray-700">Filtrar por Mês:</span>
              </div>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-48"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                }}
                className="cursor-pointer [&>*]:cursor-pointer"
              >
                Mês Atual
              </Button>
            </div>
          </div>
        )}

        {/* Dashboard de Estatísticas */}
        {!loading && !error && patientsData.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-6">
            {/* Card Total de Pacientes */}
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                filterType === 'all' 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setFilterType('all')}
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center justify-center text-center gap-1">
                  <div className="p-2 bg-blue-100 rounded-full mb-1">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-600 leading-tight">Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{getDashboardStats().total}</p>
                </div>
              </CardContent>
            </Card>

            {/* Card Pacientes sem Guia */}
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                filterType === 'no-guide' 
                  ? 'ring-2 ring-red-500 bg-red-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setFilterType('no-guide')}
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center justify-center text-center gap-1">
                  <div className="p-2 bg-red-100 rounded-full mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    
                  </div>
                  <p className="text-xs font-medium text-gray-600 leading-tight">Pac. sem Guia</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-600">{getDashboardStats().withoutGuide}</p>
                </div>
              </CardContent>
            </Card>

            {/* Card Pacientes sem Agendamento */}
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                filterType === 'no-appointment' 
                  ? 'ring-2 ring-orange-500 bg-orange-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setFilterType('no-appointment')}
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center justify-center text-center gap-1">
                  <div className="p-2 bg-orange-100 rounded-full mb-1">
                    <Calendar className="h-4 w-4 text-orange-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-600 leading-tight">Pac. sem Agend.</p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-600">{getDashboardStats().withoutAppointment}</p>
                </div>
              </CardContent>
            </Card>

            {/* Card Falta Importar Guia */}
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:bg-gray-50 ${
                filterType === 'falta-importar-guia' 
                  ? 'ring-2 ring-amber-500 bg-amber-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setFilterType('falta-importar-guia')}
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center justify-center text-center gap-1">
                  <div 
                    className={`p-2 rounded-full transition-all duration-200 mb-1 ${
                      filterType === 'falta-importar-guia' 
                        ? 'bg-amber-200 ring-2 ring-amber-500' 
                        : 'bg-amber-100'
                    }`}
                    title="Clique para filtrar guias que faltam importar"
                  >
                    <Upload className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-600 leading-tight">Falta Importar guia assinada do paciente</p>
                  <p className="text-xl sm:text-2xl font-bold text-amber-600">{getDashboardStats().totalFaltaImportarGuia}</p>
                </div>
              </CardContent>
            </Card>

            {/* Card Total de Guias sem Assinatura */}
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:bg-gray-50 ${
                filterType === 'guias-nao-assinadas' 
                  ? 'ring-2 ring-green-500 bg-green-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setFilterType('guias-nao-assinadas')}
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center justify-center text-center gap-1">
                  <div 
                    className={`p-2 rounded-full transition-all duration-200 mb-1 ${
                      filterType === 'guias-nao-assinadas' 
                        ? 'bg-green-200 ring-2 ring-purple-500' 
                        : 'bg-green-100'
                    }`}
                    title="Clique para filtrar guias sem assinatura"
                  >
                    <FileText className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-600 leading-tight">Falta guia Ass. do Psic.</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">{getDashboardStats().totalGuiasSemAssinatura}</p>
                </div>
              </CardContent>
            </Card>

            {/* Card Guias Assinadas pelo Psicólogo (Prontas para Faturar) */}
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:bg-gray-50 ${
                filterType === 'guias-assinadas' 
                  ? 'ring-2 ring-purple-500 bg-purple-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setFilterType('guias-assinadas')}
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center justify-center text-center gap-1">
                  <div 
                    className={`p-2 rounded-full transition-all duration-200 mb-1 ${
                      filterType === 'guias-assinadas' 
                        ? 'bg-purple-200 ring-2 ring-purple-500' 
                        : 'bg-purple-100'
                    }`}
                    title="Clique para filtrar guias prontas para faturar"
                  >
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-600 leading-tight">Pronto Faturar</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">{getDashboardStats().totalGuiasAssinadasPsicologo}</p>
                </div>
              </CardContent>
            </Card>

            {/* Card FATURADO */}
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:bg-gray-50 ${
                filterType === 'faturado' 
                  ? 'ring-2 ring-emerald-500 bg-emerald-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setFilterType('faturado')}
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center justify-center text-center gap-1">
                  <div 
                    className={`p-2 rounded-full transition-all duration-200 mb-1 ${
                      filterType === 'faturado' 
                        ? 'bg-emerald-200 ring-2 ring-emerald-500' 
                        : 'bg-emerald-100'
                    }`}
                    title="Clique para filtrar guias faturadas"
                  >
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-600 leading-tight">FATURADO</p>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600">{getDashboardStats().totalGuiasFaturadas}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lista de Pacientes */}

        {/* Conteúdo Principal */}
        <div className="space-y-4">
          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-gray-600">Carregando dados...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Erro ao carregar dados:</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {!loading && !error && patientsData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum paciente encontrado</p>
            </div>
          )}

          {!loading && !error && patientsData.length > 0 && (
            <div className="space-y-6">
              {getFilteredPatients().length === 0 ? (
                <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="p-3 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    {filterType === 'no-guide' && <AlertTriangle className="h-8 w-8 text-gray-400" />}
                    {filterType === 'no-appointment' && <Calendar className="h-8 w-8 text-gray-400" />}
                    {filterType === 'guias-nao-assinadas' && <FileText className="h-8 w-8 text-gray-400" />}
                    {filterType === 'guias-assinadas' && <CheckCircle className="h-8 w-8 text-gray-400" />}
                    {filterType === 'faturado' && <DollarSign className="h-8 w-8 text-gray-400" />}
                    {filterType === 'falta-importar-guia' && <Upload className="h-8 w-8 text-gray-400" />}
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    {filterType === 'no-guide' && 'Nenhum paciente sem guia encontrado'}
                    {filterType === 'no-appointment' && 'Nenhum paciente sem agendamento encontrado'}
                    {filterType === 'guias-nao-assinadas' && 'Nenhuma guia sem assinatura encontrada'}
                    {filterType === 'guias-assinadas' && 'Nenhuma guia pronta para faturar encontrada'}
                    {filterType === 'faturado' && 'Nenhuma guia faturada encontrada'}
                    {filterType === 'falta-importar-guia' && 'Nenhuma guia para importar encontrada'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {filterType === 'no-guide' && 'Todos os pacientes possuem número de guia.'}
                    {filterType === 'no-appointment' && 'Todos os pacientes possuem agendamentos.'}
                    {filterType === 'guias-nao-assinadas' && 'Todas as guias foram assinadas pelo psicólogo.'}
                    {filterType === 'guias-assinadas' && 'Não há guias prontas para faturar no momento.'}
                    {filterType === 'faturado' && 'Não há guias faturadas no período selecionado.'}
                    {filterType === 'falta-importar-guia' && 'Todas as guias assinadas já foram importadas.'}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setFilterType('all')}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100 cursor-pointer [&>*]:cursor-pointer"
                  >
                    Ver Todos os Pacientes
                  </Button>
                </div>
              ) : (
                getFilteredPatients().map((patient) => {
                // Parse dos prestadores do JSON string
                let prestadoresData: PrestadorData[] = [];
                try {
                  const parsed = patient.prestadores ? JSON.parse(patient.prestadores) : [];
                  prestadoresData = normalizePrestadoresData(parsed);
                  
                } catch (error) {
                  console.error('Erro ao fazer parse dos prestadores:', error);
                  prestadoresData = [];
                }
                
                return (
                  <Card key={patient.patient_id} className="shadow-md hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xl text-gray-800">{patient.paciente_nome}</span>
                              {patient.appointment_type && (
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${
                                    patient.appointment_type === "online" 
                                      ? "bg-green-100 text-green-800 hover:bg-green-200" 
                                      : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                  }`}
                                >
                                  {patient.appointment_type === "online" ? "Online" : "Presencial"}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200">
                                ID: {patient.patient_id}
                              </Badge>
                              {patient.insurance_type && (
                                <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
                                  {patient.insurance_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer [&>*]:cursor-pointer"
                          onClick={() => {
                            saveScrollPosition();
                            handleOpenGuideModal(patient);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Inserir Guia
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent>
                      {patient.mensagem ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-center gap-3 text-red-800">
                            <div className="p-2 bg-red-100 rounded-full">
                              <AlertTriangle className="h-5 w-5" />
                            </div>
                            <span className="font-medium text-red-900">{patient.mensagem}</span>
                          </div>
                        </div>
                      ) : (() => {
                        // Verificar se há prestadores no mês selecionado
                        let prestadoresNoMes = filterPrestadoresByMonth(prestadoresData, patient);
                        
                        // Se não encontrou prestadores, verificar se há datas com prestador no mês selecionado
                        // e incluir esses prestadores mesmo que não tenham sido encontrados inicialmente
                        if (prestadoresNoMes.length === 0 && patient.datas && patient.datas.length > 0) {
                          // Encontrar todos os numero_prestador únicos que têm datas no mês selecionado
                          const prestadoresComDatasNoMes = new Set<string>();
                          patient.datas.forEach(data => {
                            const prestadorStr = String(data.numero_prestador || '');
                            if (prestadorStr && prestadorStr !== 'null' && prestadorStr !== '' && isDateInSelectedMonth(data.data)) {
                              prestadoresComDatasNoMes.add(prestadorStr);
                            }
                          });
                          
                          // Incluir prestadores que têm datas no mês selecionado
                          if (prestadoresComDatasNoMes.size > 0) {
                            prestadoresNoMes = prestadoresData.filter(prestador => {
                              const prestadorStr = String(prestador.numero_prestador);
                              return prestadoresComDatasNoMes.has(prestadorStr);
                            });
                          }
                        }
                        
                        // Verificar se há datas sem prestador no mês selecionado
                        const datasSemPrestadorNoMes = patient.datas?.filter(data => {
                          const isNullPrestador = data.numero_prestador === null || data.numero_prestador === "null";
                          return isNullPrestador && isDateInSelectedMonth(data.data);
                        }) || [];
                        
                        // Se há prestadores no mês, mostrar eles (e também datas sem prestador se houver)
                        if (prestadoresNoMes.length > 0) {
                          return (
                            <div className="space-y-6">
                              {/* Prestadores do mês */}
                              {prestadoresNoMes
                                .filter(prestador => {
                              // Se o filtro "guias-assinadas" estiver ativo, mostrar apenas prestadores prontos para faturar (assinados mas não faturados)
                              if (filterType === 'guias-assinadas') {
                                return prestador.existe_guia_assinada_psicologo === 1 && prestador.faturado === 0;
                              }
                              // Se o filtro "faturado" estiver ativo, mostrar apenas prestadores faturados
                              if (filterType === 'faturado') {
                                return prestador.faturado === 1;
                              }
                              // Se o filtro "falta-importar-guia" estiver ativo, mostrar apenas prestadores com existe_guia_assinada === 0, 
                              // não têm documento assinado pelo psicólogo, número de prestador e não faturados
                              if (filterType === 'falta-importar-guia') {
                                return prestador.existe_guia_assinada === 0 && 
                                       prestador.existe_guia_assinada_psicologo === 0 &&
                                       prestador.numero_prestador && 
                                       prestador.faturado !== 1;
                              }
                              return true;
                            })
                            .map((prestador, prestadorIdx) => {
                            const isReadyToInvoice = prestador.existe_guia_assinada_psicologo === 1 && prestador.faturado === 0;
                            return (
                            <div key={prestadorIdx} className={`rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow ${
                              isReadyToInvoice 
                                ? 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-300' 
                                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                            }`}>
                              {/* Header do Prestador */}
                              <div className="mb-5">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-100 rounded-lg">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-lg text-gray-800 whitespace-nowrap">
                                      Número de Prestador: {prestador.numero_prestador}
                                    </span>
                                    {prestador.status_guia && 
                                     prestador.status_guia.trim() !== "" && 
                                     prestador.status_guia.trim().toLowerCase() !== "null" && (
                                      <Badge className={getStatusGuiaColor(prestador.status_guia)}>
                                        {prestador.status_guia}
                                      </Badge>
                                    )}
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="text-xs p-1 h-6 w-6 border-blue-200 text-blue-700 hover:bg-blue-50 flex-shrink-0 cursor-pointer [&>*]:cursor-pointer"
                                      onClick={() => {
                                        saveScrollPosition();
                                        setEditingPrestador(prestador);
                                        setShowEditModal(true);
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      className="text-xs p-1 h-6 w-6 bg-red-600 hover:bg-red-700 text-white flex-shrink-0 cursor-pointer [&>*]:cursor-pointer"
                                      onClick={() => handleDeleteClick(prestador.numero_prestador)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Datas de Vencimento e Validade */}
                                <div className="mt-4 flex flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">Data Autorização:</span>
                                    {prestador.data_validade ? (
                                      <span className="text-sm font-semibold text-gray-800">
                                        {format(normalizeDate(prestador.data_validade), 'dd/MM/yyyy')}
                                      </span>
                                    ) : (
                                      <span className="text-sm font-semibold text-red-600">Sem data</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">Data Vencimento:</span>
                                    {prestador.data_vencimento ? (
                                      <span className="text-sm font-semibold text-gray-800">
                                        {format(normalizeDate(prestador.data_vencimento), 'dd/MM/yyyy')}
                                      </span>
                                    ) : (
                                      <span className="text-sm font-semibold text-red-600">Sem data</span>
                                    )}
                                  </div>
                                  
                                </div>
                                
                                {/* Botões de Ação */}
                                <div className="flex items-center gap-2 flex-wrap mt-4">
                                  {/* Botão Guia Autorizada */}
                                  <div className="relative">
                                    {prestador.existe_guia_autorizada === 1 ? (
                                      <Button 
                                        size="sm" 
                                        variant="default"
                                        className="text-xs px-3 py-2 bg-green-700 text-white hover:bg-white hover:text-green-700 hover:border-green-700 border border-green-700 transition-all duration-300 ease-in-out cursor-pointer [&>*]:cursor-pointer"
                                        onClick={() => handleDownloadGuia(prestador.numero_prestador, "Guia-autorizada")}
                                      >
                                        <Upload className="h-3 w-3 mr-1" />
                                        Baixar Autorizada
                                      </Button>
                                    ) : (
                                      <div className="relative group">
                                        <input
                                          type="file"
                                          accept=".pdf"
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleImportGuia(patient.paciente_nome, prestador.numero_prestador, "Guia-autorizada", file);
                                            }
                                          }}
                                        />
                                        <Button 
                                          size="sm" 
                                          className="text-xs px-3 py-2 bg-white text-green-700 border border-green-200 group-hover:bg-green-700 group-hover:text-white group-hover:border-green-700 transition-all duration-300 ease-in-out cursor-pointer [&>*]:cursor-pointer relative z-0"
                                        >
                                          <Upload className="h-3 w-3 mr-1" />
                                          Guia Autorizada
                                        </Button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Botão Guia Assinada */}
                                  <div className="relative">
                                    {prestador.existe_guia_assinada === 1 ? (
                                      <Button 
                                        size="sm" 
                                        variant="default"
                                        className="text-xs px-3 py-2 bg-blue-700 text-white hover:bg-white hover:text-blue-700 hover:border-blue-700 border border-blue-700 transition-all duration-300 ease-in-out cursor-pointer [&>*]:cursor-pointer"
                                        onClick={() => handleDownloadGuia(prestador.numero_prestador, "Guia-assinada")}
                                      >
                                        <Upload className="h-3 w-3 mr-1" />
                                        Baixar Assinada
                                      </Button>
                                    ) : (
                                      <div className="relative group">
                                        <input
                                          type="file"
                                          accept=".pdf"
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleImportGuia(patient.paciente_nome, prestador.numero_prestador, "Guia-assinada", file);
                                            }
                                          }}
                                        />
                                        <Button 
                                          size="sm" 
                                          className="text-xs px-3 py-2 bg-white text-blue-700 border border-blue-200 group-hover:bg-blue-700 group-hover:text-white group-hover:border-blue-700 transition-all duration-300 ease-in-out cursor-pointer [&>*]:cursor-pointer relative z-0"
                                        >
                                          <Upload className="h-3 w-3 mr-1" />
                                          Assinada Paciente
                                        </Button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Botão Guia Assinada Psicólogo */}
                                  <div className="relative">
                                    {prestador.existe_guia_assinada_psicologo === 1 ? (
                                      <Button 
                                        size="sm" 
                                        variant="default"
                                        className="text-xs px-3 py-2 bg-purple-700 text-white hover:bg-white hover:text-purple-700 hover:border-purple-700 border border-purple-700 transition-all duration-300 ease-in-out cursor-pointer [&>*]:cursor-pointer"
                                        onClick={() => handleDownloadGuia(prestador.numero_prestador, "Guia-assinada-psicologo")}
                                      >
                                        <Upload className="h-3 w-3 mr-1" />
                                        Baixar Psicólogo
                                      </Button>
                                    ) : (
                                      <div className="relative group">
                                        <input
                                          type="file"
                                          accept=".pdf"
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleImportGuia(patient.paciente_nome, prestador.numero_prestador, "Guia-assinada-psicologo", file);
                                            }
                                          }}
                                        />
                                        <Button 
                                          size="sm" 
                                          className="text-xs px-3 py-2 bg-white text-purple-700 border border-purple-200 group-hover:bg-purple-700 group-hover:text-white group-hover:border-purple-700 transition-all duration-300 ease-in-out cursor-pointer [&>*]:cursor-pointer relative z-0"
                                        >
                                          <Upload className="h-3 w-3 mr-1" />
                                          Assinada Psicologo
                                        </Button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Botão Faturar */}
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    className="text-xs px-3 py-2 bg-green-700 text-white hover:bg-white hover:text-green-700 hover:border-green-700 border border-green-700 transition-all duration-300 ease-in-out cursor-pointer [&>*]:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-700 disabled:hover:text-white"
                                    onClick={() => handleFaturar(prestador.numero_prestador)}
                                    disabled={prestador.faturado === 1}
                                  >
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    {prestador.faturado ? "Faturado ✓" : "Faturar"}
                                  </Button>
                                </div>
                              </div>


                              {/* Datas de Agendamentos */}
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                {patient.datas && patient.datas.length > 0 ? (
                                  <>
                                    {/* Linha de Agendamentos */}
                                    <div className="mb-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-gray-600" />
                                          <span className="font-semibold text-gray-800">Agendamentos:</span>
                                        </div>
                                        {prestador.faturado === 1 && (
                                          <span className="text-2xl font-bold text-green-600 bg-green-100 px-4 py-2 rounded-lg border border-green-200">
                                            FATURADO
                                          </span>
                                        )}
                                        {isReadyToInvoice && (
                                          <span className="text-2xl font-bold text-purple-700 bg-purple-100 px-4 py-2 rounded-lg border border-purple-300">
                                            PRONTO PARA FATURAR
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {(() => {
                                          const datasDoPrestador = getAllDatasForPrestador(prestador.numero_prestador, patient.datas || []);
                                          return datasDoPrestador.map((data, dataIdx) => {
                                            const colorClass = getDateColor(data, patient, 'agendamentos');
                                            return (
                                              <span key={dataIdx} className={`px-3 py-1 rounded-lg text-sm font-medium ${colorClass}`}>
                                                {data.data}
                                              </span>
                                            );
                                          });
                                        })()}
                                      </div>
                                    </div>

                                    {/* Linha de Guias */}
                                    <div className="mb-4">
                                      <div className="flex items-center gap-2 mb-3">
                                        <FileText className="h-4 w-4 text-gray-600" />
                                        <span className="font-semibold text-gray-800">Guias:</span>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {(() => {
                                          const datasDoPrestador = getAllDatasForPrestador(prestador.numero_prestador, patient.datas || []);
                                          return datasDoPrestador.map((data, dataIdx) => {
                                            const colorClass = getDateColor(data, patient, 'guias');
                                            return (
                                              <span key={dataIdx} className={`px-3 py-1 rounded-lg text-sm font-medium ${colorClass}`}>
                                                {data.data}
                                              </span>
                                            );
                                          });
                                        })()}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* Fallback para quando não há dados do paciente */}
                                    <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-gray-600" />
                                      Datas de Agendamentos
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      {prestador.datas.map((data, dataIdx) => (
                                        <span key={dataIdx} className="px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                          {format(normalizeDate(data), 'dd/MM/yyyy')}
                                        </span>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Data de Faturamento */}
                              {prestador.date_faturado && (
                                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                  <div className="flex items-center gap-2 text-emerald-800">
                                    <DollarSign className="h-4 w-4" />
                                    <span className="font-medium">Data Faturado: </span>
                                    <span className="font-semibold">
                                      {format(normalizeDate(prestador.date_faturado), 'dd/MM/yyyy')}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                          })}
                              
                              {/* Se há datas sem prestador no mês, mostrar seção "Agendamentos sem GUIA" */}
                              {datasSemPrestadorNoMes.length > 0 && (
                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                                  <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-amber-100 rounded-full">
                                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                                      </div>
                                      <span className="font-bold text-lg text-amber-800">
                                        Agendamentos sem GUIA
                                      </span>
                                    </div>
                                    {/* Botão Solicitar Guia - apenas para PMDF */}
                                    {patient.insurance_type === "PMDF" && (
                                      <Button 
                                        size="sm" 
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700 text-white cursor-pointer [&>*]:cursor-pointer animate-pulse shadow-lg shadow-green-500/50"
                                        onClick={() => {
                                          saveScrollPosition();
                                          handleOpenSolicitarGuiaModal(patient);
                                        }}
                                      >
                                        <FileText className="h-4 w-4 mr-2" />
                                        Solicitar Guia
                                      </Button>
                                    )}
                                  </div>
                                  
                                  {/* Linha de Agendamentos */}
                                  <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Calendar className="h-4 w-4 text-gray-600" />
                                      <span className="font-semibold text-gray-800">Agendamentos:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {datasSemPrestadorNoMes
                                        .map((data, dataIdx) => {
                                          const colorClass = getDateColor(data, patient, 'agendamentos');
                                          return (
                                            <span key={dataIdx} className={`px-3 py-1 rounded-lg text-sm font-medium ${colorClass}`}>
                                              {data.data}
                                            </span>
                                          );
                                        })}
                                    </div>
                                  </div>

                                  {/* Linha de Guias */}
                                  <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <FileText className="h-4 w-4 text-gray-600" />
                                      <span className="font-semibold text-gray-800">Guias:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {datasSemPrestadorNoMes
                                        .map((data, dataIdx) => {
                                          const colorClass = getDateColor(data, patient, 'guias');
                                          return (
                                            <span key={dataIdx} className={`px-3 py-1 rounded-lg text-sm font-medium ${colorClass}`}>
                                              {data.data}
                                            </span>
                                          );
                                        })}
                                    </div>
                                  </div>

                                  {/* Status do Prestador */}
                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-yellow-800">
                                      <AlertTriangle className="h-4 w-4" />
                                      <span className="text-sm font-medium">
                                        ⚠️ Sem número de GUIA
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                        
                        // Se há datas sem prestador no mês (mas não há prestadores no mês), mostrar seção "Agendamentos sem GUIA"
                        if (datasSemPrestadorNoMes.length > 0) {
                          return (
                            <div className="space-y-4">
                              {/* Seção para agendamentos sem GUIA */}
                              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-5">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 rounded-full">
                                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <span className="font-bold text-lg text-amber-800">
                                      Agendamentos sem GUIA
                                    </span>
                                  </div>
                                  {/* Botão Solicitar Guia - apenas para PMDF */}
                                  {patient.insurance_type === "PMDF" && (
                                    <Button 
                                      size="sm" 
                                      variant="default"
                                      className="bg-green-600 hover:bg-green-700 text-white cursor-pointer [&>*]:cursor-pointer animate-pulse shadow-lg shadow-green-500/50"
                                      onClick={() => {
                                        saveScrollPosition();
                                        handleOpenSolicitarGuiaModal(patient);
                                      }}
                                    >
                                      <FileText className="h-4 w-4 mr-2" />
                                      Solicitar Guia
                                    </Button>
                                  )}
                                </div>
                                
                                {/* Linha de Agendamentos */}
                                <div className="mb-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="h-4 w-4 text-gray-600" />
                                    <span className="font-semibold text-gray-800">Agendamentos:</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {datasSemPrestadorNoMes
                                      .map((data, dataIdx) => {
                                        const colorClass = getDateColor(data, patient, 'agendamentos');
                                        return (
                                          <span key={dataIdx} className={`px-3 py-1 rounded-lg text-sm font-medium ${colorClass}`}>
                                            {data.data}
                                          </span>
                                        );
                                      })}
                                  </div>
                                </div>

                                {/* Linha de Guias */}
                                <div className="mb-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <FileText className="h-4 w-4 text-gray-600" />
                                    <span className="font-semibold text-gray-800">Guias:</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {datasSemPrestadorNoMes
                                      .map((data, dataIdx) => {
                                        const colorClass = getDateColor(data, patient, 'guias');
                                        return (
                                          <span key={dataIdx} className={`px-3 py-1 rounded-lg text-sm font-medium ${colorClass}`}>
                                            {data.data}
                                          </span>
                                        );
                                      })}
                                  </div>
                                </div>

                                {/* Status do Prestador */}
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <div className="flex items-center gap-2 text-yellow-800">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-sm font-medium">
                                      ⚠️ Sem número de GUIA
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        // Caso padrão: mostrar seção original (quando não há prestadores)
                        if (patient.datas && patient.datas.length > 0) {
                          return (
                        <div className="space-y-4">
                          {/* Seção para agendamentos sem GUIA */}
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-5">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 rounded-full">
                                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                                </div>
                                <span className="font-bold text-lg text-amber-800">
                                  Agendamentos sem GUIA
                                </span>
                              </div>
                              {/* Botão Solicitar Guia - apenas para PMDF */}
                              {patient.insurance_type === "PMDF" && (
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700 text-white cursor-pointer [&>*]:cursor-pointer animate-pulse shadow-lg shadow-green-500/50"
                                  onClick={() => {
                                    saveScrollPosition();
                                    handleOpenSolicitarGuiaModal(patient);
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Solicitar Guia
                                </Button>
                              )}
                            </div>
                            
                            {/* Linha de Agendamentos */}
                            <div className="mb-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Calendar className="h-4 w-4 text-gray-600" />
                                <span className="font-semibold text-gray-800">Agendamentos:</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {patient.datas
                                  .filter(data => isDateInSelectedMonth(data.data))
                                  .map((data, dataIdx) => {
                                    const colorClass = getDateColor(data, patient, 'agendamentos');
                                    return (
                                      <span key={dataIdx} className={`px-3 py-1 rounded-lg text-sm font-medium ${colorClass}`}>
                                        {data.data}
                                      </span>
                                    );
                                  })}
                              </div>
                            </div>

                            {/* Linha de Guias */}
                            <div className="mb-4">
                              <div className="flex items-center gap-2 mb-3">
                                <FileText className="h-4 w-4 text-gray-600" />
                                <span className="font-semibold text-gray-800">Guias:</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {patient.datas
                                  .filter(data => isDateInSelectedMonth(data.data))
                                  .map((data, dataIdx) => {
                                    const colorClass = getDateColor(data, patient, 'guias');
                                    return (
                                      <span key={dataIdx} className={`px-3 py-1 rounded-lg text-sm font-medium ${colorClass}`}>
                                        {data.data}
                                      </span>
                                    );
                                  })}
                              </div>
                            </div>

                            {/* Status do Prestador */}
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex items-center gap-2 text-yellow-800">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  ⚠️ Sem número de GUIA
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                          );
                        }
                        
                        // Caso sem dados
                        return (
                          <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="p-3 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                              <FileText className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhum dado encontrado</h3>
                            <p className="text-gray-500">Não há prestadores ou agendamentos para este paciente.</p>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Guias */}
      {selectedPatient && (
        <GuideModal
          isOpen={isGuideModalOpen}
          onClose={handleCloseGuideModal}
          patient={{
            patient_id: selectedPatient.patient_id,
            paciente_nome: selectedPatient.paciente_nome,
            datas: selectedPatient.datas || []
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Modal de Solicitar Guia */}
      {solicitarGuiaData && (
        <SolicitarGuiaModal
          isOpen={showSolicitarGuiaModal}
          onClose={handleCloseSolicitarGuiaModal}
          patient={{
            patient_id: solicitarGuiaData.patient.patient_id,
            paciente_nome: solicitarGuiaData.patient.paciente_nome
          }}
          datesToShow={solicitarGuiaData.datesToShow}
          onSuccess={handleModalSuccess}
        />
      )}
      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                Excluir Prestador
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir o prestador <strong>{prestadorToDelete}</strong>?
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelDelete}
                className="px-4 py-2 cursor-pointer [&>*]:cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 cursor-pointer [&>*]:cursor-pointer"
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de Download */}
      {downloadingFile && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span className="text-sm font-medium">
            Baixando {downloadingFile}...
          </span>
        </div>
      )}

      {/* Indicador de Upload/Carregamento de Documento */}
      {uploadingDocument && (
        <div className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 max-w-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent flex-shrink-0"></div>
          <span className="text-sm font-medium">
            Carregando documento {uploadingDocument.documentType} - {uploadingDocument.patientName}
          </span>
        </div>
      )}

      {/* Toast de Download Completo */}
      {showDownloadComplete && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="p-1 bg-green-500 rounded-full">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">
                {downloadResult.completed > 0 && downloadResult.failed === 0 && 'Download Concluído!'}
                {downloadResult.failed > 0 && downloadResult.completed === 0 && 'Download Falhou!'}
                {downloadResult.completed > 0 && downloadResult.failed > 0 && 'Download Parcial!'}
                {downloadResult.completed === 0 && downloadResult.failed === 0 && 'Erro!'}
              </div>
              <div className="text-xs mt-1">
                {downloadResult.message}
              </div>
              {downloadResult.completed > 0 && (
                <div className="text-xs mt-1 opacity-90">
                  ✓ {downloadResult.completed} sucessos
                  {downloadResult.failed > 0 && ` • ✗ ${downloadResult.failed} falhas`}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowDownloadComplete(false)}
              className="flex-shrink-0 text-green-200 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Progresso do Download Completo */}
      {downloadingEverything && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-full">
                <Upload className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                Baixando Tudo
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                {downloadEverythingProgress.currentStep}
              </div>
              
              {downloadEverythingProgress.currentGuide && (
                <div className="text-sm font-medium text-blue-600">
                  Paciente: {downloadEverythingProgress.currentGuide}
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso:</span>
                  <span>{downloadEverythingProgress.completed} de {downloadEverythingProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${downloadEverythingProgress.total > 0 ? (downloadEverythingProgress.completed / downloadEverythingProgress.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-semibold text-green-600">{downloadEverythingProgress.completed}</div>
                  <div className="text-gray-500">Concluídos</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-red-600">{downloadEverythingProgress.failed}</div>
                  <div className="text-gray-500">Falhas</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{downloadEverythingProgress.remaining}</div>
                  <div className="text-gray-500">Restantes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Progresso do Download de Guias Assinadas */}
      {downloadingSignedGuides && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <Upload className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                Baixando Guias Assinadas
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                {downloadSignedGuidesProgress.currentStep}
              </div>
              
              {downloadSignedGuidesProgress.currentGuide && (
                <div className="text-sm font-medium text-blue-600">
                  Paciente: {downloadSignedGuidesProgress.currentGuide}
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso:</span>
                  <span>{downloadSignedGuidesProgress.completed} de {downloadSignedGuidesProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${downloadSignedGuidesProgress.total > 0 ? (downloadSignedGuidesProgress.completed / downloadSignedGuidesProgress.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-semibold text-green-600">{downloadSignedGuidesProgress.completed}</div>
                  <div className="text-gray-500">Concluídos</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-red-600">{downloadSignedGuidesProgress.failed}</div>
                  <div className="text-gray-500">Falhas</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{downloadSignedGuidesProgress.remaining}</div>
                  <div className="text-gray-500">Restantes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Prestador */}
      <EditPrestadorModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPrestador(null);
        }}
        prestador={editingPrestador}
        onSuccess={() => {
          fetchData(); // Recarregar dados após edição (já restaura scroll)
        }}
      />
    </Layout>
  );
};

export default GuideControl;