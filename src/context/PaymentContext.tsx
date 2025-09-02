import React, { createContext, useContext, useState, useEffect } from 'react';
import { PaymentBatch, PaymentItem, PaymentContextType } from '@/types/payment';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/use-toast';

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const usePayments = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayments must be used within a PaymentProvider');
  }
  return context;
};

interface PaymentProviderProps {
  children: React.ReactNode;
}

export const PaymentProvider: React.FC<PaymentProviderProps> = ({ children }) => {
  const [paymentBatches, setPaymentBatches] = useState<PaymentBatch[]>([]);
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Carregar dados iniciais
  useEffect(() => {
    if (user) {
      loadPaymentData();
    }
  }, [user]);

  const loadPaymentData = async () => {
    try {
      // Carregar lotes de pagamento
      const batchesResponse = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/payment-batches', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (batchesResponse.ok) {
        const batchesData = await batchesResponse.json();
        setPaymentBatches(batchesData);
      }

      // Carregar itens de pagamento
      const itemsResponse = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/payment-items', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        setPaymentItems(itemsData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de pagamento:', error);
    }
  };

  const getPsychologistPayments = (psychologistId: string): PaymentBatch[] => {
    return paymentBatches.filter(batch => batch.psychologistId === psychologistId);
  };

  const getPaymentItemsByBatch = (batchId: string): PaymentItem[] => {
    return paymentItems.filter(item => item.batchId === batchId);
  };

  const createPaymentBatch = async (psychologistId: string, appointmentIds: string[]): Promise<void> => {
    try {
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/payment-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          psychologistId,
          appointmentIds,
          createdBy: user?.id,
          createdByName: user?.name,
        }),
      });

      if (response.ok) {
        const newBatch = await response.json();
        setPaymentBatches(prev => [...prev, newBatch]);
        
        toast({
          title: "Lote de pagamento criado",
          description: "O lote de pagamento foi criado com sucesso.",
        });
      } else {
        throw new Error('Erro ao criar lote de pagamento');
      }
    } catch (error) {
      console.error('Erro ao criar lote de pagamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o lote de pagamento.",
        variant: "destructive",
      });
    }
  };

  const approvePaymentBatch = async (batchId: string): Promise<void> => {
    try {
      const response = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/payment-batches/${batchId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setPaymentBatches(prev => 
          prev.map(batch => 
            batch.id === batchId 
              ? { ...batch, status: 'approved', approvedAt: new Date().toISOString() }
              : batch
          )
        );
        
        toast({
          title: "Pagamento aprovado",
          description: "O pagamento foi aprovado com sucesso.",
        });
      } else {
        throw new Error('Erro ao aprovar pagamento');
      }
    } catch (error) {
      console.error('Erro ao aprovar pagamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível aprovar o pagamento.",
        variant: "destructive",
      });
    }
  };

  const contestPaymentBatch = async (batchId: string, reason: string): Promise<void> => {
    try {
      const response = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/payment-batches/${batchId}/contest`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        setPaymentBatches(prev => 
          prev.map(batch => 
            batch.id === batchId 
              ? { ...batch, status: 'contested', contestationReason: reason }
              : batch
          )
        );
        
        toast({
          title: "Pagamento contestado",
          description: "O pagamento foi contestado e será revisado pela administração.",
        });
      } else {
        throw new Error('Erro ao contestar pagamento');
      }
    } catch (error) {
      console.error('Erro ao contestar pagamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível contestar o pagamento.",
        variant: "destructive",
      });
    }
  };

  const markPaymentAsPaid = async (batchId: string): Promise<void> => {
    try {
      const response = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/payment-batches/${batchId}/mark-paid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setPaymentBatches(prev => 
          prev.map(batch => 
            batch.id === batchId 
              ? { ...batch, status: 'paid', paidAt: new Date().toISOString() }
              : batch
          )
        );
        
        toast({
          title: "Pagamento processado",
          description: "O pagamento foi marcado como pago.",
        });
      } else {
        throw new Error('Erro ao marcar pagamento como pago');
      }
    } catch (error) {
      console.error('Erro ao marcar pagamento como pago:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar o pagamento.",
        variant: "destructive",
      });
    }
  };

  const value: PaymentContextType = {
    paymentBatches,
    getPsychologistPayments,
    getPaymentItemsByBatch,
    createPaymentBatch,
    approvePaymentBatch,
    contestPaymentBatch,
    markPaymentAsPaid,
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
};


