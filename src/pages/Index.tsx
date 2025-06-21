
import AppointmentCalendar from "@/components/AppointmentCalendar";
import Layout from "@/components/Layout";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AppointmentForm from "@/components/AppointmentForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Index = () => {
  const { appointments } = useAppointments();
  const { users, user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPsychologistId, setSelectedPsychologistId] = useState<string>("");
  const [suggestedDate, setSuggestedDate] = useState<Date>(new Date());

  // Log for debugging when appointments change
  useEffect(() => {
    console.log("Agendamentos atualizados:", appointments);

    // Log recurring appointments for debugging
    const recurringAppointments = appointments.filter(app => app.is_recurring);
    if (recurringAppointments.length > 0) {
      console.log("Agendamentos recorrentes:", recurringAppointments);
    }
  }, [appointments]);

  // Função para abrir o modal independente do calendário, sem data pré-selecionada
  const handleCreateModalOpen = () => {
    // Não seleciona nenhum psicólogo por padrão
    setSelectedPsychologistId("");
    // Não sugere nenhuma data específica inicialmente
    setSuggestedDate(new Date());
    setIsCreateModalOpen(true);
  };

  // Função para lidar com a seleção do psicólogo no formulário
  const handlePsychologistSelected = (psychologistId: string) => {
    setSelectedPsychologistId(psychologistId);
  };

  const handleFormClose = () => {
    setIsCreateModalOpen(false);
  };

  return (
    <Layout>
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Agenda</h1>
          {(user?.role === "admin" || user?.role === "receptionist") && (
            <Button
              onClick={handleCreateModalOpen}
              className="bg-clinic-600 hover:bg-clinic-700"
            >
              <Plus className="h-4 w-4 mr-1" /> Novo Agendamento
            </Button>
          )}
        </div>

        <AppointmentCalendar />

        {/* Create Appointment Modal for Homepage - Independent from calendar selection */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo agendamento.
                {" Selecione um psicólogo para que o sistema sugira automaticamente o próximo horário disponível."}
              </DialogDescription>
            </DialogHeader>
            <AppointmentForm
              selectedDate={suggestedDate}
              onClose={handleFormClose}
              lockDate={false}
              onPsychologistSelected={handlePsychologistSelected}
              independentMode={true} // Novo flag para indicar que é o modo independente
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Index;
