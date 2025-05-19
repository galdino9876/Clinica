
import AppointmentCalendar from "@/components/AppointmentCalendar";
import Layout from "@/components/Layout";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

const Index = () => {
  const { appointments } = useAppointments();
  const { users } = useAuth();
  
  // Log for debugging when appointments change
  useEffect(() => {
    console.log("Agendamentos atualizados:", appointments);
  }, [appointments]);

  return (
    <Layout>
      <AppointmentCalendar />
    </Layout>
  );
};

export default Index;
