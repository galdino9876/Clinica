
import { toast } from "@/components/ui/use-toast";

// Configuração das credenciais do banco de dados
const DATABASE_CONFIG = {
  host: "mysql.onautomacoes.com.br",
  user: "data_saude",
  password: "1q2w3e4r5t!",
  database: "saude"
};

// Definição dos tipos de ações que podem ser enviadas ao webhook
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

// URL do webhook que serve como proxy para o banco de dados
const WEBHOOK_URL = "https://n8n.onautomacoes.com.br/webhook-test/f6ba2c1d-f314-45e5-b8ba-6df21c006ab6";

/**
 * Função para chamar o webhook que se comunica com o banco de dados
 * @param param0 Parâmetros da requisição (ação, payload e filtros)
 * @returns Dados retornados pela API
 */
export const callWebhook = async <T>({ action, payload = {}, filters = {} }: WebhookRequestParams): Promise<T> => {
  try {
    console.log(`Chamando webhook: ${action}`, { payload, filters });
    
    // Adicionamos informações do banco de dados no payload para conexão segura
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        payload,
        filters,
        databaseConfig: DATABASE_CONFIG,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (!response.ok) {
      // Se o servidor retornar status de erro
      const errorText = await response.text();
      throw new Error(`Erro no servidor: ${response.status} - ${errorText}`);
    }
    
    // Processar resposta como JSON
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

/**
 * Serviço específico para operações com usuários
 */
export const UserService = {
  getUsers: async () => {
    return callWebhook({ action: "GET_USERS" });
  },
  
  createUser: async (userData: any) => {
    return callWebhook({ action: "CREATE_USER", payload: userData });
  },
  
  updateUser: async (userData: any) => {
    return callWebhook({ action: "UPDATE_USER", payload: userData });
  },
  
  deleteUser: async (userId: string) => {
    return callWebhook({ action: "DELETE_USER", payload: { id: userId } });
  }
};

/**
 * Serviço específico para operações com pacientes
 */
export const PatientService = {
  getPatients: async (filters = {}) => {
    return callWebhook({ action: "GET_PATIENTS", filters });
  },
  
  createPatient: async (patientData: any) => {
    return callWebhook({ action: "CREATE_PATIENT", payload: patientData });
  },
  
  updatePatient: async (patientData: any) => {
    return callWebhook({ action: "UPDATE_PATIENT", payload: patientData });
  },
  
  deactivatePatient: async (patientId: string, reason: string) => {
    return callWebhook({ 
      action: "DEACTIVATE_PATIENT", 
      payload: { 
        id: patientId,
        deactivationReason: reason,
        deactivationDate: new Date().toISOString().split('T')[0]
      }
    });
  }
};

/**
 * Serviço específico para operações com agendamentos
 */
export const AppointmentService = {
  getAppointments: async (filters = {}) => {
    return callWebhook({ action: "GET_APPOINTMENTS", filters });
  },
  
  createAppointment: async (appointmentData: any) => {
    return callWebhook({ action: "CREATE_APPOINTMENT", payload: appointmentData });
  },
  
  updateAppointment: async (appointmentData: any) => {
    return callWebhook({ action: "UPDATE_APPOINTMENT", payload: appointmentData });
  },
  
  cancelAppointment: async (appointmentId: string, reason: string) => {
    return callWebhook({ 
      action: "CANCEL_APPOINTMENT", 
      payload: { 
        id: appointmentId,
        cancellationReason: reason
      }
    });
  }
};

/**
 * Serviço específico para operações com salas de consulta
 */
export const RoomService = {
  getRooms: async () => {
    return callWebhook({ action: "GET_ROOMS" });
  }
};

/**
 * Serviço específico para operações com prontuários de pacientes
 */
export const PatientRecordService = {
  getPatientRecords: async (patientId: string) => {
    return callWebhook({ 
      action: "GET_PATIENT_RECORDS", 
      filters: { patientId } 
    });
  },
  
  createPatientRecord: async (recordData: any) => {
    return callWebhook({ action: "CREATE_PATIENT_RECORD", payload: recordData });
  },
  
  deletePatientRecord: async (recordId: string) => {
    return callWebhook({ action: "DELETE_PATIENT_RECORD", payload: { id: recordId } });
  }
};
