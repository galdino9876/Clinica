import { useState } from "react";
import Layout from "@/components/Layout";
import FinanceCharts from "@/components/FinanceCharts";
import GuiaAReceberTable from "@/components/GuiaAReceberTable";
import GuiaRecebidaTable from "@/components/GuiaRecebidaTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Finance = () => {
  const [activeTab, setActiveTab] = useState("charts");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finanças</h1>
          <p className="text-muted-foreground">
            Gestão financeira e acompanhamento de guias a receber
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="charts">Dashboard Financeiro</TabsTrigger>
            <TabsTrigger value="a-receber">Guias a Receber</TabsTrigger>
            <TabsTrigger value="recebidas">Guias Recebidas</TabsTrigger>
          </TabsList>

          <TabsContent value="charts" className="space-y-4">
            <FinanceCharts />
          </TabsContent>

          <TabsContent value="a-receber" className="space-y-4">
            <GuiaAReceberTable key={refreshKey} />
          </TabsContent>

          <TabsContent value="recebidas" className="space-y-4">
            <GuiaRecebidaTable />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Finance;
