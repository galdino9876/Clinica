# Campos Enviados para API create-patient

## Endpoint
```
POST https://webhook.essenciasaudeintegrada.com.br/webhook/create-patient
```

## Estrutura de Dados Enviados (Body JSON)

### ✅ Campos OBRIGATÓRIOS:

1. **`name`** (string)
   - Nome completo do paciente
   - Validação: Mínimo 2 caracteres
   - Exemplo: `"ANA CAROLINA CARVALHO FONTINELI IZAIAS"`

2. **`cpf`** (string)
   - CPF do paciente
   - Formato: `"000.000.000-00"` (com pontos e hífen)
   - Validação: Deve ter 14 caracteres e formato válido
   - Exemplo: `"123.456.789-00"`

3. **`phone`** (string)
   - Telefone do paciente
   - Formato: Apenas números, 11 dígitos (DDD + 9 + número)
   - Validação: Regex `/^\d{11}$/`
   - Exemplo: `"61988888888"` (transformado do formato digitado)
   - Nota: O formulário aceita formatação, mas é enviado apenas números

4. **`email`** (string)
   - E-mail do paciente
   - Validação: Formato de e-mail válido
   - Exemplo: `"paciente@email.com"`

5. **`birthdate`** (string)
   - Data de nascimento
   - Formato: Provavelmente `"YYYY-MM-DD"` ou formato ISO
   - Validação: Campo obrigatório (mínimo 1 caractere)
   - Exemplo: `"1990-05-15"`

6. **`value`** (number)
   - Valor da consulta
   - Validação: Deve ser maior que 0.01
   - Tipo: Número (coerção automática via `z.coerce.number()`)
   - Exemplo: `150.00`

### ⚪ Campos OPCIONAIS:

7. **`nome_responsavel`** (string | undefined)
   - Nome do responsável (para pacientes menores de idade)
   - Validação: Opcional (pode ser vazio)
   - Exemplo: `"João Silva"` ou `undefined`

8. **`telefone_responsavel`** (string | undefined)
   - Telefone do responsável
   - Formato: Apenas números, 11 dígitos (quando preenchido)
   - Validação: Se preenchido, deve ter 11 dígitos e formato válido
   - Pode ser vazio ou nulo
   - Exemplo: `"61999999999"` ou `undefined`

---

## Exemplo Completo de Request Body:

```json
{
  "name": "ANA CAROLINA CARVALHO FONTINELI IZAIAS",
  "cpf": "123.456.789-00",
  "phone": "61988888888",
  "email": "ana.carolina@email.com",
  "birthdate": "1990-05-15",
  "value": 150.00,
  "nome_responsavel": "João Silva",
  "telefone_responsavel": "61999999999"
}
```

## Exemplo Mínimo (Apenas Obrigatórios):

```json
{
  "name": "MARIA SANTOS",
  "cpf": "987.654.321-00",
  "phone": "61977777777",
  "email": "maria@email.com",
  "birthdate": "1985-12-20",
  "value": 200.00
}
```

---

## Observações Importantes:

1. **Documento PDF separado**: O documento de identidade (PDF) **NÃO** é enviado junto com os dados JSON. Ele é enviado em uma requisição **SEPARADA** para:
   - Endpoint: `https://webhook.essenciasaudeintegrada.com.br/webhook/insert_documento_pessoal`
   - Método: POST com FormData
   - Campos:
     - `documento` (File): Arquivo PDF
     - `nome` (string): Nome do paciente

2. **Formato do telefone**: 
   - O usuário pode digitar com formatação
   - Mas o valor enviado é apenas números (transformação automática)
   - O campo `phone` no request contém apenas dígitos

3. **Validação de CPF**:
   - É feita validação de formato antes do envio
   - Função `validateCPF()` verifica o formato antes de submeter

4. **Campo `value`**:
   - Representa o valor da consulta
   - É obrigatório e deve ser maior que 0.01

5. **Campos de responsável**:
   - São opcionais
   - Usados principalmente para pacientes menores de idade (crianças)

---

## Fluxo Completo de Criação:

1. **Primeiro request** (create-patient):
   - Envia dados JSON com informações do paciente
   - Recebe resposta com ID do paciente criado

2. **Segundo request** (insert_documento_pessoal) - apenas para novos cadastros:
   - Envia PDF do documento de identidade via FormData
   - Usa o nome do paciente para associar ao documento

---

## Resumo Visual:

```typescript
type CreatePatientRequest = {
  name: string;                    // ✅ OBRIGATÓRIO
  cpf: string;                     // ✅ OBRIGATÓRIO (formato: "000.000.000-00")
  phone: string;                   // ✅ OBRIGATÓRIO (11 dígitos, apenas números)
  email: string;                   // ✅ OBRIGATÓRIO (formato válido)
  birthdate: string;               // ✅ OBRIGATÓRIO
  value: number;                   // ✅ OBRIGATÓRIO (> 0.01)
  nome_responsavel?: string;       // ⚪ OPCIONAL
  telefone_responsavel?: string;   // ⚪ OPCIONAL (11 dígitos se preenchido)
}
```

---

## Campos que NÃO são enviados:

- `id` - Não é enviado em criação (apenas em edição)
- `address` - Não existe no formulário atual
- Arquivos (PDF) - Enviados separadamente
- `active` - Gerenciado pelo backend
- Timestamps (`created_at`, `updated_at`) - Gerenciados pelo backend

