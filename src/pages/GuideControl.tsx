import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

// Função para normalizar datas e evitar problemas de fuso horário
const normalizeDate = (dateStr: string): Date => {
  // Se a data já está no formato YYYY-MM-DD, usar diretamente
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T00:00:00');
  }
  
  // Para outros formatos, tentar parsear normalmente
  const date = new Date(dateStr);
  
  // Verificar se a data é válida
  if (isNaN(date.getTime())) {
    console.warn('Data inválida:', dateStr);
    return new Date();
  }
  
  return date;
};
import GuideModal from '@/components/GuideModal';
import EditPrestadorModal from '@/components/EditPrestadorModal';
import { 
  User, 
  Calendar, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Plus,
  RefreshCw,
  Upload,
  DollarSign,
  Trash2,
  Edit
} from "lucide-react";

interface PrestadorData {
  numero_prestador: number;
  datas: string[];
  existe_guia_autorizada: number;
  existe_guia_assinada: number;
  existe_guia_assinada_psicologo: number;
  date_faturado: string | null;
  faturado: number;
}

interface GuideData {
  data: string;
  agendamento: string;
  guia: string;
  numero_prestador: number | string | null;
}

interface PatientData {
  patient_id: number;
  paciente_nome: string;
  appointment_id: number | null;
  status: "pending" | "confirmed" | "completed" | "cancelled" | null;
  payment_method: "private" | "insurance" | null;
  insurance_type: string | null;
  appointment_type: "presential" | "online" | null;
  existe_guia_autorizada: number | null;
  existe_guia_assinada: number | null;
  existe_guia_assinada_psicologo: number | null;
  date_faturado: string | null;
  faturado: number | null;
  mensagem?: string;
  date_apointments?: string; // String com datas separadas por vírgula
  prestadores: string; // JSON string que precisa ser parseado
  datas?: GuideData[]; // Array de datas com status de agendamento e guia
}

