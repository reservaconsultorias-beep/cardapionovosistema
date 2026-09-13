import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bot, Power, Loader2, MessageSquare, 
  Send, User, Search, PauseCircle, PlayCircle, X
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

  // Estado das Conversas (Espelho WhatsApp Relacional)
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const selectedPhoneRef = useRef<string | null>(null);

  // Mensagens da conversa atualmente aberta (limite de 20)
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [manualMessage, setManualMessage] = useState('');
  const [sendingManual, setSendingManual] = useState(false);
  const [togglingChatPause, setTogglingChatPause] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mantém a ref sincronizada com o estado para o listener do Realtime
  useEffect(() => {
    selectedPhoneRef.current = selectedPhone;
  }, [selectedPhone]);

  useEffect(() => {
    fetchBotStatus();
    loadConversations();
    
    // Inscrever-se para atualizações em tempo real (Settings, Conversas e Mensagens)
    const subscription = supabase
      .channel('chat_agent_realtime_v2')
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

        // Espelho de conversas via settings (fallback)
        if (typeof item.key === 'string' && item.key.startsWith('chat_conversation_')) {
          if (payload.eventType === 'DELETE') {
            const rawPhone = item.key.replace('chat_conversation_', '');
            setConversations(prev => prev.filter(c => c.phone !== rawPhone));
          } else if (item.value) {
            const conv = item.value as ChatConversation;
            setConversations(prev => {
              const exists = prev.some(c => c.phone === conv.phone);
              if (exists) {
                return prev.map(c => c.phone === conv.phone ? { ...c, ...conv } : c)
                  .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
              }
              return [conv, ...prev];
            });

            if (selectedPhoneRef.current === conv.phone && Array.isArray(conv.messages)) {
              setActiveMessages(conv.messages.slice(-20));
            }
          }
        }
      })
      // Ouvinte na tabela relacional de conversas
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const deletedPhone = (payload.old as any)?.phone;
          if (deletedPhone) {
            setConversations(prev => prev.filter(c => c.phone !== deletedPhone));
            if (selectedPhoneRef.current === deletedPhone) {
              setSelectedPhone(null);
              setActiveMessages([]);
            }
          }
        } else if (payload.new) {
          const newConv = payload.new as any;
          setConversations(prev => {
            const exists = prev.some(c => c.phone === newConv.phone);
            if (exists) {
              return prev.map(c => c.phone === newConv.phone ? {
                ...c,
                name: newConv.name || c.name,
                paused: Boolean(newConv.paused),
                paused_at: newConv.paused_at,
                last_message: newConv.last_message || c.last_message,
                last_sender: newConv.last_sender || c.last_sender,
                updated_at: newConv.updated_at || new Date().toISOString()
              } : c).sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
            }
            return [{
              phone: newConv.phone,
              name: newConv.name || 'Cliente',
              paused: Boolean(newConv.paused),
              paused_at: newConv.paused_at,
              last_message: newConv.last_message,
              last_sender: newConv.last_sender,
              updated_at: newConv.updated_at || new Date().toISOString(),
              messages: []
            }, ...prev];
          });
        }
      })
      // Ouvinte na tabela relacional de mensagens (Histórico contínuo sem sobrescrever)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const newMsg = payload.new as any;
        if (!newMsg) return;

        // Se for da conversa aberta na tela, adiciona imediatamente
        if (selectedPhoneRef.current === newMsg.phone) {
          setActiveMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              sender: newMsg.sender as 'client' | 'bot' | 'human',
              text: newMsg.text,
              timestamp: newMsg.created_at || new Date().toISOString()
            }].slice(-20);
          });
        }

        // Atualiza prévia e sobe a conversa para o topo da barra lateral
        setConversations(prev => {
          return prev.map(c => c.phone === newMsg.phone ? {
            ...c,
            last_message: newMsg.text,
            last_sender: newMsg.sender,
            updated_at: newMsg.created_at || new Date().toISOString()
          } : c).sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Carrega as últimas 20 mensagens quando uma conversa é selecionada
  useEffect(() => {
    if (selectedPhone) {
      loadMessagesForPhone(selectedPhone);
    } else {
      setActiveMessages([]);
    }
  }, [selectedPhone]);

  // Auto-scroll ao receber nova mensagem ou trocar de conversa
  useEffect(() => {
    if (selectedPhone && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedPhone, activeMessages]);

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
      // 1. Tenta carregar da tabela relacional chat_conversations
      const { data: convData, error: convErr } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!convErr && convData && convData.length > 0) {
        const parsed: ChatConversation[] = convData.map(c => ({
          phone: c.phone,
          name: c.name || 'Cliente',
          paused: Boolean(c.paused),
          paused_at: c.paused_at,
          last_message: c.last_message,
          last_sender: c.last_sender,
          updated_at: c.updated_at,
          messages: []
        }));

        setConversations(parsed);
        if (!selectedPhone && parsed.length > 0) {
          setSelectedPhone(parsed[0].phone);
        }
        return;
      }

      // 2. Fallback: carregar da tabela settings
      const { data: settingsData, error: settingsErr } = await supabase
        .from('settings')
        .select('key, value, updated_at')
        .like('key', 'chat_conversation_%');

      if (settingsErr) throw settingsErr;

      if (settingsData) {
        const parsed: ChatConversation[] = settingsData
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

  const loadMessagesForPhone = async (phone: string) => {
    if (!phone) return;
    setLoadingMessages(true);
    try {
      // 1. Tenta carregar da tabela relacional chat_messages (últimas 20 mensagens)
      const { data: msgData, error: msgErr } = await supabase
        .from('chat_messages')
        .select('id, sender, text, created_at')
        .eq('phone', phone)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!msgErr && msgData && msgData.length > 0) {
        // Inverter para ordem cronológica (mais antiga -> mais nova)
        const chronMsgs: ChatMessage[] = msgData.reverse().map(m => ({
          id: m.id,
          sender: m.sender as 'client' | 'bot' | 'human',
          text: m.text,
          timestamp: m.created_at
        }));
        setActiveMessages(chronMsgs);
        return;
      }

      // 2. Fallback: carregar do array salvo no settings
      const conv = conversations.find(c => c.phone === phone);
      if (conv && Array.isArray(conv.messages) && conv.messages.length > 0) {
        setActiveMessages(conv.messages.slice(-20));
      } else {
        setActiveMessages([]);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setLoadingMessages(false);
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
    const newPaused = !currentPaused;
    const nowIso = new Date().toISOString();

    try {
      // 1. Tenta atualizar na tabela relacional chat_conversations
      try {
        await supabase
          .from('chat_conversations')
          .update({
            paused: newPaused,
            paused_at: newPaused ? nowIso : null,
            updated_at: nowIso
          })
          .eq('phone', phone);
      } catch (e) {
        console.warn('Aviso relacional toggle:', e);
      }

      // 2. Atualiza settings (fallback)
      const convKey = `chat_conversation_${phone}`;
      const conv = conversations.find(c => c.phone === phone);
      if (conv) {
        const updatedValue: ChatConversation = {
          ...conv,
          paused: newPaused,
          paused_at: newPaused ? nowIso : null,
          updated_at: nowIso
        };

        await supabase
          .from('settings')
          .upsert({
            key: convKey,
            value: updatedValue,
            updated_at: nowIso
          }, { onConflict: 'key' });

        setConversations(prev => prev.map(c => c.phone === phone ? updatedValue : c));
      }
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
    const nowIso = new Date().toISOString();

    const optimisticMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      sender: 'human',
      text: messageText,
      timestamp: nowIso
    };

    // Atualização otimista na tela (mantendo limite de 20)
    setActiveMessages(prev => [...prev, optimisticMsg].slice(-20));

    try {
      // 1. Grava na tabela relacional chat_messages e chat_conversations
      try {
        await supabase
          .from('chat_messages')
          .insert({
            phone: selectedPhone,
            sender: 'human',
            text: messageText
          });

        await supabase
          .from('chat_conversations')
          .upsert({
            phone: selectedPhone,
            last_message: messageText,
            last_sender: 'human',
            paused: true,
            paused_at: nowIso,
            updated_at: nowIso
          }, { onConflict: 'phone' });
      } catch (relErr) {
        console.warn('Aviso gravação relacional manual:', relErr);
      }

      // 2. Grava no settings (fallback de compatibilidade)
      const conv = conversations.find(c => c.phone === selectedPhone);
      const convKey = `chat_conversation_${selectedPhone}`;
      const updatedMessages = [...(conv?.messages || []), optimisticMsg].slice(-20);

      const updatedConv: ChatConversation = {
        phone: selectedPhone,
        name: conv?.name || 'Cliente',
        paused: true,
        paused_at: conv?.paused ? conv.paused_at : nowIso,
        last_message: messageText,
        last_sender: 'human',
        updated_at: nowIso,
        messages: updatedMessages
      };

      await supabase
        .from('settings')
        .upsert({
          key: convKey,
          value: updatedConv,
          updated_at: nowIso
        }, { onConflict: 'key' });

      setConversations(prev => prev.map(c => c.phone === selectedPhone ? updatedConv : c)
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()));

      // 3. Dispara envio real para o WhatsApp via Netlify Function
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

  const deleteConversation = async (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    
    if (!window.confirm('Tem certeza que deseja excluir esta conversa?')) return;

    try {
      // 1. Exclui de chat_conversations e chat_messages
      try {
        await supabase.from('chat_conversations').delete().eq('phone', phone);
        await supabase.from('chat_messages').delete().eq('phone', phone);
      } catch (relErr) {
        console.warn('Aviso delete relacional:', relErr);
      }

      // 2. Exclui de settings (fallback)
      const convKey = `chat_conversation_${phone}`;
      await supabase
        .from('settings')
        .delete()
        .eq('key', convKey);

      setConversations(prev => prev.filter(c => c.phone !== phone));
      
      if (selectedPhone === phone) {
        setSelectedPhone(null);
        setActiveMessages([]);
      }
    } catch (err) {
      console.error('Erro ao excluir conversa:', err);
      alert('Erro ao excluir a conversa.');
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
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden flex flex-col md:flex-row h-[calc(100vh-230px)] min-h-[400px]">
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
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] font-mono text-stone-400">
                            {c.updated_at ? new Date(c.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                          <button
                            onClick={(e) => deleteConversation(e, c.phone)}
                            className="text-stone-300 hover:text-red-500 hover:bg-red-50 p-0.5 rounded transition-colors"
                            title="Excluir conversa"
                          >
                            <X size={12} />
                          </button>
                        </div>
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
          <div className="flex-1 flex flex-col h-full bg-[#efeae2]">
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

            {/* Mensagens com Balões Padrão WhatsApp (Compacto) */}
            <div className="flex-1 p-3 overflow-y-auto space-y-1.5 relative" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")', opacity: 0.9 }}>
              {loadingMessages ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-stone-400 relative z-10">
                  <Loader2 size={18} className="animate-spin text-amber-500" />
                  <span className="text-xs font-mono">Carregando histórico...</span>
                </div>
              ) : activeMessages && activeMessages.length > 0 ? (
                activeMessages.map((m, idx) => {
                  const isClient = m.sender === 'client';
                  const isBot = m.sender === 'bot';
                  const isHuman = m.sender === 'human';

                  return (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`relative max-w-[85%] rounded-lg px-2 pt-1 pb-1.5 text-[12.5px] leading-snug shadow-sm ${
                          isClient
                            ? 'bg-white text-[#111b21] rounded-tl-sm'
                            : 'bg-[#d9fdd3] text-[#111b21] rounded-tr-sm'
                        }`}
                      >
                        {/* Nome do remetente interno */}
                        {!isClient && (
                          <div className={`text-[10.5px] font-medium mb-0.5 leading-none ${isBot ? 'text-emerald-600' : 'text-blue-500'}`}>
                            {isBot ? 'Giovanna' : 'Você'}
                          </div>
                        )}
                        {isClient && selectedConversation.name && (
                          <div className="text-[10.5px] font-medium mb-0.5 leading-none text-[#a80076]">
                            {selectedConversation.name}
                          </div>
                        )}

                        <div className="whitespace-pre-wrap">{m.text}</div>

                        {/* Horário (flutuando à direita inferior ou em linha) */}
                        <div className={`text-[9px] text-[#667781] text-right mt-0.5 -mb-0.5 ${m.text.length < 20 ? 'inline-block ml-3 translate-y-0.5' : 'block'}`}>
                          {m.timestamp ? new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center relative z-10">
                  <div className="bg-[#ffeecd] text-[#543b16] px-4 py-2 rounded-lg text-xs shadow-sm max-w-sm text-center">
                    Nenhuma mensagem registrada. As mensagens enviadas para este contato aparecerão aqui.
                  </div>
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
