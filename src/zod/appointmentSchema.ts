// appointmentSchema.ts
import { z } from "zod";

export const appointmentSchema = z.object({
  patientId: z.string().min(1, { message: "O ID do paciente é obrigatório!" }),
  psychologistId: z.string().min(1, { message: "O ID do psicólogo é obrigatório!" }),
  appointmentType: z.enum(["presential", "online"], {
    required_error: "O tipo de atendimento é obrigatório!",
    invalid_type_error: "O tipo de atendimento deve ser 'presential' ou 'online'!",
  }),
  roomId: z.string().optional(),
  startTime: z.string().min(1, { message: "O horário de início é obrigatório!" }),
  endTime: z.string().min(1, { message: "O horário de término é obrigatório!" }),
  value: z.coerce.number().min(0.01, { message: "O valor deve ser maior que 0!" }),
});

export type AppointmentFormData = z.infer<typeof appointmentSchema>;
