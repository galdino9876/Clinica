
import { useState, useEffect } from "react";
import { useAppointments } from "@/context/AppointmentContext";
import { Button } from "@/components/ui/button";
import { PendingPatientsData } from "@/types/appointment";
import { format, parseISO } from "date-fns";

const PendingConfirmations = () => {
  const { appointments } = useAppointments();
  const [pendingAppointmentsByDate, setPendingAppointmentsByDate] = useState<PendingPatientsData[]>([]);

  useEffect(() => {
    const pendingAppts = appointments.filter(a => a.status === "pending");

    // Group appointments by date
    const groupedByDate = pendingAppts.reduce((acc, appointment) => {
      const date = appointment.date;
      
      if (!acc[date]) {
        acc[date] = [];
      }
      
      acc[date].push({
        name: appointment.patient.name,
        phone: appointment.patient.phone,
        email: appointment.patient.email,
        cpf: appointment.patient.cpf,
        appointmentId: appointment.id,
        psychologistName: appointment.psychologistName,
        startTime: appointment.startTime
      });
      
      return acc;
    }, {} as Record<string, any[]>);

    // Convert to array format sorted by date
    const dataArray = Object.keys(groupedByDate)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map(date => ({
        date,
        patients: groupedByDate[date]
      }));

    setPendingAppointmentsByDate(dataArray);
  }, [appointments]);

  const handleSendMessages = (date: string) => {
    const dataForDate = pendingAppointmentsByDate.find(item => item.date === date);
    if (dataForDate) {
      // This would be replaced with an actual API call in the future
      console.log("Sending messages for date:", date);
      console.log("Patient data:", JSON.stringify(dataForDate, null, 2));
      alert(`Dados preparados para envio em ${format(parseISO(date), 'dd/MM/yyyy')}. Em breve será possível integrá-los com um webhook.`);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Confirmações Pendentes</h1>
      
      {pendingAppointmentsByDate.length === 0 ? (
        <div className="p-6 bg-gray-50 rounded-md text-center">
          <p className="text-gray-500">Não há consultas pendentes de confirmação.</p>
        </div>
      ) : (
        pendingAppointmentsByDate.map((dateGroup) => (
          <div key={dateGroup.date} className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
              <h3 className="font-medium">
                {format(parseISO(dateGroup.date), 'dd/MM/yyyy')} 
                <span className="ml-2 text-gray-500 text-sm">
                  ({dateGroup.patients.length} {dateGroup.patients.length === 1 ? 'paciente' : 'pacientes'})
                </span>
              </h3>
              <Button 
                size="sm" 
                onClick={() => handleSendMessages(dateGroup.date)}
              >
                Enviar Mensagens
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPF</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Psicólogo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dateGroup.patients.map((patient) => (
                    <tr key={patient.appointmentId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{patient.name}</td>
                      <td className="px-4 py-3">{patient.cpf}</td>
                      <td className="px-4 py-3">{patient.phone}</td>
                      <td className="px-4 py-3">{patient.email}</td>
                      <td className="px-4 py-3">{patient.psychologistName}</td>
                      <td className="px-4 py-3">{patient.startTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default PendingConfirmations;
