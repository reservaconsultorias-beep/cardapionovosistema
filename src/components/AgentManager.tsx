import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bot, Power, AlertCircle, Loader2, CheckCircle2, MessageSquare, ShieldCheck, Zap } from 'lucide-react';

export default function AgentManager() {
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    fetchBotStatus();
    
    // Inscrever-se para atualizações em tempo real na tabela settings
    const subscription = supabase
      .channel('bot_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.bot_active' }, (payload) => {
        if (payload.new && 'value' in payload.new) {
          setIsActive(Boolean(payload.new.value));
          if (payload.new.updated_at) {
            setLastUpdated(new Date(payload.new.updated_at).toLocaleTimeString('pt-PT'));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchBotStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value, updated_at')
        .eq('key', 'bot_active')
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao buscar status do bot:', error);
        setIsActive(true);
      } else if (data) {
        setIsActive(Boolean(data.value));
        if (data.updated_at) {
          setLastUpdated(new Date(data.updated_at).toLocaleTimeString('pt-PT'));
        }
      } else {
        setIsActive(true);
      }
    } catch (err) {
      console.error('Exceção ao buscar status:', err);
      setIsActive(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleBot = async () => {
    if (isActive === null) return;
    
    setUpdating(true);
    const newStatus = !isActive;
    const nowIso = new Date().toISOString();
    
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          key: 'bot_active', 
          value: newStatus, 
          updated_at: nowIso
        }, { onConflict: 'key' });
        
      if (error) throw error;
      
      setIsActive(newStatus);
      setLastUpdated(new Date(nowIso).toLocaleTimeString('pt-PT'));
    } catch (err) {
      console.error('Erro ao alternar bot:', err);
      alert('Não foi possível alterar o status do agente no banco de dados.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
        <span className="text-xs font-mono text-stone-500">Sincronizando com a Giovanna...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Card Principal de Controle de Status */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
              isActive 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-xs' 
                : 'bg-amber-50 border-amber-200 text-amber-600'
            }`}>
              <Bot size={28} className={updating ? "animate-pulse" : ""} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                  Giovanna • Atendente Virtual com IA
                </h2>
                <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {isActive ? 'AUTOMÁTICO ATIVO' : 'PAUSADO (HUMANO)'}
                </span>
              </div>
              <p className="text-xs text-stone-500 font-mono mt-0.5">
                Controle de Human Handover • WhatsApp Integrado via n8n & Supabase
              </p>
            </div>
          </div>

          {lastUpdated && (
            <span className="text-[10px] font-mono text-stone-400 bg-stone-50 px-2 py-1 rounded border border-stone-100">
              Última alteração: {lastUpdated}
            </span>
          )}
        </div>

        {/* Bloco Central com Botão de Ação */}
        <div className="pt-6 pb-2 max-w-xl mx-auto text-center space-y-4">
          <div className={`p-4 rounded-xl border transition-all ${
            isActive 
              ? 'bg-emerald-50/50 border-emerald-100' 
              : 'bg-amber-50/50 border-amber-100'
          }`}>
            <h3 className="text-sm font-bold text-stone-900 font-mono">
              {isActive ? 'Robô Respondendo Clientes Automaticamente' : 'Robô Pausado — Controle Humano Ativado'}
            </h3>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              {isActive 
                ? 'A Giovanna está ativa no WhatsApp lendo mensagens, esclarecendo dúvidas, apresentando o cardápio e gerando pedidos direto no seu Gestor.' 
                : 'A automação está suspensa temporariamente. Você pode conversar diretamente com o cliente pelo WhatsApp sem o risco de respostas duplicadas ou conflitantes.'}
            </p>
          </div>

          <button
            onClick={toggleBot}
            disabled={updating}
            className={`w-full py-3 px-5 rounded-xl font-bold text-sm font-mono flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs ${
              isActive 
                ? 'bg-amber-500 hover:bg-amber-600 text-stone-950 hover:shadow-md' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md'
            }`}
          >
            <Power size={18} />
            {updating 
              ? 'Sincronizando com o n8n...' 
              : (isActive ? 'Pausar Giovanna (Falar com o Cliente no WhatsApp)' : 'Reativar Giovanna (Atendimento Automático)')}
          </button>

          {!isActive && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200/80 text-amber-900 p-3 rounded-lg text-xs font-mono text-left">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
              <p>
                <strong>Importante:</strong> Ao concluir a conversa manual com o cliente, lembre-se de clicar em <em>Reativar Giovanna</em> para que os próximos clientes continuem sendo atendidos automaticamente.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cards Informativos — Voltados ao Cliente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={16} className="text-stone-700" />
            <h4 className="text-xs font-bold font-mono text-stone-900 uppercase tracking-wider">Como funciona o botão</h4>
          </div>
          <div className="text-xs text-stone-600 leading-relaxed space-y-2">
            <p>O botão funciona como uma chave de segurança que controla o fluxo de mensagens em tempo real:</p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-bold">✓</span>
                <p><strong className="text-stone-900">LIGADO:</strong> Cada nova mensagem do cliente passa pela checagem do sistema e é liberada para o robô responder automaticamente.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[9px] font-bold">✕</span>
                <p><strong className="text-stone-900">DESLIGADO:</strong> O sistema bloqueia a mensagem antes de chegar ao robô. As automações param na hora e o atendimento fica 100% sob controle humano.</p>
              </div>
            </div>
            <p className="text-stone-500 italic text-[11px] pt-1 border-t border-stone-100">
              A verificação é feita individualmente a cada mensagem recebida. Se você desligar a chave enquanto o cliente estiver digitando, a próxima resposta dele já não acionará o atendente virtual.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-amber-600" />
            <h4 className="text-xs font-bold font-mono text-stone-900 uppercase tracking-wider">Horário de Funcionamento</h4>
          </div>
          <div className="text-xs text-stone-600 leading-relaxed space-y-2">
            <p>A Giovanna respeita automaticamente os horários configurados na aba <strong className="text-stone-900">Configurações → Horários</strong>.</p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-emerald-600" />
                <p><strong className="text-stone-900">Dentro do horário:</strong> Atende normalmente, anota pedidos e envia para a cozinha.</p>
              </div>
              <div className="flex items-start gap-2">
                <MessageSquare size={13} className="shrink-0 mt-0.5 text-amber-600" />
                <p><strong className="text-stone-900">Fora do horário:</strong> Informa educadamente que está fechado, comunica quando abre e envia o cardápio.</p>
              </div>
            </div>
            <p className="text-stone-500 italic text-[11px] pt-1 border-t border-stone-100">
              Exemplo: Se domingo estiver aberto das 12h às 22h30, qualquer mensagem recebida nesse intervalo será atendida. Fora dele, a Giovanna responde automaticamente que a loja está fechada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
