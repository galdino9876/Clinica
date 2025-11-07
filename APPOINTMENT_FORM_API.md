# Documentação: Formulário de Novo Agendamento

## Visão Geral

O formulário de agendamento (`AppointmentForm.tsx`) permite criar um ou múltiplos agendamentos para um paciente. O formulário valida os dados usando Zod e envia as informações para a API em etapas.

## Campos do Formulário

### Campos Obrigatórios

1. **Paciente** (`patientId`)
   - Tipo: String (ID do paciente)
   - Validação: Obrigatório
   - Fonte: Lista de pacientes da API `/webhook/patients`

2. **Psicólogo** (`psychologistId`)
   - Tipo: String (ID do psicólogo)
   - Validação: Obrigatório
   - Fonte: Lista de usuários com role "psychologist" da API `/webhook/users`
   - Comportamento: Ao selecionar, carrega automaticamente os horários disponíveis do psicólogo

3. **Tipo de Atendimento** (`appointmentType`)
   - Tipo: Enum ("presential" | "online")
   - Validação: Obrigatório
   - Opções: "Presencial" ou "Online"

4. **Data(s)** (`selectedDates`)
   - Tipo: Array de Date
   - Validação: Pelo menos uma data deve ser selecionada
   - Comportamento: Permite selecionar múltiplas datas para criar vários agendamentos

5. **Consultório** (`roomId`)
   - Tipo: String (ID do consultório)
   - Validação: Obrigatório APENAS se `appointmentType === "presential"`
   - Fonte: Lista de consultórios da API `/webhook/consulting_rooms`
   - Comportamento: Campo é ocultado/desabilitado quando tipo é "online"

6. **Horário de Início** (`startTime`)
   - Tipo: String (formato "HH:MM", ex: "09:00")
   - Validação: Obrigatório
   - Comportamento: 
     - Carrega horários disponíveis baseados nos horários de trabalho do psicólogo
     - Gera slots de 30 em 30 minutos
     - Atualiza automaticamente o horário de término quando alterado

7. **Horário de Término** (`endTime`)
   - Tipo: String (formato "HH:MM", ex: "10:00")
   - Validação: Obrigatório
   - Comportamento: Atualizado automaticamente quando o horário de início muda (adiciona 1 hora)

8. **Método de Pagamento** (`paymentMethod`)
   - Tipo: Enum ("private" | "insurance")
   - Validação: Obrigatório
   - Opções: "Particular" ou planos de saúde (carregados da API `/webhook/recurrence_type`)

9. **Valor do Atendimento** (`value`)
   - Tipo: Number (decimal)
   - Validação: Obrigatório, mínimo 0.01
   - Comportamento:
     - Particular: Valor padrão R$ 200,00
     - Plano de saúde: Valor carregado automaticamente do plano selecionado

### Campos Opcionais (Condicionais)

#### Campos de Guia (apenas quando `paymentMethod !== "private"`)

10. **Número do Prestador** (`numeroPrestador`)
    - Tipo: String
    - Validação: Opcional, mas necessário se for enviar dados da guia
    - Exemplo: "32113578"

11. **Quantidade Autorizada** (`quantidadeAutorizada`)
    - Tipo: Number (1-5)
    - Validação: Opcional, mas necessário se for enviar dados da guia
    - Opções: 1, 2, 3, 4 ou 5

12. **Upload de PDF da Guia Autorizada** (`pdfFile`)
    - Tipo: File (PDF)
    - Validação: 
      - Apenas arquivos PDF
      - Tamanho máximo: 10MB
    - Comportamento: Enviado separadamente via FormData

### Campos de Configuração

13. **Notificar Psicólogo** (`notificarPsicologo`)
    - Tipo: Boolean
    - Validação: Opcional
    - Comportamento: Switch para ativar/desativar notificação ao psicólogo

## Fluxo de Envio para API

### Etapa 1: Criação do(s) Agendamento(s)

Para cada data selecionada, é criado um agendamento via POST para:
```
https://webhook.essenciasaudeintegrada.com.br/webhook/schedule-appointment
```

**Payload enviado:**
```json
{
  "patient_id": 123,                    // Number (convertido de string)
  "psychologist_id": 456,               // Number (convertido de string)
  "room_id": 789,                       // Number ou null (se online)
  "date": "2025-01-15",                 // String (formato yyyy-MM-dd)
  "start_time": "09:00",                // String (formato HH:MM)
  "end_time": "10:00",                  // String (formato HH:MM)
  "status": "pending",                  // String (fixo)
  "appointment_type": "presential",     // String ("presential" | "online")
  "created_at": "2025-01-10T10:30:00Z", // String (ISO timestamp)
  "updated_at": null,                   // null
  "value": 200.0,                       // Number
  "payment_method": "private",          // String ("private" | "insurance")
  "insurance_type": "Particular",       // String (nome do plano ou "Particular")
  "is_recurring": false,                // Boolean (fixo)
  "notificar": true                     // Boolean (do switch)
}
```

**Observações:**
- Se `appointmentType === "online"`, `room_id` será `null`
- Se `appointmentType === "presential"` e `roomId` estiver vazio, `room_id` será `null`
- O campo `notificar` vem do estado `notificarPsicologo`

### Etapa 2: Envio de Dados da Guia (Condicional)

**Apenas executado se:**
- `successCount > 0` (pelo menos um agendamento foi criado)
- `paymentMethod !== "private"` (não é particular)
- `numeroPrestador` está preenchido
- `quantidadeAutorizada` está preenchido (entre 1 e 5)

**Endpoint:**
```
https://webhook.essenciasaudeintegrada.com.br/webhook/insert_date_guias
```

