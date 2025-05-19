
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Appointment } from "@/types/appointment";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import AppointmentForm from "./AppointmentForm";
import AppointmentDetails from "./AppointmentDetails";

interface AppointmentTimeSlotsProps {
  selectedDate: Date;
  appointments: Appointment[];
  onCreateAppointment?: () => void; // Make this optional
}

const AppointmentTimeSlots = ({ selectedDate, appointments, onCreateAppointment }: AppointmentTimeSlotsProps) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const { user } = useAuth();

  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 8; // Start from 8 AM
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const getAppointmentsForTimeSlot = (timeSlot: string) => {
    return appointments.filter((app) => app.startTime === timeSlot);
  };

  const openAppointmentModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleCreateAppointment = () => {
    // If a custom handler is provided, use it, otherwise use local state
    if (onCreateAppointment) {
      onCreateAppointment();
    } else {
      setIsCreateModalOpen(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "border-green-300 bg-green-50";
      case "pending":
        return "border-yellow-300 bg-yellow-50";
      case "cancelled":
        return "border-red-300 bg-red-50";
      case "completed":
        return "border-blue-300 bg-blue-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold capitalize">
          {formattedDate}
        </h2>
        {(user?.role === "admin" || user?.role === "receptionist") && (
          <Button
            onClick={handleCreateAppointment}
            variant="default"
            size="sm"
            className="bg-clinic-600 hover:bg-clinic-700"
          >
            <Plus className="h-4 w-4 mr-1" /> Novo Agendamento
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {timeSlots.map((timeSlot) => {
          const slotsForTime = getAppointmentsForTimeSlot(timeSlot);
          return (
            <div key={timeSlot} className="border-b border-gray-200 pb-3 last:border-b-0">
              <div className="text-sm font-medium text-gray-500 mb-2">{timeSlot}</div>
              {slotsForTime.length === 0 ? (
                <div className="h-12 flex items-center text-sm text-gray-400">
                  Nenhum agendamento
                </div>
              ) : (
                <div className="space-y-2">
                  {slotsForTime.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => openAppointmentModal(app)}
                      className={`w-full text-left border p-3 rounded-md flex justify-between ${getStatusColor(app.status)}`}
                    >
                      <div>
                        <p className="font-medium">{app.patient.name}</p>
                        <p className="text-sm text-gray-500">
                          {app.roomName} - Dr. {app.psychologistName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          {app.startTime} - {app.endTime}
                        </span>
                        <p className="text-xs text-gray-500">
                          {app.paymentMethod === "private" ? "Particular" : app.insuranceType}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

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

      {/* View/Edit Appointment Modal */}
      <Dialog 
        open={!!selectedAppointment} 
        onOpenChange={(open) => !open && setSelectedAppointment(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <AppointmentDetails
              appointment={selectedAppointment}
              onClose={() => setSelectedAppointment(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentTimeSlots;
