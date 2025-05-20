
import { toast } from "@/components/ui/use-toast";

// Definição dos tipos de ações que podem ser enviadas ao servidor
export type WebhookAction = 
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

// URL da API backend que interage com o banco de dados
const API_URL = "https://api.saude.onautomacoes.com.br/api";

/**
 * Função para chamar o serviço de API que se comunica com o banco de dados
 * @param param0 Parâmetros da requisição (ação, payload e filtros)
 * @returns Dados retornados pela API
 */
export const callApi = async <T>({ action, payload = {}, filters = {} }: WebhookRequestParams): Promise<T> => {
  try {
    console.log(`Chamando API: ${action}`, { payload, filters });
    
    const response = await fetch(`${API_URL}/${action.toLowerCase()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`,
      },
      body: JSON.stringify({
        payload,
        filters,
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
    
    console.log(`Resposta da API (${action}):`, data);
    return data as T;
  } catch (error) {
    console.error(`Erro ao chamar API (${action}):`, error);
    toast({
      title: "Erro de Conexão",
      description: "Não foi possível conectar ao servidor. Verifique sua conexão com a internet.",
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
    return callApi({ action: "GET_USERS" });
  },
  
  createUser: async (userData: any) => {
    return callApi({ action: "CREATE_USER", payload: userData });
  },
  
  updateUser: async (userData: any) => {
    return callApi({ action: "UPDATE_USER", payload: userData });
  },
  
  deleteUser: async (userId: string) => {
    return callApi({ action: "DELETE_USER", payload: { id: userId } });
  }
};

/**
 * Serviço específico para operações com pacientes
 */
export const PatientService = {
  getPatients: async (filters = {}) => {
    return callApi({ action: "GET_PATIENTS", filters });
  },
  
  createPatient: async (patientData: any) => {
    return callApi({ action: "CREATE_PATIENT", payload: patientData });
  },
  
  updatePatient: async (patientData: any) => {
    return callApi({ action: "UPDATE_PATIENT", payload: patientData });
  },
  
  deactivatePatient: async (patientId: string, reason: string) => {
    return callApi({ 
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
    return callApi({ action: "GET_APPOINTMENTS", filters });
  },
  
  createAppointment: async (appointmentData: any) => {
    return callApi({ action: "CREATE_APPOINTMENT", payload: appointmentData });
  },
  
  updateAppointment: async (appointmentData: any) => {
    return callApi({ action: "UPDATE_APPOINTMENT", payload: appointmentData });
  },
  
  cancelAppointment: async (appointmentId: string, reason: string) => {
    return callApi({ 
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
    return callApi({ action: "GET_ROOMS" });
  }
};

/**
 * Serviço específico para operações com prontuários de pacientes
 */
export const PatientRecordService = {
  getPatientRecords: async (patientId: string) => {
    return callApi({ 
      action: "GET_PATIENT_RECORDS", 
      filters: { patientId } 
    });
  },
  
  createPatientRecord: async (recordData: any) => {
    return callApi({ action: "CREATE_PATIENT_RECORD", payload: recordData });
  },
  
  deletePatientRecord: async (recordId: string) => {
    return callApi({ action: "DELETE_PATIENT_RECORD", payload: { id: recordId } });
  }
};
