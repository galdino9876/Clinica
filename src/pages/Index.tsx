
import AppointmentCalendar from "@/components/AppointmentCalendar";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useEffect, useMemo, useState } from "react";
import { X, AlertTriangle, Calendar, ClipboardList, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type AlertWebhookItem = {
  numero_prestador?: number | string;
  id_patient: number;
  paciente_nome: string;
  controle_datas?: string | null; // CSV "YYYY-MM-DD, ..."
  appointment_datas?: string | null; // CSV "YYYY-MM-DD, ..."
};

const parseCsvDatesToMonthMap = (csv: string | null | undefined, year: number, monthIndex: number) => {
  if (!csv) return new Set<number>();
  const dates = csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const result = new Set<number>();
  for (const d of dates) {
    const [y, m, day] = d.split("-").map((v) => parseInt(v, 10));
    if (!isNaN(y) && !isNaN(m) && !isNaN(day)) {
      if (y === year && m - 1 === monthIndex) {
        result.add(day);
      }
    }
  }
  return result;
};

const getWeeksInMonth = (year: number, monthIndex: number) => {
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const offset = firstDay.getDay(); // 0..6 (Sun..Sat)
  return Math.ceil((offset + daysInMonth) / 7);
};

const getWeekOfMonth = (year: number, monthIndex: number, day: number) => {
  const firstDay = new Date(year, monthIndex, 1);
  const offset = firstDay.getDay();
  return Math.ceil((offset + day) / 7);
};

// Função para calcular as datas esperadas baseadas no padrão de atendimento
const calculateExpectedDates = (appointmentDates: number[], year: number, monthIndex: number) => {
  try {
    if (!appointmentDates || appointmentDates.length === 0) return [];
    
    // Ordenar as datas
    const sortedDates = [...appointmentDates].sort((a, b) => a - b);
    
    // Encontrar o padrão (intervalo entre as datas)
    let interval = 7; // Padrão semanal por padrão
    
    if (sortedDates.length >= 2) {
      // Calcular o intervalo mais comum entre as datas
      const intervals = [];
      for (let i = 1; i < sortedDates.length; i++) {
        intervals.push(sortedDates[i] - sortedDates[i - 1]);
      }
      
      // Usar o intervalo mais frequente
      const intervalCounts = intervals.reduce((acc, interval) => {
        acc[interval] = (acc[interval] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      const intervalKeys = Object.keys(intervalCounts);
      if (intervalKeys.length > 0) {
        interval = parseInt(intervalKeys.reduce((a, b) => 
          intervalCounts[parseInt(a)] > intervalCounts[parseInt(b)] ? a : b
        ));
      }
    }
    
    // Calcular a data de início (primeira data)
    const startDate = sortedDates[0];
    
    // Calcular todas as datas esperadas até o final do mês
    const expectedDates = [];
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    for (let date = startDate; date <= daysInMonth; date += interval) {
      expectedDates.push(date);
    }
    
    return expectedDates;
  } catch (error) {
    console.error('Error in calculateExpectedDates:', error);
    return [];
  }
};

// Função para formatar data para exibição
const formatDateForDisplay = (day: number, year: number, monthIndex: number) => {
  try {
    if (!day || !year || monthIndex === undefined) {
      return day?.toString() || 'N/A';
    }
    const month = monthIndex + 1;
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error in formatDateForDisplay:', error);
    return day?.toString() || 'N/A';
  }
};

const Index = () => {
  const { user } = useAuth();
  const [showAlertModal, setShowAlertModal] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertItems, setAlertItems] = useState<AlertWebhookItem[]>([]);

  // Verificação de permissões do usuário
  const isAdmin = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";
  const isPsychologist = user?.role === "psychologist";
  const canViewAlerts = isAdmin || isReceptionist; // Apenas admin e recepcionista podem ver alertas

  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth(); // 0-based
  const monthLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  useEffect(() => {
    // Só buscar alertas se o usuário tem permissão para vê-los
    if (!canViewAlerts) {
      setShowAlertModal(false);
      return;
    }

    let aborted = false;
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
        if (!aborted) {
          const arr: AlertWebhookItem[] = Array.isArray(data) ? data : [];
          setAlertItems(arr);
        }
      } catch (e: any) {
        if (!aborted) setAlertError(e?.message || "Erro desconhecido");
      } finally {
        if (!aborted) setLoadingAlerts(false);
      }
    };
    fetchAlerts();
    return () => {
      aborted = true;
    };
  }, [canViewAlerts]);

  const computedAlerts = useMemo(() => {
    const totalWeeks = getWeeksInMonth(year, monthIndex);
    const lastWeekNow = getWeekOfMonth(year, monthIndex, now.getDate()) === totalWeeks;
    const nextMonthIndex = (monthIndex + 1) % 12;
    const nextMonthYear = monthIndex === 11 ? year + 1 : year;

    console.log('🔍 Debug Alert System:', {
      year,
      monthIndex,
      totalWeeks,
      lastWeekNow,
      alertItemsCount: alertItems.length,
      alertItems: alertItems.map(item => ({
        id: item.id_patient,
        nome: item.paciente_nome,
        appointment_datas: item.appointment_datas,
        controle_datas: item.controle_datas
      }))
    });

    return alertItems.map((item) => {
      const monthAppointmentsDays = parseCsvDatesToMonthMap(item.appointment_datas, year, monthIndex);
      const monthControlDays = parseCsvDatesToMonthMap(item.controle_datas, year, monthIndex);

      // Only consider current month
      const appointmentWeeks = new Set(
        Array.from(monthAppointmentsDays).map((d) => getWeekOfMonth(year, monthIndex, d))
      );
      const controlWeeks = new Set(
        Array.from(monthControlDays).map((d) => getWeekOfMonth(year, monthIndex, d))
      );

      console.log(`🔍 Patient ${item.paciente_nome}:`, {
        appointment_datas: item.appointment_datas,
        controle_datas: item.controle_datas,
        monthAppointmentsDays: Array.from(monthAppointmentsDays),
        monthControlDays: Array.from(monthControlDays),
        appointmentWeeks: Array.from(appointmentWeeks),
        controlWeeks: Array.from(controlWeeks),
        totalWeeks
      });

      const hasAppointmentsThisMonth = appointmentWeeks.size > 0;
      const hasControlsThisMonth = controlWeeks.size > 0;

      // 1. Alertas específicos por data - agendamentos sem guia correspondente
      const appointmentsWithoutGuides: number[] = [];
      monthAppointmentsDays.forEach(day => {
        if (!monthControlDays.has(day)) {
          appointmentsWithoutGuides.push(day);
        }
      });

      // 2. Verificar se há agendamentos para a primeira semana do próximo mês
      let needsNextMonthScheduling = false;
      let hasAppointmentsInLastWeek = false;
      let nextMonthAppointmentsCount = 0;
      
      if (lastWeekNow) {
        // Verificar se o paciente tem agendamentos na última semana do mês atual
        const lastWeekAppointments = Array.from(monthAppointmentsDays).filter(day => 
          getWeekOfMonth(year, monthIndex, day) === totalWeeks
        );
        hasAppointmentsInLastWeek = lastWeekAppointments.length > 0;
        
        // Verificar agendamentos para o próximo mês
        const nextMonthAppointments = parseCsvDatesToMonthMap(
          item.appointment_datas,
          nextMonthYear,
          nextMonthIndex
        );
        nextMonthAppointmentsCount = nextMonthAppointments.size;
        
        // Verificar especificamente a primeira semana do próximo mês
        const nextMonthFirstWeekAppointments = Array.from(nextMonthAppointments).filter(day => 
          getWeekOfMonth(nextMonthYear, nextMonthIndex, day) === 1
        );
        
        // Alerta se tem agendamentos na última semana mas não tem para o próximo mês
        needsNextMonthScheduling = hasAppointmentsInLastWeek && nextMonthAppointmentsCount === 0;
      }

      // 3. Verificar se há agendamentos apenas para algumas semanas mas faltam para outras
      const appointmentWeeksArray = Array.from(appointmentWeeks).sort((a, b) => a - b);
      const controlWeeksArray = Array.from(controlWeeks).sort((a, b) => a - b);
      
      // Detectar semanas com agendamentos mas sem guias
      const weeksWithAppointmentsButNoGuides: number[] = [];
      appointmentWeeksArray.forEach(week => {
        if (!controlWeeksArray.includes(week)) {
          weeksWithAppointmentsButNoGuides.push(week);
        }
      });

      // 4. Verificar se há agendamentos apenas para algumas semanas mas faltam para outras
      let needsGuidesForLaterWeeks = false;
      let missingWeeksForGuides: number[] = [];
      
      if (hasAppointmentsThisMonth && hasControlsThisMonth) {
        // Verificar se há agendamentos mas faltam guias para semanas específicas
        for (let week = 1; week <= totalWeeks; week++) {
          if (appointmentWeeksArray.includes(week) && !controlWeeksArray.includes(week)) {
            missingWeeksForGuides.push(week);
          }
        }
        
        if (missingWeeksForGuides.length > 0) {
          needsGuidesForLaterWeeks = true;
        }
      }

      // 5. Verificar se há agendamentos apenas para algumas semanas do mês (padrão semanal)
      let needsMoreAppointmentsForWeeklyPattern = false;
      let missingWeeksForAppointments: number[] = [];
      
      if (hasAppointmentsThisMonth) {
        // Se há agendamentos apenas para algumas semanas, verificar se deveria ter para todas as semanas
        const hasAppointmentsInMultipleWeeks = appointmentWeeksArray.length > 1;
        const hasAppointmentsInConsecutiveWeeks = appointmentWeeksArray.every((week, index) => 
          index === 0 || week === appointmentWeeksArray[index - 1] + 1
        );
        
        // Se há agendamentos em semanas não consecutivas ou apenas em algumas semanas
        if (hasAppointmentsInMultipleWeeks && !hasAppointmentsInConsecutiveWeeks) {
          // Encontrar semanas que têm agendamentos mas não têm guias
          for (let week = 1; week <= totalWeeks; week++) {
            if (appointmentWeeksArray.includes(week) && !controlWeeksArray.includes(week)) {
              missingWeeksForAppointments.push(week);
            }
          }
          
          if (missingWeeksForAppointments.length > 0) {
            needsMoreAppointmentsForWeeklyPattern = true;
          }
        }
      }

      // 6. LÓGICA INTELIGENTE: Detectar guias faltantes e agendamentos faltantes
      let needsMoreAppointmentsForCompleteMonth = false;
      let missingDatesForCompleteMonth: number[] = [];
      let missingDatesForGuides: number[] = [];
      
      if (hasAppointmentsThisMonth) {
        try {
          // PRIMEIRO: Verificar se agendamentos e guias estão sincronizados
          const appointmentsArray = Array.from(monthAppointmentsDays).sort((a, b) => a - b);
          const controlsArray = Array.from(monthControlDays).sort((a, b) => a - b);
          
          // Verificar se agendamentos e guias estão sincronizados (mas ainda pode faltar mais agendamentos)
          const appointmentsMatch = appointmentsArray.length === controlsArray.length && 
            appointmentsArray.every((date, index) => date === controlsArray[index]);
          
          if (appointmentsMatch) {
            console.log(`✅ ${item.paciente_nome}: Agendamentos e guias estão sincronizados para as datas existentes`);
            // Continuar para verificar se faltam mais agendamentos
          }
          
          // Sempre verificar se faltam agendamentos/guias (independente de estarem sincronizados)
          {
            // 1. Detectar guias faltantes para agendamentos existentes
            const missingGuideDates = appointmentsArray.filter(date => 
              !monthControlDays.has(date)
            );
            
            // 2. Detectar agendamentos faltantes baseados no padrão semanal
            let missingAppointmentDates: number[] = [];
            
            if (appointmentsArray.length >= 1) {
              let interval = 7; // Padrão semanal por padrão
              
              if (appointmentsArray.length >= 2) {
                // Calcular intervalo entre agendamentos
                const intervals = [];
                for (let i = 1; i < appointmentsArray.length; i++) {
                  intervals.push(appointmentsArray[i] - appointmentsArray[i - 1]);
                }
                
                // Encontrar o intervalo mais comum (padrão semanal)
                const intervalCounts = intervals.reduce((acc, interval) => {
                  acc[interval] = (acc[interval] || 0) + 1;
                  return acc;
                }, {} as Record<number, number>);
                
                const mostCommonInterval = parseInt(Object.keys(intervalCounts).reduce((a, b) =>
                  intervalCounts[parseInt(a)] > intervalCounts[parseInt(b)] ? a : b
                ));
                
                interval = mostCommonInterval;
              }
              
              // Se o intervalo é 7 dias (semanal) ou é um agendamento único, calcular datas faltantes
              if (interval === 7 || appointmentsArray.length === 1) {
                const lastAppointment = appointmentsArray[appointmentsArray.length - 1];
                const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
                
                // Calcular próximas datas baseadas no padrão semanal
                for (let date = lastAppointment + 7; date <= daysInMonth; date += 7) {
                  if (!monthAppointmentsDays.has(date)) {
                    missingAppointmentDates.push(date);
                  }
                }
              }
            }
            
            console.log(`🔍 Analysis for ${item.paciente_nome}:`, {
              appointmentDates: appointmentsArray,
              controlDates: controlsArray,
              missingGuideDates,
              missingAppointmentDates,
              appointmentsMatch,
              lastAppointment: appointmentsArray[appointmentsArray.length - 1],
              daysInMonth: new Date(year, monthIndex + 1, 0).getDate(),
              interval: appointmentsArray.length >= 2 ? 'calculated' : 7
            });
            
            if (missingGuideDates.length > 0) {
              missingDatesForGuides = missingGuideDates;
              needsMoreAppointmentsForWeeklyPattern = true;
            }
            
            if (missingAppointmentDates.length > 0) {
              missingDatesForCompleteMonth = missingAppointmentDates;
              needsMoreAppointmentsForCompleteMonth = true;
            }
          }
        } catch (error) {
          console.error('Error in smart date detection:', error);
        }
      }

      // 7. LÓGICA ADICIONAL: Detectar se há agendamentos mas faltam guias para datas específicas
      if (hasAppointmentsThisMonth && hasControlsThisMonth) {
        // Verificar se há agendamentos que não têm guias correspondentes
        const appointmentsWithoutGuides = Array.from(monthAppointmentsDays).filter(date => 
          !monthControlDays.has(date)
        );
        
        if (appointmentsWithoutGuides.length > 0) {
          // Evitar duplicatas
          const uniqueMissingGuides = [...new Set([...missingDatesForGuides, ...appointmentsWithoutGuides])];
          missingDatesForGuides = uniqueMissingGuides;
          needsMoreAppointmentsForWeeklyPattern = true;
        }
      }
      
      // 8. VERIFICAÇÃO FINAL: Se agendamentos e guias estão sincronizados, limpar apenas alertas de guias duplicadas
      if (hasAppointmentsThisMonth && hasControlsThisMonth) {
        const appointmentsArray = Array.from(monthAppointmentsDays).sort((a, b) => a - b);
        const controlsArray = Array.from(monthControlDays).sort((a, b) => a - b);
        const appointmentsMatch = appointmentsArray.length === controlsArray.length && 
          appointmentsArray.every((date, index) => date === controlsArray[index]);
        
        if (appointmentsMatch) {
          // Limpar apenas guias faltantes para agendamentos EXISTENTES (não futuros)
          missingDatesForGuides = missingDatesForGuides.filter(date => 
            !monthAppointmentsDays.has(date)
          );
          appointmentsWithoutGuides.length = 0;
          // Manter missingDatesForCompleteMonth - ainda pode faltar agendamentos futuros
        }
      }

      // 5. Verificar se o mês tem 4 semanas e se há guias apenas para semanas iniciais
      let needsMoreGuidesForRestOfMonth = false;
      if (totalWeeks === 4 && hasControlsThisMonth) {
        const hasOnlyEarlyWeeks = controlWeeksArray.length > 0 && 
          controlWeeksArray.every(week => week <= 2) && 
          !controlWeeksArray.includes(3) && !controlWeeksArray.includes(4);
        
        if (hasOnlyEarlyWeeks) {
          needsMoreGuidesForRestOfMonth = true;
        }
      }

      // 6. Pacientes sem guia para este mês (caso geral)
      const noGuides = hasAppointmentsThisMonth && !hasControlsThisMonth;

      const result = {
        id_patient: item.id_patient,
        paciente_nome: item.paciente_nome,
        totalWeeks,
        appointmentWeeks: Array.from(appointmentWeeks).sort((a, b) => a - b),
        controlWeeks: Array.from(controlWeeks).sort((a, b) => a - b),
        appointmentDates: Array.from(monthAppointmentsDays).sort((a, b) => a - b),
        controlDates: Array.from(monthControlDays).sort((a, b) => a - b),
        appointmentsWithoutGuides: appointmentsWithoutGuides.sort((a, b) => a - b),
        weeksWithAppointmentsButNoGuides,
        missingWeeksForGuides,
        missingWeeksForAppointments,
        missingWeeksForCompleteMonth: [],
        missingDatesForCompleteMonth: missingDatesForCompleteMonth.sort((a, b) => a - b),
        missingDatesForGuides: missingDatesForGuides.sort((a, b) => a - b),
        noGuides,
        needsNextMonthScheduling,
        hasAppointmentsInLastWeek,
        nextMonthAppointmentsCount,
        needsGuidesForLaterWeeks,
        needsMoreAppointmentsForWeeklyPattern,
        needsMoreAppointmentsForCompleteMonth,
        needsMoreGuidesForRestOfMonth,
      };

      console.log(`🔍 Result for ${item.paciente_nome}:`, {
        hasAppointmentsThisMonth,
        hasControlsThisMonth,
        appointmentsWithoutGuides: result.appointmentsWithoutGuides,
        weeksWithAppointmentsButNoGuides: result.weeksWithAppointmentsButNoGuides,
        missingWeeksForGuides: result.missingWeeksForGuides,
        missingWeeksForAppointments: result.missingWeeksForAppointments,
        missingWeeksForCompleteMonth: result.missingWeeksForCompleteMonth,
        noGuides: result.noGuides,
        needsNextMonthScheduling: result.needsNextMonthScheduling,
        needsGuidesForLaterWeeks: result.needsGuidesForLaterWeeks,
        needsMoreAppointmentsForWeeklyPattern: result.needsMoreAppointmentsForWeeklyPattern,
        needsMoreAppointmentsForCompleteMonth: result.needsMoreAppointmentsForCompleteMonth,
        needsMoreGuidesForRestOfMonth: result.needsMoreGuidesForRestOfMonth
      });

      return result;
    })
    // Show only patients with relevant alerts
    .filter((a) => {
      try {
        const hasAlerts = a.appointmentWeeks.length > 0 && (
          (a.appointmentsWithoutGuides && a.appointmentsWithoutGuides.length > 0) || 
          (a.weeksWithAppointmentsButNoGuides && a.weeksWithAppointmentsButNoGuides.length > 0) ||
          (a.missingWeeksForGuides && a.missingWeeksForGuides.length > 0) ||
          (a.missingWeeksForAppointments && a.missingWeeksForAppointments.length > 0) ||
          (a.missingWeeksForCompleteMonth && a.missingWeeksForCompleteMonth.length > 0) ||
          (a.missingDatesForCompleteMonth && a.missingDatesForCompleteMonth.length > 0) ||
          (a.missingDatesForGuides && a.missingDatesForGuides.length > 0) ||
          a.noGuides || 
          a.needsNextMonthScheduling || 
          a.needsGuidesForLaterWeeks ||
          a.needsMoreAppointmentsForWeeklyPattern ||
          a.needsMoreAppointmentsForCompleteMonth ||
          a.needsMoreGuidesForRestOfMonth
        );
        
        console.log(`🔍 Filter result for ${a.paciente_nome}:`, {
          hasAlerts,
          appointmentWeeks: a.appointmentWeeks,
          hasAppointmentWeeks: a.appointmentWeeks.length > 0,
          missingDatesForCompleteMonth: a.missingDatesForCompleteMonth,
          missingDatesForGuides: a.missingDatesForGuides,
          needsMoreAppointmentsForWeeklyPattern: a.needsMoreAppointmentsForWeeklyPattern,
          needsMoreAppointmentsForCompleteMonth: a.needsMoreAppointmentsForCompleteMonth
        });
        
        return hasAlerts;
      } catch (error) {
        console.error('Error in filter:', error);
        return false;
      }
    });
  }, [alertItems, monthIndex, year, now]);

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
            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mt-8 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-amber-500 to-rose-500 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5" />
                <h2 className="text-lg font-bold capitalize">Alertas de Agendamentos — {monthLabel}</h2>
              </div>
              <button
                onClick={() => setShowAlertModal(false)}
                className="p-2 rounded-full hover:bg-white/20 transition"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {loadingAlerts && (
                <div className="text-gray-600">Carregando alertas...</div>
              )}
              {!loadingAlerts && alertError && (
                <div className="text-rose-600">{alertError}</div>
              )}
              {!loadingAlerts && !alertError && computedAlerts.length === 0 && (
                <div className="text-gray-600">Sem alertas para este mês.</div>
              )}

              {!loadingAlerts && !alertError && computedAlerts.length > 0 && (
                <div className="space-y-4 max-w-full">
                  {/* Alertas Consolidados */}
                  <Card className="w-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-blue-600" />
                        Alertas de Agendamentos e Guias
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 pb-0">
                      {/* Cabeçalho da tabela */}
                      <div className="flex items-center px-4 py-2 bg-gray-100 text-sm font-medium text-gray-700 mb-1">
                        <div className="flex items-center gap-2 flex-1">
                          <User className="h-4 w-4" />
                          <span>Nome do Paciente</span>
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <span>Status do Alerta</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {computedAlerts
                          .filter(a => 
                            (a.needsMoreAppointmentsForCompleteMonth && a.missingDatesForCompleteMonth && a.missingDatesForCompleteMonth.length > 0) ||
                            (a.needsMoreAppointmentsForWeeklyPattern && a.missingDatesForGuides && a.missingDatesForGuides.length > 0) ||
                            (a.appointmentsWithoutGuides && a.appointmentsWithoutGuides.length > 0) ||
                            a.noGuides || 
                            a.needsMoreGuidesForRestOfMonth || 
                            a.needsNextMonthScheduling
                          )
                          .map((a) => {
                            // Agendamentos faltantes
                            const missingAppointments = a.missingDatesForCompleteMonth || [];
                            
                            // Guias faltantes
                            const allMissingGuides = [
                              ...(a.missingDatesForGuides || []),
                              ...(a.appointmentsWithoutGuides || [])
                            ].filter((value, index, self) => self.indexOf(value) === index);
                            
                            // Outros alertas
                            const otherAlerts = [];
                            if (a.noGuides) otherAlerts.push("Sem guia para este mês");
                            if (a.needsMoreGuidesForRestOfMonth) otherAlerts.push("Faltam guias para semanas 3 e 4");
                            
                            // Determinar o tipo de alerta e cor
                            let alertType = "";
                            let alertColor = "";
                            let alertMessage = "";
                            let alertIcon = null;
                            
                            if (a.needsNextMonthScheduling && a.hasAppointmentsInLastWeek) {
                              // Alerta laranja: precisa agendamento para próximo mês
                              alertType = "nextMonth";
                              alertColor = "bg-orange-50 border-orange-200";
                              alertMessage = `Precisa agendamento para próximo mês`;
                              alertIcon = <Calendar className="h-4 w-4 text-orange-600" />;
                            } else if (missingAppointments.length > 0 && allMissingGuides.length > 0) {
                              // Ambos faltando - usar alerta azul melhorado
                              alertType = "both";
                              alertColor = "bg-blue-50 border-blue-200";
                              alertMessage = `Faltam agendamentos e guias`;
                              alertIcon = <AlertTriangle className="h-4 w-4 text-blue-600" />;
                            } else if (missingAppointments.length > 0) {
                              // Só agendamentos faltando
                              alertType = "appointments";
                              alertColor = "bg-blue-50 border-blue-200";
                              alertMessage = `Faltam agendamentos`;
                              alertIcon = <Calendar className="h-4 w-4 text-blue-600" />;
                            } else if (allMissingGuides.length > 0) {
                              // Só guias faltando
                              alertType = "guides";
                              alertColor = "bg-green-50 border-green-200";
                              alertMessage = `Faltam guias`;
                              alertIcon = <ClipboardList className="h-4 w-4 text-green-600" />;
                            } else if (otherAlerts.length > 0) {
                              // Outros alertas
                              alertType = "other";
                              alertColor = "bg-amber-50 border-amber-200";
                              alertMessage = otherAlerts[0];
                              alertIcon = <AlertTriangle className="h-4 w-4 text-amber-600" />;
                            }
                            
                            return (
                              <div key={a.id_patient} className={`flex items-center px-4 py-3 rounded text-sm hover:bg-opacity-80 transition-colors border-l-4 ${alertColor}`}>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                  <span className="font-medium truncate">{a.paciente_nome}</span>
                                </div>
                                
                                {/* Status do Alerta */}
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {alertIcon}
                                  <div className="flex flex-col gap-1">
                                    <span className={`text-xs font-medium ${
                                      alertType === "nextMonth" ? "text-orange-700" :
                                      alertType === "appointments" ? "text-blue-700" :
                                      alertType === "guides" ? "text-green-700" :
                                      alertType === "both" ? "text-blue-700" :
                                      "text-amber-700"
                                    }`}>
                                      {alertMessage}
                                    </span>
                                    
                                    {/* Datas específicas */}
                                    <div className="flex flex-col gap-2">
                                      {alertType === "nextMonth" && (
                                        <div className="flex flex-wrap gap-1">
                                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                                            📅 Próximo mês
                            </span>
                          </div>
                        )}
                                      
                                      {alertType === "both" && (
                                        <div className="space-y-2">
                                          {/* Agendamentos Faltantes */}
                                          <div className="flex flex-col gap-1">
                                            <span className="text-xs font-semibold text-blue-800">Agendamentos:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {missingAppointments.map(day => (
                                                <span key={day} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                                  {formatDateForDisplay(day, year, monthIndex)}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                          
                                          {/* Guias Faltantes */}
                                          <div className="flex flex-col gap-1">
                                            <span className="text-xs font-semibold text-green-800">Guias Faltantes:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {allMissingGuides.map(day => (
                                                <span key={day} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                                  {formatDateForDisplay(day, year, monthIndex)}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {alertType === "appointments" && missingAppointments.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {missingAppointments.map(day => (
                                            <span key={day} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                              📅 {formatDateForDisplay(day, year, monthIndex)}
                            </span>
                                          ))}
                          </div>
                        )}
                                      
                                      {alertType === "guides" && allMissingGuides.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {allMissingGuides.map(day => (
                                            <span key={day} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                              📋 {formatDateForDisplay(day, year, monthIndex)}
                            </span>
                                          ))}
                          </div>
                        )}
                      </div>
                    </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Index;
