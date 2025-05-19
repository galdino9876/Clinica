
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
  const { appointments, findNextAvailableSlot } = useAppointments();
  const { users, user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPsychologistId, setSelectedPsychologistId] = useState<string>("");
  
  // Log for debugging when appointments change
  useEffect(() => {
    console.log("Agendamentos atualizados:", appointments);
  }, [appointments]);

  // Encontrar o primeiro psicólogo disponível quando o componente é montado
  useEffect(() => {
    if (users && users.length > 0) {
      // Tente encontrar um psicólogo no sistema
      const firstPsychologist = users.find(u => u.role === 'psychologist');
      if (firstPsychologist) {
        setSelectedPsychologistId(firstPsychologist.id);
      }
    }
  }, [users]);

  // Função modificada para abrir o modal com a data mais próxima disponível
  const handleCreateModalOpen = () => {
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
        
        {/* Create Appointment Modal for Homepage - Now with auto-suggest next available slot */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo agendamento.
                {selectedPsychologistId && " O sistema sugerirá automaticamente o próximo horário disponível quando você selecionar um psicólogo."}
              </DialogDescription>
            </DialogHeader>
            <AppointmentForm
              selectedDate={new Date()}
              onClose={handleFormClose}
              lockDate={false}
              onPsychologistSelected={handlePsychologistSelected}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Index;