const GuideControl: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientsData, setPatientsData] = useState<PatientData[]>([]);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [prestadorToDelete, setPrestadorToDelete] = useState<number | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [downloadingEverything, setDownloadingEverything] = useState(false);
  const [downloadEverythingProgress, setDownloadEverythingProgress] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    remaining: 0,
    currentStep: '',
    currentGuide: ''
  });
  const [showDownloadComplete, setShowDownloadComplete] = useState(false);
  const [downloadResult, setDownloadResult] = useState({
    completed: 0,
    failed: 0,
    message: ''
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPrestador, setEditingPrestador] = useState<PrestadorData | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Função para salvar posição de scroll
  const saveScrollPosition = () => {
    setScrollPosition(window.scrollY);
  };

  // Função para restaurar posição de scroll
  const restoreScrollPosition = () => {
    setTimeout(() => {
      window.scrollTo(0, scrollPosition);
    }, 100);
  };

  // Função para buscar dados da API
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        "https://webhook.essenciasaudeintegrada.com.br/webhook/return_date_guias",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados: ${response.status}`);
      }
      
      const data: PatientData[] = await response.json();
      setPatientsData(data);
      
      // Restaurar posição de scroll após carregar dados
      restoreScrollPosition();
      
    } catch (e: any) {
      setError(e?.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Função para importar PDF de guia
  const handleImportGuia = async (
    patientName: string, 
    numeroPrestador: number, 
    command: "Guia-autorizada" | "Guia-assinada" | "Guia-assinada-psicologo",
    file: File
  ) => {
    try {
      const formData = new FormData();
      formData.append('command', command);
      formData.append('nome_patient', patientName);
      formData.append('numero_prestador', numeroPrestador.toString());
      formData.append('file', file);

      const response = await fetch(
        "https://webhook.essenciasaudeintegrada.com.br/webhook/insert_guia_completed",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao importar guia: ${response.status}`);
      }

      const result = await response.json();
      console.log('Guia importada com sucesso:', result);
      
      // Recarregar dados após importação
      fetchData();
      
    } catch (error) {
      console.error('Erro ao importar guia:', error);
      alert('Erro ao importar guia. Tente novamente.');
    }
  };

  // Função para fazer download do arquivo
  const handleDownloadGuia = async (numeroPrestador: number, command: string) => {
    try {
      setDownloadingFile(`${command}_${numeroPrestador}`);
      
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/get_guia_completed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numero_prestador: numeroPrestador,
          command: command
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao baixar arquivo: ${response.status}`);
      }

      // Criar blob e fazer download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${command}_${numeroPrestador}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Esconder indicador após download iniciar
      setTimeout(() => {
        setDownloadingFile(null);
      }, 1000); // 1 segundo de delay para mostrar que o download foi iniciado
      
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      alert('Erro ao baixar arquivo. Tente novamente.');
      setDownloadingFile(null);
    }
  };

  // Função para faturar
  const handleFaturar = async (numeroPrestador: number) => {
    try {
      const response = await fetch(
        "https://webhook.essenciasaudeintegrada.com.br/webhook/insert_state_faturament",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            numero_prestador: numeroPrestador
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao faturar: ${response.status}`);
      }

      const result = await response.json();
      console.log('Faturamento realizado com sucesso:', result);
      
      // Recarregar dados após faturamento
      fetchData();
      
    } catch (error) {
      console.error('Erro ao faturar:', error);
      alert('Erro ao faturar. Tente novamente.');
    }
  };

  // Função para lidar com upload de arquivo
  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    patientName: string,
    numeroPrestador: number,
    command: "Guia-autorizada" | "Guia-assinada" | "Guia-assinada-psicologo"
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImportGuia(patientName, numeroPrestador, command, file);
    }
  };

  // Função para abrir modal de guias
  const handleOpenGuideModal = (patient: PatientData) => {
    setSelectedPatient(patient);
    setIsGuideModalOpen(true);
  };

  // Função para fechar modal de guias
  const handleCloseGuideModal = () => {
    setIsGuideModalOpen(false);
    setSelectedPatient(null);
  };

  // Função para recarregar dados após sucesso
  const handleModalSuccess = () => {
    fetchData();
  };

  // Função para mostrar confirmação de exclusão
  const handleDeleteClick = (numeroPrestador: number) => {
    setPrestadorToDelete(numeroPrestador);
    setShowDeleteConfirm(true);
  };

  // Função para confirmar exclusão
  const handleConfirmDelete = async () => {
    if (!prestadorToDelete) return;

    try {
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/delete_prestador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero_prestador: prestadorToDelete
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao excluir prestador: ${response.status}`);
      }

      const result = await response.json();
      console.log('Prestador excluído com sucesso:', result);
      
      // Recarregar dados após exclusão
      fetchData();
      
    } catch (error) {
      console.error('Erro ao excluir prestador:', error);
      alert('Erro ao excluir prestador. Tente novamente.');
    } finally {
      setShowDeleteConfirm(false);
      setPrestadorToDelete(null);
    }
  };

  // Função para cancelar exclusão
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setPrestadorToDelete(null);
  };

  // Função para baixar tudo (3 requests por numero_prestador único)
  const handleDownloadEverything = async () => {
    // Filtrar prestadores com guia assinada pelo psicólogo E que não estão faturados
    const guidesToDownload: Array<{numero_prestador: number, paciente_nome: string}> = [];
    
    patientsData.forEach(patient => {
      if (patient.prestadores) {
        try {
          const prestadoresData: PrestadorData[] = JSON.parse(patient.prestadores);
          prestadoresData.forEach(prestador => {
            if (prestador.existe_guia_assinada_psicologo === 1 && prestador.faturado === 0) {
              guidesToDownload.push({
                numero_prestador: prestador.numero_prestador,
                paciente_nome: patient.paciente_nome
              });
            }
          });
        } catch (error) {
          console.error('Erro ao parsear prestadores:', error);
        }
      }
    });

    if (guidesToDownload.length === 0) {
      alert('Nenhuma guia assinada pelo psicólogo não faturada encontrada para download');
      return;
    }

    // Calcular total de requests (3 por numero_prestador único)
    const totalRequests = guidesToDownload.length * 3;

    setDownloadingEverything(true);
    setDownloadEverythingProgress({
      total: totalRequests,
      completed: 0,
      failed: 0,
      remaining: totalRequests,
      currentStep: 'Iniciando downloads...',
      currentGuide: ''
    });

    let completed = 0;
    let failed = 0;

    try {
      for (let i = 0; i < guidesToDownload.length; i++) {
        const guide = guidesToDownload[i];

        setDownloadEverythingProgress(prev => ({
          ...prev,
          currentGuide: guide.paciente_nome,
          currentStep: `Processando prestador ${i + 1} de ${guidesToDownload.length}`
        }));

        // Request 1: Guia assinada pelo psicólogo
        try {
          setDownloadEverythingProgress(prev => ({
            ...prev,
            currentStep: `Baixando guia assinada pelo psicólogo - ${guide.paciente_nome}`
          }));

          const response1 = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/get_guia_completed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              numero_prestador: guide.numero_prestador,
              command: 'Guia-assinada-psicologo'
            })
          });

          if (response1.ok) {
            const blob1 = await response1.blob();
            const url1 = window.URL.createObjectURL(blob1);
            const link1 = document.createElement('a');
            link1.href = url1;
            const contentDisposition = response1.headers.get('Content-Disposition');
            const filename1 = contentDisposition 
              ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
              : `Guia-Assinada-Psicologo-${guide.paciente_nome}-${guide.numero_prestador}.pdf`;
            link1.download = filename1;
            document.body.appendChild(link1);
            link1.click();
            document.body.removeChild(link1);
            window.URL.revokeObjectURL(url1);
            completed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error('Erro ao baixar guia assinada pelo psicólogo:', error);
          failed++;
        }

        setDownloadEverythingProgress(prev => ({
          ...prev,
          completed: completed,
          failed: failed,
          remaining: totalRequests - completed - failed
        }));

        // Request 2: Documento pessoal
        try {
          setDownloadEverythingProgress(prev => ({
            ...prev,
            currentStep: `Baixando documento pessoal - ${guide.paciente_nome}`
          }));

          const response2 = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/documento_pessoal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nome: guide.paciente_nome
            })
          });

          if (response2.ok) {
            const blob2 = await response2.blob();
            const url2 = window.URL.createObjectURL(blob2);
            const link2 = document.createElement('a');
            link2.href = url2;
            const contentDisposition2 = response2.headers.get('Content-Disposition');
            const filename2 = contentDisposition2 
              ? contentDisposition2.split('filename=')[1]?.replace(/"/g, '') 
              : `Documento-Pessoal-${guide.paciente_nome}.pdf`;
            link2.download = filename2;
            document.body.appendChild(link2);
            link2.click();
            document.body.removeChild(link2);
            window.URL.revokeObjectURL(url2);
            completed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error('Erro ao baixar documento pessoal:', error);
          failed++;
        }

        setDownloadEverythingProgress(prev => ({
          ...prev,
          completed: completed,
          failed: failed,
          remaining: totalRequests - completed - failed
        }));

        // Request 3: Relatório
        try {
          setDownloadEverythingProgress(prev => ({
            ...prev,
            currentStep: `Baixando relatório - ${guide.paciente_nome}`
          }));

          const response3 = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/relatorio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nome: guide.paciente_nome,
              titulo: 'RELATORIO PSICOLOGICO',
              cid: 'F-41',
              plano: 'PMDF'
            })
          });

          if (response3.ok) {
            const blob3 = await response3.blob();
            const url3 = window.URL.createObjectURL(blob3);
            const link3 = document.createElement('a');
            link3.href = url3;
            const contentDisposition3 = response3.headers.get('Content-Disposition');
            const filename3 = contentDisposition3 
              ? contentDisposition3.split('filename=')[1]?.replace(/"/g, '') 
              : `Relatorio-Psicologico-${guide.paciente_nome}.pdf`;
            link3.download = filename3;
            document.body.appendChild(link3);
            link3.click();
            document.body.removeChild(link3);
            window.URL.revokeObjectURL(url3);
            completed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error('Erro ao baixar relatório:', error);
          failed++;
        }

        setDownloadEverythingProgress(prev => ({
          ...prev,
          completed: completed,
          failed: failed,
          remaining: totalRequests - completed - failed
        }));

        // Pequeno delay entre prestadores para não sobrecarregar
        if (i < guidesToDownload.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setDownloadingEverything(false);

      // Mostrar resultado final com toast
      let message = '';
      if (failed === 0) {
        message = `Download concluído! ${completed} arquivos baixados com sucesso.`;
      } else if (completed === 0) {
        message = `Falha no download! ${failed} arquivos falharam.`;
      } else {
        message = `Download parcial! ${completed} arquivos baixados, ${failed} falharam.`;
      }
      
      setDownloadResult({
        completed,
        failed,
        message
      });
      setShowDownloadComplete(true);
      
      // Esconder toast após 5 segundos
      setTimeout(() => {
        setShowDownloadComplete(false);
      }, 5000);
      
    } catch (error) {
      console.error('Erro geral no download:', error);
      setDownloadResult({
        completed: 0,
        failed: 0,
        message: 'Erro durante o download. Tente novamente.'
      });
      setShowDownloadComplete(true);
      setDownloadingEverything(false);
      
      // Esconder toast após 5 segundos
      setTimeout(() => {
        setShowDownloadComplete(false);
      }, 5000);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Guias Concluídas</h1>
            <p className="text-gray-600 mt-1">Gestão de guias médicas finalizadas</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleDownloadEverything} 
              disabled={loading || downloadingEverything}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              {downloadingEverything ? 'Baixando...' : 'Baixar Tudo'}
            </Button>
            <Button onClick={fetchData} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="space-y-4">
          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-gray-600">Carregando dados...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Erro ao carregar dados:</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {!loading && !error && patientsData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum paciente encontrado</p>
            </div>
          )}

          {!loading && !error && patientsData.length > 0 && (
            <div className="space-y-6">
              {patientsData.map((patient) => {
                // Parse dos prestadores do JSON string
                let prestadoresData: PrestadorData[] = [];
                try {
                  prestadoresData = patient.prestadores ? JSON.parse(patient.prestadores) : [];
                  
                  // Debug: verificar formato das datas dos prestadores
                  prestadoresData.forEach((prestador, idx) => {
                    console.log(`Prestador ${idx} - Datas:`, prestador.datas);
                    prestador.datas.forEach((data, dataIdx) => {
                      console.log(`  Data ${dataIdx}:`, data, '-> Date:', new Date(data));
                    });
                  });
                } catch (error) {
                  console.error('Erro ao fazer parse dos prestadores:', error);
                  prestadoresData = [];
                }
                
                return (
                  <Card key={patient.patient_id} className="shadow-md hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xl text-gray-800">{patient.paciente_nome}</span>
                              {patient.appointment_type && (
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${
                                    patient.appointment_type === "online" 
                                      ? "bg-green-100 text-green-800 hover:bg-green-200" 
                                      : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                  }`}
                                >
                                  {patient.appointment_type === "online" ? "Online" : "Presencial"}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200">
                                ID: {patient.patient_id}
                              </Badge>
                              {patient.insurance_type && (
                                <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
                                  {patient.insurance_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            saveScrollPosition();
                            handleOpenGuideModal(patient);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          + Guias
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent>
                      {patient.mensagem ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-center gap-3 text-red-800">
                            <div className="p-2 bg-red-100 rounded-full">
                              <AlertTriangle className="h-5 w-5" />
                            </div>
                            <span className="font-medium text-red-900">{patient.mensagem}</span>
                          </div>
                        </div>
                      ) : prestadoresData.length > 0 ? (
                        <div className="space-y-6">
                          {prestadoresData.map((prestador, prestadorIdx) => (
                            <div key={prestadorIdx} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                              {/* Header do Prestador */}
                              <div className="mb-5">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-100 rounded-lg">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-lg text-gray-800 whitespace-nowrap">
                                      Número de Prestador: {prestador.numero_prestador}
                                    </span>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="text-xs p-1 h-6 w-6 border-blue-200 text-blue-700 hover:bg-blue-50 flex-shrink-0"
                                      onClick={() => {
                                        saveScrollPosition();
                                        setEditingPrestador(prestador);
                                        setShowEditModal(true);
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      className="text-xs p-1 h-6 w-6 bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
                                      onClick={() => handleDeleteClick(prestador.numero_prestador)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Botões de Ação */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Botão Guia Autorizada */}
                                  <div className="relative">
                                    {prestador.existe_guia_autorizada === 1 ? (
                                      <Button 
                                        size="sm" 
                                        variant="default"
                                        className="text-xs px-3 py-2 bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleDownloadGuia(prestador.numero_prestador, "Guia-autorizada")}
                                      >
                                        <Upload className="h-3 w-3 mr-1" />
                                        Baixar Autorizada
                                      </Button>
                                    ) : (
                                      <>
                                        <input
                                          type="file"
                                          accept=".pdf"
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleImportGuia(patient.paciente_nome, prestador.numero_prestador, "Guia-autorizada", file);
                                            }
                                          }}
                                        />
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="text-xs px-3 py-2 border-green-200 text-green-700 hover:bg-green-50 relative z-0"
                                        >
                                          <Upload className="h-3 w-3 mr-1" />
                                          Importar Autorizada
                                        </Button>
                                      </>
                                    )}
                                  </div>

                                  {/* Botão Guia Assinada */}
                                  <div className="relative">
                                    {prestador.existe_guia_assinada === 1 ? (
                                      <Button 
                                        size="sm" 
                                        variant="default"
                                        className="text-xs px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => handleDownloadGuia(prestador.numero_prestador, "Guia-assinada")}
                                      >
                                        <Upload className="h-3 w-3 mr-1" />
                                        Baixar Assinada
                                      </Button>
                                    ) : (
                                      <>
                                        <input
                                          type="file"
                                          accept=".pdf"
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleImportGuia(patient.paciente_nome, prestador.numero_prestador, "Guia-assinada", file);
                                            }
                                          }}
                                        />
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="text-xs px-3 py-2 border-blue-200 text-blue-700 hover:bg-blue-50 relative z-0"
                                        >
                                          <Upload className="h-3 w-3 mr-1" />
                                          Importar Assinada
                                        </Button>
                                      </>
                                    )}
                                  </div>

                                  {/* Botão Guia Assinada Psicólogo */}
                                  <div className="relative">
                                    {prestador.existe_guia_assinada_psicologo === 1 ? (
                                      <Button 
                                        size="sm" 
                                        variant="default"
                                        className="text-xs px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white"
                                        onClick={() => handleDownloadGuia(prestador.numero_prestador, "Guia-assinada-psicologo")}
                                      >
                                        <Upload className="h-3 w-3 mr-1" />
                                        Baixar Psicólogo
                                      </Button>
                                    ) : (
                                      <>
                                        <input
                                          type="file"
                                          accept=".pdf"
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleImportGuia(patient.paciente_nome, prestador.numero_prestador, "Guia-assinada-psicologo", file);
                                            }
                                          }}
                                        />
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="text-xs px-3 py-2 border-purple-200 text-purple-700 hover:bg-purple-50 relative z-0"
                                        >
                                          <Upload className="h-3 w-3 mr-1" />
                                          Importar Psicólogo
                                        </Button>
                                      </>
                                    )}
                                  </div>

                                  {/* Botão Faturar */}
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    className="text-xs px-3 py-2 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleFaturar(prestador.numero_prestador)}
                                    disabled={prestador.faturado === 1}
                                  >
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    {prestador.faturado ? "Faturado ✓" : "Faturar"}
                                  </Button>
                                </div>
                              </div>


                              {/* Datas de Agendamentos */}
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                {patient.datas && patient.datas.length > 0 ? (
                                  <>
                                    {/* Linha de Agendamentos */}
                                    <div className="mb-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-gray-600" />
                                          <span className="font-semibold text-gray-800">Agendamentos:</span>
                                        </div>
                                        {prestador.faturado === 1 && (
                                          <span className="text-2xl font-bold text-green-600 bg-green-100 px-4 py-2 rounded-lg border border-green-200">
                                            FATURADO
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {patient.datas
                                          .filter(data => data.numero_prestador === prestador.numero_prestador || data.numero_prestador === null)
                                          .map((data, dataIdx) => {
                                            const hasAgendamento = data.agendamento === "ok";
                                            return (
                                              <span key={dataIdx} className={`px-3 py-1 rounded-lg text-sm font-medium ${
                                                hasAgendamento 
                                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                                  : 'bg-red-100 text-red-800 border border-red-200'
                                              }`}>
                                                {data.data}
                                              </span>
                                            );
                                          })}
                                      </div>
                                    </div>

                                    {/* Linha de Guias */}
                                    <div className="mb-4">
                                      <div className="flex items-center gap-2 mb-3">
                                        <FileText className="h-4 w-4 text-gray-600" />
                                        <span className="font-semibold text-gray-800">Guias:</span>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {patient.datas
                                          .filter(data => data.numero_prestador === prestador.numero_prestador || data.numero_prestador === null)
                                          .map((data, dataIdx) => {
                                            const hasGuia = data.guia === "ok";
                                            return (
                                              <span key={dataIdx} className={`px-3 py-1 rounded-lg text-sm font-medium ${
                                                hasGuia 
                                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                                  : 'bg-red-100 text-red-800 border border-red-200'
                                              }`}>
                                                {data.data}
                                              </span>
                                            );
                                          })}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* Fallback para quando não há dados do paciente */}
                                    <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-gray-600" />
                                      Datas de Agendamentos
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      {prestador.datas.map((data, dataIdx) => (
                                        <span key={dataIdx} className="px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                          {format(normalizeDate(data), 'dd/MM/yyyy')}
                                        </span>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Data de Faturamento */}
                              {prestador.date_faturado && (
                                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                  <div className="flex items-center gap-2 text-emerald-800">
                                    <DollarSign className="h-4 w-4" />
                                    <span className="font-medium">Data Faturado: </span>
                                    <span className="font-semibold">
                                      {format(normalizeDate(prestador.date_faturado), 'dd/MM/yyyy')}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : patient.datas && patient.datas.length > 0 ? (
                        <div className="space-y-4">
                          {/* Seção para agendamentos sem GUIA */}
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                              <div className="p-2 bg-amber-100 rounded-full">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                              </div>
                              <span className="font-bold text-lg text-amber-800">
                                Agendamentos sem GUIA
                              </span>
                            </div>
                            
                            {/* Linha de Agendamentos */}
                            <div className="mb-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Calendar className="h-4 w-4 text-gray-600" />
                                <span className="font-semibold text-gray-800">Agendamentos:</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {patient.datas.map((data, dataIdx) => {
                                  const hasAgendamento = data.agendamento === "ok";
                                  return (
                                    <span key={dataIdx} className={`px-3 py-1 rounded-lg text-sm font-medium ${
                                      hasAgendamento 
                                        ? 'bg-green-100 text-green-800 border border-green-200' 
                                        : 'bg-red-100 text-red-800 border border-red-200'
                                    }`}>
                                      {data.data}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Linha de Guias */}
                            <div className="mb-4">
                              <div className="flex items-center gap-2 mb-3">
                                <FileText className="h-4 w-4 text-gray-600" />
                                <span className="font-semibold text-gray-800">Guias:</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {patient.datas.map((data, dataIdx) => {
                                  const hasGuia = data.guia === "ok";
                                  return (
                                    <span key={dataIdx} className={`px-3 py-1 rounded-lg text-sm font-medium ${
                                      hasGuia 
                                        ? 'bg-green-100 text-green-800 border border-green-200' 
                                        : 'bg-red-100 text-red-800 border border-red-200'
                                    }`}>
                                      {data.data}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Status do Prestador */}
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex items-center gap-2 text-yellow-800">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  ⚠️ Sem número de GUIA
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="p-3 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhum dado encontrado</h3>
                          <p className="text-gray-500">Não há prestadores ou agendamentos para este paciente.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Guias */}
      {selectedPatient && (
        <GuideModal
          isOpen={isGuideModalOpen}
          onClose={handleCloseGuideModal}
          patient={{
            patient_id: selectedPatient.patient_id,
            paciente_nome: selectedPatient.paciente_nome,
            datas: selectedPatient.datas || []
          }}
          onSuccess={handleModalSuccess}
        />
      )}
      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                Excluir Prestador
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir o prestador <strong>{prestadorToDelete}</strong>?
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelDelete}
                className="px-4 py-2"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700"
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de Download */}
      {downloadingFile && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span className="text-sm font-medium">
            Baixando {downloadingFile}...
          </span>
        </div>
      )}

      {/* Toast de Download Completo */}
      {showDownloadComplete && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="p-1 bg-green-500 rounded-full">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">
                {downloadResult.completed > 0 && downloadResult.failed === 0 && 'Download Concluído!'}
                {downloadResult.failed > 0 && downloadResult.completed === 0 && 'Download Falhou!'}
                {downloadResult.completed > 0 && downloadResult.failed > 0 && 'Download Parcial!'}
                {downloadResult.completed === 0 && downloadResult.failed === 0 && 'Erro!'}
              </div>
              <div className="text-xs mt-1">
                {downloadResult.message}
              </div>
              {downloadResult.completed > 0 && (
                <div className="text-xs mt-1 opacity-90">
                  ✓ {downloadResult.completed} sucessos
                  {downloadResult.failed > 0 && ` • ✗ ${downloadResult.failed} falhas`}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowDownloadComplete(false)}
              className="flex-shrink-0 text-green-200 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Progresso do Download Completo */}
      {downloadingEverything && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-full">
                <Upload className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                Baixando Tudo
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                {downloadEverythingProgress.currentStep}
              </div>
              
              {downloadEverythingProgress.currentGuide && (
                <div className="text-sm font-medium text-blue-600">
                  Paciente: {downloadEverythingProgress.currentGuide}
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso:</span>
                  <span>{downloadEverythingProgress.completed} de {downloadEverythingProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${downloadEverythingProgress.total > 0 ? (downloadEverythingProgress.completed / downloadEverythingProgress.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-semibold text-green-600">{downloadEverythingProgress.completed}</div>
                  <div className="text-gray-500">Concluídos</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-red-600">{downloadEverythingProgress.failed}</div>
                  <div className="text-gray-500">Falhas</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{downloadEverythingProgress.remaining}</div>
                  <div className="text-gray-500">Restantes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Prestador */}
      <EditPrestadorModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPrestador(null);
        }}
        prestador={editingPrestador}
        onSuccess={() => {
          fetchData(); // Recarregar dados após edição (já restaura scroll)
        }}
      />
    </Layout>
  );
};

export default GuideControl;