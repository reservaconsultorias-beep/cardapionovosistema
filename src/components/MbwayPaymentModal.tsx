import React, { useState } from 'react';
import { Copy, Check, ExternalLink, ArrowRight, ShieldCheck, X, Smartphone, Send, Info } from 'lucide-react';
import { MBWAY_CONFIG } from '../config/mbwayConfig';

interface MbwayPaymentModalProps {
  orderId: number | null;
  total: number;
  trackingCode: string | null;
  whatsappUrl: string;
  onClose: () => void;
}

export default function MbwayPaymentModal({
  orderId,
  total,
  trackingCode,
  whatsappUrl,
  onClose
}: MbwayPaymentModalProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const effectiveAmount = Number(total || 0);
  const formattedAmount = effectiveAmount.toLocaleString('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  });

  const paymentReference = orderId ? `PEDIDO-${orderId}` : 'PEDIDO-41MENUS';

  const copyToClipboard = async (text: string, type: 'phone' | 'ref') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      if (type === 'phone') {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      } else {
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2000);
      }
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  return (
    <div className="w-full flex flex-col items-center text-center font-sans select-none">
      {/* Top Header: Badge + Botão Fechar */}
      <div className="w-full flex items-center justify-between pb-2.5 border-b border-stone-100">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold">
          <Smartphone size={12} className="text-red-600" />
          <span>Pedido {orderId ? `#${orderId}` : ''} Registado</span>
        </div>
        
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
          title="Fechar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Título e Valor em Destaque */}
      <div className="w-full my-3 p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between">
        <div className="text-left">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
            Forma de Pagamento
          </span>
          <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight flex items-center gap-1 mt-0.5">
            Pague com <span className="text-[#005CA9] font-black">MB</span><span className="text-[#E31B23] font-black">WAY</span>
          </h2>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
            Total a Transferir
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono text-stone-900 tracking-tight">
            {formattedAmount}
          </span>
        </div>
      </div>

      {/* Instrução Clara de Enviar Dinheiro */}
      <div className="w-full bg-blue-50/70 border border-blue-200/70 rounded-xl px-3 py-2 text-left flex items-start gap-2 mb-3">
        <Send size={15} className="text-[#005CA9] shrink-0 mt-0.5" />
        <p className="text-[11px] text-blue-950 leading-relaxed">
          Abra o seu aplicativo <strong>MB WAY</strong>, selecione <strong>"Enviar Dinheiro"</strong> e transfira para os dados abaixo:
        </p>
      </div>

      {/* Cards de Cópia: Telemóvel e Referência */}
      <div className="w-full grid grid-cols-2 gap-2 text-left mb-3">
        {/* Telemóvel */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-2.5 flex flex-col justify-between">
          <div>
            <span className="block text-[9.5px] font-bold text-stone-500 uppercase tracking-wider">
              Telemóvel MB WAY
            </span>
            <span className="block text-xs sm:text-sm font-mono font-black text-stone-900 mt-0.5 truncate">
              {MBWAY_CONFIG.telefoneRecebedorFormatado}
            </span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(MBWAY_CONFIG.telefoneRecebedor, 'phone')}
            className={`mt-2 w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs ${
              copiedPhone
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-900 hover:bg-black text-white'
            }`}
          >
            {copiedPhone ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedPhone ? 'Copiado!' : 'Copiar Telemóvel'}</span>
          </button>
        </div>

        {/* Referência */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-2.5 flex flex-col justify-between">
          <div>
            <span className="block text-[9.5px] font-bold text-stone-500 uppercase tracking-wider">
              Descrição / Ref
            </span>
            <span className="block text-xs sm:text-sm font-mono font-black text-stone-900 mt-0.5 truncate">
              {paymentReference}
            </span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(paymentReference, 'ref')}
            className={`mt-2 w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs ${
              copiedRef
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-200 hover:bg-stone-300 text-stone-800'
            }`}
          >
            {copiedRef ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedRef ? 'Copiado!' : 'Copiar Ref'}</span>
          </button>
        </div>
      </div>

      {/* Aviso de Preparo no Forno */}
      <div className="w-full bg-emerald-50/80 border border-emerald-200 rounded-xl px-3 py-2 text-left flex items-center gap-2 mb-3.5">
        <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
        <p className="text-[10.5px] text-emerald-950 leading-tight">
          O seu pedido já está <strong>em preparo no forno</strong>! Após fazer a transferência, confirme pelo WhatsApp.
        </p>
      </div>

      {/* Botões de Ação */}
      <div className="w-full flex flex-col gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-xs transition-all active:scale-[0.98]"
        >
          <span>Enviar Comprovativo no WhatsApp</span>
          <ArrowRight size={15} />
        </a>

        <div className="flex items-center gap-2 w-full mt-0.5">
          {trackingCode && (
            <a
              href={`/track/${trackingCode}`}
              className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-all"
            >
              <ExternalLink size={12} />
              <span>Acompanhar Pedido</span>
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-stone-200 hover:bg-stone-50 text-stone-600 font-bold py-2 px-3 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
