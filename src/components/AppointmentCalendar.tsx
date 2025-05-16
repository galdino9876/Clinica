
import { useState } from "react";
import Calendar from "react-calendar";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import AppointmentTimeSlots from "./AppointmentTimeSlots";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "react-calendar/dist/Calendar.css";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const AppointmentCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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

  // Custom tile content to show appointment indicators
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return null;
    
    const appointmentsForDate = getAppointmentsForDate(date);
    if (appointmentsForDate.length === 0) return null;
    
    // Generate different colors based on number of appointments
    const getColor = (index: number) => {
      const colors = ["appointment-blue", "appointment-green", "appointment-red", "appointment-yellow", "appointment-purple"];
      return colors[index % colors.length];
    };
    
    return (
      <div className="flex justify-center mt-1">
        {appointmentsForDate.slice(0, 3).map((_, index) => (
          <div
            key={index}
            className={`appointment-dot ${getColor(index)}`}
            style={{ left: `${(index * 6) + 45}%` }}
          />
        ))}
        {appointmentsForDate.length > 3 && (
          <span className="text-xs text-gray-500">+{appointmentsForDate.length - 3}</span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-1/2 lg:w-1/3">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <Calendar
            onChange={(value: Value) => {
              if (value instanceof Date) {
                setSelectedDate(value);
              }
            }}
            value={selectedDate}
            tileContent={tileContent}
            prevLabel={<ChevronLeft className="h-5 w-5" />}
            nextLabel={<ChevronRight className="h-5 w-5" />}
            prev2Label={null}
            next2Label={null}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <p className="text-sm text-gray-500 w-full">Legenda:</p>
            <div className="flex items-center mr-4">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
              <span className="text-xs">Consultas</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
              <span className="text-xs">Avaliações</span>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full md:w-1/2 lg:w-2/3">
        <AppointmentTimeSlots 
          selectedDate={selectedDate}
          appointments={getAppointmentsForDate(selectedDate)}
        />
      </div>
    </div>
  );
};

export default AppointmentCalendar;
