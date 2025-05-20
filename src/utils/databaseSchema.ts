
/**
 * Este arquivo contém as definições das tabelas do banco de dados
 * e as queries SQL para criar o banco de dados.
 */

// Definição do esquema do banco de dados
export const DATABASE_SCHEMA = {
  tables: [
    {
      name: "users",
      description: "Armazena os usuários do sistema (administradores, recepcionistas, psicólogos)",
      columns: [
        { name: "id", type: "VARCHAR(36)", constraints: "PRIMARY KEY", description: "ID único do usuário (UUID)" },
        { name: "name", type: "VARCHAR(100)", constraints: "NOT NULL", description: "Nome completo do usuário" },
        { name: "email", type: "VARCHAR(100)", constraints: "NOT NULL UNIQUE", description: "Email do usuário (usado para login)" },
        { name: "role", type: "ENUM('admin', 'receptionist', 'psychologist')", constraints: "NOT NULL", description: "Papel do usuário no sistema" },
        { name: "phone", type: "VARCHAR(20)", constraints: "NULL", description: "Número de telefone do usuário" },
        { name: "username", type: "VARCHAR(30)", constraints: "NULL", description: "Nome de usuário opcional" },
        { name: "password_hash", type: "VARCHAR(255)", constraints: "NOT NULL", description: "Hash da senha do usuário" },
        { name: "created_at", type: "TIMESTAMP", constraints: "NOT NULL DEFAULT CURRENT_TIMESTAMP", description: "Data de criação do registro" },
        { name: "updated_at", type: "TIMESTAMP", constraints: "NULL ON UPDATE CURRENT_TIMESTAMP", description: "Data da última atualização" }
      ]
    },
    {
      name: "psychologist_details",
      description: "Detalhes específicos para usuários do tipo psicólogo",
      columns: [
        { name: "user_id", type: "VARCHAR(36)", constraints: "PRIMARY KEY", description: "ID do usuário (referência à tabela users)" },
        { name: "commission_percentage", type: "TINYINT", constraints: "NOT NULL DEFAULT 50", description: "Percentual de comissão do psicólogo (10-100)" },
        { name: "created_at", type: "TIMESTAMP", constraints: "NOT NULL DEFAULT CURRENT_TIMESTAMP", description: "Data de criação do registro" },
        { name: "updated_at", type: "TIMESTAMP", constraints: "NULL ON UPDATE CURRENT_TIMESTAMP", description: "Data da última atualização" }
      ],
      foreignKeys: [
        { column: "user_id", references: "users(id)", onDelete: "CASCADE" }
      ]
    },
    {
      name: "working_hours",
      description: "Horários de disponibilidade dos psicólogos",
      columns: [
        { name: "id", type: "VARCHAR(36)", constraints: "PRIMARY KEY", description: "ID único do registro (UUID)" },
        { name: "user_id", type: "VARCHAR(36)", constraints: "NOT NULL", description: "ID do psicólogo (referência à tabela users)" },
        { name: "day_of_week", type: "TINYINT", constraints: "NOT NULL", description: "Dia da semana (0=domingo, 1=segunda, etc.)" },
        { name: "start_time", type: "VARCHAR(5)", constraints: "NOT NULL", description: "Hora de início (formato HH:MM)" },
        { name: "end_time", type: "VARCHAR(5)", constraints: "NOT NULL", description: "Hora de término (formato HH:MM)" },
        { name: "created_at", type: "TIMESTAMP", constraints: "NOT NULL DEFAULT CURRENT_TIMESTAMP", description: "Data de criação do registro" },
        { name: "updated_at", type: "TIMESTAMP", constraints: "NULL ON UPDATE CURRENT_TIMESTAMP", description: "Data da última atualização" }
      ],
      foreignKeys: [
        { column: "user_id", references: "users(id)", onDelete: "CASCADE" }
      ],
      indexes: [
        { name: "idx_working_hours_user", columns: ["user_id", "day_of_week"] }
      ]
    },
    {
      name: "consulting_rooms",
      description: "Salas de consulta disponíveis na clínica",
      columns: [
        { name: "id", type: "VARCHAR(36)", constraints: "PRIMARY KEY", description: "ID único da sala (UUID)" },
        { name: "name", type: "VARCHAR(50)", constraints: "NOT NULL", description: "Nome da sala" },
        { name: "description", type: "VARCHAR(255)", constraints: "NULL", description: "Descrição opcional da sala" },
        { name: "created_at", type: "TIMESTAMP", constraints: "NOT NULL DEFAULT CURRENT_TIMESTAMP", description: "Data de criação do registro" },
        { name: "updated_at", type: "TIMESTAMP", constraints: "NULL ON UPDATE CURRENT_TIMESTAMP", description: "Data da última atualização" }
      ]
    },
    {
      name: "patients",
      description: "Pacientes da clínica",
      columns: [
        { name: "id", type: "VARCHAR(36)", constraints: "PRIMARY KEY", description: "ID único do paciente (UUID)" },
        { name: "name", type: "VARCHAR(100)", constraints: "NOT NULL", description: "Nome completo do paciente" },
        { name: "cpf", type: "VARCHAR(14)", constraints: "NOT NULL UNIQUE", description: "CPF do paciente (formato: 000.000.000-00)" },
        { name: "phone", type: "VARCHAR(20)", constraints: "NOT NULL", description: "Telefone do paciente" },
        { name: "email", type: "VARCHAR(100)", constraints: "NOT NULL", description: "Email do paciente" },
        { name: "address", type: "VARCHAR(255)", constraints: "NULL", description: "Endereço do paciente" },
        { name: "birthdate", type: "DATE", constraints: "NULL", description: "Data de nascimento do paciente" },
        { name: "active", type: "BOOLEAN", constraints: "NOT NULL DEFAULT TRUE", description: "Status do paciente (ativo/inativo)" },
        { name: "deactivation_reason", type: "TEXT", constraints: "NULL", description: "Motivo da desativação se o paciente estiver inativo" },
        { name: "deactivation_date", type: "DATE", constraints: "NULL", description: "Data em que o paciente foi desativado" },
        { name: "identity_document", type: "VARCHAR(255)", constraints: "NULL", description: "Caminho para o documento de identidade" },
        { name: "insurance_document", type: "VARCHAR(255)", constraints: "NULL", description: "Caminho para o documento do convênio" },
        { name: "created_at", type: "TIMESTAMP", constraints: "NOT NULL DEFAULT CURRENT_TIMESTAMP", description: "Data de criação do registro" },
        { name: "updated_at", type: "TIMESTAMP", constraints: "NULL ON UPDATE CURRENT_TIMESTAMP", description: "Data da última atualização" }
      ]
    },
    {
      name: "appointments",
      description: "Agendamentos de consultas",
      columns: [
        { name: "id", type: "VARCHAR(36)", constraints: "PRIMARY KEY", description: "ID único do agendamento (UUID)" },
        { name: "patient_id", type: "VARCHAR(36)", constraints: "NOT NULL", description: "ID do paciente" },
        { name: "psychologist_id", type: "VARCHAR(36)", constraints: "NOT NULL", description: "ID do psicólogo" },
        { name: "room_id", type: "VARCHAR(36)", constraints: "NULL", description: "ID da sala (null para consultas online)" },
        { name: "date", type: "DATE", constraints: "NOT NULL", description: "Data da consulta" },
        { name: "start_time", type: "VARCHAR(5)", constraints: "NOT NULL", description: "Hora de início (formato HH:MM)" },
        { name: "end_time", type: "VARCHAR(5)", constraints: "NOT NULL", description: "Hora de término (formato HH:MM)" },
        { name: "status", type: "ENUM('scheduled', 'completed', 'cancelled', 'confirmed', 'pending')", constraints: "NOT NULL DEFAULT 'scheduled'", description: "Status do agendamento" },
        { name: "payment_method", type: "ENUM('private', 'insurance')", constraints: "NOT NULL", description: "Método de pagamento" },
        { name: "insurance_type", type: "ENUM('Unimed', 'SulAmérica', 'Fusex', 'Other', NULL)", constraints: "NULL", description: "Tipo de convênio (se aplicável)" },
        { name: "insurance_token", type: "VARCHAR(50)", constraints: "NULL", description: "Token do convênio (se aplicável)" },
        { name: "value", type: "DECIMAL(10, 2)", constraints: "NOT NULL", description: "Valor da consulta" },
        { name: "appointment_type", type: "ENUM('presential', 'online')", constraints: "NOT NULL DEFAULT 'presential'", description: "Tipo de consulta" },
        { name: "is_recurring", type: "BOOLEAN", constraints: "NOT NULL DEFAULT FALSE", description: "Indica se é um agendamento recorrente" },
        { name: "recurrence_type", type: "ENUM('weekly', 'biweekly', NULL)", constraints: "NULL", description: "Tipo de recorrência" },
        { name: "recurrence_group_id", type: "VARCHAR(36)", constraints: "NULL", description: "ID do grupo de recorrência" },
        { name: "created_at", type: "TIMESTAMP", constraints: "NOT NULL DEFAULT CURRENT_TIMESTAMP", description: "Data de criação do registro" },
        { name: "updated_at", type: "TIMESTAMP", constraints: "NULL ON UPDATE CURRENT_TIMESTAMP", description: "Data da última atualização" }
      ],
      foreignKeys: [
        { column: "patient_id", references: "patients(id)", onDelete: "CASCADE" },
        { column: "psychologist_id", references: "users(id)", onDelete: "RESTRICT" },
        { column: "room_id", references: "consulting_rooms(id)", onDelete: "SET NULL" }
      ],
      indexes: [
        { name: "idx_appointments_psychologist_date", columns: ["psychologist_id", "date"] },
        { name: "idx_appointments_patient_date", columns: ["patient_id", "date"] },
        { name: "idx_appointments_status", columns: ["status"] },
        { name: "idx_appointments_recurrence", columns: ["recurrence_group_id"] }
      ]
    },
    {
      name: "patient_records",
      description: "Prontuários/registros dos pacientes",
      columns: [
        { name: "id", type: "VARCHAR(36)", constraints: "PRIMARY KEY", description: "ID único do registro (UUID)" },
        { name: "patient_id", type: "VARCHAR(36)", constraints: "NOT NULL", description: "ID do paciente" },
        { name: "appointment_id", type: "VARCHAR(36)", constraints: "NULL", description: "ID do agendamento relacionado (opcional)" },
        { name: "date", type: "DATE", constraints: "NOT NULL", description: "Data do registro" },
        { name: "notes", type: "TEXT", constraints: "NOT NULL", description: "Anotações do profissional" },
        { name: "created_by", type: "VARCHAR(36)", constraints: "NOT NULL", description: "ID do profissional que criou o registro" },
        { name: "created_at", type: "TIMESTAMP", constraints: "NOT NULL DEFAULT CURRENT_TIMESTAMP", description: "Data de criação do registro" },
        { name: "updated_at", type: "TIMESTAMP", constraints: "NULL ON UPDATE CURRENT_TIMESTAMP", description: "Data da última atualização" }
      ],
      foreignKeys: [
        { column: "patient_id", references: "patients(id)", onDelete: "CASCADE" },
        { column: "appointment_id", references: "appointments(id)", onDelete: "SET NULL" },
        { column: "created_by", references: "users(id)", onDelete: "RESTRICT" }
      ],
      indexes: [
        { name: "idx_patient_records_patient", columns: ["patient_id"] },
        { name: "idx_patient_records_date", columns: ["date"] }
      ]
    },
    {
      name: "finance_transactions",
      description: "Transações financeiras relacionadas às consultas",
      columns: [
        { name: "id", type: "VARCHAR(36)", constraints: "PRIMARY KEY", description: "ID único da transação (UUID)" },
        { name: "appointment_id", type: "VARCHAR(36)", constraints: "NOT NULL", description: "ID do agendamento relacionado" },
        { name: "patient_id", type: "VARCHAR(36)", constraints: "NOT NULL", description: "ID do paciente" },
        { name: "psychologist_id", type: "VARCHAR(36)", constraints: "NOT NULL", description: "ID do psicólogo" },
        { name: "transaction_date", type: "DATE", constraints: "NOT NULL", description: "Data da transação" },
        { name: "total_value", type: "DECIMAL(10, 2)", constraints: "NOT NULL", description: "Valor total da consulta" },
        { name: "clinic_value", type: "DECIMAL(10, 2)", constraints: "NOT NULL", description: "Valor que fica para a clínica" },
        { name: "psychologist_value", type: "DECIMAL(10, 2)", constraints: "NOT NULL", description: "Valor que vai para o psicólogo" },
        { name: "payment_method", type: "ENUM('private', 'insurance')", constraints: "NOT NULL", description: "Método de pagamento" },
        { name: "insurance_type", type: "ENUM('Unimed', 'SulAmérica', 'Fusex', 'Other', NULL)", constraints: "NULL", description: "Tipo de convênio (se aplicável)" },
        { name: "status", type: "ENUM('pending', 'paid', 'cancelled')", constraints: "NOT NULL DEFAULT 'pending'", description: "Status do pagamento" },
        { name: "created_at", type: "TIMESTAMP", constraints: "NOT NULL DEFAULT CURRENT_TIMESTAMP", description: "Data de criação do registro" },
        { name: "updated_at", type: "TIMESTAMP", constraints: "NULL ON UPDATE CURRENT_TIMESTAMP", description: "Data da última atualização" }
      ],
      foreignKeys: [
        { column: "appointment_id", references: "appointments(id)", onDelete: "CASCADE" },
        { column: "patient_id", references: "patients(id)", onDelete: "RESTRICT" },
        { column: "psychologist_id", references: "users(id)", onDelete: "RESTRICT" }
      ],
      indexes: [
        { name: "idx_transactions_date", columns: ["transaction_date"] },
        { name: "idx_transactions_psychologist", columns: ["psychologist_id"] },
        { name: "idx_transactions_status", columns: ["status"] }
      ]
    }
  ]
};

