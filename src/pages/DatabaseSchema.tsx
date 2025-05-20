
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { fullDatabaseSQL } from "@/utils/databaseSchema";

const DatabaseSchema = () => {
  const [copied, setCopied] = useState(false);
  
  const handleCopySQL = () => {
    navigator.clipboard.writeText(fullDatabaseSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Esquema do Banco de Dados</h1>
        
        <p className="mb-6 text-gray-700">
          Abaixo está o script SQL completo para criar todas as tabelas necessárias 
          para o funcionamento do sistema. Este script cria um banco de dados chamado "saude" 
          e todas as tabelas com seus relacionamentos.
        </p>
        
        <Tabs defaultValue="sql">
          <TabsList className="mb-4">
            <TabsTrigger value="sql">Script SQL</TabsTrigger>
            <TabsTrigger value="info">Informações</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sql">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">Script de Criação do Banco de Dados</h2>
                  <Button 
                    onClick={handleCopySQL}
                    variant="outline"
                    size="sm"
                  >
                    {copied ? "Copiado!" : "Copiar SQL"}
                  </Button>
                </div>
                
                <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {fullDatabaseSQL}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="info">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-medium mb-4">Estrutura do Banco de Dados</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-base mb-2">Tabelas Principais:</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>users</strong> - Usuários do sistema (administradores, recepcionistas, psicólogos)</li>
                      <li><strong>psychologist_details</strong> - Detalhes específicos para psicólogos</li>
                      <li><strong>working_hours</strong> - Horários de disponibilidade dos psicólogos</li>
                      <li><strong>consulting_rooms</strong> - Salas de consulta disponíveis na clínica</li>
                      <li><strong>patients</strong> - Pacientes da clínica</li>
                      <li><strong>appointments</strong> - Agendamentos de consultas</li>
                      <li><strong>patient_records</strong> - Prontuários/registros dos pacientes</li>
                      <li><strong>finance_transactions</strong> - Transações financeiras relacionadas às consultas</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-medium text-base mb-2">Como Usar:</h3>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Execute o script SQL em seu gerenciador de banco de dados MySQL</li>
                      <li>Verifique se todas as tabelas foram criadas corretamente</li>
                      <li>Configure as variáveis de ambiente para conexão ao banco de dados</li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="font-medium text-base mb-2">Observações:</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Todas as tabelas incluem campos de auditoria (created_at, updated_at)</li>
                      <li>Chaves estrangeiras foram configuradas com regras apropriadas de exclusão</li>
                      <li>Índices foram adicionados para melhorar a performance em consultas frequentes</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default DatabaseSchema;
