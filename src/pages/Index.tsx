import AppointmentCalendar from "@/components/AppointmentCalendar";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { X, AlertTriangle, Calendar, ClipboardList, User, Edit, BarChart3, FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PsychologistAvailabilityDashboard from "@/components/PsychologistAvailabilityDashboard";
import AppointmentForm from "@/components/AppointmentForm";
import SolicitarGuiaModal from "@/components/SolicitarGuiaModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type AlertWebhookItem = {
  paciente_nome: string;
  patient_id?: number; // Campo opcional caso a API retorne
  appointment_id?: number; // ID do agendamento relacionado
  motivo: string | null;
  active: number | string;
  insurance_type?: string; // Tipo de plano/seguro
  birthdate?: string; // Data de nascimento para calcular se é adulto ou criança
  datas: Array<{
    data: string; // Data no formato "DD/MM/YYYY"
    agendamento: string; // Status do agendamento ("ok", "warning", "error", etc.)
    guia: string; // Status da guia ("falta", "ok", etc.)
    numero_prestador: number | string | null;
  }>;
};

// Função para determinar se é adulto ou criança baseado na data de nascimento
const getCategoriaEtaria = (birthdate?: string): string => {
  if (!birthdate) return "";
  try {
    const d = new Date(birthdate);
    if (isNaN(d.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const monthDiff = today.getMonth() - d.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) age--;
    if (age < 0) return "";
    return age < 12 ? "Criança" : "Adulto";
  } catch (error) {
    return "";
  }
};

// Função para obter o dia da semana em português
const getDayOfWeek = (dateString: string): string => {
  try {
    const [day, month, year] = dateString.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return format(date, 'EEEE', { locale: ptBR });
  } catch (error) {
    console.error('Erro ao obter dia da semana:', error);
    return '';
  }
};

// Função para obter o número do dia da semana (0=domingo, 1=segunda, etc.)
const getDayOfWeekNumber = (dateString: string): number => {
  try {
    const [day, month, year] = dateString.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dayNumber = date.getDay(); // 0=domingo, 1=segunda, ..., 6=sábado
    // Ajustar para que segunda-feira seja o primeiro dia
    return dayNumber === 0 ? 7 : dayNumber; // Domingo vai para o final
  } catch (error) {
    console.error('Erro ao obter número do dia da semana:', error);
    return 8; // Retorna 8 para datas inválidas (vão para o final)
  }
};

// Função para agrupar alertas por dia da semana da data mais próxima
const groupAlertsByDay = (alerts: AlertWebhookItem[]): Array<{ day: string; dayNumber: number; alerts: AlertWebhookItem[] }> => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  // Calcular data inicial (primeiro dia do mês atual) e fim (primeira semana completa do mês seguinte)
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();
  
  // Data inicial: primeiro dia do mês atual (mostra todo o mês atual)
  const primeiroDiaMes = new Date(anoAtual, mesAtual, 1);
  primeiroDiaMes.setHours(0, 0, 0, 0);
  
  // Primeiro dia do mês seguinte
  const primeiroDiaMesSeguinte = new Date(anoAtual, mesAtual + 1, 1);
  // Fim da primeira semana do mês seguinte (dia 7)
  const fimPrimeiraSemanaMesSeguinte = new Date(primeiroDiaMesSeguinte);
  fimPrimeiraSemanaMesSeguinte.setDate(7); // Dia 7 do mês seguinte
  fimPrimeiraSemanaMesSeguinte.setHours(23, 59, 59, 999);
  
  const grouped = alerts.reduce((acc, alert) => {
    // Encontrar a data mais próxima do alerta
    if (!alert.datas || !Array.isArray(alert.datas)) {
      // Sem datas, adicionar ao grupo "Sem data"
      const noDateGroup = acc.find(g => g.day === 'Sem data');
      if (noDateGroup) {
        noDateGroup.alerts.push(alert);
      } else {
        acc.push({
          day: 'Sem data',
          dayNumber: 8,
          alerts: [alert]
        });
      }
      return acc;
    }
    
    // Filtrar apenas datas: todo o mês atual (semana 1 até última semana) + 1 semana do mês seguinte
    const datasFiltradas = alert.datas
      .map((dataItem) => {
        const [day, month, year] = dataItem.data.split('/');
        const dataObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        dataObj.setHours(0, 0, 0, 0);
        return { dataObj, dataItem };
      })
      .filter(({ dataObj }) => dataObj >= primeiroDiaMes && dataObj <= fimPrimeiraSemanaMesSeguinte); // Todo o mês atual + 1 semana do mês seguinte
    
    if (datasFiltradas.length === 0) {
      // Sem datas no período, adicionar ao grupo "Sem data"
      const noDateGroup = acc.find(g => g.day === 'Sem data');
      if (noDateGroup) {
        noDateGroup.alerts.push(alert);
      } else {
        acc.push({
          day: 'Sem data',
          dayNumber: 8,
          alerts: [alert]
        });
      }
      return acc;
    }
    
    // Pegar a data mais próxima (primeira do mês)
    const dataMaisProxima = datasFiltradas.sort((a, b) => a.dataObj.getTime() - b.dataObj.getTime())[0];
    const dataStr = dataMaisProxima.dataItem.data;
    const dayOfWeek = getDayOfWeek(dataStr);
    const dayNumber = getDayOfWeekNumber(dataStr);
    const capitalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
    
    const existingGroup = acc.find(g => g.day === capitalizedDay);
    if (existingGroup) {
      existingGroup.alerts.push(alert);
    } else {
      acc.push({
        day: capitalizedDay,
        dayNumber: dayNumber,
        alerts: [alert]
      });
    }
    
    return acc;
  }, [] as Array<{ day: string; dayNumber: number; alerts: AlertWebhookItem[] }>);
  
  // Ordenar grupos por dia da semana (segunda=1, terça=2, ..., domingo=7, sem data=8)
  grouped.sort((a, b) => {
    if (a.dayNumber !== b.dayNumber) {
      return a.dayNumber - b.dayNumber;
    }
    // Se mesmo dia, ordenar por nome do paciente
    return a.alerts[0].paciente_nome.localeCompare(b.alerts[0].paciente_nome);
  });
  
  // Dentro de cada grupo, ordenar os alertas
  grouped.forEach(group => {
    group.alerts.sort((a, b) => {
      // Primeiro: ordenar por active = 1 primeiro
      if (a.active === 1 && b.active !== 1) return -1;
      if (a.active !== 1 && b.active === 1) return 1;
      // Segundo: ordenar por nome
      return a.paciente_nome.localeCompare(b.paciente_nome);
    });
  });
  
  return grouped;
};

