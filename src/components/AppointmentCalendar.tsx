
import { useState } from "react";
import Calendar from "react-calendar";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import AppointmentTimeSlots from "./AppointmentTimeSlots";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-calendar/dist/Calendar.css";
import AppointmentForm from "./AppointmentForm";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const AppointmentCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { appointments } = useAppointments();
  const { user } = useAuth();

  // Filter appointments based on user role and selected date
  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    if (user?.role === "psychologist") {
      return appointments.filter(
        (app) => 
          app.date === dateStr && 
          app.psychologistId === user.id
      );
    }
    
    return appointments.filter((app) => app.date === dateStr);
  };

  // Check if a date has appointments
  const hasAppointments = (date: Date) => {
    const appointmentsForDate = getAppointmentsForDate(date);
    return appointmentsForDate.length > 0;
  };

  // Format date for display
  const formatSelectedDate = (date: Date) => {
    return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  // Custom tile content to show appointment indicators
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return null;
    
    const appointmentsForDate = getAppointmentsForDate(date);
    if (appointmentsForDate.length === 0) return null;
    
    // Count appointments by status
    const confirmedCount = appointmentsForDate.filter(app => app.status === "confirmed").length;
    const pendingCount = appointmentsForDate.filter(app => app.status === "pending").length;
    
    return (
      <div className="flex justify-center mt-1">
        {confirmedCount > 0 && (
          <div
            className="appointment-dot bg-green-500"
            style={{ marginRight: "3px" }}
          />
        )}
        {pendingCount > 0 && (
          <div
            className="appointment-dot bg-yellow-500"
          />
        )}
        {appointmentsForDate.length > (confirmedCount + pendingCount) && (
          <span className="text-xs text-gray-500">+{appointmentsForDate.length - (confirmedCount + pendingCount)}</span>
        )}
      </div>
    );
  };

  const handleDateChange = (value: Value) => {
    if (value instanceof Date) {
      setSelectedDate(value);
      setIsDetailsOpen(true);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Agenda</h1>
        {(user?.role === "admin" || user?.role === "receptionist") && (
          <Button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="bg-clinic-600 hover:bg-clinic-700"
          >
            <Plus className="h-4 w-4 mr-1" /> Novo Agendamento
          </Button>
        )}
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <Calendar
          onChange={handleDateChange}
          value={selectedDate}
          tileContent={tileContent}
          prevLabel={<ChevronLeft className="h-5 w-5" />}
          nextLabel={<ChevronRight className="h-5 w-5" />}
          prev2Label={null}
          next2Label={null}
          className="w-full"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <p className="text-sm text-gray-500 w-full">Legenda:</p>
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
            <span className="text-xs">Confirmadas</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
            <span className="text-xs">Pendentes</span>
          </div>
        </div>
      </div>
      
      {/* Modal for appointment details */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-full max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold capitalize">
              {formatSelectedDate(selectedDate)}
            </DialogTitle>
          </DialogHeader>
          <AppointmentTimeSlots 
            selectedDate={selectedDate}
            appointments={getAppointmentsForDate(selectedDate)}
          />
        </DialogContent>
      </Dialog>

      {/* Create Appointment Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            selectedDate={selectedDate}
            onClose={() => setIsCreateModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentCalendar;
