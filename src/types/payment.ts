export interface PaymentItem {
  id: string;
  batchId: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  appointmentDate: string;
  grossValue: number;
  netValue: number;
  commissionPercentage: number;
  createdAt: string;
}

export interface PaymentBatch {
  id: string;
  psychologistId: string;
  psychologistName: string;
  totalGrossValue: number;
  totalNetValue: number;
  status: 'pending' | 'approved' | 'contested' | 'paid';
  contestationReason?: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  approvedAt?: string;
  paidAt?: string;
  appointmentIds?: string[];
}

export interface PaymentContextType {
  paymentBatches: PaymentBatch[];
  getPsychologistPayments: (psychologistId: string) => PaymentBatch[];
  getPaymentItemsByBatch: (batchId: string) => PaymentItem[];
  createPaymentBatch: (psychologistId: string, appointmentIds: string[]) => Promise<void>;
  approvePaymentBatch: (batchId: string) => Promise<void>;
  contestPaymentBatch: (batchId: string, reason: string) => Promise<void>;
  markPaymentAsPaid: (batchId: string) => Promise<void>;
}


