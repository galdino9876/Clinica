import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, Send, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Interface para os dados da API
interface EmailData {
  id: number;
  id_drive_autorizado: string | null;
  email_controle: number;
  id_patient: number;
  patient_name: string;
  email_patient: string;
}

const EmailDashboard = () => {
  const [pendingEmails, setPendingEmails] = useState<EmailData[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());
  const [sendingEmails, setSendingEmails] = useState(false);
  const [progressAlert, setProgressAlert] = useState({
    isVisible: false,
    total: 0,
    sent: 0,
    failed: 0,
    current: 0
  });

  useEffect(() => {
    fetchEmailData();
  }, []);

  const fetchEmailData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/get_email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Verificar se é um array ou objeto único
      const dataArray = Array.isArray(result) ? result : [result];
      
      // Separar emails pendentes (email_controle === 0 e id_drive_autorizado tem valor)
      const pending = dataArray.filter(
        (email) => email.email_controle === 0 && email.id_drive_autorizado != null && email.id_drive_autorizado !== ''
      );
      
      // Separar emails enviados (email_controle === 1)
      const sent = dataArray.filter(
        (email) => email.email_controle === 1
      );
      
      setPendingEmails(pending);
      setSentEmails(sent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar emails:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id: number) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEmails(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEmails.size === pendingEmails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(pendingEmails.map(email => email.id)));
    }
  };

  const handleSendEmails = async () => {
    if (selectedEmails.size === 0) return;
    
    try {
      setSendingEmails(true);
      
      const selectedEmailList = pendingEmails.filter(email => selectedEmails.has(email.id));
      const total = selectedEmailList.length;
      
      setProgressAlert({
        isVisible: true,
        total,
        sent: 0,
        failed: 0,
        current: 0
      });
      
      let sentCount = 0;
      let failedCount = 0;
      let currentCount = 0;

      // Enviar um email por vez
      for (const email of selectedEmailList) {
        currentCount++;
        try {
          const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/send_mail', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: email.id,
              id_drive_autorizado: email.id_drive_autorizado,
              email_controle: email.email_controle,
              id_patient: email.id_patient,
              patient_name: email.patient_name,
              email_patient: email.email_patient
            })
          });

          if (response.ok) {
            sentCount++;
          } else {
            failedCount++;
          }
          
          // Atualizar progresso em tempo real
          setProgressAlert({
            isVisible: true,
            total,
            sent: sentCount,
            failed: failedCount,
            current: currentCount
          });
        } catch (err) {
          failedCount++;
          setProgressAlert({
            isVisible: true,
            total,
            sent: sentCount,
            failed: failedCount,
            current: currentCount
          });
          console.error('Erro ao enviar email:', err);
        }
      }

      // Após enviar todos, recarregar os dados
      await fetchEmailData();
      setSelectedEmails(new Set());
      
      // Ocultar alerta após 3 segundos
      setTimeout(() => {
        setProgressAlert(prev => ({ ...prev, isVisible: false }));
      }, 3000);
      
    } catch (err) {
      console.error('Erro ao enviar emails:', err);
      setProgressAlert(prev => ({ ...prev, isVisible: false }));
    } finally {
      setSendingEmails(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando emails...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-md text-center">
        <p className="text-red-600">Erro: {error}</p>
        <Button onClick={fetchEmailData} className="mt-4">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">
            Emails pendentes para envio: {pendingEmails.length} | Emails já enviados: {sentEmails.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchEmailData} variant="outline">
            Atualizar
          </Button>
          {pendingEmails.length > 0 && (
            <>
              <Button 
                onClick={handleSelectAll}
                variant="outline"
              >
                {selectedEmails.size === pendingEmails.length ? 'Deselecionar Todos' : 'Selecionar Todos'}
              </Button>
              <Button 
                onClick={handleSendEmails}
                disabled={sendingEmails || selectedEmails.size === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sendingEmails ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Email {selectedEmails.size > 0 && `(${selectedEmails.size})`}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Emails Pendentes */}
      {pendingEmails.length === 0 ? (
        <div className="p-6 bg-gray-50 rounded-md text-center">
          <p className="text-gray-500">
            Não há emails pendentes para envio.
          </p>
        </div>
      ) : (
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Emails Pendentes ({pendingEmails.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {/* Cabeçalho da tabela */}
            <div className="flex items-center px-4 py-2 bg-gray-100 text-sm font-medium text-gray-700">
              <div className="w-12 flex items-center justify-center">
                <Checkbox
                  checked={selectedEmails.size === pendingEmails.length && pendingEmails.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </div>
              <div className="flex-1">
                <span>Nome do Paciente</span>
              </div>
              <div className="flex-1">
                <span>Email</span>
              </div>
              <div className="w-24">
                <span>ID</span>
              </div>
            </div>
            
            <div className="space-y-1">
              {pendingEmails.map((email) => (
                <div 
                  key={email.id} 
                  className={`flex items-center px-4 py-2 rounded text-sm hover:bg-gray-100 transition-colors ${
                    selectedEmails.has(email.id) ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="w-12 flex items-center justify-center">
                    <Checkbox
                      checked={selectedEmails.has(email.id)}
                      onCheckedChange={() => handleToggleSelect(email.id)}
                    />
                  </div>
                  <div className="flex-1 font-medium">
                    {email.patient_name}
                  </div>
                  <div className="flex-1 text-gray-600 truncate">
                    {email.email_patient}
                  </div>
                  <div className="w-24 text-gray-500">
                    {email.id_patient}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emails Enviados */}
      {sentEmails.length > 0 && (
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Emails Já Enviados ({sentEmails.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {/* Cabeçalho da tabela */}
            <div className="flex items-center px-4 py-2 bg-gray-100 text-sm font-medium text-gray-700">
              <div className="w-12"></div>
              <div className="flex-1">
                <span>Nome do Paciente</span>
              </div>
              <div className="flex-1">
                <span>Email</span>
              </div>
              <div className="w-24">
                <span>Status</span>
              </div>
            </div>
            
            <div className="space-y-1">
              {sentEmails.map((email) => (
                <div 
                  key={email.id} 
                  className="flex items-center px-4 py-2 rounded text-sm bg-gray-50 opacity-75"
                >
                  <div className="w-12"></div>
                  <div className="flex-1 font-medium">
                    {email.patient_name}
                  </div>
                  <div className="flex-1 text-gray-600 truncate">
                    {email.email_patient}
                  </div>
                  <div className="w-24">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Email enviado
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerta de Progresso */}
      {progressAlert.isVisible && (
        <div className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white rounded-lg p-4 shadow-lg min-w-[300px]">
          <div className="flex items-center gap-3">
            {progressAlert.sent + progressAlert.failed < progressAlert.total && (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            <div className="flex-1">
              <p className="font-medium">
                Enviando: {progressAlert.current} de {progressAlert.total}
              </p>
              <div className="mt-1">
                <div className="w-full bg-blue-700 rounded-full h-2">
                  <div 
                    className="bg-green-400 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${progressAlert.total > 0 ? (progressAlert.current / progressAlert.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              <p className="text-sm text-blue-200 mt-1">
                Sucesso: {progressAlert.sent} | Falhas: {progressAlert.failed}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailDashboard;
