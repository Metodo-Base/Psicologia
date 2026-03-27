-- Script para criar as tabelas necessárias no Supabase para o PsicoCRM

-- 1. Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer', -- 'admin', 'secretaria', 'viewer'
    name TEXT,
    must_change_password BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Tentativas de Login (Brute Force Protection)
CREATE TABLE IF NOT EXISTS login_attempts (
    ip TEXT PRIMARY KEY,
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE
);

-- 3. Tabela de Chaves de API
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_value TEXT UNIQUE NOT NULL, -- sk_...
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'revoked'
    created_by UUID REFERENCES users(id),
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Logs da API
CREATE TABLE IF NOT EXISTS api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    ip TEXT,
    api_key_id UUID REFERENCES api_keys(id),
    response_time INTEGER, -- em ms
    user_agent TEXT
);

-- 5. Tabela de Configuração da Clínica
CREATE TABLE IF NOT EXISTS clinic_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    opening_hours JSONB,
    contact_text TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT one_row CHECK (id = 1)
);

-- 6. Tabela de Leads / Pacientes
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    whatsapp TEXT,
    email TEXT,
    status_conversao TEXT DEFAULT 'Novo', -- 'Novo', 'Em Atendimento', 'Convertido', 'Arquivado'
    tipo TEXT DEFAULT 'lead', -- 'lead', 'paciente'
    origem TEXT,
    modalidade TEXT,
    valor_sessao DECIMAL(10,2),
    notas_clinicas TEXT, -- Apenas admin vê
    data_triagem TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_ultima_interacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    patient_id TEXT, -- ID externo se houver
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabela de Configurações de IA
CREATE TABLE IF NOT EXISTS ai_configs (
    id TEXT PRIMARY KEY, -- 'openai', 'gemini'
    api_key TEXT,
    model_name TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    settings JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabela de Logs de Busca com IA
CREATE TABLE IF NOT EXISTS ai_search_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    query TEXT NOT NULL,
    response TEXT,
    tokens_used INTEGER,
    api_key_id UUID REFERENCES api_keys(id),
    execution_time INTEGER
);

-- Habilitar RLS (Row Level Security) - Opcional mas recomendado
-- Por enquanto, vamos manter simples para garantir que o app conecte.
-- O app usa a service_role ou anon key com permissões via código.
