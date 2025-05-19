
import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import AppointmentTimeSlots from "./AppointmentTimeSlots";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const { user, getPsychologists } = useAuth();
  const [selectedPsychologistId, setSelectedPsychologistId] = useState<string | null>(null);
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([]);
  
  // Force re-render when appointments change
  const [, setForceUpdate] = useState<number>(0);

  useEffect(() => {
    // Force component to re-render when appointments change
    setForceUpdate(prev => prev + 1);
    
    // Calculate fully booked dates
    calculateFullyBookedDates();
  }, [appointments]);
  
  // Calculate which dates are fully booked
  const calculateFullyBookedDates = () => {
    const psychologists = getPsychologists();
    const bookedDatesMap = new Map<string, Set<string>>();
    const psychologistsByDate = new Map<string, Set<string>>();
    
    // First, collect all dates where psychologists are available
    psychologists.forEach(psych => {
      if (psych.workingHours) {
        // Get available days of week for this psychologist
        const availableDays = psych.workingHours.map(wh => wh.dayOfWeek);
        
        // Check the next 60 days
        const today = new Date();
        for (let i = 0; i < 60; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
          
          // If this psychologist works on this day of week
          if (availableDays.includes(dayOfWeek)) {
            const dateStr = date.toISOString().split('T')[0];
            
            // Add this psychologist to the set of available psychologists for this date
            if (!psychologistsByDate.has(dateStr)) {
              psychologistsByDate.set(dateStr, new Set());
            }
            psychologistsByDate.get(dateStr)?.add(psych.id);
          }
        }
      }
    });
    
    // Now check appointments to see which psychologists are fully booked
    appointments.forEach(app => {
      // Only count confirmed appointments
      if (app.status === 'confirmed' || app.status === 'pending') {
        const dateStr = app.date;
        const psychId = app.psychologistId;
        
        // Initialize the set of booked psychologists for this date if needed
        if (!bookedDatesMap.has(dateStr)) {
          bookedDatesMap.set(dateStr, new Set());
        }
        
        // Add this psychologist to the set of booked psychologists for this date
        bookedDatesMap.get(dateStr)?.add(psychId);
      }
    });
    
    // Find dates where all available psychologists are booked
    const fullyBooked: string[] = [];
    
    psychologistsByDate.forEach((availablePsychs, dateStr) => {
      const bookedPsychs = bookedDatesMap.get(dateStr) || new Set();
      
      // Check if all available psychologists are booked
      let allBooked = true;
      availablePsychs.forEach(psychId => {
        if (!bookedPsychs.has(psychId)) {
          allBooked = false;
        }
      });
      
      if (allBooked && availablePsychs.size > 0) {
        fullyBooked.push(dateStr);
      }
    });
    
    setFullyBookedDates(fullyBooked);
    console.log("Fully booked dates:", fullyBooked);
  };
  
  // Filter appointments based on user role and selected date
  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    console.log(`Filtering appointments for date: ${dateStr}`);
    
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
  
  // Get list of all psychologists
  const psychologists = getPsychologists();
  
  // Determine if a date is available for any psychologist (for admin/receptionist) or current psychologist (for psychologist)
  const isPsychologistAvailableOnDate = (date: Date) => {
    if (user?.role === "psychologist") {
      // For psychologist users, only check their own availability
      if (!user.workingHours) return false;
      
      const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      return user.workingHours.some(wh => wh.dayOfWeek === dayOfWeek);
    } else {
      // For admin/receptionist, check all psychologists
      return psychologists.some(psychologist => {
        if (!psychologist.workingHours) return false;
        
        const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
        return psychologist.workingHours.some(wh => wh.dayOfWeek === dayOfWeek);
      });
    }
  };

  // Custom tile content to show appointment indicators
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return null;
    
    const appointmentsForDate = getAppointmentsForDate(date);
    const isAvailable = isPsychologistAvailableOnDate(date);
    
    if (appointmentsForDate.length === 0 && !isAvailable) return null;
    
    // Count appointments by status
    const confirmedCount = appointmentsForDate.filter(app => app.status === "confirmed").length;
    const pendingCount = appointmentsForDate.filter(app => app.status === "pending").length;
    const otherCount = appointmentsForDate.length - confirmedCount - pendingCount;
    
    // Create appointment dots based on status and count
    const appointmentDots = [];
    
    // Add confirmed appointment dots (green)
    for (let i = 0; i < confirmedCount && i < 5; i++) {
      appointmentDots.push(
        <div
          key={`confirmed-${i}`}
          className="appointment-dot bg-green-500"
        />
      );
    }
    
    // Add pending appointment dots (yellow)
    for (let i = 0; i < pendingCount && i + confirmedCount < 5; i++) {
      appointmentDots.push(
        <div
          key={`pending-${i}`}
          className="appointment-dot bg-yellow-500"
        />
      );
    }
    
    // Add others (cancelled, completed) if space permits
    for (let i = 0; i < otherCount && i + confirmedCount + pendingCount < 5; i++) {
      appointmentDots.push(
        <div
          key={`other-${i}`}
          className="appointment-dot bg-gray-500"
        />
      );
    }
    
    // Only show green availability dot if no appointments and psychologist is available
    if (appointmentDots.length === 0 && isAvailable) {
      appointmentDots.push(
        <div 
          key="available" 
          className="appointment-dot bg-emerald-400" 
        />
      );
    }
    
    const totalAppointments = appointmentsForDate.length;
    
    return (
      <div className="flex flex-wrap justify-center gap-1 mt-1">
        {appointmentDots}
        {totalAppointments > 5 && (
          <span className="text-xs text-gray-500 font-medium">+</span>
        )}
      </div>
    );
  };
  
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return null;
    
    const dateStr = date.toISOString().split('T')[0];
    if (fullyBookedDates.includes(dateStr)) {
      return "fully-booked-date";
    }
    
    if (isPsychologistAvailableOnDate(date)) {
      return "available-date";
    }
    
    return null;
  };

  const handleDateChange = (value: Value) => {
    if (value instanceof Date) {
      // Make sure to create a new Date object to avoid reference issues
      const selectedDate = new Date(value);
      console.log("Calendar selection - New date selected:", selectedDate);
      setSelectedDate(selectedDate);
      setIsDetailsOpen(true);
    }
  };
  
  // Update the selected psychologist when the form modal opens
  const handleCreateModalOpen = () => {
    setIsCreateModalOpen(true);
  };
  
  // Update selectedPsychologistId when form closes
  const handleFormClose = () => {
    setIsCreateModalOpen(false);
    setSelectedPsychologistId(null);
  };
  
  // Function to update selected psychologist from the form
  const handlePsychologistSelected = (psychologistId: string) => {
    setSelectedPsychologistId(psychologistId);
  };

  return (
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
      
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <Calendar
          onChange={handleDateChange}
          value={selectedDate}
          tileContent={tileContent}
          tileClassName={tileClassName}
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
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
            <span className="text-xs">Pendentes</span>
          </div>
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 rounded-full bg-emerald-400 mr-1"></div>
            <span className="text-xs">Disponibilidade do psicólogo</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-orange-500 mr-1"></div>
            <span className="text-xs">Dia totalmente agendado</span>
          </div>
        </div>
      </div>
      
      {/* Modal for appointment details */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold capitalize">
              {formatSelectedDate(selectedDate)}
            </DialogTitle>
            <DialogDescription>
              Consultas e horários disponíveis para esta data
            </DialogDescription>
          </DialogHeader>
          <AppointmentTimeSlots 
            selectedDate={selectedDate}
            appointments={getAppointmentsForDate(selectedDate)}
          />
        </DialogContent>
      </Dialog>

      {/* Create Appointment Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um novo agendamento
            </DialogDescription>
          </DialogHeader>
          <AppointmentForm
            selectedDate={selectedDate}
            onClose={handleFormClose}
            onPsychologistSelected={handlePsychologistSelected}
          />
        </DialogContent>
      </Dialog>

      <style>
        {`
        .available-date {
          background-color: rgba(52, 211, 153, 0.15);
        }
        .fully-booked-date {
          background-color: #FEC6A1;
        }
        .appointment-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-right: 2px;
        }
        .react-calendar__tile {
          color: black !important;
          font-weight: 500;
        }
        .react-calendar__tile--active {
          background-color: #007bff !important;
          color: white !important;
        }
        .react-calendar__tile:disabled {
          color: #757575 !important;
        }
        `}
      </style>
    </div>
  );
};

export default AppointmentCalendar;
