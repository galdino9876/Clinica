
import AppointmentCalendar from "@/components/AppointmentCalendar";
import Layout from "@/components/Layout";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Index = () => {
  const { appointments } = useAppointments();
  const { users, getPsychologists } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPsychologist, setSelectedPsychologist] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Log for debugging when appointments change
  useEffect(() => {
    console.log("Agendamentos atualizados:", appointments);
  }, [appointments]);

  // Function to find available psychologists for a given date
  const findAvailablePsychologistsForDate = (date: Date) => {
    const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const psychologists = getPsychologists();
    
    return psychologists.filter(psychologist => 
      psychologist.workingHours?.some(wh => wh.dayOfWeek === dayOfWeek)
    );
  };

  // Handle date selection in calendar
  const handleDateSelected = (date: Date) => {
    setSelectedDate(date);
    
    // If a psychologist is already selected, check availability
    if (selectedPsychologist) {
      const psychologist = users.find(u => u.id === selectedPsychologist);
      
      if (psychologist && psychologist.workingHours) {
        const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
        const isAvailable = psychologist.workingHours.some(wh => wh.dayOfWeek === dayOfWeek);
        
        if (!isAvailable) {
          // Find available psychologists for this date
          const availablePsychologists = findAvailablePsychologistsForDate(date);
          
          if (availablePsychologists.length > 0) {
            toast({
              title: "Psicólogo indisponível nesta data",
              description: `${psychologist.name} não atende em ${format(date, "dd/MM/yyyy")}. Existem ${availablePsychologists.length} outros psicólogos disponíveis neste dia.`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Dia sem atendimento",
              description: `Não há psicólogos disponíveis na data ${format(date, "dd/MM/yyyy")}.`,
              variant: "destructive",
            });
          }
        }
      }
    }
  };

  // Handle psychologist selection
  const handlePsychologistSelected = (psychologistId: string) => {
    setSelectedPsychologist(psychologistId);
    
    // If a date is already selected, check availability
    if (selectedDate) {
      const psychologist = users.find(u => u.id === psychologistId);
      
      if (psychologist && psychologist.workingHours) {
        const dayOfWeek = selectedDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
        const isAvailable = psychologist.workingHours.some(wh => wh.dayOfWeek === dayOfWeek);
        
        if (!isAvailable) {
          toast({
            title: "Psicólogo indisponível",
            description: `${psychologist.name} não atende em ${format(selectedDate, "eeee", { locale: require('date-fns/locale/pt-BR') })}.`,
            variant: "destructive",
          });
        }
      }
    }
  };

  return (
    <Layout>
      <AppointmentCalendar 
        onDateSelected={handleDateSelected}
        onPsychologistSelected={handlePsychologistSelected}
      />
    </Layout>
  );
};

export default Index;
