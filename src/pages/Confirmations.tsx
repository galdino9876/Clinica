
import Layout from "@/components/Layout";
import PendingConfirmations from "@/components/PendingConfirmations";
import EmailDashboard from "@/components/EmailDashboard";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const Confirmations = () => {
  const { user } = useAuth();
  
  // Only non-psychologist users should access this page
  if (user?.role === "psychologist") {
    return <Navigate to="/" replace />;
  }
  
  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Confirmações de Agendamentos</h1>
      
      <Tabs defaultValue="reminders" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="reminders">Whatsapp</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reminders">
          <PendingConfirmations />
        </TabsContent>
        
        <TabsContent value="email">
          <EmailDashboard />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default Confirmations;