const Index = () => {
  const { user } = useAuth();
  const [showAlertModal, setShowAlertModal] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertItems, setAlertItems] = useState<AlertWebhookItem[]>([]);
  const [patientsBirthdates, setPatientsBirthdates] = useState<Map<number, string>>(new Map());
  // Mapa para armazenar horário do último agendamento: patientId -> {start_time, end_time}
  const [lastAppointmentTimes, setLastAppointmentTimes] = useState<Map<number, { start_time: string; end_time: string }>>(new Map());
  
  // Estados para o modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertWebhookItem | null>(null);
  const [editActive, setEditActive] = useState(true);
  const [editMotivo, setEditMotivo] = useState("");
  const [savingAlert, setSavingAlert] = useState(false);
  
  // Estados para o formulário de agendamento pré-preenchido
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [appointmentFormData, setAppointmentFormData] = useState<{
    patientId?: string;
    psychologistId?: string;
    date?: Date;
    startTime?: string;
    endTime?: string;
    paymentMethod?: string;
    insuranceType?: string;
    appointmentType?: "presential" | "online";
  } | null>(null);

  // Estados para o modal de solicitar guia
  const [showSolicitarGuiaModal, setShowSolicitarGuiaModal] = useState(false);
  const [solicitarGuiaData, setSolicitarGuiaData] = useState<{
    patient: { patient_id: number; paciente_nome: string };
    datesToShow: string[];
  } | null>(null);

  // Verificação de permissões do usuário
  const isAdmin = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";
  const isPsychologist = user?.role === "psychologist";
  const canViewAlerts = isAdmin || isReceptionist; // Apenas admin e recepcionista podem ver alertas

  // Função para obter pacientes com agendamento mas sem guia
  const getPatientsWithoutGuide = (): Array<{
    patient: { patient_id: number; paciente_nome: string };
    datesWithoutGuide: string[];
  }> => {
    const patientsMap = new Map<number, {
      patient: { patient_id: number; paciente_nome: string };
      datesWithoutGuide: string[];
    }>();

    alertItems.forEach(alert => {
      // Excluir pacientes desativados (active === 0 ou "0")
      if (alert.active === 0 || alert.active === "0") return;
      
      // Apenas pacientes ativos
      if (alert.active !== 1 && alert.active !== "1") return;
      
      // Apenas pacientes com plano PMDF
      if (alert.insurance_type !== "PMDF") return;
      
      // Verificar se tem agendamento mas não tem guia
      if (!alert.datas || !Array.isArray(alert.datas)) return;

      const datesWithoutGuide = alert.datas
        .filter(dataItem => 
          dataItem.agendamento === "ok" && 
          (dataItem.guia !== "ok" && dataItem.guia !== "OK")
        )
        .map(dataItem => dataItem.data);

      if (datesWithoutGuide.length > 0 && alert.patient_id) {
        const patientId = alert.patient_id;
        if (patientsMap.has(patientId)) {
          // Adicionar datas ao paciente existente
          const existing = patientsMap.get(patientId)!;
          existing.datesWithoutGuide.push(...datesWithoutGuide);
          // Remover duplicatas
          existing.datesWithoutGuide = [...new Set(existing.datesWithoutGuide)];
        } else {
          patientsMap.set(patientId, {
            patient: {
              patient_id: patientId,
              paciente_nome: alert.paciente_nome
            },
            datesWithoutGuide: datesWithoutGuide
          });
        }
      }
    });

    return Array.from(patientsMap.values());
  };

  // Função auxiliar para corrigir status de agendamento baseado nos appointments reais
  const correctAppointmentStatus = async (alertItems: AlertWebhookItem[]): Promise<AlertWebhookItem[]> => {
    try {
      const appointmentsResponse = await fetch(
        "https://webhook.essenciasaudeintegrada.com.br/webhook/appointmens",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      
      if (!appointmentsResponse.ok) {
        return alertItems; // Retornar sem alterações se falhar
      }
      
      const appointments = await appointmentsResponse.json();
      
      // Criar um mapa de appointments por patient_id e data
      // Formato: Map<patient_id, Map<date_YYYY-MM-DD, appointment>>
      const appointmentsMap = new Map<number, Map<string, any>>();
      
      if (Array.isArray(appointments)) {
        appointments.forEach((apt: any) => {
          if (apt.patient_id && apt.date) {
            if (!appointmentsMap.has(apt.patient_id)) {
              appointmentsMap.set(apt.patient_id, new Map());
            }
            const patientAppointments = appointmentsMap.get(apt.patient_id)!;
            // Armazenar por data no formato YYYY-MM-DD
            patientAppointments.set(apt.date, apt);
          }
        });
      }
      
      // Corrigir status de agendamento nos alertas
      return alertItems.map(alert => {
        const patientId = alert.patient_id;
        
        // Se não tem patient_id, não podemos verificar
        if (!patientId) {
          return alert;
        }
        
        // Verificar se há appointments para este paciente
        const patientAppointments = appointmentsMap.get(patientId);
        if (!patientAppointments) {
          return alert;
        }
        
        // Atualizar datas do alerta
        if (alert.datas && Array.isArray(alert.datas)) {
          const updatedDatas = alert.datas.map(dataItem => {
            // Converter data de DD/MM/YYYY para YYYY-MM-DD
            const [day, month, year] = dataItem.data.split('/');
            const dateFormatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            
            // Verificar se há appointment para esta data
            const appointment = patientAppointments.get(dateFormatted);
            
            // Se há appointment e o status está como "falta", corrigir para "ok"
            if (appointment && dataItem.agendamento === "falta") {
              return {
                ...dataItem,
                agendamento: "ok"
              };
            }
            
            return dataItem;
          });
          
          return {
            ...alert,
            datas: updatedDatas
          };
        }
        
        return alert;
      });
    } catch (error) {
      console.error('Erro ao corrigir status de agendamento:', error);
      return alertItems; // Retornar sem alterações se falhar
    }
  };

  // Função para buscar alertas da API
  const fetchAlerts = async () => {
    try {
      setLoadingAlerts(true);
      setAlertError(null);
      
      const response = await fetch(
        "https://webhook.essenciasaudeintegrada.com.br/webhook/ALERTA",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar alertas: ${response.status}`);
      }
      
      const data = await response.json();
      
      
      // Processar o novo formato da API
      let alertItems: AlertWebhookItem[] = [];
      
      if (Array.isArray(data)) {
        alertItems = data;
      } else if (data && typeof data === 'object') {
        alertItems = [data];
      }
      
      // Corrigir status de agendamento baseado nos appointments reais
      alertItems = await correctAppointmentStatus(alertItems);
      
      setAlertItems(alertItems);
      
      // Buscar patient_ids que faltam e depois buscar dados adicionais
      const alertsWithIds: number[] = [];
      const alertsWithoutIds: AlertWebhookItem[] = [];
      
      alertItems.forEach(alert => {
        if (alert.patient_id) {
          alertsWithIds.push(alert.patient_id);
        } else {
          alertsWithoutIds.push(alert);
        }
      });
      
      // Buscar patient_ids pelos nomes para os que não têm
      if (alertsWithoutIds.length > 0) {
        const fetchedIds = await Promise.all(
          alertsWithoutIds.map(alert => getPatientIdByName(alert.paciente_nome))
        );
        
        fetchedIds.forEach((id, index) => {
          if (id) {
            alertsWithIds.push(id);
            // Atualizar o alerta com o patient_id encontrado
            if (alertsWithoutIds[index]) {
              alertsWithoutIds[index].patient_id = id;
            }
          }
        });
        
        // Atualizar os alertas com os IDs encontrados
        let updatedAlertItems = alertItems.map(alert => {
          const foundAlert = alertsWithoutIds.find(a => a.paciente_nome === alert.paciente_nome);
          if (foundAlert && foundAlert.patient_id) {
            return { ...alert, patient_id: foundAlert.patient_id };
          }
          return alert;
        });
        
        // Se encontramos novos patient_ids, corrigir novamente os status de agendamento
        updatedAlertItems = await correctAppointmentStatus(updatedAlertItems);
        
        setAlertItems(updatedAlertItems);
      }
      
      // Remover duplicatas
      const uniquePatientIds = [...new Set(alertsWithIds)];
      
      if (uniquePatientIds.length > 0) {
        fetchPatientsBirthdates(uniquePatientIds);
        // Buscar horário do último agendamento para cada paciente
        fetchLastAppointmentTimes(uniquePatientIds);
      }
      
    } catch (e: any) {
      setAlertError(e?.message || "Erro desconhecido");
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    // Só buscar alertas se o usuário tem permissão para vê-los
    if (!canViewAlerts) {
      setShowAlertModal(false);
      return;
    }

    let aborted = false;
    const loadAlerts = async () => {
      await fetchAlerts();
    };
    
    loadAlerts();
    return () => {
      aborted = true;
    };
  }, [canViewAlerts]);

  // Função para abrir modal de edição
  const handleEditAlert = (alert: AlertWebhookItem) => {
    setEditingAlert(alert);
    setEditActive(alert.active === 1 || alert.active === "1");
    setEditMotivo(alert.motivo || "");
    setShowEditModal(true);
  };

  // Função para buscar patient_id pelo nome
  const getPatientIdByName = async (patientName: string): Promise<number | null> => {
    try {
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/patients", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        console.error('Erro ao buscar pacientes:', response.status);
        return null;
      }

      const patients = await response.json();
      const patient = patients.find((p: any) => 
        p.name && p.name.toLowerCase().trim() === patientName.toLowerCase().trim()
      );

      return patient ? patient.id : null;
    } catch (error) {
      console.error('Erro ao buscar patient_id:', error);
      return null;
    }
  };

  // Função para buscar agendamentos anteriores do paciente
  const fetchPatientAppointments = async (patientId: number) => {
    try {
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/apointment_patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: patientId })
      });

      if (!response.ok) {
        console.error('Erro ao buscar agendamentos:', response.status);
        return [];
      }

      const data = await response.json();
      // Filtrar objetos vazios e ordenar por data (mais recente primeiro)
      const validAppointments = Array.isArray(data) 
        ? data.filter(appointment => 
            appointment && 
            Object.keys(appointment).length > 0 && 
            appointment.date
          )
        : [];
      
      // Ordenar por data (mais recente primeiro)
      return validAppointments.sort((a: any, b: any) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      console.error('Erro ao buscar agendamentos do paciente:', error);
      return [];
    }
  };

  // Função para buscar agendamento completo pelo ID (para obter psychologist_id)
  const fetchAppointmentById = async (appointmentId: number) => {
    try {
      // Buscar todos os agendamentos e filtrar pelo ID
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/appointmens', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Erro ao buscar agendamentos:', response.status);
        return null;
      }

      const data = await response.json();
      const appointments = Array.isArray(data) ? data : [];
      
      // Encontrar o agendamento pelo ID
      const appointment = appointments.find((apt: any) => apt.id === appointmentId || String(apt.id) === String(appointmentId));
      
      return appointment || null;
    } catch (error) {
      console.error('Erro ao buscar agendamento por ID:', error);
      return null;
    }
  };

  // Função para abrir formulário de agendamento pré-preenchido
  const handleOpenAppointmentForm = async (
    alert: AlertWebhookItem,
    dataItem: { data: string; agendamento: string; guia: string; numero_prestador: number | string | null }
  ) => {
    try {
      // Buscar patient_id
      let patientId = alert.patient_id;
      if (!patientId) {
        patientId = await getPatientIdByName(alert.paciente_nome);
      }

      if (!patientId) {
        alert("Não foi possível encontrar o ID do paciente.");
        return;
      }

      // Tentar buscar psychologist_id do appointment_id do alerta
      let psychologistId: number | null = null;
      
      if (alert.appointment_id) {
        const appointment = await fetchAppointmentById(alert.appointment_id);
        if (appointment) {
          psychologistId = appointment.psychologist_id || appointment.psychologistId || null;
        }
      }
      
      // Se não encontrou pelo appointment_id, buscar nos agendamentos anteriores do paciente
      if (!psychologistId) {
        const appointments = await fetchPatientAppointments(patientId);
        const lastAppointment = appointments.length > 0 ? appointments[0] : null;
        
        if (lastAppointment) {
          // Tentar diferentes formatos de psychologist_id
          psychologistId = lastAppointment.psychologist_id || lastAppointment.psychologistId || null;
        }
      }
      
      // Buscar agendamentos anteriores do paciente para outros dados (horários, tipo, etc)
      const appointments = await fetchPatientAppointments(patientId);
      const lastAppointment = appointments.length > 0 ? appointments[0] : null;

      // Converter data do formato DD/MM/YYYY para Date
      const [day, month, year] = dataItem.data.split('/');
      const appointmentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      // Determinar método de pagamento baseado no insurance_type
      const paymentMethod = alert.insurance_type === "Particular" ? "private" : "insurance";
      
      // Preparar dados do formulário
      const formData = {
        patientId: String(patientId),
        psychologistId: psychologistId ? String(psychologistId) : undefined,
        date: appointmentDate,
        startTime: lastAppointment?.start_time || lastAppointment?.startTime || undefined,
        endTime: lastAppointment?.end_time || lastAppointment?.endTime || undefined,
        paymentMethod: paymentMethod,
        insuranceType: alert.insurance_type || undefined,
        appointmentType: lastAppointment?.appointment_type || lastAppointment?.appointmentType || "presential" as "presential" | "online",
      };


      setAppointmentFormData(formData);
      setShowAppointmentForm(true);
    } catch (error) {
      console.error('Erro ao abrir formulário de agendamento:', error);
      alert("Erro ao preparar formulário de agendamento. Tente novamente.");
    }
  };

  // Função para buscar horário do último agendamento de cada paciente
  const fetchLastAppointmentTimes = async (patientIds: number[]) => {
    try {
      const timesMap = new Map<number, { start_time: string; end_time: string }>();
      
      // Buscar último agendamento para cada paciente
      await Promise.all(patientIds.map(async (patientId) => {
        try {
          const appointments = await fetchPatientAppointments(patientId);
          
          // Pegar o primeiro agendamento (já está ordenado por data, mais recente primeiro)
          if (appointments.length > 0) {
            const lastAppointment = appointments[0];
            
            if (lastAppointment.start_time && lastAppointment.end_time) {
              // Formatar horário (remover segundos se houver)
              const startTime = lastAppointment.start_time.includes(':') 
                ? lastAppointment.start_time.substring(0, 5) 
                : lastAppointment.start_time;
              const endTime = lastAppointment.end_time.includes(':') 
                ? lastAppointment.end_time.substring(0, 5) 
                : lastAppointment.end_time;
              
              timesMap.set(patientId, { start_time: startTime, end_time: endTime });
            }
          }
        } catch (error) {
          console.error(`Erro ao buscar horário para paciente ${patientId}:`, error);
        }
      }));
      
      setLastAppointmentTimes(timesMap);
    } catch (error) {
      console.error('Erro ao buscar horários dos agendamentos:', error);
    }
  };

  // Função para buscar data de nascimento dos pacientes
  const fetchPatientsBirthdates = async (patientIds: number[]) => {
    try {
      // Filtrar IDs que ainda não temos no cache
      const uniqueIds = [...new Set(patientIds.filter(id => id))];
      
      if (uniqueIds.length === 0) return;

      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/patients", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        console.error('Erro ao buscar pacientes:', response.status);
        return;
      }

      const patients = await response.json();
      
      // Atualizar cache com callback para ter acesso ao estado atual
      setPatientsBirthdates(prevMap => {
        const newBirthdates = new Map(prevMap);
        
        patients.forEach((patient: any) => {
          if (patient.id && patient.birthdate && uniqueIds.includes(patient.id)) {
            newBirthdates.set(patient.id, patient.birthdate);
          }
        });
        
        return newBirthdates;
      });
    } catch (error) {
      console.error('Erro ao buscar datas de nascimento:', error);
    }
  };

  // Função para salvar alterações do alerta
  const handleSaveAlert = async () => {
    if (!editingAlert) {
      return;
    }

    try {
      setSavingAlert(true);
      
      const requestBody: any = {
        paciente_nome: editingAlert.paciente_nome,
        active: editActive ? "1" : "0",
        motivo: editMotivo
      };

      // Se não temos patient_id, tentar buscar pelo nome
      let patientId = editingAlert.patient_id;
      if (!patientId) {
        patientId = await getPatientIdByName(editingAlert.paciente_nome);
        if (patientId) {
          requestBody.patient_id = patientId;
        }
      } else {
        requestBody.patient_id = patientId;
      }
      
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/alter_alerta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar alterações");
      }

      setShowEditModal(false);
      setEditingAlert(null);
      setEditMotivo("");
      
      // Recarregar os alertas da API para obter os dados atualizados
      await fetchAlerts();
    } catch (error) {
      alert("Erro ao salvar alterações. Tente novamente.");
    } finally {
      setSavingAlert(false);
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto">
        <AppointmentCalendar />
      </div>

      {showAlertModal && canViewAlerts && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4"
          onClick={() => setShowAlertModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mt-4 md:mt-8 max-h-[95vh] md:max-h-[90vh] overflow-hidden mx-2 md:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-3 md:p-4 flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-bold">Alertas do Sistema</h2>
              <button
                onClick={() => setShowAlertModal(false)}
                className="p-1 rounded-full hover:bg-white/20 transition"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            <div className="p-3 md:p-6 max-h-[calc(95vh-100px)] md:max-h-[calc(90vh-120px)] overflow-y-auto">
              <Tabs defaultValue="alerts" className="w-full">
                <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <TabsTrigger value="alerts" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Alertas do Sistema
                  </TabsTrigger>
                  <TabsTrigger value="availability" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Disponibilidade dos Psicólogos
                  </TabsTrigger>
                  {isAdmin && (
                    <TabsTrigger value="guide-request" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Controle Solicitação GUIA
                    </TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="alerts" className="mt-6">
                  {loadingAlerts && (
                    <div className="text-gray-600">Carregando alertas...</div>
                  )}
                  {!loadingAlerts && alertError && (
                    <div className="text-rose-600">{alertError}</div>
                  )}
                  {!loadingAlerts && !alertError && alertItems.length === 0 && (
                    <div className="text-gray-600">Nenhum alerta encontrado.</div>
                  )}

                  {!loadingAlerts && !alertError && alertItems.length > 0 && (
                    <div className="space-y-4 max-w-full">
                      {/* Alertas da API */}
                      <Card className="w-full">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-blue-600" />
                            Alertas do Sistema
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                          {/* Cabeçalho da tabela - oculto em mobile */}
                          <div className="hidden md:flex items-center px-4 py-2 bg-gray-100 text-sm font-medium text-gray-700 mb-1">
                            <div className="flex items-center gap-2 flex-1">
                              <User className="h-4 w-4" />
                              <span>Paciente</span>
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              <Calendar className="h-4 w-4" />
                              <span>Datas e Status</span>
                            </div>
                            <div className="flex items-center gap-2 w-20">
                              <span>Ações</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            {(() => {
                              // Filtrar alertas (mas incluir active = 0 para mostrar no final)
                              const filteredAlerts = alertItems.filter((alert) => {
                                // Se active = 1, sempre mostrar
                                if (alert.active === 1 || alert.active === "1") {
                                  return true;
                                }
                                
                                // Se active = 0, incluir para mostrar no final
                                if (alert.active === 0 || alert.active === "0") {
                                  return true;
                                }
                                
                                // Filtrar pacientes que têm todas as datas e guias "ok"
                                if (!alert.datas || !Array.isArray(alert.datas)) {
                                  return true; // Mostrar se não tem datas (erro)
                                }
                                
                                // Verificar se todas as guias estão "ok"
                                const todasGuiasOk = alert.datas && alert.datas.every(dataItem => dataItem.guia === "ok");
                                
                                // Se todas as guias estão ok, não mostrar
                                if (todasGuiasOk) {
                                  return false;
                                }
                                
                                return true; // Mostrar se tem pelo menos uma guia com problema
                              });
                              
                              // Separar alertas ativos (active = 1) e desabilitados (active = 0)
                              const alertasAtivos = filteredAlerts.filter(alert => 
                                alert.active === 1 || alert.active === "1"
                              );
                              const alertasDesabilitados = filteredAlerts.filter(alert => 
                                alert.active === 0 || alert.active === "0"
                              );
                              
                              // Agrupar por dia da semana apenas os ativos
                              const groupedAlertsAtivos = groupAlertsByDay(alertasAtivos);
                              
                              // Para os desabilitados, criar um único grupo "Pacientes Desabilitados"
                              const groupedAlertsDesabilitados = alertasDesabilitados.length > 0 ? [{
                                day: 'Pacientes Desabilitados',
                                dayNumber: 9,
                                alerts: alertasDesabilitados
                              }] : [];
                              
                              // Combinar: ativos primeiro, depois desabilitados
                              const groupedAlerts = [...groupedAlertsAtivos, ...groupedAlertsDesabilitados];
                              
                              return groupedAlerts.map((group) => (
                                <div key={group.day} className="space-y-1">
                                  {/* Cabeçalho do grupo */}
                                  <div className={`px-4 py-2 border-l-4 ${
                                    group.day === 'Pacientes Desabilitados' 
                                      ? 'bg-gray-100 border-gray-500' 
                                      : 'bg-blue-100 border-blue-500'
                                  }`}>
                                    <div className="flex items-center gap-2">
                                      <span className={`font-semibold text-sm ${
                                        group.day === 'Pacientes Desabilitados' 
                                          ? 'text-gray-800' 
                                          : 'text-blue-800'
                                      }`}>{group.day}</span>
                                      <span className={`text-xs ${
                                        group.day === 'Pacientes Desabilitados' 
                                          ? 'text-gray-600' 
                                          : 'text-blue-600'
                                      }`}>({group.alerts.length} {group.alerts.length === 1 ? 'paciente' : 'pacientes'})</span>
                                    </div>
                                  </div>
                                  {/* Alertas do grupo */}
                                  {group.alerts.map((alert, index) => {
                              // Determinar se o alerta está ativo ou desabilitado
                              const isActive = alert.active === 1 || alert.active === "1";
                              const alertColor = isActive ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200";
                              
                              return (
                                <div key={index} className={`flex flex-col md:flex-row md:items-center gap-3 md:gap-0 px-3 md:px-4 py-3 rounded text-sm hover:bg-opacity-80 transition-colors border-l-4 ${alertColor}`}>
                                  {/* Nome do Paciente */}
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <User className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium break-words">{alert.paciente_nome}</span>
                                        {(() => {
                                          // Tentar usar birthdate do alert, ou buscar do cache se tiver patient_id
                                          const birthdate = alert.birthdate || (alert.patient_id ? patientsBirthdates.get(alert.patient_id) : undefined);
                                          const categoria = getCategoriaEtaria(birthdate);
                                          
                                          return categoria ? (
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                                              categoria === "Criança" 
                                                ? "bg-orange-100 text-orange-700" 
                                                : "bg-blue-100 text-blue-700"
                                            }`}>
                                              {categoria}
                                            </span>
                                          ) : null;
                                        })()}
                                      </div>
                                      {alert.insurance_type && (
                                        <span className="text-xs text-gray-500">Plano: {alert.insurance_type}</span>
                                      )}
                                      {alert.patient_id && (() => {
                                        const timeInfo = lastAppointmentTimes.get(alert.patient_id);
                                        if (timeInfo) {
                                          return (
                                            <span className="text-xs">
                                              <span className="text-black">Horário:</span>{' '}
                                              <span className="text-sm font-bold text-purple-600">
                                                {timeInfo.start_time} - {timeInfo.end_time}
                                              </span>
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                      {!isActive && (
                                        <div className="flex flex-col">
                                          <span className="text-xs text-red-600 font-medium">⚠️ Paciente Desistiu</span>
                                          {alert.motivo && (
                                            <span className="text-xs text-gray-600">Motivo: {alert.motivo}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Datas e Status */}
                                  <div className="flex flex-col gap-2 flex-1 min-w-0 md:items-start">
                                    <div className="flex flex-col gap-2 w-full">
                                      {alert.datas && Array.isArray(alert.datas) ? (() => {
                                        // Calcular data de hoje para comparação
                                        const hoje = new Date();
                                        hoje.setHours(0, 0, 0, 0);
                                        
                                        // Calcular data inicial (primeiro dia do mês atual) e fim (primeira semana completa do mês seguinte)
                                        const anoAtual = hoje.getFullYear();
                                        const mesAtual = hoje.getMonth();
                                        
                                        // Data inicial: primeiro dia do mês atual (mostra todo o mês atual)
                                        const primeiroDiaMes = new Date(anoAtual, mesAtual, 1);
                                        primeiroDiaMes.setHours(0, 0, 0, 0);
                                        
                                        // Primeiro dia do mês seguinte
                                        const primeiroDiaMesSeguinte = new Date(anoAtual, mesAtual + 1, 1);
                                        // Fim da primeira semana do mês seguinte (dia 7)
                                        const fimPrimeiraSemanaMesSeguinte = new Date(primeiroDiaMesSeguinte);
                                        fimPrimeiraSemanaMesSeguinte.setDate(7); // Dia 7 do mês seguinte
                                        fimPrimeiraSemanaMesSeguinte.setHours(23, 59, 59, 999);
                                        
                                        // Filtrar datas: todo o mês atual (semana 1 até última semana) + 1 semana do mês seguinte
                                        const datasFiltradas = alert.datas.filter((dataItem) => {
                                          const [day, month, year] = dataItem.data.split('/');
                                          const dataObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                          dataObj.setHours(0, 0, 0, 0);
                                          
                                          // Incluir datas: todo o mês atual + 1 semana do mês seguinte
                                          const isIncluded = dataObj >= primeiroDiaMes && dataObj <= fimPrimeiraSemanaMesSeguinte;
                                          
                                          return isIncluded;
                                        });
                                        
                                        // Ordenar datas (ordem cronológica crescente)
                                        const datasOrdenadas = datasFiltradas.sort((a, b) => {
                                          const [dayA, monthA, yearA] = a.data.split('/');
                                          const [dayB, monthB, yearB] = b.data.split('/');
                                          const dataObjA = new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA));
                                          const dataObjB = new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB));
                                          return dataObjA.getTime() - dataObjB.getTime();
                                        });
                                        
                                        return datasOrdenadas.map((dataItem, idx) => {
                                          // Converter data para comparação
                                          const [day, month, year] = dataItem.data.split('/');
                                          const dataObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                          const hojeCompare = new Date();
                                          hojeCompare.setHours(0, 0, 0, 0);
                                          dataObj.setHours(0, 0, 0, 0);
                                          
                                          // Verificar se é a data atual
                                          const isHoje = dataObj.getTime() === hojeCompare.getTime();
                                          
                                          // Determinar cores para agendamento
                                          const agendamentoColor = dataItem.agendamento === "ok" ? "bg-green-200 text-green-900" : 
                                                                 dataItem.agendamento === "warning" ? "bg-yellow-200 text-yellow-900" :
                                                                 dataItem.agendamento === "error" ? "bg-red-200 text-red-900" :
                                                                 "bg-blue-200 text-blue-900";
                                          
                                          // Verificar se é paciente Particular (não mostrar guias)
                                          const isParticular = alert.insurance_type === "Particular";
                                          
                                          // Determinar cores para guia
                                          const guiaColor = dataItem.guia === "ok" ? "bg-green-200 text-green-900" : 
                                                           dataItem.guia === "falta" ? "bg-red-200 text-red-900" :
                                                           "bg-blue-200 text-blue-900";
                                          
                                          return (
                                            <div key={idx} className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-md ${isHoje ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-50/50' : 'bg-gray-50/50'}`}>
                                              <span className={`text-xs font-medium min-w-[90px] sm:min-w-[80px] ${isHoje ? 'font-bold text-blue-700' : 'text-gray-600'}`}>
                                                {dataItem.data}
                                                {isHoje && <span className="ml-1 text-blue-600">●</span>}
                                              </span>
                                              <div className="flex flex-wrap gap-1.5 sm:gap-1">
                                                {dataItem.agendamento === "falta" ? (
                                                  <span 
                                                    className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${agendamentoColor} cursor-pointer hover:opacity-80 transition-opacity`}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleOpenAppointmentForm(alert, dataItem);
                                                    }}
                                                    title="Clique para criar agendamento"
                                                  >
                                                    📅 falta agendamento
                                                  </span>
                                                ) : (
                                                  <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${agendamentoColor}`}>
                                                    📅 {dataItem.agendamento}
                                                  </span>
                                                )}
                                                {!isParticular && (
                                                <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${guiaColor}`}>
                                                  📋 {dataItem.guia === "falta" ? "falta guia" : dataItem.guia}
                                                </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        });
                                      })() : (
                                        <span className="text-xs text-gray-500">Paciente sem agendamentos/guias</span>
                                      )}
                                    </div>
                                  </div>
                                            
                                  {/* Botão Editar */}
                                  <div className="flex items-center justify-end md:justify-start gap-2 md:w-20 mt-2 md:mt-0">
                                    <button
                                      onClick={() => handleEditAlert(alert)}
                                      className="p-2 md:p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      title="Editar alerta"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                                </div>
                              ));
                            })()}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                </TabsContent>
                
                <TabsContent value="availability" className="mt-6">
                  <PsychologistAvailabilityDashboard 
                    appointments={[]}
                    workingHours={[]}
                    users={[]}
                    loading={false}
                    error={null}
                    onRefresh={() => {
                      // Recarregar dados se necessário
                      window.location.reload();
                    }}
                  />
                </TabsContent>

                {/* Aba Controle Solicitação GUIA - Apenas para Admin */}
                {isAdmin && (
                  <TabsContent value="guide-request" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          Controle Solicitação GUIA
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {loadingAlerts ? (
                          <div className="text-gray-600">Carregando...</div>
                        ) : (
                          (() => {
                            const patientsWithoutGuide = getPatientsWithoutGuide();
                            if (patientsWithoutGuide.length === 0) {
                              return (
                                <div className="text-gray-600 text-center py-8">
                                  Nenhum paciente com agendamento sem guia encontrado.
                                </div>
                              );
                            }
                            return (
                              <div className="space-y-4">
                                {patientsWithoutGuide.map((item, index) => (
                                  <div
                                    key={`${item.patient.patient_id}-${index}`}
                                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                      <div className="flex-1">
                                        <p className="font-semibold text-gray-900 mb-2">
                                          Paciente {item.patient.paciente_nome}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          <span className="text-sm text-gray-600">Datas de agendamento sem guias:</span>
                                          {item.datesWithoutGuide.map((date, dateIndex) => (
                                            <span
                                              key={dateIndex}
                                              className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm font-medium"
                                            >
                                              {date}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                      <Button
                                        onClick={() => {
                                          setSolicitarGuiaData({
                                            patient: item.patient,
                                            datesToShow: item.datesWithoutGuide
                                          });
                                          setShowSolicitarGuiaModal(true);
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                      >
                                        Solicitar guia
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Alerta */}
      {showEditModal && editingAlert && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-lg font-bold">Editar Alerta</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-full hover:bg-white/20 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Paciente:</strong> {editingAlert.paciente_nome}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Total de Datas:</strong> {editingAlert.datas ? editingAlert.datas.length : 0}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="active" className="text-sm font-medium text-gray-700">
                    Alerta ativo
                  </label>
                </div>

                <div>
                  <label htmlFor="motivo" className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo (opcional)
                  </label>
                  <textarea
                    id="motivo"
                    value={editMotivo}
                    onChange={(e) => setEditMotivo(e.target.value)}
                    placeholder="Digite o motivo da alteração..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={savingAlert}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAlert}
                  disabled={savingAlert}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingAlert && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {savingAlert ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Formulário de Agendamento Pré-preenchido */}
      {showAppointmentForm && appointmentFormData && (
        <Dialog open={showAppointmentForm} onOpenChange={setShowAppointmentForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <AppointmentForm
              selectedDate={appointmentFormData.date || new Date()}
              onClose={() => {
                setShowAppointmentForm(false);
                setAppointmentFormData(null);
                // Recarregar alertas após criar agendamento
                fetchAlerts();
              }}
              onAppointmentCreated={() => {
                // Recarregar alertas após criar agendamento
                fetchAlerts();
              }}
              initialPatientId={appointmentFormData.patientId}
              initialPsychologistId={appointmentFormData.psychologistId}
              initialDate={appointmentFormData.date}
              initialStartTime={appointmentFormData.startTime}
              initialEndTime={appointmentFormData.endTime}
              initialPaymentMethod={appointmentFormData.paymentMethod}
              initialInsuranceType={appointmentFormData.insuranceType}
              initialAppointmentType={appointmentFormData.appointmentType}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Solicitar Guia */}
      {showSolicitarGuiaModal && solicitarGuiaData && (
        <SolicitarGuiaModal
          isOpen={showSolicitarGuiaModal}
          onClose={() => {
            setShowSolicitarGuiaModal(false);
            setSolicitarGuiaData(null);
          }}
          patient={solicitarGuiaData.patient}
          datesToShow={solicitarGuiaData.datesToShow}
          onSuccess={() => {
            // Recarregar alertas após solicitar guia
            fetchAlerts();
          }}
        />
      )}
    </Layout>
  );
};

export default Index;