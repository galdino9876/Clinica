import { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GuiaRecebidaService, GuiaRecebida } from "@/services/guiaRecebidaService";
import { Loader2, RefreshCw, Upload, FileSpreadsheet, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const GuiaRecebidaTable = () => {
  const [guias, setGuias] = useState<GuiaRecebida[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchGuias = async () => {
    try {
      setLoading(true);
      const data = await GuiaRecebidaService.fetchGuiasRecebidas();
      console.log("Guias recebidas no componente:", data);
      console.log("Quantidade de guias:", data.length);
      setGuias(data);
    } catch (error) {
      console.error("Erro ao buscar guias:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuias();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validExtensions = [".xlsx", ".xls"];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      
      if (!validExtensions.includes(fileExtension)) {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls).",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "Arquivo não selecionado",
        description: "Por favor, selecione um arquivo Excel para importar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      await GuiaRecebidaService.importExcel(selectedFile);
      
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setShowImportDialog(false);
      await fetchGuias();
    } catch (error) {
      console.error("Erro ao importar arquivo:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const filteredGuias = guias.filter((guia) =>
    guia.Paciente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guia["Nº da Guia"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guia["Nº da Fatura"]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg md:text-xl">Guias Recebidas</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Lista de guias que já foram recebidas após faturamento
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchGuias}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2 text-xs md:text-sm">Atualizar</span>
            </Button>
            <Button onClick={() => setShowImportDialog(true)} size="sm" className="w-full sm:w-auto">
              <Upload className="h-4 w-4 mr-2" />
              <span className="text-xs md:text-sm">Importar Excel</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Buscar por paciente, número da guia ou fatura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:max-w-sm text-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredGuias.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {searchTerm ? "Nenhuma guia encontrada com os filtros aplicados." : "Nenhuma guia recebida encontrada."}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Data Atendimento</TableHead>
                    <TableHead>Entrega na AMHP</TableHead>
                    <TableHead>Entrega no Convênio</TableHead>
                    <TableHead>Repasse ao Associado</TableHead>
                    <TableHead>Código do Serviço</TableHead>
                    <TableHead>Nº da Guia</TableHead>
                    <TableHead>Nº AMHPTISS</TableHead>
                    <TableHead>Nº Fechamento</TableHead>
                    <TableHead>Nº da Fatura</TableHead>
                    <TableHead>Local/Caráter</TableHead>
                    <TableHead>Valor Cobrado</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Valor do Repasse</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuias.map((guia) => (
                    <TableRow key={guia.id || `${guia["Nº da Guia"]}-${guia.Paciente}`}>
                      <TableCell className="font-medium">{guia.Paciente || "-"}</TableCell>
                      <TableCell>{guia["Data Atendimento"] ?? "-"}</TableCell>
                      <TableCell>{guia["Entrega na AMHP"] ?? "-"}</TableCell>
                      <TableCell>{guia["Entrega no Convênio"] ?? "-"}</TableCell>
                      <TableCell>{guia["Repasse ao Associado"] ?? "-"}</TableCell>
                      <TableCell>{guia["Código do Serviço"] ?? "-"}</TableCell>
                      <TableCell>{guia["Nº da Guia"] ?? "-"}</TableCell>
                      <TableCell>{guia["Nº AMHPTISS"] ?? "-"}</TableCell>
                      <TableCell>{guia["Nº Fechamento de Produção"] ?? "-"}</TableCell>
                      <TableCell>{guia["Nº da Fatura"] ?? "-"}</TableCell>
                      <TableCell>{guia["Local / Caráter do Atendimento"] ?? "-"}</TableCell>
                      <TableCell>{guia["Valor Cobrado"] ?? "-"}</TableCell>
                      <TableCell>{guia["Valor"] ?? "-"}</TableCell>
                      <TableCell className="max-w-xs truncate" title={guia["Motivo"] || undefined}>
                        {guia["Motivo"] ?? "-"}
                      </TableCell>
                      <TableCell className="font-medium">{guia["Valor do Repasse"] ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden space-y-4">
              {filteredGuias.map((guia) => (
                <div key={guia.id || `${guia["Nº da Guia"]}-${guia.Paciente}`} className="border rounded-lg p-4 space-y-3">
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-gray-500">Paciente:</span>
                      <p className="font-medium text-sm">{guia.Paciente || "-"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-gray-500">Data Atendimento:</span>
                        <p className="text-xs">{guia["Data Atendimento"] ?? "-"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Nº da Guia:</span>
                        <p className="text-xs">{guia["Nº da Guia"] ?? "-"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Nº da Fatura:</span>
                        <p className="text-xs">{guia["Nº da Fatura"] ?? "-"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Valor:</span>
                        <p className="text-xs font-medium">{guia["Valor"] ?? "-"}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Valor do Repasse:</span>
                      <p className="text-sm font-medium text-green-600">{guia["Valor do Repasse"] ?? "-"}</p>
                    </div>
                    {guia["Motivo"] && (
                      <div>
                        <span className="text-xs text-gray-500">Motivo:</span>
                        <p className="text-xs">{guia["Motivo"]}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && filteredGuias.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Mostrando {filteredGuias.length} de {guias.length} guia(s)
          </div>
        )}
      </CardContent>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Importar Guias Recebidas</DialogTitle>
            <DialogDescription>
              Importe um arquivo Excel com as guias recebidas do sistema do governo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-file-input-recebida"
              />
              <label htmlFor="excel-file-input-recebida">
                <Button variant="outline" asChild>
                  <span>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Selecionar Arquivo Excel
                  </span>
                </Button>
              </label>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between p-4 border rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={!selectedFile || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Arquivo
                </>
              )}
            </Button>

            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">Formato esperado do Excel:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Colunas: Datas (Atendimento, Entrega na AMHP, Entrega no convênio, Repasse ao Associado)</li>
                <li>Controles (Código do Serviço, Nº da Guia, Nº AMHPTISS, Nº Fechamento de Produção, Nº da Fatura, Local / Caráter do Atendimento)</li>
                <li>Glosa (Valor Cobrado, Valor, Motivo, Valor do Repasse)</li>
                <li>Paciente</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default GuiaRecebidaTable;

