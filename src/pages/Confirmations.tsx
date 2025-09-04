
import Layout from "@/components/Layout";
import PendingConfirmations from "@/components/PendingConfirmations";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

const Confirmations = () => {
  const { user } = useAuth();
  
  // Only non-psychologist users should access this page
  if (user?.role === "psychologist") {
    return <Navigate to="/" replace />;
  }
  
  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Confirmações de Agendamentos</h1>
      <PendingConfirmations />
    </Layout>
  );
};

export default Confirmations;
