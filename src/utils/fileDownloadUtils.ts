/**
 * Utilitários para download de arquivos
 */

/**
 * Baixa um arquivo a partir de um Blob
 * @param blob - O blob do arquivo
 * @param filename - Nome do arquivo para download
 */
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Detecta o tipo de arquivo baseado no content-type
 * @param contentType - O content-type da resposta
 * @returns Objeto com extensão e nome base do arquivo
 */
export const detectFileType = (contentType: string | null): { extension: string; filename: string } => {
  if (!contentType) {
    return { extension: 'bin', filename: 'arquivo' };
  }

  if (contentType.includes('application/pdf')) {
    return { extension: 'pdf', filename: 'atestado' };
  }
  
  if (contentType.includes('image/jpeg')) {
    return { extension: 'jpg', filename: 'pedido_continuidade_img' };
  }
  
  if (contentType.includes('image/png')) {
    return { extension: 'png', filename: 'pedido_continuidade' };
  }
  
  if (contentType.includes('application/zip')) {
    return { extension: 'zip', filename: 'pedido_continuidade' };
  }

  // Fallback para tipos desconhecidos
  return { extension: 'bin', filename: 'arquivo' };
};

/**
 * Gera um nome de arquivo com timestamp
 * @param baseName - Nome base do arquivo
 * @param patientName - Nome do paciente
 * @param extension - Extensão do arquivo
 * @returns Nome do arquivo formatado
 */
export const generateFileName = (baseName: string, patientName: string, extension: string): string => {
  const dateStr = new Date().toISOString().split('T')[0];
  const cleanPatientName = patientName.replace(/[^a-zA-Z0-9]/g, '_');
  return `${baseName}_${cleanPatientName}_${dateStr}.${extension}`;
};

/**
 * Processa uma resposta de API e baixa o arquivo apropriado
 * @param response - Resposta da API
 * @param patientName - Nome do paciente
 * @param customFilename - Nome customizado (opcional)
 * @returns Promise que resolve quando o download é concluído
 */
export const processAndDownloadFile = async (
  response: Response, 
  patientName: string, 
  customFilename?: string
): Promise<void> => {
  const contentType = response.headers.get('content-type');
  const contentDisposition = response.headers.get('content-disposition');
  
  // Verificar se é um arquivo ZIP (múltiplos arquivos)
  if (contentType?.includes('application/zip') || contentDisposition?.includes('.zip')) {
    const blob = await response.blob();
    const filename = customFilename || generateFileName('pedido_continuidade', patientName, 'zip');
    downloadFile(blob, filename);
    return;
  }
  
  // Processar como arquivo único
  const blob = await response.blob();
  const { extension, filename } = detectFileType(contentType);
  const finalFilename = customFilename || generateFileName(filename, patientName, extension);
  downloadFile(blob, finalFilename);
};
