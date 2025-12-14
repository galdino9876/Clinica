import { toast } from "@/components/ui/use-toast";

export interface GuiaRecebida {
  id: string;
  Paciente: string;
  "Data Atendimento"?: string | null;
  "Entrega na AMHP"?: string | null;
  "Entrega no Convênio"?: string | null;
  "Repasse ao Associado"?: string | null;
  "Código do Serviço"?: string | null;
  "Nº da Guia"?: string | null;
  "Nº AMHPTISS"?: string | null;
  "Nº Fechamento de Produção"?: string | null;
  "Nº da Fatura"?: string | null;
  "Local / Caráter do Atendimento"?: string | null;
  "Valor Cobrado"?: string | null;
  "Valor"?: string | null;
  "Motivo"?: string | null;
  "Valor do Repasse"?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

const WEBHOOK_IMPORT_URL = "https://n8n.essenciasaudeintegrada.com.br/webhook/guia-a-receber";
const WEBHOOK_FETCH_URL = "https://webhook.essenciasaudeintegrada.com.br/webhook/guia-recebido-return";

/**
 * Interface para dados brutos da API (snake_case)
 */
interface GuiaRecebidaRaw {
  id: number | string;
  paciente: string;
  data_atendimento?: string | null;
  data_entrega_amhp?: string | null;
  data_entrega_convenio?: string | null;
  data_repasse_associado?: string | null;
  codigo_servico?: string | null;
  numero_guia?: string | null;
  numero_amhptiss?: string | null;
  numero_fechamento_producao?: string | null;
  numero_fatura?: string | null;
  local_carater_atendimento?: string | null;
  valor_cobrado?: string | number | null;
  valor?: string | number | null;
  motivo_glosa?: string | null;
  valor_repasse?: string | number | null;
  created_at?: string;
  updated_at?: string | null;
}

/**
 * Converte dados brutos da API para o formato esperado pelo componente
 */
const transformGuiaData = (raw: GuiaRecebidaRaw): GuiaRecebida => {
  const formatDate = (dateString: string | null | undefined): string | null => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("pt-BR");
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value: string | number | null | undefined): string | null => {
    if (value === null || value === undefined || value === "") return null;
    const numValue = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
    if (isNaN(numValue)) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numValue);
  };

  return {
    id: String(raw.id),
    Paciente: raw.paciente || "",
    "Data Atendimento": formatDate(raw.data_atendimento),
    "Entrega na AMHP": formatDate(raw.data_entrega_amhp),
    "Entrega no Convênio": formatDate(raw.data_entrega_convenio),
    "Repasse ao Associado": formatDate(raw.data_repasse_associado),
    "Código do Serviço": raw.codigo_servico || null,
    "Nº da Guia": raw.numero_guia || null,
    "Nº AMHPTISS": raw.numero_amhptiss || null,
    "Nº Fechamento de Produção": raw.numero_fechamento_producao || null,
    "Nº da Fatura": raw.numero_fatura || null,
    "Local / Caráter do Atendimento": raw.local_carater_atendimento || null,
    "Valor Cobrado": formatCurrency(raw.valor_cobrado),
    "Valor": raw.valor ? formatCurrency(raw.valor) : null,
    "Motivo": raw.motivo_glosa || null,
    "Valor do Repasse": formatCurrency(raw.valor_repasse),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
};

/**
 * Serviço para operações com guias recebidas
 */
export const GuiaRecebidaService = {
  /**
   * Importa um arquivo Excel com guias recebidas
   * @param file Arquivo Excel a ser importado
   */
  importExcel: async (file: File): Promise<void> => {
    try {
      const formData = new FormData();
      formData.append("file-a-receber", file);

      const response = await fetch(WEBHOOK_IMPORT_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao importar arquivo: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Arquivo importado com sucesso:", result);

      toast({
        title: "Sucesso",
        description: "Arquivo Excel importado com sucesso!",
      });
    } catch (error: any) {
      console.error("Erro ao importar arquivo Excel:", error);
      toast({
        title: "Erro ao Importar",
        description: error.message || "Não foi possível importar o arquivo. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  },

  /**
   * Busca todas as guias recebidas da API
   * @returns Lista de guias recebidas
   */
  fetchGuiasRecebidas: async (): Promise<GuiaRecebida[]> => {
    try {
      const response = await fetch(WEBHOOK_FETCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao buscar guias: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Dados recebidos da API (Guias Recebidas):", data);
      
      let rawData: GuiaRecebidaRaw[] = [];
      
      // Se a resposta for um array, usar diretamente
      if (Array.isArray(data)) {
        rawData = data;
      }
      // Se a resposta tiver uma propriedade com os dados (ex: data, guias, etc.)
      else if (data.data && Array.isArray(data.data)) {
        rawData = data.data;
      }
      else if (data.guias && Array.isArray(data.guias)) {
        rawData = data.guias;
      }
      // Se for um único objeto (não array), converter para array
      else if (data && typeof data === 'object' && (data.id || data.paciente)) {
        rawData = [data];
      }
      else {
        console.warn("Formato de resposta inesperado:", data);
        return [];
      }

      // Transformar os dados para o formato esperado
      const transformedData = rawData.map(transformGuiaData);
      console.log("Dados transformados:", transformedData);
      return transformedData;
    } catch (error: any) {
      console.error("Erro ao buscar guias recebidas:", error);
      toast({
        title: "Erro ao Buscar Dados",
        description: error.message || "Não foi possível buscar as guias recebidas. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  },
};

