const apiKey = process.env.N8N_API_KEY;

const migrationSql = `
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    name TEXT DEFAULT 'Cliente',
    paused BOOLEAN DEFAULT false,
    paused_at TIMESTAMPTZ,
    last_message TEXT,
    last_sender TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_phone ON public.chat_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated ON public.chat_conversations(updated_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    sender TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_phone ON public.chat_messages(phone, created_at DESC);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_conversations' AND policyname = 'Allow public all chat_conversations'
  ) THEN
    CREATE POLICY "Allow public all chat_conversations" ON public.chat_conversations FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Allow public all chat_messages'
  ) THEN
    CREATE POLICY "Allow public all chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

NOTIFY pgrst, 'reload schema';
`;

async function runMigration() {
  console.log('1. Criando workflow temporário de migração no n8n...');
  const webhookPath = 'migracao-chat-' + Date.now();

  const wfPayload = {
    name: 'Temp Migration Runner',
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: webhookPath,
          responseMode: 'responseNode',
          options: {}
        },
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [200, 300],
        id: 'node-webhook',
        name: 'Webhook'
      },
      {
        parameters: {
          operation: 'executeQuery',
          query: migrationSql,
          options: {}
        },
        type: 'n8n-nodes-base.postgres',
        typeVersion: 2.6,
        position: [420, 300],
        id: 'node-postgres',
        name: 'Postgres Supabase',
        credentials: {
          postgres: {
            id: 'nnC874tjLWizL2l9',
            name: 'postgres_supabase'
          }
        }
      },
      {
        parameters: {
          respondWith: 'allIncomingItems',
          options: {}
        },
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1.1,
        position: [640, 300],
        id: 'node-respond',
        name: 'Respond to Webhook'
      }
    ],
    connections: {
      Webhook: {
        main: [
          [{ node: 'Postgres Supabase', type: 'main', index: 0 }]
        ]
      },
      'Postgres Supabase': {
        main: [
          [{ node: 'Respond to Webhook', type: 'main', index: 0 }]
        ]
      }
    },
    settings: {
      executionOrder: 'v1'
    }
  };

  const createRes = await fetch('https://funnyeagle-n8n.cloudfy.live/api/v1/workflows', {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(wfPayload)
  });

  const createdData = await createRes.json();
  const createdWf = createdData.data || createdData;
  const tempWfId = createdWf.id;
  console.log('✓ Workflow criado com ID:', tempWfId);

  console.log('2. Ativando workflow temporário...');
  await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${tempWfId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });

  console.log('3. Chamando webhook para executar o SQL...');
  const webhookUrl = `https://funnyeagle-n8n.cloudfy.live/webhook/${webhookPath}`;
  const triggerRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run: true })
  });

  const triggerResult = await triggerRes.text();
  console.log('✓ Resposta do Webhook:', triggerResult);

  console.log('4. Deletando workflow temporário...');
  await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${tempWfId}`, {
    method: 'DELETE',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  console.log('✓ Workflow temporário removido com sucesso.');
}

runMigration().catch(console.error);
