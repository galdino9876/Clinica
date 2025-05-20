
-- Criação do banco de dados (caso não exista)
CREATE DATABASE IF NOT EXISTS saude
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE saude;

-- Tabela: users
-- Armazena os usuários do sistema (administradores, recepcionistas, psicólogos)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY COMMENT 'ID único do usuário (UUID)',
  name VARCHAR(100) NOT NULL COMMENT 'Nome completo do usuário',
  email VARCHAR(100) NOT NULL UNIQUE COMMENT 'Email do usuário (usado para login)',
  role ENUM('admin', 'receptionist', 'psychologist') NOT NULL COMMENT 'Papel do usuário no sistema',
  phone VARCHAR(20) NULL COMMENT 'Número de telefone do usuário',
  username VARCHAR(30) NULL COMMENT 'Nome de usuário opcional',
  password_hash VARCHAR(255) NOT NULL COMMENT 'Hash da senha do usuário',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data da última atualização'
);

-- Tabela: psychologist_details
-- Detalhes específicos para usuários do tipo psicólogo
CREATE TABLE IF NOT EXISTS psychologist_details (
  user_id VARCHAR(36) PRIMARY KEY COMMENT 'ID do usuário (referência à tabela users)',
  commission_percentage TINYINT NOT NULL DEFAULT 50 COMMENT 'Percentual de comissão do psicólogo (10-100)',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data da última atualização',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela: working_hours
-- Horários de disponibilidade dos psicólogos
CREATE TABLE IF NOT EXISTS working_hours (
  id VARCHAR(36) PRIMARY KEY COMMENT 'ID único do registro (UUID)',
  user_id VARCHAR(36) NOT NULL COMMENT 'ID do psicólogo (referência à tabela users)',
  day_of_week TINYINT NOT NULL COMMENT 'Dia da semana (0=domingo, 1=segunda, etc.)',
  start_time VARCHAR(5) NOT NULL COMMENT 'Hora de início (formato HH:MM)',
  end_time VARCHAR(5) NOT NULL COMMENT 'Hora de término (formato HH:MM)',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data da última atualização',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_working_hours_user ON working_hours (user_id, day_of_week);

-- Tabela: consulting_rooms
-- Salas de consulta disponíveis na clínica
CREATE TABLE IF NOT EXISTS consulting_rooms (
  id VARCHAR(36) PRIMARY KEY COMMENT 'ID único da sala (UUID)',
  name VARCHAR(50) NOT NULL COMMENT 'Nome da sala',
  description VARCHAR(255) NULL COMMENT 'Descrição opcional da sala',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data da última atualização'
);

-- Tabela: patients
-- Pacientes da clínica
CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(36) PRIMARY KEY COMMENT 'ID único do paciente (UUID)',
  name VARCHAR(100) NOT NULL COMMENT 'Nome completo do paciente',
  cpf VARCHAR(14) NOT NULL UNIQUE COMMENT 'CPF do paciente (formato: 000.000.000-00)',
  phone VARCHAR(20) NOT NULL COMMENT 'Telefone do paciente',
  email VARCHAR(100) NOT NULL COMMENT 'Email do paciente',
  address VARCHAR(255) NULL COMMENT 'Endereço do paciente',
  birthdate DATE NULL COMMENT 'Data de nascimento do paciente',
  active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Status do paciente (ativo/inativo)',
  deactivation_reason TEXT NULL COMMENT 'Motivo da desativação se o paciente estiver inativo',
  deactivation_date DATE NULL COMMENT 'Data em que o paciente foi desativado',
  identity_document VARCHAR(255) NULL COMMENT 'Caminho para o documento de identidade',
  insurance_document VARCHAR(255) NULL COMMENT 'Caminho para o documento do convênio',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data da última atualização'
);

-- Tabela: appointments
-- Agendamentos de consultas
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(36) PRIMARY KEY COMMENT 'ID único do agendamento (UUID)',
  patient_id VARCHAR(36) NOT NULL COMMENT 'ID do paciente',
  psychologist_id VARCHAR(36) NOT NULL COMMENT 'ID do psicólogo',
  room_id VARCHAR(36) NULL COMMENT 'ID da sala (null para consultas online)',
  date DATE NOT NULL COMMENT 'Data da consulta',
  start_time VARCHAR(5) NOT NULL COMMENT 'Hora de início (formato HH:MM)',
  end_time VARCHAR(5) NOT NULL COMMENT 'Hora de término (formato HH:MM)',
  status ENUM('scheduled', 'completed', 'cancelled', 'confirmed', 'pending') NOT NULL DEFAULT 'scheduled' COMMENT 'Status do agendamento',
  payment_method ENUM('private', 'insurance') NOT NULL COMMENT 'Método de pagamento',
  insurance_type ENUM('Unimed', 'SulAmérica', 'Fusex', 'Other', NULL) NULL COMMENT 'Tipo de convênio (se aplicável)',
  insurance_token VARCHAR(50) NULL COMMENT 'Token do convênio (se aplicável)',
  value DECIMAL(10, 2) NOT NULL COMMENT 'Valor da consulta',
  appointment_type ENUM('presential', 'online') NOT NULL DEFAULT 'presential' COMMENT 'Tipo de consulta',
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Indica se é um agendamento recorrente',
  recurrence_type ENUM('weekly', 'biweekly', NULL) NULL COMMENT 'Tipo de recorrência',
  recurrence_group_id VARCHAR(36) NULL COMMENT 'ID do grupo de recorrência',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data da última atualização',
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (psychologist_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (room_id) REFERENCES consulting_rooms(id) ON DELETE SET NULL
);

CREATE INDEX idx_appointments_psychologist_date ON appointments (psychologist_id, date);
CREATE INDEX idx_appointments_patient_date ON appointments (patient_id, date);
CREATE INDEX idx_appointments_status ON appointments (status);
CREATE INDEX idx_appointments_recurrence ON appointments (recurrence_group_id);

-- Tabela: patient_records
-- Prontuários/registros dos pacientes
CREATE TABLE IF NOT EXISTS patient_records (
  id VARCHAR(36) PRIMARY KEY COMMENT 'ID único do registro (UUID)',
  patient_id VARCHAR(36) NOT NULL COMMENT 'ID do paciente',
  appointment_id VARCHAR(36) NULL COMMENT 'ID do agendamento relacionado (opcional)',
  date DATE NOT NULL COMMENT 'Data do registro',
  notes TEXT NOT NULL COMMENT 'Anotações do profissional',
  created_by VARCHAR(36) NOT NULL COMMENT 'ID do profissional que criou o registro',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data da última atualização',
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_patient_records_patient ON patient_records (patient_id);
CREATE INDEX idx_patient_records_date ON patient_records (date);

-- Tabela: finance_transactions
-- Transações financeiras relacionadas às consultas
CREATE TABLE IF NOT EXISTS finance_transactions (
  id VARCHAR(36) PRIMARY KEY COMMENT 'ID único da transação (UUID)',
  appointment_id VARCHAR(36) NOT NULL COMMENT 'ID do agendamento relacionado',
  patient_id VARCHAR(36) NOT NULL COMMENT 'ID do paciente',
  psychologist_id VARCHAR(36) NOT NULL COMMENT 'ID do psicólogo',
  transaction_date DATE NOT NULL COMMENT 'Data da transação',
  total_value DECIMAL(10, 2) NOT NULL COMMENT 'Valor total da consulta',
  clinic_value DECIMAL(10, 2) NOT NULL COMMENT 'Valor que fica para a clínica',
  psychologist_value DECIMAL(10, 2) NOT NULL COMMENT 'Valor que vai para o psicólogo',
  payment_method ENUM('private', 'insurance') NOT NULL COMMENT 'Método de pagamento',
  insurance_type ENUM('Unimed', 'SulAmérica', 'Fusex', 'Other', NULL) NULL COMMENT 'Tipo de convênio (se aplicável)',
  status ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT 'Status do pagamento',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data da última atualização',
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  FOREIGN KEY (psychologist_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_transactions_date ON finance_transactions (transaction_date);
CREATE INDEX idx_transactions_psychologist ON finance_transactions (psychologist_id);
CREATE INDEX idx_transactions_status ON finance_transactions (status);

-- Consultas de verificação
-- SHOW TABLES;
-- DESCRIBE users;
-- DESCRIBE patients;
