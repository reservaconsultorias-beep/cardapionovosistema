import React, { useState } from 'react';
import { Copy, Check, ExternalLink, ArrowRight, ShieldCheck, X, Smartphone } from 'lucide-react';
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

  // URL para geração dinâmica de QR Code visual preto oficial do 41 Menus
  const qrPayload = `MBWAY:${MBWAY_CONFIG.telefoneRecebedor}|VALOR:${effectiveAmount.toFixed(2)}|REF:${paymentReference}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrPayload)}&color=000000&bgcolor=ffffff`;

  return (
    <div className="w-full flex flex-col items-center text-center font-sans select-none">
      {/* Top Header: Badge + Botão Fechar */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-stone-100">
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
          <X size={17} />
        </button>
      </div>

      {/* Título e Valor a Transferir */}
      <div className="w-full mt-2 flex items-center justify-between px-1">
        <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight flex items-center gap-1">
          Pague com <span className="text-[#005CA9] font-black">MB</span><span className="text-[#E31B23] font-black">WAY</span>
        </h2>
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Total:</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-stone-900 tracking-tight">
            {formattedAmount}
          </span>
        </div>
      </div>

      {/* QR Code Compacto e Nítido */}
      <div className="my-2.5 flex flex-col items-center">
        <div className="p-2 bg-white rounded-xl border border-stone-200 shadow-xs flex items-center justify-center">
          <img
            src={qrCodeUrl}
            alt="QR Code MB WAY do Pedido"
            className="w-32 h-32 sm:w-36 sm:h-36 object-contain rounded"
          />
        </div>
        <p className="text-[10.5px] text-stone-500 mt-1">
          Aponte a câmara ou app MB WAY para pagar
        </p>
      </div>

      {/* Bloco Copiar Telemóvel e Referência em 2 Colunas (Sem rolagem) */}
      <div className="w-full grid grid-cols-2 gap-2 text-left mb-2.5">
        {/* Coluna 1: Telemóvel */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-2 flex flex-col justify-between">
          <div>
            <span className="block text-[9.5px] font-bold text-stone-500 uppercase tracking-wider">
              Telemóvel
            </span>
            <span className="block text-xs font-mono font-bold text-stone-900 mt-0.5 truncate">
              {MBWAY_CONFIG.telefoneRecebedorFormatado}
            </span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(MBWAY_CONFIG.telefoneRecebedor, 'phone')}
            className={`mt-1.5 w-full py-1 px-2 rounded-lg text-[10.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              copiedPhone
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-900 hover:bg-black text-white'
            }`}
          >
            {copiedPhone ? <Check size={12} /> : <Copy size={12} />}
            <span>{copiedPhone ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>

        {/* Coluna 2: Referência */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-2 flex flex-col justify-between">
          <div>
            <span className="block text-[9.5px] font-bold text-stone-500 uppercase tracking-wider">
              Referência
            </span>
            <span className="block text-xs font-mono font-bold text-stone-900 mt-0.5 truncate">
              {paymentReference}
            </span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(paymentReference, 'ref')}
            className={`mt-1.5 w-full py-1 px-2 rounded-lg text-[10.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              copiedRef
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-200 hover:bg-stone-300 text-stone-800'
            }`}
          >
            {copiedRef ? <Check size={12} /> : <Copy size={12} />}
            <span>{copiedRef ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {/* Nota Compacta de Preparo */}
      <div className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-left flex items-center gap-2 mb-3">
        <ShieldCheck size={15} className="text-stone-900 shrink-0" />
        <p className="text-[10px] text-stone-600 leading-tight">
          O pedido já está <strong>em preparo</strong>. Envie o valor e confirme via WhatsApp.
        </p>
      </div>

      {/* Ações: WhatsApp Principal + Linha Secundária */}
      <div className="w-full flex flex-col gap-1.5">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-xs transition-all active:scale-[0.98]"
        >
          <span>Enviar pedido e comprovativo via WhatsApp</span>
          <ArrowRight size={14} />
        </a>

        <div className="flex items-center gap-2 w-full mt-0.5">
          {trackingCode && (
            <a
              href={`/track/${trackingCode}`}
              className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 text-[11px] transition-all"
            >
              <ExternalLink size={11} />
              <span>Acompanhar</span>
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-stone-200 hover:bg-stone-50 text-stone-600 font-bold py-1.5 px-2.5 rounded-lg text-[11px] transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
