import { toast } from "@/components/ui/use-toast";

export interface GuiaAReceber {
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

export interface GuiaAReceberFormatted {
  id: string;
  Paciente: string;
  "Data Atendimento": string;
  "Entrega na AMHP": string;
  "Entrega no Convênio": string;
  "Repasse ao Associado": string;
  "Código do Serviço": string;
  "Nº da Guia": string;
  "Nº AMHPTISS": string;
  "Nº Fechamento de Produção": string;
  "Nº da Fatura": string;
  "Local / Caráter do Atendimento": string;
  "Valor Cobrado": string;
  "Valor": string;
  "Motivo": string;
  "Valor do Repasse": string;
}

const WEBHOOK_IMPORT_URL = "https://n8n.essenciasaudeintegrada.com.br/webhook/guia-a-receber";
const WEBHOOK_FETCH_URL = "https://webhook.essenciasaudeintegrada.com.br/webhook/guia-a-receber-return";

/**
 * Interface para dados brutos da API (snake_case)
 */
interface GuiaAReceberRaw {
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
const transformGuiaData = (raw: GuiaAReceberRaw): GuiaAReceber => {
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
 * Serviço para operações com guias a receber
 */
export const GuiaAReceberService = {
  /**
   * Importa um arquivo Excel com guias a receber
   * @param file Arquivo Excel a ser importado
   */
  importExcel: async (file: File): Promise<void> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

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
   * Busca todas as guias a receber da API
   * @returns Lista de guias a receber
   */
  fetchGuiasAReceber: async (): Promise<GuiaAReceber[]> => {
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
      console.log("Dados recebidos da API:", data);
      
      let resultData: GuiaAReceber[] = [];
      
      // Se a resposta for um array, verificar o formato
      if (Array.isArray(data)) {
        // Se os dados já estão formatados (têm campo "Paciente"), usar diretamente
        if (data.length > 0 && data[0].Paciente) {
          resultData = data.map(item => ({
            id: String(item.id),
            Paciente: item.Paciente || "",
            "Data Atendimento": item["Data Atendimento"] || null,
            "Entrega na AMHP": item["Entrega na AMHP"] || null,
            "Entrega no Convênio": item["Entrega no Convênio"] || null,
            "Repasse ao Associado": item["Repasse ao Associado"] || null,
            "Código do Serviço": item["Código do Serviço"] || null,
            "Nº da Guia": item["Nº da Guia"] || null,
            "Nº AMHPTISS": item["Nº AMHPTISS"] || null,
            "Nº Fechamento de Produção": item["Nº Fechamento de Produção"] || null,
            "Nº da Fatura": item["Nº da Fatura"] || null,
            "Local / Caráter do Atendimento": item["Local / Caráter do Atendimento"] || null,
            "Valor Cobrado": item["Valor Cobrado"] || null,
            "Valor": item["Valor"] || null,
            "Motivo": item["Motivo"] || null,
            "Valor do Repasse": item["Valor do Repasse"] || null,
            created_at: item.created_at,
            updated_at: item.updated_at,
          }));
        } else {
          // Se os dados estão em snake_case, transformar
          const rawData = data as GuiaAReceberRaw[];
          resultData = rawData.map(transformGuiaData);
        }
      }
      // Se a resposta tiver uma propriedade com os dados (ex: data, guias, etc.)
      else if (data.data && Array.isArray(data.data)) {
        if (data.data.length > 0 && data.data[0].Paciente) {
          resultData = data.data.map((item: any) => ({
            id: String(item.id),
            Paciente: item.Paciente || "",
            "Data Atendimento": item["Data Atendimento"] || null,
            "Entrega na AMHP": item["Entrega na AMHP"] || null,
            "Entrega no Convênio": item["Entrega no Convênio"] || null,
            "Repasse ao Associado": item["Repasse ao Associado"] || null,
            "Código do Serviço": item["Código do Serviço"] || null,
            "Nº da Guia": item["Nº da Guia"] || null,
            "Nº AMHPTISS": item["Nº AMHPTISS"] || null,
            "Nº Fechamento de Produção": item["Nº Fechamento de Produção"] || null,
            "Nº da Fatura": item["Nº da Fatura"] || null,
            "Local / Caráter do Atendimento": item["Local / Caráter do Atendimento"] || null,
            "Valor Cobrado": item["Valor Cobrado"] || null,
            "Valor": item["Valor"] || null,
            "Motivo": item["Motivo"] || null,
            "Valor do Repasse": item["Valor do Repasse"] || null,
            created_at: item.created_at,
            updated_at: item.updated_at,
          }));
        } else {
          resultData = (data.data as GuiaAReceberRaw[]).map(transformGuiaData);
        }
      }
      else if (data.guias && Array.isArray(data.guias)) {
        if (data.guias.length > 0 && data.guias[0].Paciente) {
          resultData = data.guias.map((item: any) => ({
            id: String(item.id),
            Paciente: item.Paciente || "",
            "Data Atendimento": item["Data Atendimento"] || null,
            "Entrega na AMHP": item["Entrega na AMHP"] || null,
            "Entrega no Convênio": item["Entrega no Convênio"] || null,
            "Repasse ao Associado": item["Repasse ao Associado"] || null,
            "Código do Serviço": item["Código do Serviço"] || null,
            "Nº da Guia": item["Nº da Guia"] || null,
            "Nº AMHPTISS": item["Nº AMHPTISS"] || null,
            "Nº Fechamento de Produção": item["Nº Fechamento de Produção"] || null,
            "Nº da Fatura": item["Nº da Fatura"] || null,
            "Local / Caráter do Atendimento": item["Local / Caráter do Atendimento"] || null,
            "Valor Cobrado": item["Valor Cobrado"] || null,
            "Valor": item["Valor"] || null,
            "Motivo": item["Motivo"] || null,
            "Valor do Repasse": item["Valor do Repasse"] || null,
            created_at: item.created_at,
            updated_at: item.updated_at,
          }));
        } else {
          resultData = (data.guias as GuiaAReceberRaw[]).map(transformGuiaData);
        }
      }
      // Se for um único objeto (não array), converter para array
      else if (data && typeof data === 'object') {
        if (data.Paciente) {
          resultData = [{
            id: String(data.id),
            Paciente: data.Paciente || "",
            "Data Atendimento": data["Data Atendimento"] || null,
            "Entrega na AMHP": data["Entrega na AMHP"] || null,
            "Entrega no Convênio": data["Entrega no Convênio"] || null,
            "Repasse ao Associado": data["Repasse ao Associado"] || null,
            "Código do Serviço": data["Código do Serviço"] || null,
            "Nº da Guia": data["Nº da Guia"] || null,
            "Nº AMHPTISS": data["Nº AMHPTISS"] || null,
            "Nº Fechamento de Produção": data["Nº Fechamento de Produção"] || null,
            "Nº da Fatura": data["Nº da Fatura"] || null,
            "Local / Caráter do Atendimento": data["Local / Caráter do Atendimento"] || null,
            "Valor Cobrado": data["Valor Cobrado"] || null,
            "Valor": data["Valor"] || null,
            "Motivo": data["Motivo"] || null,
            "Valor do Repasse": data["Valor do Repasse"] || null,
            created_at: data.created_at,
            updated_at: data.updated_at,
          }];
        } else if (data.id || data.paciente) {
          resultData = [transformGuiaData(data as GuiaAReceberRaw)];
        }
      }
      else {
        console.warn("Formato de resposta inesperado:", data);
        return [];
      }

      console.log("Dados processados:", resultData);
      return resultData;
    } catch (error: any) {
      console.error("Erro ao buscar guias a receber:", error);
      toast({
        title: "Erro ao Buscar Dados",
        description: error.message || "Não foi possível buscar as guias a receber. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  },
};

