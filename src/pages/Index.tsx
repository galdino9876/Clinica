
import AppointmentCalendar from "@/components/AppointmentCalendar";
import Layout from "@/components/Layout";
import { useAppointments } from "@/context/AppointmentContext";
import { useEffect } from "react";

const Index = () => {
  const { appointments } = useAppointments();
  
  // Log para debug quando os agendamentos mudarem
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
