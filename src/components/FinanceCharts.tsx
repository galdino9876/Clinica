
import { useState } from "react";
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
import { useAppointments } from "@/context/AppointmentContext";
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

type FilterPeriod = "day" | "week" | "month" | "year";

// Simple user data for the chart
const psychologists = [
  { id: "3", name: "Dr. John Smith" },
  { id: "4", name: "Dr. Sarah Johnson" },
];

const FinanceCharts = () => {
  const { appointments } = useAppointments();
  const { user } = useAuth();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");
  const [selectedPsychologist, setSelectedPsychologist] = useState<string>(
    user?.role === "psychologist" ? user.id : "all"
  );

  const isAdmin = user?.role === "admin";
  const isPsychologist = user?.role === "psychologist";
  
  // If user is a psychologist, they can only see their own data
  const effectivePsychologist = isPsychologist ? user?.id : selectedPsychologist;

  // Filter appointments based on date and psychologist
  const getFilteredAppointments = () => {
    let startDate: Date;
    const today = new Date();
    
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
        startDate = subDays(today, 30); // Default to last 30 days
    }
    
    return appointments.filter((app) => {
      const appDate = new Date(app.date);
      const matchesDate = appDate >= startDate;
      const matchesPsychologist = 
        effectivePsychologist === "all" || 
        app.psychologistId === effectivePsychologist;
      
      return matchesDate && matchesPsychologist;
    });
  };
  
  const filteredAppointments = getFilteredAppointments();
  
  // Calculate total revenue
  const totalRevenue = filteredAppointments.reduce(
    (sum, app) => sum + app.value,
    0
  );
  
  // Generate chart data
  const generateChartData = () => {
    if (filteredAppointments.length === 0) return [];
    
    // Group by date or by psychologist based on view
    if (effectivePsychologist === "all") {
      // Group by psychologist
      const dataByPsychologist = psychologists.map((psych) => {
        const psychAppointments = filteredAppointments.filter(
          (app) => app.psychologistId === psych.id
        );
        
        return {
          name: psych.name,
          valor: psychAppointments.reduce((sum, app) => sum + app.value, 0),
          consultas: psychAppointments.length,
        };
      });
      
      return dataByPsychologist;
    } else {
      // Group by date periods
      const dateGroups: Record<string, { date: string; valor: number; consultas: number }> = {};
      
      filteredAppointments.forEach((app) => {
        let groupKey: string;
        
        switch (filterPeriod) {
          case "day":
            groupKey = format(new Date(app.date), "HH:00", { locale: ptBR });
            break;
          case "week":
            groupKey = format(new Date(app.date), "EEE", { locale: ptBR });
            break;
          case "month":
            groupKey = format(new Date(app.date), "dd/MM", { locale: ptBR });
            break;
          case "year":
            groupKey = format(new Date(app.date), "MMM", { locale: ptBR });
            break;
          default:
            groupKey = app.date;
        }
        
        if (!dateGroups[groupKey]) {
          dateGroups[groupKey] = { date: groupKey, valor: 0, consultas: 0 };
        }
        
        dateGroups[groupKey].valor += app.value;
        dateGroups[groupKey].consultas += 1;
      });
      
      return Object.values(dateGroups);
    }
  };
  
  const chartData = generateChartData();
  
  // Get period name for display
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
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Finanças</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
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
              {filteredAppointments.length} consultas
            </p>
          </CardContent>
        </Card>
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
                  name="Valor (R$)"
                  dataKey="valor"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
                  {psychologists.find(p => p.id === effectivePsychologist)?.name || ""}
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
                  <p className="text-sm text-gray-500">Receita Total:</p>
                  <p className="font-medium">R$ {totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FinanceCharts;
