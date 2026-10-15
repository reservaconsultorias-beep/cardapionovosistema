import React, { useState } from 'react';
import { Copy, Check, ExternalLink, ArrowRight, ShieldCheck, Clock, X, Smartphone } from 'lucide-react';
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
        setTimeout(() => setCopiedPhone(false), 2500);
      } else {
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2500);
      }
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  // URL para geração dinâmica de QR Code visual com as informações do pagamento
  const qrPayload = `MBWAY:${MBWAY_CONFIG.telefoneRecebedor}|VALOR:${effectiveAmount.toFixed(2)}|REF:${paymentReference}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrPayload)}&color=083d07`;

  return (
    <div className="w-full flex flex-col items-center text-center font-sans relative">
      {/* Botão fechar */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-0 right-0 p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
        title="Fechar"
      >
        <X size={18} />
      </button>

      {/* Header com Logo MB WAY e Valor em Euros */}
      <div className="w-full pb-4 border-b border-stone-100 flex flex-col items-center pr-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold mb-2">
          <Smartphone size={13} className="text-red-600" />
          <span>Pedido {orderId ? `#${orderId}` : ''} Registado</span>
        </div>
        
        <h2 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
          Pague com <span className="text-[#005CA9] font-black">MB</span><span className="text-[#E31B23] font-black">WAY</span>
        </h2>
        <div className="mt-2 flex items-baseline justify-center gap-1.5">
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total a transferir:</span>
          <span className="text-2xl font-black font-mono text-[#083d07]">
            {formattedAmount}
          </span>
        </div>
      </div>

      {/* Área do QR Code MB WAY */}
      <div className="my-4 flex flex-col items-center">
        <div className="p-3 bg-white rounded-2xl border-2 border-stone-200 shadow-sm relative flex items-center justify-center min-w-[210px] min-h-[210px]">
          <img
            src={qrCodeUrl}
            alt="QR Code MB WAY do Pedido"
            className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
          />
        </div>
        <p className="text-[11px] text-stone-500 mt-2">
          Aponte a câmara ou a app MB WAY para o código
        </p>
      </div>

      {/* Bloco Copiar Telemóvel e Referência */}
      <div className="w-full max-w-sm space-y-3">
        {/* Telemóvel */}
        <div>
          <label className="block text-left text-xs font-bold text-stone-700 mb-1">
            Telemóvel do Restaurante (MB WAY):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={MBWAY_CONFIG.telefoneRecebedorFormatado}
              className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 font-mono font-bold select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(MBWAY_CONFIG.telefoneRecebedor, 'phone')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer ${
                copiedPhone
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#083d07] hover:bg-[#0b520a] text-white'
              }`}
            >
              {copiedPhone ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedPhone ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Descrição / Referência */}
        <div>
          <label className="block text-left text-xs font-bold text-stone-700 mb-1">
            Descrição / Referência da transferência:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={paymentReference}
              className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 font-mono select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(paymentReference, 'ref')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer ${
                copiedRef
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-200 hover:bg-stone-300 text-stone-800'
              }`}
            >
              {copiedRef ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedRef ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Instruções de Pagamento PT-PT */}
      <div className="w-full max-w-sm mt-4 p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-left space-y-2 text-xs text-stone-600">
        <div className="flex items-center gap-1.5 font-bold text-stone-800 text-[11px] uppercase tracking-wider">
          <ShieldCheck size={14} className="text-[#083d07]" />
          <span>Como pagar via MB WAY:</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-stone-600 pl-0.5">
          <li>Abra a sua aplicação <strong>MB WAY</strong> (ou do seu banco).</li>
          <li>Selecione <strong>"Enviar Dinheiro"</strong>.</li>
          <li>Introduza o telemóvel: <strong>{MBWAY_CONFIG.telefoneRecebedorFormatado}</strong> ({MBWAY_CONFIG.nomeTitular}).</li>
          <li>Introduza o valor de <strong>{formattedAmount}</strong> e na mensagem coloque <strong>{paymentReference}</strong>.</li>
          <li>Após concluir, clique no botão verde abaixo para enviar o pedido e o comprovativo via WhatsApp!</li>
        </ol>
        <div className="pt-2 border-t border-stone-200/80 flex items-start gap-2 text-[11px] text-amber-900 bg-amber-50/80 p-2 rounded-lg">
          <Clock size={13} className="text-amber-700 shrink-0 mt-0.5" />
          <span>
            <strong>Nota:</strong> O pedido entrará em forno/preparação após a validação do comprovativo pela equipa da pizzaria.
          </span>
        </div>
      </div>

      {/* Ações Finais: WhatsApp & Acompanhar Pedido */}
      <div className="w-full max-w-sm flex flex-col gap-2 mt-5">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-all active:scale-[0.98]"
        >
          <span>Enviar pedido e comprovativo via WhatsApp</span>
          <ArrowRight size={15} />
        </a>

        {trackingCode && (
          <a
            href={`/track/${trackingCode}`}
            className="w-full bg-white border border-[#083d07] text-[#083d07] hover:bg-[#083d07] hover:text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-xs transition-all"
          >
            <span>Acompanhar estado do pedido</span>
            <ExternalLink size={13} />
          </a>
        )}

        <button
          type="button"
          onClick={onClose}
          className="text-xs text-stone-500 hover:text-stone-800 font-medium py-1.5 transition-colors cursor-pointer"
        >
          Voltar ao Cardápio
        </button>
      </div>
    </div>
  );
}
