
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
// Removido Textarea para usar contenteditable com suporte a imagens inline
import { Patient, PatientRecord } from "@/types/appointment";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Trash, MessageCircle, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";


interface PatientRecordsProps {
  patient: Patient;
  onClose: () => void;
}

const PatientRecords = ({ patient, onClose }: PatientRecordsProps) => {
  const [notes, setNotes] = useState("");
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [showAll, setShowAll] = useState(true); // Exibe todos por padrão
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [psychologists, setPsychologists] = useState<{ [key: number]: string }>({}); // Mapeamento ID -> Nome
  const [usersCache, setUsersCache] = useState<any[]>([]); // Cache da lista de usuários
  const [selectedImages, setSelectedImages] = useState<{ id: string; file: File; url: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImageUrls, setCurrentImageUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const { user } = useAuth();

  // Função para normalizar URL de imagem (tenta melhorar compatibilidade)
  const normalizeImageUrl = (url: string): string => {
    if (!url) return url;
    
    // Se for URL do Google Drive, tenta melhorar o acesso
    if (url.includes('googleusercontent.com') || url.includes('drive.google.com')) {
      // Remove parâmetros que podem causar problemas
      try {
        const urlObj = new URL(url);
        // Mantém apenas parâmetros essenciais
        urlObj.searchParams.delete('usp');
        urlObj.searchParams.delete('export');
        return urlObj.toString();
      } catch (e) {
        // Se falhar ao parsear, retorna original
        return url;
      }
    }
    
    return url;
  };

  // Função para buscar nome do psicólogo
  const fetchPsychologistName = async (psychologistId: number) => {
    try {
      // Validação para garantir que o ID existe
      if (!psychologistId || !Number.isInteger(psychologistId)) {
        // console.warn("ID do psicólogo inválido:", psychologistId);
        return "Desconhecido";
      }

      console.log("Buscando psicólogo com ID:", psychologistId);
      
      let users: any[] = [];
      
      // Se já temos o cache de usuários, usar ele
      if (usersCache.length > 0) {
        users = usersCache;
        console.log("Usando cache de usuários");
      } else {
        // Buscar todos os usuários de uma vez
        const response = await fetch(
          "https://webhook.essenciasaudeintegrada.com.br/webhook/users"
        );
        
        if (!response.ok) {
          console.error("Erro na resposta da API:", response.status, response.statusText);
          throw new Error("Erro ao buscar usuários");
        }
        
        const usersData = await response.json();
        users = Array.isArray(usersData) ? usersData : usersData.users || usersData.data || [];
        
        // Salvar no cache
        setUsersCache(users);
        console.log("Lista de usuários carregada e cacheada:", users.length);
      }
      
      // Encontrar o usuário específico por ID
      const user = users.find((u: any) => {
        // Converter ambos para string para comparação mais robusta
        const userId = String(u.id);
        const targetId = String(psychologistId);
        return userId === targetId;
      });
      
      if (user) {
        console.log("Usuário encontrado:", user);
        return user.name || user.nome || "Desconhecido";
      } else {
        // console.warn("Usuário não encontrado com ID:", psychologistId);
        console.log("Usuários disponíveis:", users.map(u => ({ id: u.id, name: u.name || u.nome })));
        return "Desconhecido";
      }
    } catch (error) {
      console.error("Erro ao buscar psicólogo:", error);
      return "Desconhecido";
    }
  };

  // Carrega nomes dos psicólogos para os registros
  const loadPsychologistNames = async (records: PatientRecord[]) => {
    const uniqueIds = [...new Set(records.map((r) => r.created_by))];
    const names: { [key: number]: string } = {};
    
    console.log("IDs únicos de psicólogos encontrados:", uniqueIds);
    console.log("Registros recebidos:", records);
    
    for (const id of uniqueIds) {
      // Valida se o ID é válido antes de fazer a requisição
      if (id && Number.isInteger(id)) {
        console.log("Carregando nome para psicólogo ID:", id);
        const name = await fetchPsychologistName(id);
        names[id] = name;
        console.log(`Nome carregado para ID ${id}:`, name);
      } else if (!id || !Number.isInteger(id)) {
        // console.warn("ID inválido encontrado:", id);
        names[id] = "ID Inválido";
      }
    }
    
    console.log("Nomes carregados:", names);
    setPsychologists((prev) => ({ ...prev, ...names }));
  };

  const fetchRecords = async (patientId: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/patient_records/${patientId}`
      );
      if (!response.ok) throw new Error("Erro ao carregar prontuários");
      const data = await response.json();
      const recordsData = Array.isArray(data) ? data : data.records || [];
      
      // Normalizar os dados dos prontuários
      const normalizedRecords = recordsData.map((record: any) => ({
        id: Number(record.id) || 0,
        patient_id: record.patient_id || record.patientId || patientId,
        appointment_id: record.appointment_id || record.appointmentId || null,
        date: record.date || new Date().toISOString().split('T')[0],
        notes: record.notes || '',
        created_by: Number(record.created_by || record.createdBy) || 0,
        img_nota1: record.img_nota1 || null,
        img_nota2: record.img_nota2 || null,
        img_nota3: record.img_nota3 || null,
        img_nota4: record.img_nota4 || null,
        img_nota5: record.img_nota5 || null,
      }));
      
      console.log("Prontuários normalizados:", normalizedRecords);
      setRecords(normalizedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      await loadPsychologistNames(normalizedRecords);
    } catch (err: any) {
      setError("Erro ao carregar prontuários.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Verifica se o usuário está autenticado
    if (!user || !user.id) {
      console.error("Usuário não autenticado ou sem ID:", user);
      setError("Usuário não autenticado. Faça login novamente.");
      setLoading(false);
      return;
    }

    console.log("Usuário autenticado:", user);
    
    if (patient?.id && Number.isInteger(Number(patient.id))) {
      fetchRecords(Number(patient.id));
    } else {
      setError("Paciente inválido.");
      setLoading(false);
    }
  }, [patient, user]);

  // Monitorar mudanças no estado dos psicólogos para debug
  useEffect(() => {
    console.log("Estado dos psicólogos atualizado:", psychologists);
  }, [psychologists]);

  const handleSaveRecord = async () => {
    const currentEditor = editorRef.current;
    const notesText = currentEditor ? currentEditor.innerText.trim() : notes.trim();
    if (!notesText) {
      setError("As anotações são obrigatórias.");
      return;
    }
    if (!Number.isInteger(patient.id)) {
      setError("ID do paciente inválido.");
      return;
    }
    if (!user || !Number.isInteger(user.id)) {
      setError("Usuário não autenticado ou ID inválido. Faça login novamente.");
      return;
    }

    const newRecord = {
      patient_id: Number(patient.id),
      appointment_id: null as string | null,
      date: new Date().toISOString().split("T")[0],
      notes: String(notesText),
      created_by: Number(user.id),
    };

    try {
      setLoading(true);
      setError(null);
      let response: Response | null = null;

      // Enviar com imagens em binário se houver
      if (selectedImages.length > 0) {
        const formData = new FormData();
        // patient_id: número (convertido para string no FormData, mas valor numérico)
        formData.append("patient_id", String(Number(newRecord.patient_id)));
        // appointment_id: texto (string ou null)
        formData.append("appointment_id", newRecord.appointment_id ? String(newRecord.appointment_id) : "");
        formData.append("date", newRecord.date);
        // notes: texto (string)
        formData.append("notes", String(newRecord.notes));
        // created_by: número (convertido para string no FormData, mas valor numérico)
        formData.append("created_by", String(Number(newRecord.created_by)));
        
        // Enviar imagens com nomes img1, img2, img3, img4, img5
        selectedImages.forEach((img, index) => {
          const imageKey = `img${index + 1}`;
          formData.append(imageKey, img.file);
        });

        response = await fetch(
          "https://webhook.essenciasaudeintegrada.com.br/webhook/create-patients-records",
          {
            method: "POST",
            body: formData,
          }
        );
      } else {
        // Sem imagem: mantém JSON como antes
        // Garantir tipos corretos: patient_id e created_by como número, appointment_id e notes como string
        const jsonRecord = {
          patient_id: Number(newRecord.patient_id),
          appointment_id: newRecord.appointment_id ? String(newRecord.appointment_id) : null,
          date: newRecord.date,
          notes: String(newRecord.notes),
          created_by: Number(newRecord.created_by),
        };
        
        response = await fetch(
          "https://webhook.essenciasaudeintegrada.com.br/webhook/create-patients-records",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(jsonRecord),
          }
        );
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao salvar prontuário");
      }
      
      // Recarregar registros do servidor após salvar com sucesso
      // Isso garante que os dados exibidos são os mesmos do banco de dados
      await fetchRecords(Number(patient.id));
      
      // Limpar campos após salvar
      setNotes("");
      // Limpa editor
      if (editorRef.current) editorRef.current.innerHTML = "";
      // Limpa imagens e revoga URLs
      selectedImages.forEach((img) => URL.revokeObjectURL(img.url));
      setSelectedImages([]);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar prontuário. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Permitir apenas texto no editor, imagens devem ser adicionadas via upload
    // Não fazer nada especial para imagens no paste
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    
    if (imageFiles.length === 0) return;
    
    addImages(imageFiles);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const imageFiles = Array.from(files).filter(file => file.type.startsWith("image/"));
    addImages(imageFiles);
    
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addImages = (files: File[]) => {
    const newImages = files
      .slice(0, 5 - selectedImages.length) // Limitar a 5 imagens no total
      .map(file => {
        const url = URL.createObjectURL(file);
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return { id, file, url };
      });
    
    if (newImages.length > 0) {
      setSelectedImages((prev) => [...prev, ...newImages]);
    }
    
    if (files.length > 5 - selectedImages.length) {
      setError(`Apenas as primeiras ${5 - selectedImages.length} imagens foram adicionadas. Máximo de 5 imagens permitido.`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const removeImage = (id: string) => {
    setSelectedImages((prev) => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  // Atualiza estado de notas baseado no texto do editor
  const handleEditorInput = () => {
    const ed = editorRef.current;
    setNotes(ed ? ed.innerText : "");
  };

  // Cleanup URLs ao desmontar
  useEffect(() => {
    return () => {
      selectedImages.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, []);

  // Navegação por teclado no modal de imagem
  useEffect(() => {
    if (!imageModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setImageModalOpen(false);
      } else if (e.key === 'ArrowLeft' && currentImageUrls.length > 1) {
        setCurrentImageIndex((prev) => 
          prev === 0 ? currentImageUrls.length - 1 : prev - 1
        );
      } else if (e.key === 'ArrowRight' && currentImageUrls.length > 1) {
        setCurrentImageIndex((prev) => 
          prev === currentImageUrls.length - 1 ? 0 : prev + 1
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageModalOpen, currentImageUrls.length]);

  const handleDeleteRecord = async (recordId: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este prontuário?")) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        "https://webhook.essenciasaudeintegrada.com.br/webhook/patient-records",
        { 
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ id: recordId })
        }
      );
      
      if (!response.ok) throw new Error("Falha ao excluir prontuário");
      
      // Remove o registro da lista local
      setRecords(records.filter((r) => r.id !== recordId));
    } catch (err: any) {
      setError("Erro ao excluir prontuário.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  // Função para abrir WhatsApp
  const openWhatsApp = (phone: string) => {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    // Abre o WhatsApp com o número formatado
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  if (error || !patient) {
    return (
      <div className="p-4">
        <p className="text-red-600">{error || "Paciente não encontrado."}</p>
        <Button variant="outline" onClick={onClose} className="mt-4">
          Fechar
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando prontuários...</span>
      </div>
    );
  }

  // Exibe todos os registros por padrão, ou apenas o último se showAll for false
  const displayedRecords = showAll ? records : records.slice(0, 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">Nome</p>
          <p>{patient.name || patient.name || "N/A"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">CPF</p>
          <p>{patient.cpf || "N/A"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">Telefone</p>
          <div className="flex items-center gap-2">
            <p>{patient.phone || patient.phone || "N/A"}</p>
            {(patient.phone || patient.phone) && (
              <button
                onClick={() => openWhatsApp(patient.phone || patient.phone)}
                className="text-green-600 hover:text-green-700 transition-colors"
                title="Abrir WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">E-mail</p>
          <p>{patient.email || "N/A"}</p>
        </div>
        {/* Campos do responsável - só mostram se tiverem valores */}
        {patient.nome_responsavel && patient.telefone_responsavel && (
          <div className="space-y-1 md:col-span-2">
            <p className="text-sm font-medium text-gray-500">Responsável</p>
            <div className="space-y-1">
              <p><span className="text-sm font-medium text-gray-500">Nome:</span> {patient.nome_responsavel}</p>
              <div className="flex items-center gap-2">
                <p><span className="text-sm font-medium text-gray-500">Telefone:</span> {patient.telefone_responsavel}</p>
                <button
                  onClick={() => openWhatsApp(patient.telefone_responsavel)}
                  className="text-green-600 hover:text-green-700 transition-colors"
                  title="Abrir WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Histórico de Prontuários</h3>
        {records.length > 1 && (
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="text-sm px-4 py-1"
          >
            {showAll ? "Ver Apenas o Último" : "Ver Todos os Prontuários"}
          </Button>
        )}
      </div>
      {records.length === 0 ? (
        <p className="text-gray-500 text-sm">Nenhum prontuário encontrado para este paciente.</p>
      ) : (
        <div className="space-y-3">
          {displayedRecords.map((record) => (
            <Card
              key={record.id || Math.random().toString()}
              className="border border-gray-200 rounded-lg shadow-sm"
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {formatDate(record.date)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Criado por: {psychologists[record.created_by] || "Carregando..."} 
                      {!psychologists[record.created_by] && (
                        <span className="text-red-500 ml-1">
                          (ID: {record.created_by})
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRecord(record.id)}
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap mb-3">{record.notes}</p>
                
                {/* Exibir imagens se existirem */}
                {(record.img_nota1 || record.img_nota2 || record.img_nota3 || record.img_nota4 || record.img_nota5) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-2">Imagens do registro:</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {[record.img_nota1, record.img_nota2, record.img_nota3, record.img_nota4, record.img_nota5]
                        .map((imgUrl, originalIndex) => {
                          if (!imgUrl || imgUrl.trim() === "") return null;
                          // Contar quantas imagens válidas existem até este índice
                          const validImages = [record.img_nota1, record.img_nota2, record.img_nota3, record.img_nota4, record.img_nota5]
                            .slice(0, originalIndex + 1)
                            .filter(url => url && url.trim() !== "");
                          const index = validImages.length;
                          
                          const hasFailed = failedImages.has(imgUrl);
                          
                          return (
                            <div 
                              key={`img-${originalIndex}-${imgUrl}`} 
                              className="relative group cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Coletar todas as imagens válidas deste registro
                                const allImages = [record.img_nota1, record.img_nota2, record.img_nota3, record.img_nota4, record.img_nota5]
                                  .filter(url => url && url.trim() !== "");
                                const clickedIndex = allImages.findIndex(url => url === imgUrl);
                                setCurrentImageUrls(allImages);
                                setCurrentImageIndex(clickedIndex >= 0 ? clickedIndex : 0);
                                setImageModalOpen(true);
                              }}
                            >
                              {hasFailed ? (
                                <div className="w-full h-24 flex items-center justify-center bg-gray-200 rounded border border-gray-300">
                                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              ) : (
                                <img
                                  src={normalizeImageUrl(imgUrl)}
                                  alt={`Imagem ${index} do registro`}
                                  className="w-full h-24 object-cover rounded border border-gray-300 hover:opacity-80 transition-opacity"
                                  onError={(e) => {
                                    // Tentar recarregar a imagem uma vez antes de marcar como falhada
                                    const target = e.target as HTMLImageElement;
                                    const retryCount = parseInt(target.getAttribute('data-retry') || '0');
                                    
                                    if (retryCount < 2) {
                                      // Tentar novamente após um pequeno delay
                                      setTimeout(() => {
                                        target.setAttribute('data-retry', String(retryCount + 1));
                                        // Tentar com URL normalizada novamente
                                        const normalizedUrl = normalizeImageUrl(imgUrl);
                                        const separator = normalizedUrl.includes('?') ? '&' : '?';
                                        target.src = `${normalizedUrl}${separator}_retry=${Date.now()}`;
                                      }, 500);
                                    } else {
                                      // Marcar imagem como falhada após tentativas
                                      console.error('Erro ao carregar imagem após tentativas:', imgUrl);
                                      setFailedImages(prev => new Set(prev).add(imgUrl));
                                    }
                                  }}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                                img{index}
                              </div>
                            </div>
                          );
                        })
                        .filter(Boolean)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="space-y-3 pt-4 border-t">
        <h3 className="text-lg font-semibold">Adicionar Registro</h3>
        
        {/* Campo de texto */}
        <div className="w-full">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorInput}
            onPaste={handlePaste}
            className="w-full min-h-[160px] rounded-md border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ whiteSpace: "pre-wrap" }}
          />
          <p className="text-xs text-gray-500 mt-1">Digite suas anotações aqui.</p>
        </div>

        {/* Área de upload de imagens */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Imagens (máximo 5)</label>
          
          {/* Área de drag and drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-300 bg-gray-50 hover:border-gray-400"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
              id="image-upload-input"
            />
            <label
              htmlFor="image-upload-input"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm text-gray-600">
                Arraste e solte imagens aqui ou clique para selecionar
              </p>
              <p className="text-xs text-gray-500">
                {selectedImages.length}/5 imagens selecionadas
              </p>
            </label>
          </div>

          {/* Preview das imagens */}
          {selectedImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
              {selectedImages.map((img, index) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded border border-gray-300"
                  />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remover imagem"
                  >
                    <Trash className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                    img{index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-sm px-4 py-1 border-gray-300"
          >
            Fechar
          </Button>
          <Button
            onClick={handleSaveRecord}
            disabled={loading}
            className="text-sm px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Salvando..." : "Salvar Registro"}
          </Button>
        </div>
      </div>

      {/* Modal de Visualização de Imagem - Renderizado via Portal para ocupar tela inteira */}
      {imageModalOpen && currentImageUrls.length > 0 && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            margin: 0,
            padding: 0,
            pointerEvents: 'auto',
          }}
          onClick={(e) => {
            // Fechar ao clicar no fundo (não na imagem ou botões)
            if (e.target === e.currentTarget) {
              setImageModalOpen(false);
            }
          }}
        >
          {/* Botão Fechar */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setImageModalOpen(false);
            }}
            className="absolute top-4 right-4 z-[10000] p-2 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-lg cursor-pointer"
            style={{ zIndex: 10000 }}
            aria-label="Fechar"
          >
            <X className="h-6 w-6 text-gray-800" />
          </button>

          {/* Botão Anterior */}
          {currentImageUrls.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCurrentImageIndex((prev) => 
                  prev === 0 ? currentImageUrls.length - 1 : prev - 1
                );
              }}
              className="absolute left-4 z-[10000] p-2 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-lg cursor-pointer"
              style={{ zIndex: 10000 }}
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-6 w-6 text-gray-800" />
            </button>
          )}

          {/* Botão Próximo */}
          {currentImageUrls.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCurrentImageIndex((prev) => 
                  prev === currentImageUrls.length - 1 ? 0 : prev + 1
                );
              }}
              className="absolute right-4 z-[10000] p-2 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-lg cursor-pointer"
              style={{ zIndex: 10000 }}
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-6 w-6 text-gray-800" />
            </button>
          )}

          {/* Imagem */}
          <div className="relative w-[95vw] h-[95vh] flex items-center justify-center" style={{ zIndex: 1 }}>
            <img
              key={`modal-img-${currentImageIndex}-${currentImageUrls[currentImageIndex]}`}
              src={normalizeImageUrl(currentImageUrls[currentImageIndex])}
              alt={`Imagem ${currentImageIndex + 1} de ${currentImageUrls.length}`}
              className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{ pointerEvents: 'auto', maxWidth: '95vw', maxHeight: '95vh' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const retryCount = parseInt(target.getAttribute('data-retry') || '0');
                
                if (retryCount < 2) {
                  // Tentar recarregar
                  setTimeout(() => {
                    target.setAttribute('data-retry', String(retryCount + 1));
                    const imgUrl = currentImageUrls[currentImageIndex];
                    const normalizedUrl = normalizeImageUrl(imgUrl);
                    const separator = normalizedUrl.includes('?') ? '&' : '?';
                    target.src = `${normalizedUrl}${separator}_retry=${Date.now()}`;
                  }, 500);
                } else {
                  console.error('Erro ao carregar imagem no modal após tentativas:', currentImageUrls[currentImageIndex]);
                  // Mostrar link para abrir em nova aba como fallback
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.image-error-link')) {
                    const link = document.createElement('a');
                    link.href = currentImageUrls[currentImageIndex];
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.className = 'image-error-link px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600';
                    link.textContent = 'Clique para abrir imagem em nova aba';
                    parent.appendChild(link);
                  }
                }
              }}
              referrerPolicy="no-referrer"
            />
            
            {/* Indicador de posição */}
            {currentImageUrls.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {currentImageUrls.length}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PatientRecords;