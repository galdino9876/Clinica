
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppointments } from "@/context/AppointmentContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PendingPatientsData } from "@/types/appointment";
import { Check, Send } from "lucide-react";

const PendingConfirmations = () => {
  const { getPendingAppointmentsByDate, updateAppointmentStatus } = useAppointments();
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const pendingAppointmentsByDate = getPendingAppointmentsByDate();
  
  const handleConfirmAppointment = (appointmentId: string) => {
    updateAppointmentStatus(appointmentId, "confirmed");
  };

  const handleSendMessages = (date: string) => {
    setSelectedDate(date);
    setIsMessageModalOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const prepareMessageData = () => {
    if (!selectedDate) return null;
    
    const dateData = pendingAppointmentsByDate.find(item => item.date === selectedDate);
    if (!dateData) return null;
    
    return JSON.stringify(
      dateData.patients.map(p => ({
        name: p.name,
        phone: p.phone,
        email: p.email,
        cpf: p.cpf,
        psychologistName: p.psychologistName,
        appointmentTime: p.startTime,
        appointmentDate: formatDate(selectedDate)
      })),
      null,
      2
    );
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Confirmação de Consultas</h1>

      {pendingAppointmentsByDate.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-500">Não há consultas pendentes de confirmação.</p>
        </div>
      ) : (
        pendingAppointmentsByDate.map((dateGroup) => (
          <Card key={dateGroup.date} className="w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-xl capitalize">
                  {formatDate(dateGroup.date)}
                </CardTitle>
                <CardDescription>{dateGroup.patients.length} pacientes pendentes</CardDescription>
              </div>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => handleSendMessages(dateGroup.date)}
              >
                <Send className="h-4 w-4" />
                Enviar Mensagens
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dateGroup.patients.map((patient, index) => (
                  <div 
                    key={`${dateGroup.date}-${index}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div>
                      <p className="font-medium">{patient.name}</p>
                      <div className="flex gap-3 text-sm text-gray-500">
                        <p>{patient.startTime}</p>
                        <p>{patient.psychologistName}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleConfirmAppointment(patient.appointmentId)}
                      className="gap-1"
                    >
                      <Check className="h-4 w-4" /> Confirmar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={isMessageModalOpen} onOpenChange={setIsMessageModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && `Dados dos pacientes - ${formatDate(selectedDate)}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="mb-2 text-sm text-gray-700">
                Dados prontos para envio ao serviço de mensagens. Utilize este JSON para enviar mensagens 
                de confirmação a todos os pacientes listados:
              </p>
              <pre className="bg-gray-900 text-gray-200 p-4 rounded-md overflow-auto text-xs max-h-80">
                {prepareMessageData()}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageModalOpen(false)}>
              Fechar
            </Button>
            <Button 
              onClick={() => {
                // Simulate webhook API call
                console.log('Sending data to webhook:', prepareMessageData());
                alert("Dados enviados com sucesso para o serviço de mensagens!");
                setIsMessageModalOpen(false);
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar para API
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingConfirmations;