// Função que gera SQL para criar as tabelas
export const generateCreateTablesSQL = (): string => {
  // Seleciona o banco de dados
  let sql = `USE saude;\n\n`;
  
  // Para cada tabela
  DATABASE_SCHEMA.tables.forEach(table => {
    sql += `-- Tabela: ${table.name}\n`;
    sql += `-- ${table.description}\n`;
    sql += `CREATE TABLE IF NOT EXISTS ${table.name} (\n`;
    
    // Adiciona as colunas
    const columnDefs = table.columns.map(col => {
      return `  ${col.name} ${col.type} ${col.constraints} COMMENT '${col.description}'`;
    });
    
    // Adiciona as chaves estrangeiras se existirem
    if (table.foreignKeys) {
      table.foreignKeys.forEach(fk => {
        columnDefs.push(`  FOREIGN KEY (${fk.column}) REFERENCES ${fk.references}${fk.onDelete ? ` ON DELETE ${fk.onDelete}` : ''}`);
      });
    }
    
    sql += columnDefs.join(',\n');
    sql += `\n);\n\n`;
    
    // Adiciona índices se existirem
    if (table.indexes) {
      table.indexes.forEach(idx => {
        sql += `CREATE INDEX ${idx.name} ON ${table.name} (${idx.columns.join(', ')});\n`;
      });
      sql += '\n';
    }
  });
  
  return sql;
};

// Função para gerar a consulta SQL para visualizar a estrutura do banco de dados
export const generateShowTablesSQL = (): string => {
  return `
-- Ver todas as tabelas no banco de dados
SHOW TABLES;

-- Para examinar a estrutura de cada tabela, execute:
-- DESCRIBE nome_da_tabela;

-- Exemplos:
DESCRIBE users;
DESCRIBE patients;
DESCRIBE appointments;
`;
};

// SQL para criar o banco de dados completo
export const fullDatabaseSQL = `
-- Criação do banco de dados (caso não exista)
CREATE DATABASE IF NOT EXISTS saude
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

${generateCreateTablesSQL()}
`;
