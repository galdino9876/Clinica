import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, AlertCircle, Calendar, Hash, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

interface SolicitarGuiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: {
    patient_id: number;
    paciente_nome: string;
  };
  datesToShow: string[]; // Datas no formato DD/MM/YYYY
  onSuccess: () => void;
}

const SolicitarGuiaModal: React.FC<SolicitarGuiaModalProps> = ({
  isOpen,
  onClose,
  patient,
  datesToShow,
  onSuccess
}) => {
  const [codSessao, setCodSessao] = useState<string>("");
  const [qntSessao, setQntSessao] = useState<number>(1);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resetar campos quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      setCodSessao("");
      setQntSessao(1);
      setSelectedDates([]);
      setError(null);
    }
  }, [isOpen]);

  // Quando o código de sessão mudar para 50000462, fixar quantidade em 1 e limitar a 1 data
  useEffect(() => {
    if (codSessao === "50000462") {
      setQntSessao(1);
      // Se houver mais de 1 data selecionada, manter apenas a primeira
      setSelectedDates(prev => {
        if (prev.length > 1) {
          return [prev[0]];
        }
        return prev;
      });
    }
  }, [codSessao]);

  // Atualizar automaticamente a quantidade de sessão baseado no número de datas selecionadas
  useEffect(() => {
    // Se o código não for 50000462, atualizar quantidade automaticamente
    if (codSessao !== "50000462" && codSessao !== "") {
      const newQnt = selectedDates.length > 0 ? selectedDates.length : 1;
      // Limitar a quantidade máxima a 5
      setQntSessao(Math.min(newQnt, 5));
    } else if (codSessao === "50000462") {
      // Garantir que quantidade seja 1 para código 50000462
      setQntSessao(1);
    }
  }, [selectedDates, codSessao]);

  const handleDateToggle = (date: string) => {
    if (selectedDates.includes(date)) {
      const newSelectedDates = selectedDates.filter(d => d !== date);
      setSelectedDates(newSelectedDates);
    } else {
      // Se código for 50000462, permitir apenas 1 data
      if (codSessao === "50000462") {
        if (selectedDates.length === 0) {
          setSelectedDates([date]);
        } else {
          setError("Para o código 50000462, apenas 1 data pode ser selecionada");
          return;
        }
      } else {
        // Limitar a 5 datas selecionadas para outros códigos
        if (selectedDates.length < 5) {
          setSelectedDates([...selectedDates, date]);
        } else {
          setError("Máximo de 5 datas podem ser selecionadas");
          return;
        }
      }
      // Limpar erro se a seleção foi bem-sucedida
      setError(null);
    }
  };

  const handleSubmit = async () => {
    // Validações
    if (!codSessao) {
      setError("Código de Sessão é obrigatório");
      return;
    }

    if (selectedDates.length === 0) {
      setError("Selecione pelo menos uma data");
      return;
    }

    // Validação: se código for 50000462, quantidade deve ser 1
    if (codSessao === "50000462" && qntSessao !== 1) {
      setError("Para o código 50000462, a quantidade deve ser 1");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Converter datas de DD/MM/YYYY para YYYY-MM-DD
      const formattedDates = selectedDates.map(dateStr => {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
      });

      // 2. Montar o payload
      const payload: any = {
        Id_patient: patient.patient_id,
        CodSessao: codSessao,
        QntSessao: qntSessao,
        Date_1: "",
        Date_2: "",
        Date_3: "",
        Date_4: "",
        Date_5: ""
      };

      // 3. Preencher as datas (máximo 5)
      for (let i = 0; i < Math.min(formattedDates.length, 5); i++) {
        payload[`Date_${i + 1}`] = formattedDates[i];
      }

      // 4. Enviar para API
      const response = await fetch("https://n8n.essenciasaudeintegrada.com.br/webhook/solicitar_guia_benner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao solicitar guia: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Guia solicitada com sucesso:', result);

      toast({
        title: "Sucesso",
        description: "Guia solicitada com sucesso!",
        variant: "default",
      });

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Erro ao solicitar guia:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCodSessao("");
    setQntSessao(1);
    setSelectedDates([]);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white p-6 rounded-t-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white text-xl">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="font-bold">Solicitar Guia</div>
                <div className="text-sm font-normal text-blue-100 mt-1">
                  {patient.paciente_nome}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Código de Sessão */}
          <Card className="border-2 hover:border-blue-300 transition-colors">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Hash className="h-5 w-5 text-blue-600" />
                  </div>
                  <Label htmlFor="codSessao" className="text-base font-semibold text-gray-700">
                    Código de Sessão <span className="text-red-500">*</span>
                  </Label>
                </div>
                <Select value={codSessao} onValueChange={setCodSessao}>
                  <SelectTrigger id="codSessao" className="h-12 text-base">
                    <SelectValue placeholder="Selecione o código de sessão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50000470" className="text-base py-3">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        <span>50000470</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="50000462" className="text-base py-3">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        <span>50000462</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="50000491" className="text-base py-3">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        <span>50000491</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Datas */}
          <Card className="border-2 hover:border-green-300 transition-colors">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <Label className="text-base font-semibold text-gray-700">
                      Selecionar Datas <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  {selectedDates.length > 0 && (
                    <Badge className="bg-green-600 text-white px-3 py-1">
                      <CheckCircle2 className="h-3 w-3 mr-1.5" />
                      {selectedDates.length} selecionada(s)
                    </Badge>
                  )}
                </div>
                
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 max-h-64 overflow-y-auto">
                  {datesToShow.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 font-medium">
                        Nenhuma data disponível
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {datesToShow.map((date) => {
                        const isSelected = selectedDates.includes(date);
                        const isDisabled = 
                          (!isSelected && selectedDates.length >= 5) ||
                          (codSessao === "50000462" && !isSelected && selectedDates.length >= 1);
                        
                        return (
                          <div
                            key={date}
                            onClick={() => !isDisabled && handleDateToggle(date)}
                            className={`
                              flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                              ${isSelected 
                                ? 'bg-green-50 border-green-400 shadow-md' 
                                : isDisabled
                                ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                                : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                              }
                            `}
                          >
                            <Checkbox
                              id={`date-${date}`}
                              checked={isSelected}
                              onCheckedChange={() => handleDateToggle(date)}
                              disabled={isDisabled}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                            <label
                              htmlFor={`date-${date}`}
                              className={`flex-1 text-sm font-medium cursor-pointer ${
                                isSelected ? 'text-green-800' : 'text-gray-700'
                              }`}
                            >
                              {date}
                            </label>
                            {isSelected && (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {selectedDates.length >= 5 && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-800">
                      Máximo de 5 datas permitidas. Apenas as primeiras 5 serão enviadas.
                    </p>
                  </div>
                )}
                {codSessao === "50000462" && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-800">
                      Para o código 50000462, apenas 1 data pode ser selecionada.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Mensagem de Erro */}
          {error && (
            <Card className="border-2 border-red-300 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800 mb-1">Erro</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="px-6 py-4 bg-gray-50 border-t gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="px-6 h-11 border-2 hover:bg-gray-100"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !codSessao || selectedDates.length === 0}
            className="px-6 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Solicitar Guia
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SolicitarGuiaModal;














