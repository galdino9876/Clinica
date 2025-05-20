
# Estrutura do Banco de Dados - Sistema Clínico

Este documento descreve a estrutura completa do banco de dados MySQL para o sistema de gestão da clínica psicológica.

## Visão Geral das Tabelas

O banco de dados consiste em 8 tabelas principais:

1. **users** - Usuários do sistema (administradores, recepcionistas, psicólogos)
2. **psychologist_details** - Detalhes específicos para psicólogos
3. **working_hours** - Horários de disponibilidade dos psicólogos
4. **consulting_rooms** - Salas de consulta disponíveis na clínica
5. **patients** - Pacientes da clínica
6. **appointments** - Agendamentos de consultas
7. **patient_records** - Prontuários/registros dos pacientes
8. **finance_transactions** - Transações financeiras relacionadas às consultas

## Detalhamento das Tabelas

### 1. users
Armazena os usuários do sistema (administradores, recepcionistas, psicólogos).

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | VARCHAR(36) | PRIMARY KEY | ID único do usuário (UUID) |
| name | VARCHAR(100) | NOT NULL | Nome completo do usuário |
| email | VARCHAR(100) | NOT NULL, UNIQUE | Email do usuário (usado para login) |
| role | ENUM('admin', 'receptionist', 'psychologist') | NOT NULL | Papel do usuário no sistema |
| phone | VARCHAR(20) | NULL | Número de telefone do usuário |
| username | VARCHAR(30) | NULL | Nome de usuário opcional |
| password_hash | VARCHAR(255) | NOT NULL | Hash da senha do usuário |
| created_at | TIMESTAMP | NOT NULL DEFAULT CURRENT_TIMESTAMP | Data de criação do registro |
| updated_at | TIMESTAMP | NULL ON UPDATE CURRENT_TIMESTAMP | Data da última atualização |

### 2. psychologist_details
Detalhes específicos para usuários do tipo psicólogo.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| user_id | VARCHAR(36) | PRIMARY KEY, FK -> users(id) | ID do usuário (referência à tabela users) |
| commission_percentage | TINYINT | NOT NULL DEFAULT 50 | Percentual de comissão do psicólogo (10-100) |
| created_at | TIMESTAMP | NOT NULL DEFAULT CURRENT_TIMESTAMP | Data de criação do registro |
| updated_at | TIMESTAMP | NULL ON UPDATE CURRENT_TIMESTAMP | Data da última atualização |

### 3. working_hours
Horários de disponibilidade dos psicólogos.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | VARCHAR(36) | PRIMARY KEY | ID único do registro (UUID) |
| user_id | VARCHAR(36) | NOT NULL, FK -> users(id) | ID do psicólogo (referência à tabela users) |
| day_of_week | TINYINT | NOT NULL | Dia da semana (0=domingo, 1=segunda, etc.) |
| start_time | VARCHAR(5) | NOT NULL | Hora de início (formato HH:MM) |
| end_time | VARCHAR(5) | NOT NULL | Hora de término (formato HH:MM) |
| created_at | TIMESTAMP | NOT NULL DEFAULT CURRENT_TIMESTAMP | Data de criação do registro |
| updated_at | TIMESTAMP | NULL ON UPDATE CURRENT_TIMESTAMP | Data da última atualização |

**Índices:**
- idx_working_hours_user (user_id, day_of_week)

### 4. consulting_rooms
Salas de consulta disponíveis na clínica.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | VARCHAR(36) | PRIMARY KEY | ID único da sala (UUID) |
| name | VARCHAR(50) | NOT NULL | Nome da sala |
| description | VARCHAR(255) | NULL | Descrição opcional da sala |
| created_at | TIMESTAMP | NOT NULL DEFAULT CURRENT_TIMESTAMP | Data de criação do registro |
| updated_at | TIMESTAMP | NULL ON UPDATE CURRENT_TIMESTAMP | Data da última atualização |

### 5. patients
Pacientes da clínica.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | VARCHAR(36) | PRIMARY KEY | ID único do paciente (UUID) |
| name | VARCHAR(100) | NOT NULL | Nome completo do paciente |
| cpf | VARCHAR(14) | NOT NULL, UNIQUE | CPF do paciente (formato: 000.000.000-00) |
| phone | VARCHAR(20) | NOT NULL | Telefone do paciente |
| email | VARCHAR(100) | NOT NULL | Email do paciente |
| address | VARCHAR(255) | NULL | Endereço do paciente |
| birthdate | DATE | NULL | Data de nascimento do paciente |
| active | BOOLEAN | NOT NULL DEFAULT TRUE | Status do paciente (ativo/inativo) |
| deactivation_reason | TEXT | NULL | Motivo da desativação se o paciente estiver inativo |
| deactivation_date | DATE | NULL | Data em que o paciente foi desativado |
| identity_document | VARCHAR(255) | NULL | Caminho para o documento de identidade |
| insurance_document | VARCHAR(255) | NULL | Caminho para o documento do convênio |
| created_at | TIMESTAMP | NOT NULL DEFAULT CURRENT_TIMESTAMP | Data de criação do registro |
| updated_at | TIMESTAMP | NULL ON UPDATE CURRENT_TIMESTAMP | Data da última atualização |