**Payload enviado:**
```json
{
  "numero_prestador": 32113578,         // Number (convertido de string)
  "id_patient": 123,                    // Number (ID do paciente)
  "date_1": "2025-01-15",               // String (formato yyyy-MM-dd)
  "date_2": "2025-01-22",               // String (pode estar vazio "")
  "date_3": "",                         // String (pode estar vazio "")
  "date_4": "",                         // String (pode estar vazio "")
  "date_5": ""                          // String (pode estar vazio "")
}
```

**Lógica de preenchimento:**
- As datas são preenchidas sequencialmente baseadas em:
  - `quantidadeAutorizada`: define quantas datas serão preenchidas (máximo 5)
  - `selectedDates`: as datas selecionadas no formulário
- Se `quantidadeAutorizada = 3` e há 5 datas selecionadas, apenas as 3 primeiras serão usadas
- Se `quantidadeAutorizada = 5` e há apenas 2 datas selecionadas, apenas `date_1` e `date_2` serão preenchidas

### Etapa 3: Upload de PDF da Guia (Condicional)

**Apenas executado se:**
- Um arquivo PDF foi selecionado (`pdfFile !== null`)
- Os dados da guia foram enviados com sucesso

**Endpoint:**
```
https://webhook.essenciasaudeintegrada.com.br/webhook/insert_guia_completed
```

**Método:** POST (FormData)

**FormData enviado:**
```
file: [File object]                    // Arquivo PDF
numero_prestador: "32113578"           // String
command: "Guia-autorizada"              // String (fixo)
nome_patient: "Nome do Paciente"       // String (nome do paciente selecionado)
```

**Observações:**
- O nome do paciente é buscado da lista de pacientes usando o `patientId`
- Após upload bem-sucedido, o arquivo é limpo do estado

## Validações do Formulário

### Validação Zod (appointmentSchema)

1. **patientId**: String não vazia
2. **psychologistId**: String não vazia
3. **appointmentType**: Enum ["presential", "online"]
4. **roomId**: 
   - Opcional se `appointmentType === "online"`
   - Obrigatório se `appointmentType === "presential"`
5. **startTime**: String não vazia
6. **endTime**: String não vazia
7. **value**: Number >= 0.01
8. **paymentMethod**: Enum ["private", "insurance"] ou string não vazia
9. **insuranceType**: String opcional
10. **numeroPrestador**: String opcional
11. **quantidadeAutorizada**: Number opcional

### Validações Adicionais no Submit

- Verifica se há pelo menos uma data selecionada (`selectedDates.length > 0`)
- Verifica se campos de guia estão preenchidos antes de enviar para API de guias

## Comportamentos Especiais

### Carregamento de Horários do Psicólogo

Quando um psicólogo é selecionado:
1. Faz requisição para: `GET /webhook/d52c9494-5de9-4444-877e-9e8d01662962/working_hours/{psychologistId}`
2. Gera slots de horário de 30 em 30 minutos baseado nos horários de trabalho
3. Preenche automaticamente `startTime` e `endTime` com os primeiros horários disponíveis
4. Atualiza os horários quando a data selecionada muda

### Atualização Automática de Horário de Término

Quando `startTime` muda:
- Calcula automaticamente `endTime` adicionando 1 hora
- Garante que não ultrapasse 23:59

### Limpeza de Campos Condicionais

- Quando `appointmentType` muda para "online", `roomId` é limpo
- Quando `paymentMethod` muda para "private", campos de guia são limpos

### Múltiplos Agendamentos

- O formulário permite selecionar múltiplas datas
- Para cada data selecionada, um agendamento é criado
- Todos os agendamentos compartilham os mesmos dados (paciente, psicólogo, horários, etc.)
- Apenas a data muda entre os agendamentos

## Resumo dos Endpoints Utilizados

| Endpoint | Método | Quando é chamado |
|----------|--------|------------------|
| `/webhook/patients` | GET | Carregamento inicial do formulário |
| `/webhook/consulting_rooms` | GET | Carregamento inicial do formulário |
| `/webhook/users` | GET | Carregamento inicial do formulário (filtra psicólogos) |
| `/webhook/recurrence_type` | GET | Carregamento de planos de pagamento (lazy) |
| `/webhook/d52c9494-5de9-4444-877e-9e8d01662962/working_hours/{id}` | GET | Quando um psicólogo é selecionado |
| `/webhook/schedule-appointment` | POST | Para cada data selecionada (cria agendamento) |
| `/webhook/insert_date_guias` | POST | Se método de pagamento não é particular e campos de guia preenchidos |
| `/webhook/insert_guia_completed` | POST | Se um PDF foi selecionado |

## Exemplo Completo de Fluxo

1. Usuário preenche o formulário:
   - Seleciona paciente "João Silva"
   - Seleciona psicólogo "Dr. Maria"
   - Seleciona tipo "Presencial"
   - Seleciona consultório "Sala 1"
   - Seleciona datas: 15/01, 22/01, 29/01
   - Horário: 09:00 - 10:00
   - Método: "Unimed"
   - Valor: R$ 150,00
   - Número prestador: 32113578
   - Quantidade autorizada: 3
   - Upload PDF da guia

2. Ao submeter:
   - Cria 3 agendamentos (um para cada data) via `/webhook/schedule-appointment`
   - Envia dados da guia com `date_1`, `date_2`, `date_3` preenchidas via `/webhook/insert_date_guias`
   - Faz upload do PDF via `/webhook/insert_guia_completed`

3. Resultado:
   - 3 agendamentos criados
   - Guia vinculada ao paciente
   - PDF da guia armazenado

