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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

import { Download, Edit, Save, Loader } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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

interface Appointment {
  id: number;
  patient_id: number;
  psychologist_id: number;
  room_id?: number;
  date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "canceled" | "completed";
  payment_method: "private" | "insurance";
  insurance_type?: "Unimed" | "SulAmérica" | "Fusex" | "Other";
  insurance_token?: string;
  value: number;
  appointment_type: "presential" | "online";
  is_recurring: boolean;
  recurrence_type?: "weekly" | "biweekly";
  recurrence_group_id?: number;
  created_at: string;
  updated_at: string;
}

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
  const { user } = useAuth();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");
  const [selectedPsychologist, setSelectedPsychologist] = useState<string>("all");
  const [showReportTable, setShowReportTable] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editTransactionValue, setEditTransactionValue] = useState<number>(0);
  const [editTransactionInsuranceType, setEditTransactionInsuranceType] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditingLoading, setIsEditingLoading] = useState<boolean>(false);

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
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let url = "";

      if (effectivePsychologist === "all") {
        const allAppointments: Appointment[] = [];
        for (const psych of psychologists) {
          const response = await fetch(
            `https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/appointmens/${psych.id}`
          );
          if (response.ok) {
            const data = await response.json();
            allAppointments.push(...data);
          }
        }
        setAppointments(allAppointments);
      } else {
        url = `https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/appointmens/${effectivePsychologist}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Erro ao buscar appointments");
        }

        const data = await response.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error("Erro ao buscar appointments:", error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (psychologists.length > 0) {
      fetchAppointments();
    }
  }, [effectivePsychologist, psychologists]);

  const getFilteredAppointments = () => {
    let startDate: Date;
    const today = new Date("2025-08-25T19:13:00-03:00"); // Data e hora atuais

    switch (filterPeriod) {
      case "day":
        startDate = new Date(today.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = startOfWeek(today, { weekStartsOn: 1 });
        break;
      case "month":
        startDate = startOfMonth(today);
        break;
      case "year":
        startDate = startOfYear(today);
        break;
      default:
        startDate = subDays(today, 30);
    }

    return appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.date);
      const matchesDate = appointmentDate >= startDate;
      const isConfirmed = appointment.status === "confirmed" || appointment.status === "completed";

      return matchesDate && isConfirmed;
    });
  };

  const filteredAppointments = getFilteredAppointments();

  const calculateFinancials = () => {
    let totalRevenue = 0;
    let psychologistCommission = 0;
    let clinicRevenue = 0;

    if (!filteredAppointments || filteredAppointments.length === 0) {
      return { totalRevenue: 0, psychologistCommission: 0, clinicRevenue: 0 };
    }

    filteredAppointments.forEach((appointment) => {
      const value = Number(appointment.value) || 0;
      totalRevenue += value;

      const commissionPercentage = 50; // ou buscar do contexto do usuário
      const commission = (value * commissionPercentage) / 100;
      psychologistCommission += commission;
      clinicRevenue += value - commission;
    });

    return {
      totalRevenue: Number(totalRevenue) || 0,
      psychologistCommission: Number(psychologistCommission) || 0,
      clinicRevenue: Number(clinicRevenue) || 0,
    };
  };

  const { totalRevenue, psychologistCommission, clinicRevenue } = calculateFinancials();




  const generateChartData = () => {
    if (!filteredAppointments || filteredAppointments.length === 0) return [];

    if (effectivePsychologist === "all") {
      const dataByPsychologist = psychologists.map((psych) => {
        const psychAppointments = filteredAppointments.filter(
          (appointment) => appointment.psychologist_id === Number(psych.id)
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

      filteredAppointments.forEach((appointment) => {
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
        return "Este Mês";
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
        const appointmentToEdit = appointments.find(
          (appointment) => String(appointment.id) === editingTransactionId
        );

        if (appointmentToEdit) {
          // Preparar os dados para enviar para a API
          const appointmentData = {
            id: appointmentToEdit.id,
            patient_id: appointmentToEdit.patient_id,
            psychologist_id: appointmentToEdit.psychologist_id,
            room_id: appointmentToEdit.room_id,
            date: appointmentToEdit.date,
            start_time: appointmentToEdit.start_time,
            end_time: appointmentToEdit.end_time,
            status: appointmentToEdit.status,
            payment_method: appointmentToEdit.payment_method, // Mantém o payment_method original
            insurance_type: editTransactionInsuranceType, // Novo tipo de convênio digitado
            insurance_token: appointmentToEdit.insurance_token,
            value: editTransactionValue, // Novo valor
            appointment_type: appointmentToEdit.appointment_type,
            is_recurring: appointmentToEdit.is_recurring,
            recurrence_type: appointmentToEdit.recurrence_type,
            recurrence_group_id: appointmentToEdit.recurrence_group_id,
            created_at: appointmentToEdit.created_at,
            updated_at: new Date().toISOString()
          };

          // Enviar requisição POST para a API
          const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/appointmens_edit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(appointmentData)
          });

          if (response.ok) {
            console.log('Valor e tipo de convênio da consulta atualizados com sucesso na API');
            
            // Atualizar o estado local após sucesso na API
            setAppointments((prev) =>
              prev.map((appointment) =>
                String(appointment.id) === editingTransactionId
                  ? { ...appointment, value: editTransactionValue, insurance_type: editTransactionInsuranceType as "Unimed" | "SulAmérica" | "Fusex" | "Other" }
                  : appointment
              )
            );
          } else {
            console.error('Erro na API:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Detalhes do erro:', errorText);
            throw new Error(`Erro na API: ${response.status} - ${errorText}`);
          }
        }
      } catch (error) {
        console.error("Erro ao atualizar valor e tipo de convênio da consulta:", error);
        // Aqui você pode adicionar um toast ou notificação de erro para o usuário
      } finally {
        setIsEditingLoading(false);
      }
    }
    setIsEditModalOpen(false);
    setEditingTransactionId(null);
  };

  const generateReport = () => {
  const doc = new jsPDF();

  const title = `Relatório Financeiro - ${getPeriodName()}`;
  doc.setFontSize(18);
  doc.text(title, 14, 20);

  let subtitle = "Todos os Psicólogos";
  if (effectivePsychologist !== "all") {
    const psych = psychologists.find((p) => p.id === effectivePsychologist);
    subtitle = psych ? psych.name : "Psicólogo";
  }
  doc.setFontSize(14);
  doc.text(subtitle, 14, 30);

  doc.setFontSize(12);
  doc.text(`Total de Consultas: ${filteredAppointments.length}`, 14, 40);
  doc.text(`Receita Total: R$ ${totalRevenue.toFixed(2)}`, 14, 47);

  if (isAdmin) {
    doc.text(`Receita da Clínica: R$ ${clinicRevenue.toFixed(2)}`, 14, 54);
    doc.text(`Comissões dos Psicólogos: R$ ${psychologistCommission.toFixed(2)}`, 14, 61);
    var tableY = 68;
  } else {
    var tableY = 54;
  }

  doc.text(
    `Data de Geração: ${format(new Date(), "dd/MM/yyyy HH:mm", {
      locale: ptBR,
    })}`,
    14,
    tableY
  );
  tableY += 7;

  const tableData = filteredAppointments.map((appointment) => {
    const commissionPercentage = 50;
    // Corrigir aqui - converter para número antes de usar toFixed
    const appointmentValue = Number(appointment.value) || 0;
    const commission = (appointmentValue * commissionPercentage) / 100;
    const patient = patients.find((p) => p.id === appointment.patient_id);
    const psychologist = psychologists.find((p) => Number(p.id) === appointment.psychologist_id);

    return [
      patient?.name || patient?.nome || "Paciente não encontrado",
      format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR }),
      `${appointment.start_time} - ${appointment.end_time}`,
      `R$ ${appointmentValue.toFixed(2)}`, // Usar appointmentValue em vez de appointment.value
      `R$ ${commission.toFixed(2)} (${commissionPercentage}%)`,
      psychologist?.name || "Psicólogo não encontrado",
    ];
  });

  (doc as any).autoTable({
    startY: tableY,
    head: [["Paciente", "Data", "Horário", "Valor", "Comissão", "Psicólogo"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [0, 123, 255], textColor: 255 },
    styles: { fontSize: 10 },
  });

  const reportName = `relatorio-financeiro-${filterPeriod}-${format(
    new Date(),
    "yyyyMMdd",
    { locale: ptBR }
  )}.pdf`;
  doc.save(reportName);
};

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Finanças</h1>
        {(loading || isLoading) && <Loader className="h-5 w-5 animate-spin" />}
      </div>

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
            <Button
              variant={filterPeriod === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPeriod("month")}
            >
              Mês
            </Button>
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
                {filteredAppointments.length} consultas confirmadas
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
           <Button
  onClick={generateReport}
  className="flex items-center gap-1"
  size="sm"
  disabled={loading || isLoading}
>
  <Download className="h-4 w-4" /> Exportar PDF
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
                    <TableHead className="text-right">Valor</TableHead>
                    {isAdmin && <TableHead className="text-right">Comissão</TableHead>}
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 5} className="text-center py-4">
                        <Loader className="h-5 w-5 animate-spin mx-auto" />
                        <p className="mt-2 text-gray-500">Carregando dados iniciais...</p>
                      </TableCell>
                    </TableRow>
                  ) : loading ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 5} className="text-center py-4">
                        <Loader className="h-5 w-5 animate-spin mx-auto" />
                        <p className="mt-2 text-gray-500">Carregando transações...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 5} className="text-center py-4 text-gray-500">
                        Nenhuma consulta confirmada encontrada para este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAppointments.map((appointment) => {
                      const commissionPercentage = 50;
                      const commission = ((Number(appointment.value) || 0) * commissionPercentage) / 100;
                      const patient = patients.find((p) => p.id === appointment.patient_id);
                      const psychologist = psychologists.find((p) => Number(p.id) === appointment.psychologist_id);

                      return (
                        <TableRow key={appointment.id}>
                          <TableCell>{patient?.name || patient?.nome || "Paciente não encontrado"}</TableCell>
                          <TableCell>
                            {format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {appointment.start_time} - {appointment.end_time}
                          </TableCell>
                          <TableCell>{psychologist?.name || "Psicólogo não encontrado"}</TableCell>
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

      {isAdmin && effectivePsychologist !== "all" && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Psicólogo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Profissional:</p>
                <p className="font-medium">
                  {psychologists.find((p) => p.id === effectivePsychologist)?.name || ""}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total de Consultas:</p>
                  <p className="font-medium">{filteredAppointments.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Média por Consulta:</p>
                  <p className="font-medium">
                    R$ {filteredAppointments.length > 0
                      ? (totalRevenue / filteredAppointments.length).toFixed(2)
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
  );
};

export default FinanceCharts;