### 6. appointments
Agendamentos de consultas.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | VARCHAR(36) | PRIMARY KEY | ID único do agendamento (UUID) |
| patient_id | VARCHAR(36) | NOT NULL, FK -> patients(id) | ID do paciente |
| psychologist_id | VARCHAR(36) | NOT NULL, FK -> users(id) | ID do psicólogo |
| room_id | VARCHAR(36) | NULL, FK -> consulting_rooms(id) | ID da sala (null para consultas online) |
| date | DATE | NOT NULL | Data da consulta |
| start_time | VARCHAR(5) | NOT NULL | Hora de início (formato HH:MM) |
| end_time | VARCHAR(5) | NOT NULL | Hora de término (formato HH:MM) |
| status | ENUM('scheduled', 'completed', 'cancelled', 'confirmed', 'pending') | NOT NULL DEFAULT 'scheduled' | Status do agendamento |
| payment_method | ENUM('private', 'insurance') | NOT NULL | Método de pagamento |
| insurance_type | ENUM('Unimed', 'SulAmérica', 'Fusex', 'Other', NULL) | NULL | Tipo de convênio (se aplicável) |
| insurance_token | VARCHAR(50) | NULL | Token do convênio (se aplicável) |
| value | DECIMAL(10, 2) | NOT NULL | Valor da consulta |
| appointment_type | ENUM('presential', 'online') | NOT NULL DEFAULT 'presential' | Tipo de consulta |
| is_recurring | BOOLEAN | NOT NULL DEFAULT FALSE | Indica se é um agendamento recorrente |
| recurrence_type | ENUM('weekly', 'biweekly', NULL) | NULL | Tipo de recorrência |
| recurrence_group_id | VARCHAR(36) | NULL | ID do grupo de recorrência |
| created_at | TIMESTAMP | NOT NULL DEFAULT CURRENT_TIMESTAMP | Data de criação do registro |
| updated_at | TIMESTAMP | NULL ON UPDATE CURRENT_TIMESTAMP | Data da última atualização |

**Índices:**
- idx_appointments_psychologist_date (psychologist_id, date)
- idx_appointments_patient_date (patient_id, date)
- idx_appointments_status (status)
- idx_appointments_recurrence (recurrence_group_id)

### 7. patient_records
Prontuários/registros dos pacientes.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | VARCHAR(36) | PRIMARY KEY | ID único do registro (UUID) |
| patient_id | VARCHAR(36) | NOT NULL, FK -> patients(id) | ID do paciente |
| appointment_id | VARCHAR(36) | NULL, FK -> appointments(id) | ID do agendamento relacionado (opcional) |
| date | DATE | NOT NULL | Data do registro |
| notes | TEXT | NOT NULL | Anotações do profissional |
| created_by | VARCHAR(36) | NOT NULL, FK -> users(id) | ID do profissional que criou o registro |
| created_at | TIMESTAMP | NOT NULL DEFAULT CURRENT_TIMESTAMP | Data de criação do registro |
| updated_at | TIMESTAMP | NULL ON UPDATE CURRENT_TIMESTAMP | Data da última atualização |

**Índices:**
- idx_patient_records_patient (patient_id)
- idx_patient_records_date (date)

### 8. finance_transactions
Transações financeiras relacionadas às consultas.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | VARCHAR(36) | PRIMARY KEY | ID único da transação (UUID) |
| appointment_id | VARCHAR(36) | NOT NULL, FK -> appointments(id) | ID do agendamento relacionado |
| patient_id | VARCHAR(36) | NOT NULL, FK -> patients(id) | ID do paciente |
| psychologist_id | VARCHAR(36) | NOT NULL, FK -> users(id) | ID do psicólogo |
| transaction_date | DATE | NOT NULL | Data da transação |
| total_value | DECIMAL(10, 2) | NOT NULL | Valor total da consulta |
| clinic_value | DECIMAL(10, 2) | NOT NULL | Valor que fica para a clínica |
| psychologist_value | DECIMAL(10, 2) | NOT NULL | Valor que vai para o psicólogo |
| payment_method | ENUM('private', 'insurance') | NOT NULL | Método de pagamento |
| insurance_type | ENUM('Unimed', 'SulAmérica', 'Fusex', 'Other', NULL) | NULL | Tipo de convênio (se aplicável) |
| status | ENUM('pending', 'paid', 'cancelled') | NOT NULL DEFAULT 'pending' | Status do pagamento |
| created_at | TIMESTAMP | NOT NULL DEFAULT CURRENT_TIMESTAMP | Data de criação do registro |
| updated_at | TIMESTAMP | NULL ON UPDATE CURRENT_TIMESTAMP | Data da última atualização |

**Índices:**
- idx_transactions_date (transaction_date)
- idx_transactions_psychologist (psychologist_id)
- idx_transactions_status (status)

## Relacionamentos

- **users** → **psychologist_details**: Um psicólogo tem um registro de detalhes (1:1)
- **users** → **working_hours**: Um psicólogo tem vários horários de trabalho (1:N)
- **users** → **appointments**: Um psicólogo tem vários agendamentos (1:N)
- **users** → **patient_records**: Um psicólogo cria vários registros de pacientes (1:N)
- **patients** → **appointments**: Um paciente tem vários agendamentos (1:N)
- **patients** → **patient_records**: Um paciente tem vários registros (1:N)
- **appointments** → **patient_records**: Um agendamento pode ter um registro associado (1:1)
- **appointments** → **finance_transactions**: Um agendamento tem uma transação financeira (1:1)
- **consulting_rooms** → **appointments**: Uma sala tem vários agendamentos (1:N)

## Instruções para Criar o Banco de Dados

1. Abra um cliente MySQL (como MySQL Workbench, phpMyAdmin, ou linha de comando)
2. Cole e execute o script SQL fornecido no arquivo

```sql
-- Criação do banco de dados (caso não exista)
CREATE DATABASE IF NOT EXISTS saude
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE saude;

-- Criar tabelas...
```

3. Verifique se todas as tabelas foram criadas corretamente:
```sql
SHOW TABLES;
```

4. Para examinar a estrutura de uma tabela específica:
```sql
DESCRIBE nome_da_tabela;
```
