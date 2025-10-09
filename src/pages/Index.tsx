import AppointmentCalendar from "@/components/AppointmentCalendar";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React, { useEffect, useState } from "react";
import { X, AlertTriangle, Calendar, ClipboardList, User, Edit, BarChart3 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PsychologistAvailabilityDashboard from "@/components/PsychologistAvailabilityDashboard";

type AlertWebhookItem = {
  paciente_nome: string;
  motivo: string | null;
  exibir: number | string;
  datas: Array<{
    data: string; // Data no formato "DD/MM/YYYY"
    agendamento: string; // Status do agendamento ("ok", "warning", "error", etc.)
    guia: string; // Status da guia ("falta", "ok", etc.)
    numero_prestador: number | string | null;
  }>;
};

const Index = () => {
  const { user } = useAuth();
  const [showAlertModal, setShowAlertModal] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertItems, setAlertItems] = useState<AlertWebhookItem[]>([]);
  
  // Estados para o modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertWebhookItem | null>(null);
  const [editExibir, setEditExibir] = useState(true);
  const [editMotivo, setEditMotivo] = useState("");
  const [savingAlert, setSavingAlert] = useState(false);

  // Verificação de permissões do usuário
  const isAdmin = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";
  const isPsychologist = user?.role === "psychologist";
  const canViewAlerts = isAdmin || isReceptionist; // Apenas admin e recepcionista podem ver alertas

  // Função para buscar alertas da API
  const fetchAlerts = async () => {
    try {
      setLoadingAlerts(true);
      setAlertError(null);
      
      const response = await fetch(
        "https://webhook.essenciasaudeintegrada.com.br/webhook/ALERTA",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar alertas: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Processar o novo formato da API
      let alertItems: AlertWebhookItem[] = [];
      
      if (Array.isArray(data)) {
        alertItems = data;
      } else if (data && typeof data === 'object') {
        alertItems = [data];
      }
      
      setAlertItems(alertItems);
      
    } catch (e: any) {
      setAlertError(e?.message || "Erro desconhecido");
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    // Só buscar alertas se o usuário tem permissão para vê-los
    if (!canViewAlerts) {
      setShowAlertModal(false);
      return;
    }

    let aborted = false;
    const loadAlerts = async () => {
      await fetchAlerts();
    };
    
    loadAlerts();
    return () => {
      aborted = true;
    };
  }, [canViewAlerts]);

  // Função para abrir modal de edição
  const handleEditAlert = (alert: AlertWebhookItem) => {
    setEditingAlert(alert);
    setEditExibir(alert.exibir !== 0);
    setEditMotivo(alert.motivo || "");
    setShowEditModal(true);
  };

  // Função para salvar alterações do alerta
  const handleSaveAlert = async () => {
    if (!editingAlert) {
      return;
    }

    try {
      setSavingAlert(true);
      
      const requestBody = {
        paciente_nome: editingAlert.paciente_nome,
        exibir: editExibir ? "1" : "0",
        motivo: editMotivo
      };
      
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/alter_alerta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar alterações");
      }

      setShowEditModal(false);
      setEditingAlert(null);
      setEditMotivo("");
      
      // Recarregar os alertas da API para obter os dados atualizados
      await fetchAlerts();
      
      // Mostrar feedback de sucesso
      alert("Alerta atualizado com sucesso!");
    } catch (error) {
      alert("Erro ao salvar alterações. Tente novamente.");
    } finally {
      setSavingAlert(false);
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto">
        <AppointmentCalendar />
      </div>

      {showAlertModal && canViewAlerts && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4"
          onClick={() => setShowAlertModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mt-8 max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Alertas do Sistema</h2>
              <button
                onClick={() => setShowAlertModal(false)}
                className="p-1 rounded-full hover:bg-white/20 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <Tabs defaultValue="alerts" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="alerts" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Alertas do Sistema
                  </TabsTrigger>
                  <TabsTrigger value="availability" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Disponibilidade dos Psicólogos
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="alerts" className="mt-6">
                  {loadingAlerts && (
                    <div className="text-gray-600">Carregando alertas...</div>
                  )}
                  {!loadingAlerts && alertError && (
                    <div className="text-rose-600">{alertError}</div>
                  )}
                  {!loadingAlerts && !alertError && alertItems.length === 0 && (
                    <div className="text-gray-600">Nenhum alerta encontrado.</div>
                  )}

                  {!loadingAlerts && !alertError && alertItems.length > 0 && (
                    <div className="space-y-4 max-w-full">
                      {/* Alertas da API */}
                      <Card className="w-full">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-blue-600" />
                            Alertas do Sistema
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                          {/* Cabeçalho da tabela */}
                          <div className="flex items-center px-4 py-2 bg-gray-100 text-sm font-medium text-gray-700 mb-1">
                            <div className="flex items-center gap-2 flex-1">
                              <User className="h-4 w-4" />
                              <span>Paciente</span>
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              <Calendar className="h-4 w-4" />
                              <span>Datas e Status</span>
                            </div>
                            <div className="flex items-center gap-2 w-20">
                              <span>Ações</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            {alertItems
                              .filter((alert) => {
                                // Filtrar pacientes que têm todas as datas e guias "ok"
                                if (!alert.datas || !Array.isArray(alert.datas)) {
                                  return true; // Mostrar se não tem datas (erro)
                                }
                                
                                // Verificar se todas as guias estão "ok"
                                const todasGuiasOk = alert.datas.every(dataItem => dataItem.guia === "ok");
                                
                                // Se todas as guias estão ok, não mostrar
                                if (todasGuiasOk) {
                                  return false;
                                }
                                
                                return true; // Mostrar se tem pelo menos uma guia com problema
                              })
                              .sort((a, b) => {
                                // Ordenar: exibir = 1 primeiro, exibir = 0 no final
                                if (a.exibir === 1 && b.exibir !== 1) return -1;
                                if (a.exibir !== 1 && b.exibir === 1) return 1;
                                return 0;
                              })
                              .map((alert, index) => {
                              // Determinar se o alerta está ativo ou desabilitado
                              const isActive = alert.exibir !== 0;
                              const alertColor = isActive ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200";
                              
                              return (
                                <div key={index} className={`flex items-center px-4 py-3 rounded text-sm hover:bg-opacity-80 transition-colors border-l-4 ${alertColor}`}>
                                  {/* Nome do Paciente */}
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                    <div className="flex flex-col">
                                      <span className="font-medium truncate">{alert.paciente_nome}</span>
                                      {!isActive && (
                                        <div className="flex flex-col">
                                          <span className="text-xs text-red-600 font-medium">⚠️ Paciente Desistiu</span>
                                          {alert.motivo && (
                                            <span className="text-xs text-gray-600">Motivo: {alert.motivo}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                      </div>
                                  
                                  {/* Datas e Status */}
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="flex flex-col gap-1">
                                      {alert.datas && Array.isArray(alert.datas) ? alert.datas.map((dataItem, idx) => {
                                        // Determinar cores para agendamento
                                        const agendamentoColor = dataItem.agendamento === "ok" ? "bg-green-200 text-green-900" : 
                                                               dataItem.agendamento === "warning" ? "bg-yellow-200 text-yellow-900" :
                                                               dataItem.agendamento === "error" ? "bg-red-200 text-red-900" :
                                                               "bg-blue-200 text-blue-900";
                                        
                                        // Determinar cores para guia
                                        const guiaColor = dataItem.guia === "ok" ? "bg-green-200 text-green-900" : 
                                                         dataItem.guia === "falta" ? "bg-red-200 text-red-900" :
                                                         "bg-blue-200 text-blue-900";
                                        
                                        return (
                                          <div key={idx} className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-600 min-w-[80px]">
                                              {dataItem.data}
                                                </span>
                                            <div className="flex gap-1">
                                              <span className={`px-2 py-1 rounded text-xs font-medium ${agendamentoColor}`}>
                                                📅 {dataItem.agendamento === "falta" ? "falta agendamento" : dataItem.agendamento}
                                              </span>
                                              <span className={`px-2 py-1 rounded text-xs font-medium ${guiaColor}`}>
                                                📋 {dataItem.guia === "falta" ? "falta guia" : dataItem.guia}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      }) : (
                                        <span className="text-xs text-gray-500">Paciente sem agendamentos/guias</span>
                                      )}
                              </div>
                                            </div>
                                            
                                            {/* Botão Editar */}
                                  <div className="flex items-center gap-2 w-20">
                                              <button
                                      onClick={() => handleEditAlert(alert)}
                                                className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Editar alerta"
                                              >
                                                <Edit className="h-4 w-4" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                </TabsContent>
                
                <TabsContent value="availability" className="mt-6">
                  <PsychologistAvailabilityDashboard 
                    appointments={[]}
                    workingHours={[]}
                    users={[]}
                    loading={false}
                    error={null}
                    onRefresh={() => {
                      // Recarregar dados se necessário
                      window.location.reload();
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Alerta */}
      {showEditModal && editingAlert && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-lg font-bold">Editar Alerta</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-full hover:bg-white/20 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Paciente:</strong> {editingAlert.paciente_nome}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Total de Datas:</strong> {editingAlert.datas.length}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="exibir"
                    checked={editExibir}
                    onChange={(e) => setEditExibir(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="exibir" className="text-sm font-medium text-gray-700">
                    Alerta ativo
                  </label>
                </div>

                <div>
                  <label htmlFor="motivo" className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo (opcional)
                  </label>
                  <textarea
                    id="motivo"
                    value={editMotivo}
                    onChange={(e) => setEditMotivo(e.target.value)}
                    placeholder="Digite o motivo da alteração..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={savingAlert}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAlert}
                  disabled={savingAlert}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingAlert && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {savingAlert ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Index;