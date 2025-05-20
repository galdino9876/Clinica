
import { toast } from "@/components/ui/use-toast";

const WEBHOOK_URL = "https://n8n.onautomacoes.com.br/webhook-test/f6ba2c1d-f314-45e5-b8ba-6df21c006ab6";

type WebhookAction = 
  | "GET_USERS"
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | "GET_PATIENTS"
  | "CREATE_PATIENT"
  | "UPDATE_PATIENT"
  | "DEACTIVATE_PATIENT"
  | "GET_APPOINTMENTS"
  | "CREATE_APPOINTMENT"
  | "UPDATE_APPOINTMENT"
  | "CANCEL_APPOINTMENT"
  | "GET_ROOMS"
  | "GET_PATIENT_RECORDS"
  | "CREATE_PATIENT_RECORD"
  | "DELETE_PATIENT_RECORD";

interface WebhookRequestParams {
  action: WebhookAction;
  payload?: any;
  filters?: Record<string, any>;
}

export const callWebhook = async <T>({ action, payload = {}, filters = {} }: WebhookRequestParams): Promise<T> => {
  try {
    console.log(`Chamando webhook: ${action}`, { payload, filters });
    
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        payload,
        filters,
        timestamp: new Date().toISOString(),
      }),
    });
    
    // Se o webhook não retornar um JSON válido (por exemplo, se for no-cors)
    // você pode precisar ajustar essa parte para lidar com isso
    const data = await response.json();
    
    console.log(`Resposta do webhook (${action}):`, data);
    return data as T;
  } catch (error) {
    console.error(`Erro ao chamar webhook (${action}):`, error);
    toast({
      title: "Erro de Conexão",
      description: "Não foi possível conectar ao banco de dados. Verifique sua conexão com a internet.",
      variant: "destructive",
    });
    throw error;
  }
};
