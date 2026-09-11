import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bot, Power, Loader2, MessageSquare, 
  Send, User, Search, PauseCircle, PlayCircle
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'client' | 'bot' | 'human';
  text: string;
  timestamp: string;
}

export interface ChatConversation {
  phone: string;
  name: string;
  paused: boolean;
  paused_at?: string | null;
  last_message?: string;
  last_sender?: 'client' | 'bot' | 'human';
  updated_at: string;
  messages: ChatMessage[];
}

export default function AgentManager() {
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Estado das Conversas (Espelho WhatsApp)
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualMessage, setManualMessage] = useState('');
  const [sendingManual, setSendingManual] = useState(false);
  const [togglingChatPause, setTogglingChatPause] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBotStatus();
    loadConversations();
    
    // Inscrever-se para atualizações em tempo real na tabela settings
    const subscription = supabase
      .channel('bot_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload) => {
        const item = (payload.new || payload.old) as any;
        if (!item || !item.key) return;

        // Status geral do bot
        if (item.key === 'bot_active') {
          setIsActive(Boolean(item.value));
          if (item.updated_at) {
            setLastUpdated(new Date(item.updated_at).toLocaleTimeString('pt-BR'));
          }
        }

        // Espelho de conversas
        if (typeof item.key === 'string' && item.key.startsWith('chat_conversation_')) {
          if (payload.eventType === 'DELETE') {
            const rawPhone = item.key.replace('chat_conversation_', '');
            setConversations(prev => prev.filter(c => c.phone !== rawPhone));
          } else if (item.value) {
            const conv = item.value as ChatConversation;
            setConversations(prev => {
              const exists = prev.some(c => c.phone === conv.phone);
              if (exists) {
                return prev.map(c => c.phone === conv.phone ? conv : c)
                  .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
              }
              return [conv, ...prev];
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Auto-scroll ao receber nova mensagem
  useEffect(() => {
    if (selectedPhone && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedPhone, conversations]);

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
          setLastUpdated(new Date(data.updated_at).toLocaleTimeString('pt-BR'));
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

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value, updated_at')
        .like('key', 'chat_conversation_%');

      if (error) throw error;

      if (data) {
        const parsed: ChatConversation[] = data
          .map(d => d.value)
          .filter(Boolean)
          .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());

        setConversations(parsed);
        if (parsed.length > 0 && !selectedPhone) {
          setSelectedPhone(parsed[0].phone);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar conversas do espelho:', err);
    } finally {
      setLoadingConversations(false);
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
      setLastUpdated(new Date(nowIso).toLocaleTimeString('pt-BR'));
    } catch (err) {
      console.error('Erro ao alternar bot:', err);
      alert('Não foi possível alterar o status do agente no banco de dados.');
    } finally {
      setUpdating(false);
    }
  };

  const toggleChatPause = async (phone: string, currentPaused: boolean) => {
    setTogglingChatPause(true);
    try {
      const convKey = `chat_conversation_${phone}`;
      const conv = conversations.find(c => c.phone === phone);
      if (!conv) return;

      const newPaused = !currentPaused;
      const updatedValue: ChatConversation = {
        ...conv,
        paused: newPaused,
        paused_at: newPaused ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('settings')
        .upsert({
          key: convKey,
          value: updatedValue,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;

      setConversations(prev => prev.map(c => c.phone === phone ? updatedValue : c));
    } catch (err) {
      console.error('Erro ao alternar pausa do chat:', err);
      alert('Erro ao atualizar pausa deste chat.');
    } finally {
      setTogglingChatPause(false);
    }
  };

  const sendManualMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPhone || !manualMessage.trim() || sendingManual) return;

    const messageText = manualMessage.trim();
    setSendingManual(true);
    setManualMessage('');

    try {
      const conv = conversations.find(c => c.phone === selectedPhone);
      const convKey = `chat_conversation_${selectedPhone}`;
      const nowIso = new Date().toISOString();

      const newMsg: ChatMessage = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sender: 'human',
        text: messageText,
        timestamp: nowIso
      };

      const updatedMessages = [...(conv?.messages || []), newMsg].slice(-100);

      const updatedConv: ChatConversation = {
        phone: selectedPhone,
        name: conv?.name || 'Cliente',
        paused: true, // Ao enviar mensagem manual, pausa automaticamente a IA para evitar choque
        paused_at: conv?.paused ? conv.paused_at : nowIso,
        last_message: messageText,
        last_sender: 'human',
        updated_at: nowIso,
        messages: updatedMessages
      };

      // Grava no espelho
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: convKey,
          value: updatedConv,
          updated_at: nowIso
        }, { onConflict: 'key' });

      if (error) throw error;

      setConversations(prev => prev.map(c => c.phone === selectedPhone ? updatedConv : c));

      // Dispara envio real para o WhatsApp via Netlify Function / n8n
      fetch('/.netlify/functions/whatsapp-send-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedPhone,
          message: messageText
        })
      }).catch(err => console.warn('Aviso envio WhatsApp:', err));

    } catch (err) {
      console.error('Erro ao enviar mensagem manual:', err);
      alert('Falha ao registrar mensagem manual.');
    } finally {
      setSendingManual(false);
    }
  };

  const selectedConversation = conversations.find(c => c.phone === selectedPhone);

  const filteredConversations = conversations.filter(c => {
    const term = searchTerm.toLowerCase();
    return (c.name || '').toLowerCase().includes(term) || (c.phone || '').includes(term);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
        <span className="text-xs font-mono text-stone-500">Sincronizando com a Giovanna...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-7xl">
      {/* Topo / Header Minimalista de Controle */}
      <div className="bg-white rounded-xl border border-stone-200/80 px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Identificação da IA */}
        <div className="flex items-center gap-3">
          <div className={`relative w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
            isActive 
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
              : 'bg-amber-50 text-amber-600 border border-amber-200'
          }`}>
            <Bot size={22} className={updating ? "animate-pulse" : ""} />
            <span 
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`} 
              title={isActive ? "IA Conectada" : "IA Pausada"}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
                Giovanna
              </h2>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {isActive ? 'Ativa' : 'Pausada Global'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono">
              <span>{conversations.length} {conversations.length === 1 ? 'conversa' : 'conversas'}</span>
              {lastUpdated && (
                <>
                  <span>•</span>
                  <span>Atualizado às {lastUpdated}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Botão Master Simples */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleBot}
            disabled={updating}
            className={`px-3.5 py-2 rounded-lg font-medium text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
              isActive 
                ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Power size={14} className={updating ? "animate-spin" : ""} />
            {updating 
              ? 'Salvando...' 
              : (isActive ? 'Pausar IA Geral' : 'Ativar IA Geral')}
          </button>
        </div>
      </div>

      {/* Espelho de Conversas estilo ADO / WhatsApp Minimalista */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden flex flex-col md:flex-row h-[calc(100vh-210px)] min-h-[580px] max-h-[720px]">
        {/* Coluna Esquerda: Lista de Conversas (Alta Densidade) */}
        <div className="w-full md:w-72 lg:w-80 border-r border-stone-200 flex flex-col h-full bg-stone-50/50">
          {/* Busca Limpa Compacta */}
          <div className="p-2 border-b border-stone-200/80 bg-white shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar conversa ou telefone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 text-xs bg-stone-100/80 rounded-md border border-transparent focus:border-stone-300 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Lista de Contatos Alta Densidade com Scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100/80">
            {loadingConversations ? (
              <div className="p-6 text-center text-xs font-mono text-stone-400 flex flex-col items-center gap-1.5">
                <Loader2 size={15} className="animate-spin text-stone-400" />
                Carregando conversas...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400">
                Nenhuma conversa no momento.
              </div>
            ) : (
              filteredConversations.map(c => {
                const isSelected = selectedPhone === c.phone;
                return (
                  <button
                    key={c.phone}
                    onClick={() => setSelectedPhone(c.phone)}
                    className={`w-full text-left px-2.5 py-1.5 transition-colors flex items-center gap-2.5 cursor-pointer ${
                      isSelected 
                        ? 'bg-amber-50/90 border-l-2 border-amber-500' 
                        : 'hover:bg-stone-100/60 bg-white'
                    }`}
                  >
                    <div className="relative w-7 h-7 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-[11px] shrink-0 border border-stone-200">
                      {c.name ? c.name.charAt(0).toUpperCase() : <User size={12} />}
                      <span 
                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${c.paused ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        title={c.paused ? "IA Pausada neste chat" : "IA Ativa"}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 leading-none mb-0.5">
                        <span className="font-semibold text-xs text-stone-900 truncate">
                          {c.name || c.phone}
                        </span>
                        <span className="text-[9px] font-mono text-stone-400 shrink-0">
                          {c.updated_at ? new Date(c.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1.5">
                        <p className="text-[11px] text-stone-500 truncate leading-tight">
                          {c.last_sender === 'bot' && <span className="text-emerald-600 font-medium">IA: </span>}
                          {c.last_sender === 'human' && <span className="text-blue-600 font-medium">Você: </span>}
                          {c.last_message || 'Iniciou conversa'}
                        </p>
                        {c.paused && (
                          <span className="shrink-0 text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800">
                            Pausa
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Direita: Painel do Chat */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col h-full bg-[#f9f9fb]">
            {/* Topo do Chat Selecionado */}
            <div className="px-3 py-2 bg-white border-b border-stone-200 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0 border border-stone-200">
                  {selectedConversation.name ? selectedConversation.name.charAt(0).toUpperCase() : <User size={12} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 leading-none mb-0.5">
                    <h3 className="font-bold text-xs text-stone-900 truncate">
                      {selectedConversation.name || 'Cliente'}
                    </h3>
                    <span className="text-[10px] font-mono text-stone-400">
                      {selectedConversation.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] leading-none">
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedConversation.paused ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <span className={selectedConversation.paused ? 'text-amber-700 font-medium' : 'text-emerald-700 font-medium'}>
                      {selectedConversation.paused ? 'IA pausada neste chat' : 'IA respondendo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão de Pausa Individual Discreto */}
              <button
                onClick={() => toggleChatPause(selectedConversation.phone, Boolean(selectedConversation.paused))}
                disabled={togglingChatPause}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium flex items-center gap-1 transition-all cursor-pointer ${
                  selectedConversation.paused
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                }`}
                title={selectedConversation.paused ? "Retomar respostas automáticas da IA" : "Pausar IA neste chat para atender manualmente"}
              >
                {selectedConversation.paused ? (
                  <>
                    <PlayCircle size={12} />
                    Retomar IA
                  </>
                ) : (
                  <>
                    <PauseCircle size={12} />
                    Assumir Chat
                  </>
                )}
              </button>
            </div>

            {/* Mensagens com Balões Limpos Compactos */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                selectedConversation.messages.map((m, idx) => {
                  const isClient = m.sender === 'client';
                  const isBot = m.sender === 'bot';
                  const isHuman = m.sender === 'human';

                  return (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1 mb-0.5 px-1 text-[9px] font-mono text-stone-400">
                        {isClient && <span>{selectedConversation.name || 'Cliente'}</span>}
                        {isBot && <span className="text-emerald-700 font-medium">Giovanna</span>}
                        {isHuman && <span className="text-blue-700 font-medium">Você</span>}
                        <span>•</span>
                        <span>{new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`max-w-[78%] rounded-xl px-3 py-1.5 text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                          isClient
                            ? 'bg-white text-stone-800 border border-stone-200/80 rounded-tl-xs'
                            : isBot
                            ? 'bg-emerald-600 text-white rounded-tr-xs'
                            : 'bg-stone-900 text-white rounded-tr-xs'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-mono text-stone-400">
                  Nenhuma mensagem registrada ainda.
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de Envio de Mensagem Manual Compacto */}
            <form onSubmit={sendManualMessage} className="p-2 bg-white border-t border-stone-200 flex items-center gap-1.5 shrink-0">
              <input
                type="text"
                placeholder={selectedConversation.paused 
                  ? "Responder cliente no WhatsApp..." 
                  : "Responder cliente (pausa a IA neste chat automaticamente)..."}
                value={manualMessage}
                onChange={e => setManualMessage(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-stone-50 rounded-md border border-stone-200 focus:border-stone-400 focus:bg-white focus:outline-none transition-all font-sans"
              />
              <button
                type="submit"
                disabled={!manualMessage.trim() || sendingManual}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-md text-xs font-mono font-medium flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
              >
                {sendingManual ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                <span>Enviar</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-stone-400 bg-stone-50/20">
            <MessageSquare size={28} className="mb-1.5 text-stone-300" />
            <p className="text-xs">Selecione uma conversa para visualizar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
