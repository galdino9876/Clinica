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
    
    // Map to store available time slots for each date and psychologist
    const availableSlotsMap = new Map<string, Map<string, number>>();
    
    // Map to store booked time slots for each date and psychologist
    const bookedSlotsMap = new Map<string, Map<string, number>>();
    
    // First, initialize available slots for each psychologist's working days
    psychologists.forEach(psych => {
      if (psych.workingHours) {
        // Get available days of week for this psychologist
        const workingHours = psych.workingHours;
        
        // Check the next 60 days
        const today = new Date();
        for (let i = 0; i < 60; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
          
          // Find if this psychologist works on this day of week
          const workingHoursForDay = workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
          
          if (workingHoursForDay) {
            const { startTime, endTime } = workingHoursForDay;
            const dateStr = date.toISOString().split('T')[0];
            
            // Generate 1-hour slots for this day
            const availableSlots = generateTimeSlots(startTime, endTime, 60);
            
            // Add these slots to the available slots map
            if (!availableSlotsMap.has(dateStr)) {
              availableSlotsMap.set(dateStr, new Map());
            }
            
            const psychSlotsMap = availableSlotsMap.get(dateStr)!;
            if (!psychSlotsMap.has(psych.id)) {
              psychSlotsMap.set(psych.id, availableSlots.length);
            } else {
              psychSlotsMap.set(psych.id, psychSlotsMap.get(psych.id)! + availableSlots.length);
            }
          }
        }
      }
    });
    
    // Now count all booked slots from appointments
    appointments.forEach(app => {
      if (app.status === 'confirmed' || app.status === 'pending') {
        const dateStr = app.date;
        const psychId = app.psychologistId;
        
        // Initialize booked slots map for this date if needed
        if (!bookedSlotsMap.has(dateStr)) {
          bookedSlotsMap.set(dateStr, new Map());
        }
        
        // Increment booked slots count for this psychologist on this date
        const psychBookedMap = bookedSlotsMap.get(dateStr)!;
        if (!psychBookedMap.has(psychId)) {
          psychBookedMap.set(psychId, 1);
        } else {
          psychBookedMap.set(psychId, psychBookedMap.get(psychId)! + 1);
        }
      }
    });
    
    // Find dates where all available slots are booked
    const fullyBooked: string[] = [];
    
    availableSlotsMap.forEach((psychSlotsMap, dateStr) => {
      let allPsychologistsFullyBooked = true;
      
      // Check if each psychologist is fully booked for this date
      psychSlotsMap.forEach((availableSlots, psychId) => {
        const bookedSlotsForDate = bookedSlotsMap.get(dateStr);
        const bookedSlotsForPsych = bookedSlotsForDate?.get(psychId) || 0;
        
        // If any psychologist has available slots, the date is not fully booked
        if (bookedSlotsForPsych < availableSlots) {
          allPsychologistsFullyBooked = false;
        }
      });
      
      // If all psychologists are fully booked, mark this date as fully booked
      if (allPsychologistsFullyBooked && psychSlotsMap.size > 0) {
        fullyBooked.push(dateStr);
      }
    });
    
    setFullyBookedDates(fullyBooked);
    console.log("Fully booked dates:", fullyBooked);
    console.log("Available slots map:", Array.from(availableSlotsMap.entries()));
    console.log("Booked slots map:", Array.from(bookedSlotsMap.entries()));
  };
  
  // Helper function to generate time slots
  const generateTimeSlots = (startTime: string, endTime: string, durationMinutes: number) => {
    const slots = [];
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    
    // Corrigido: Garantir que inclua o último horário possível antes do fim do expediente
    for (let currentMin = startMin; currentMin + durationMinutes <= endMin; currentMin += durationMinutes) {
      slots.push([minutesToTime(currentMin), minutesToTime(currentMin + durationMinutes)]);
    }
    
    return slots;
  };
  
  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
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
  
  // Determine if a date is available for any psychologist
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
    // When opening the create modal directly from button, use the current selected date
    setIsCreateModalOpen(true);
  };
  
  // Create appointment for specific date from the calendar view
  const handleCreateFromCalendar = (date: Date) => {
    console.log("Creating appointment from calendar for date:", date);
    setSelectedDate(date); // Set selected date before opening modal
    setIsCreateModalOpen(true); // Open create appointment modal
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
            onCreateAppointment={() => handleCreateFromCalendar(selectedDate)}
          />
        </DialogContent>
      </Dialog>

      {/* Create Appointment Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>
              {isDetailsOpen 
                ? "Criando agendamento para a data selecionada"
                : "Preencha os dados para criar um novo agendamento"}
            </DialogDescription>
          </DialogHeader>
          <AppointmentForm
            selectedDate={selectedDate}
            onClose={handleFormClose}
            onPsychologistSelected={handlePsychologistSelected}
            lockDate={isDetailsOpen} // Lock the date if we're creating from calendar view
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
