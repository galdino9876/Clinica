import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import FinanceCharts from "@/components/FinanceCharts";
import GuiaAReceberTable from "@/components/GuiaAReceberTable";
import GuiaRecebidaTable from "@/components/GuiaRecebidaTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/utils/roleUtils";

const Finance = () => {
  const { user } = useAuth();
  const userIsAdmin = isAdmin(user?.role);
  const [activeTab, setActiveTab] = useState("charts");
  const [refreshKey, setRefreshKey] = useState(0);

  // Garantir que usuários não-admin não acessem abas de guias
  useEffect(() => {
    if (!userIsAdmin && (activeTab === "a-receber" || activeTab === "recebidas")) {
      setActiveTab("charts");
    }
  }, [userIsAdmin, activeTab]);

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6 p-3 md:p-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Finanças</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gestão financeira e acompanhamento de guias a receber
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2 h-auto">
            <TabsTrigger value="charts" className="text-xs sm:text-sm">Dashboard Financeiro</TabsTrigger>
            {userIsAdmin && (
              <>
                <TabsTrigger value="a-receber" className="text-xs sm:text-sm">Guias a Receber</TabsTrigger>
                <TabsTrigger value="recebidas" className="text-xs sm:text-sm">Guias Recebidas</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="charts" className="space-y-4">
            <FinanceCharts />
          </TabsContent>

          {userIsAdmin && (
            <>
              <TabsContent value="a-receber" className="space-y-4">
                <GuiaAReceberTable key={refreshKey} />
              </TabsContent>

              <TabsContent value="recebidas" className="space-y-4">
                <GuiaRecebidaTable />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </Layout>
  );
};

export default Finance;
