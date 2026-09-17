-- Tabela de Assinatura e Cobrança do Sistema do Gestor
CREATE TABLE IF NOT EXISTS system_subscription (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'past_due', 'blocked', 'canceled'
    monthly_amount NUMERIC(10,2) NOT NULL DEFAULT 490.00,
    due_day INTEGER NOT NULL DEFAULT 16,
    grace_period_days INTEGER NOT NULL DEFAULT 5,
    last_payment_date TIMESTAMPTZ,
    next_due_date TIMESTAMPTZ,
    pix_phone VARCHAR(50) DEFAULT '41996560080',
    pix_code TEXT DEFAULT '00020126360014BR.GOV.BCB.PIX0114+55419965600805204000053039865406490.005802BR5914SISTEMA GESTOR6008CURITIBA62150511MENSALIDADE6304F9A7',
    pix_qr_url TEXT,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    stripe_payment_link TEXT DEFAULT 'https://buy.stripe.com/test_gestor_delivery_490',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE system_subscription ENABLE ROW LEVEL SECURITY;

-- Permitir leitura de assinatura
CREATE POLICY "Permitir leitura de assinatura" 
ON system_subscription 
FOR SELECT 
TO public 
USING (true);

-- Permitir atualização de assinatura
CREATE POLICY "Permitir atualização de assinatura" 
ON system_subscription 
FOR ALL 
TO public 
USING (true);

-- Registro padrão inicial para o estabelecimento
INSERT INTO system_subscription (
    status,
    monthly_amount,
    due_day,
    grace_period_days,
    pix_phone,
    pix_code,
    next_due_date
) 
SELECT 
    'active',
    490.00,
    16,
    5,
    '41996560080',
    '00020126360014BR.GOV.BCB.PIX0114+55419965600805204000053039865406490.005802BR5914SISTEMA GESTOR6008CURITIBA62150511MENSALIDADE6304F9A7',
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '15 days'
WHERE NOT EXISTS (
    SELECT 1 FROM system_subscription LIMIT 1
);
