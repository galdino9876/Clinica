# Sistema de Gestão de Pagamentos em Lotes

## Visão Geral

Este sistema implementa uma funcionalidade completa de gestão de pagamentos em lotes para a clínica psicológica, permitindo que administradores criem lotes de pagamento para psicólogos e que os psicólogos aprovem ou contestem esses pagamentos.

## Funcionalidades Implementadas

### 1. Para Administradores

#### Criação de Lotes de Pagamento
- Seleção de psicólogo
- Visualização de consultas disponíveis para pagamento
- Seleção múltipla de consultas
- Cálculo automático de valores (bruto e comissão)
- Criação de lote com status "pending"

#### Gestão de Lotes
- Visualização de todos os lotes criados
- Filtros por status (pendente, aprovado, contestado, pago)
- Detalhes completos de cada lote
- Processamento de pagamentos aprovados

### 2. Para Psicólogos

#### Visualização de Pagamentos
- Dashboard com resumo de valores por status
- Histórico completo de pagamentos
- Detalhes de cada lote de pagamento

#### Aprovação/Contestação
- Aprovação de lotes pendentes
- Contestação com justificativa
- Visualização de motivos de contestação

## Estrutura de Dados

### PaymentBatch
```typescript
interface PaymentBatch {
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
}
```

### PaymentItem
```typescript
interface PaymentItem {
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
```

## Fluxo de Trabalho

1. **Criação do Lote** (Admin)
   - Admin seleciona psicólogo
   - Seleciona consultas para pagamento
   - Sistema calcula valores automaticamente
   - Lote é criado com status "pending"

2. **Aprovação/Contestação** (Psicólogo)
   - Psicólogo visualiza lote pendente
   - Pode aprovar ou contestar
   - Se contestar, deve fornecer justificativa

3. **Processamento** (Admin)
   - Admin visualiza lotes aprovados
   - Pode processar pagamento
   - Status muda para "paid"

## Componentes Criados

### 1. PaymentContext (`src/context/PaymentContext.tsx`)
- Gerenciamento de estado dos pagamentos
- Funções para criar, aprovar, contestar e processar pagamentos
- Integração com APIs

### 2. PsychologistPayments (`src/components/PsychologistPayments.tsx`)
- Interface para psicólogos visualizarem seus pagamentos
- Funcionalidades de aprovação e contestação
- Dashboard com resumos

### 3. PaymentManagement (`src/components/PaymentManagement.tsx`)
- Interface para administradores gerenciarem pagamentos
- Criação de lotes
- Processamento de pagamentos

### 4. Tipos (`src/types/payment.ts`)
- Definições TypeScript para PaymentBatch e PaymentItem
- Interface do contexto de pagamentos

## Integração com FinanceCharts

O componente `FinanceCharts` foi atualizado para incluir:
- Navegação por abas (Relatórios | Pagamentos)
- Exibição condicional baseada no papel do usuário
- Integração com o sistema de pagamentos

## APIs Necessárias

O sistema espera as seguintes APIs no backend:

### GET /webhook/payment-batches
- Retorna lista de lotes de pagamento

### POST /webhook/payment-batches
- Cria novo lote de pagamento

### PUT /webhook/payment-batches/{id}/approve
- Aprova lote de pagamento

### PUT /webhook/payment-batches/{id}/contest
- Contesta lote de pagamento

### PUT /webhook/payment-batches/{id}/mark-paid
- Marca lote como pago

### GET /webhook/payment-items
- Retorna itens de pagamento

## Configuração

1. Adicione o `PaymentProvider` ao `App.tsx`
2. Importe os componentes necessários
3. Configure as APIs no backend
4. Ajuste as URLs das APIs conforme necessário

## Uso

### Para Administradores
1. Acesse a página de Finanças
2. Clique na aba "Pagamentos"
3. Selecione um psicólogo
4. Selecione as consultas para pagamento
5. Crie o lote
6. Processe pagamentos aprovados

### Para Psicólogos
1. Acesse a página de Finanças
2. Clique na aba "Pagamentos"
3. Visualize seus pagamentos pendentes
4. Aprove ou conteste conforme necessário

## Benefícios

- **Transparência**: Psicólogos podem ver exatamente o que estão sendo pagos
- **Controle**: Administradores têm controle total sobre o processo
- **Rastreabilidade**: Histórico completo de todos os pagamentos
- **Flexibilidade**: Sistema de contestação permite correções
- **Automação**: Cálculos automáticos reduzem erros


