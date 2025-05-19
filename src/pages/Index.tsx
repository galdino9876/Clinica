
import AppointmentCalendar from "@/components/AppointmentCalendar";
import Layout from "@/components/Layout";
import PendingConfirmations from "@/components/PendingConfirmations";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

const Index = () => {
  const { appointments } = useAppointments();
  const { user } = useAuth();
  
  // Log for debugging when appointments change
  useEffect(() => {
    console.log("Agendamentos atualizados:", appointments);
  }, [appointments]);

  return (
    <Layout>
      <AppointmentCalendar />
      
      {/* Show pending confirmations for admin and receptionist roles */}
      {(user?.role === "admin" || user?.role === "receptionist") && (
        <div className="mt-6">
          <PendingConfirmations />
        </div>
      )}
    </Layout>
  );
};

export default Index;
