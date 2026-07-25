import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { supabase } from '../lib/supabase';
import { CartItem } from "../types";
import {
  RESTAURANT_WHATSAPP_PHONE,
  ALL_MENU_ITEMS,
} from "../data/menu";
import { useBusinessHours } from '../hooks/useBusinessHours';
import { ShoppingBag, Plus, Minus, X, Check, MapPin } from "lucide-react";

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onAddToCart: (item: CartItem) => void;
  isOpen: boolean; // Used for mobile modal
  onClose: () => void; // Used for mobile modal
}

const DeliveryScooter = () => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[#8b0000]">
    {/* Box */}
    <rect x="8" y="18" width="18" height="16" rx="2" fill="#8b0000" stroke="#8b0000" />
    <path d="M8 24h18" stroke="white" strokeWidth="1" />
    {/* Body */}
    <path d="M26 34 L40 34 L48 44" strokeWidth="4" />
    <path d="M42 22 L36 44" strokeWidth="4" />
    <path d="M38 22 L46 22" strokeWidth="4" />
    <path d="M30 34 L26 22 L18 22" strokeWidth="4" />
    <path d="M26 34 L32 44" strokeWidth="4" />
    {/* Wheels */}
    <circle cx="16" cy="46" r="6" strokeWidth="4" />
    <circle cx="44" cy="46" r="6" strokeWidth="4" />
    {/* Details */}
    <path d="M20 22 L20 18" strokeWidth="2" />
    {/* Motion Lines */}
    <path d="M4 42 L1 42" stroke="gray" strokeWidth="2" />
    <path d="M6 38 L2 38" stroke="gray" strokeWidth="2" />
  </svg>
);

export default function Cart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onAddToCart,
  isOpen,
  onClose,
}: CartProps) {
  const [name, setName] = useState("");
  const [telefone, setTelefone] = useState("");
  const [morada, setMorada] = useState("");
  const [zona, setZona] = useState("");
  const [orderType, setOrderType] = useState("Delivery");
  const [pagamento, setPagamento] = useState("MB Way");
  const [trocoPara, setTrocoPara] = useState("");
  const [hasShownParty, setHasShownParty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [savedOrderId, setSavedOrderId] = useState<number | null>(null);
  const [savedTrackingCode, setSavedTrackingCode] = useState<string | null>(null);

  const [zonesFees, setZonesFees] = useState<Record<string, number>>({});
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(20);
  const [minDeliveryOrder, setMinDeliveryOrder] = useState(10);
  const [deliveryTimeEstimate, setDeliveryTimeEstimate] = useState('40 a 50 min');
  const [pickupTimeEstimate, setPickupTimeEstimate] = useState('25 a 35 min');

  useEffect(() => {
    const loadDeliverySettings = async () => {
      try {
        const { data: zones, error: zonesError } = await supabase
          .from('delivery_zones')
          .select('name, fee')
          .eq('is_active', true)
          .order('sort_order');
        if (zonesError) throw zonesError;
        if (zones && zones.length > 0) {
          const map: Record<string, number> = {};
          zones.forEach((z: any) => { map[z.name] = Number(z.fee); });
          setZonesFees(map);
        }

        const { data: settingsRows, error: settingsError } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['free_delivery_threshold', 'delivery_min_order', 'delivery_time_estimate', 'pickup_time_estimate']);
        if (settingsError) throw settingsError;
        settingsRows?.forEach((row: any) => {
          if (row.key === 'free_delivery_threshold') setFreeDeliveryThreshold(Number(row.value));
          if (row.key === 'delivery_min_order') setMinDeliveryOrder(Number(row.value));
          if (row.key === 'delivery_time_estimate') setDeliveryTimeEstimate(row.value);
          if (row.key === 'pickup_time_estimate') setPickupTimeEstimate(row.value);
        });
      } catch (err) {
        console.warn('[Cart] Não foi possível carregar zonas/configurações do Supabase, usando valores padrão.', err);
      }
    };
    loadDeliverySettings();
  }, []);

  const subtotal = items.reduce(
    (acc, item) => acc + item.priceCalculated * item.quantity,
    0,
  );

  useEffect(() => {
    if (subtotal >= freeDeliveryThreshold && !hasShownParty) {
      setHasShownParty(true);
      
      // Trigger confetti
      try {
        const fireConfetti = typeof confetti === 'function' ? confetti : (confetti ? (confetti as any).default : null);
        if (typeof fireConfetti === 'function') {
          fireConfetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#8b0000', '#ffffff', '#ffd700', '#4CAF50']
          });
        }
      } catch (e) {
        console.warn('Confetti error:', e);
      }
      
    } else if (subtotal < freeDeliveryThreshold && hasShownParty) {
      setHasShownParty(false);
    }
  }, [subtotal, hasShownParty]);

  let deliveryFee = 0;
  if (orderType === "Delivery") {
    if (subtotal >= freeDeliveryThreshold) {
      deliveryFee = 0;
    } else {
      deliveryFee = zonesFees[zona] || 0;
    }
  }

  const total = subtotal + deliveryFee;

  const businessStatus = useBusinessHours();

  const handleCheckout = async () => {
    setFormError(null);
    const errors: string[] = [];

    if (!businessStatus.isOpen) {
      errors.push("Estamos fechados no momento. Você poderá finalizar o pedido durante o nosso horário de funcionamento.");
    }

    if (orderType === "Delivery" && subtotal < minDeliveryOrder) {
      errors.push(`O valor mínimo para entrega é de €${minDeliveryOrder.toFixed(2)}.`);
    }
    if (!name.trim()) {
      errors.push("Por favor, preencha o seu nome.");
    }
    if (orderType === "Delivery") {
      if (!morada.trim()) {
        errors.push("Por favor, preencha a morada de entrega.");
      }
      if (!zona.trim()) {
        errors.push("Por favor, preencha a zona/freguesia de entrega.");
      }
    }

    if (errors.length > 0) {
      setFormError(errors.join("\n"));
      return;
    }

    const orderNumber = Math.floor(1000 + Math.random() * 9000);
    const orderDate = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });

    let newOrderId = null;
    try {
      const { data, error } = await supabase.from('orders').insert([{
        customer_name: name,
        customer_phone: telefone,
        order_type: orderType,
        payment_method: pagamento,
        status: 'Pendente',
        total_amount: total,
        delivery_address: orderType === 'Delivery' ? morada : null,
        delivery_zone: orderType === 'Delivery' ? zona : null,
        change_for: pagamento === 'Numerário' ? trocoPara : null,
        items: items.map(item => {
          let itemName = item.menuItem.name;
          if (item.isHalfAndHalf && item.halfAndHalfFlavor) {
            itemName = `1/2 ${item.menuItem.name} e 1/2 ${item.halfAndHalfFlavor.name}`;
          }
          if (item.size) {
            itemName += ` (${item.size === "G" ? "Gr" : item.size === "M" ? "Md" : "Pq"})`;
          }
          const extrasTotalPrice = (item.extras || []).reduce((sum, e) => sum + e.price, 0);
          return {
            name: itemName,
            category: item.menuItem.category,
            quantity: item.quantity,
            priceCalculated: item.priceCalculated,
            basePrice: item.priceCalculated - extrasTotalPrice,
            extras: item.extras || [],
            notes: item.notes || ""
          };
        })
      }]).select();

      if (error) throw error;
      if (data && data.length > 0) {
        newOrderId = data[0].id;
        setSavedOrderId(newOrderId);
        setSavedTrackingCode(data[0].tracking_code);

        try {
          if (telefone) {
            const { data: existingCustomer } = await supabase
              .from('customers')
              .select('id, total_orders, total_spent')
              .eq('phone', telefone)
              .maybeSingle();

            if (existingCustomer) {
              await supabase.from('customers').update({
                name,
                total_orders: (existingCustomer.total_orders || 0) + 1,
                total_spent: (Number(existingCustomer.total_spent) || 0) + total,
                last_order_at: new Date().toISOString(),
              }).eq('id', existingCustomer.id);
            } else {
              await supabase.from('customers').insert([{
                phone: telefone,
                name,
                total_orders: 1,
                total_spent: total,
                last_order_at: new Date().toISOString(),
              }]);
            }
          }
        } catch (custErr) {
          console.warn('[Cart] Não foi possível atualizar o cadastro do cliente (CRM):', custErr);
        }
      }
    } catch (err) {
      console.error("Error saving order:", err);
    }

    let text = `-----------------------------------\n`;
    text += `           41 MENU'S\n`;
    text += `-----------------------------------\n`;
    text += `Pedido Nº: ${newOrderId || orderNumber}\n`;
    text += `Tipo: ${orderType === "Delivery" ? "Entrega" : "Takeaway"}\n\n`;

    text += `[CLIENTE]\n`;
    text += `Nome: ${name}\n`;
    text += `Telefone: ${telefone}\n\n`;

    if (orderType === "Delivery") {
      text += `[ENDEREÇO DE ENTREGA]\n`;
      text += `Morada: ${morada}\n`;
      text += `Complemento: ${zona}\n`;
      text += `-----------------------------------\n`;
      text += `🛵 Tempo est. de entrega:\n   ${deliveryTimeEstimate}\n`;
    } else {
      text += `-----------------------------------\n`;
      text += `⏱️ Tempo est. de prep:\n   ${pickupTimeEstimate}\n`;
    }

    const orderDateObj = new Date();
    const dateStr = orderDateObj.toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon' });
    const timeStr = orderDateObj.toLocaleTimeString('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' });

    text += `-----------------------------------\n`;
    text += `[ITENS DO PEDIDO]\n`;
    text += `Data: ${dateStr} Hora: ${timeStr}\n\n`;

    const sortedItems = [...items].sort((a, b) => {
      const catA = (a.menuItem.category || "").toLowerCase();
      const catB = (b.menuItem.category || "").toLowerCase();
      
      const getWeight = (cat: string) => {
        if (cat.includes('esfiha')) return 2;
        if (cat.includes('bebida')) return 3;
        if (cat.includes('borda')) return 4;
        return 1; // default to 1 (Pizzas)
      };

      return getWeight(catA) - getWeight(catB);
    });

    sortedItems.forEach((item) => {
      let desc = item.menuItem.name;
      if (item.isHalfAndHalf && item.halfAndHalfFlavor) {
        desc = `1/2 ${item.menuItem.name} e 1/2 ${item.halfAndHalfFlavor.name}`;
      }
      if (item.size)
        desc += ` (${item.size === "G" ? "Gr" : item.size === "M" ? "Md" : "Pq"})`;
      
      const extrasTotalPrice = (item.extras || []).reduce((sum, e) => sum + e.price, 0);
      const basePrice = item.priceCalculated - extrasTotalPrice;
      
      const priceStr = `€ ${(basePrice * item.quantity).toFixed(2)}`;
      text += `*${item.quantity}x* ${desc} (${priceStr})\n`;
      
      if (item.extras && item.extras.length > 0) {
        item.extras.forEach((extra) => {
          text += `   + ${extra.name} (+ € ${(extra.price * item.quantity).toFixed(2)})\n`;
        });
        text += `   *Subtotal item: € ${(item.priceCalculated * item.quantity).toFixed(2)}*\n`;
      }
      if (item.notes) {
        text += `   📝 Obs: ${item.notes}\n`;
      }
      
      text += `\n`;
    });

    text += `-----------------------------------\n`;
    text += `*Subtotal: € ${subtotal.toFixed(2)}*\n`;
    if (orderType === "Delivery") {
      if (subtotal >= freeDeliveryThreshold) {
        text += `Taxa Entrega: € 0.00\n`;
      } else {
        text += `Taxa Entrega: € ${deliveryFee.toFixed(2)}\n`;
      }
    }
    text += `*TOTAL: € ${total.toFixed(2)}*\n`;
    text += `-----------------------------------\n`;
    text += `[PAGAMENTO]\n`;
    text += `Forma: ${pagamento}\n`;
    if (pagamento === "Numerário" && trocoPara) {
      text += `Troco para: € ${trocoPara}\n`;
    }
    text += `-----------------------------------`;

    const encoded = encodeURIComponent(text);
    const wappUrl = `https://wa.me/351938360931?text=${encoded}`;

    // Abertura síncrona em nova aba / app do WhatsApp para evitar bloqueio de pop-up e contornar a recusa de conexão em iframe
    window.open(wappUrl, "_blank");

    // Atualização de estado após o redirecionamento (fire-and-forget)
    setWhatsappUrl(wappUrl);
    setIsSuccess(true);
    onClearCart();
  };

  if (isSuccess) {
    const successActionButtons = (
      <div className="w-full max-w-sm mx-auto flex flex-col gap-3 mt-2">
        {savedOrderId && (
          <a
            href={`/track/${savedTrackingCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#8b0000] hover:bg-[#6b0000] text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 text-lg shadow-xl transition-all duration-200 cursor-pointer"
          >
            🔍 ACOMPANHAR PEDIDO
          </a>
        )}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            onClearCart();
            setIsSuccess(false);
            onClose();
          }}
          className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 text-lg shadow-xl transition-all duration-200 animate-pulse cursor-pointer"
        >
          📲 ENVIAR PEDIDO NO WHATSAPP
        </a>
        <p className="text-xs text-gray-500 font-semibold text-center">
          Se o WhatsApp não abriu automaticamente, clique no botão acima!
        </p>
      </div>
    );

    return (
      <>
        {/* Desktop Inline Cart */}
        <div className="hidden lg:block sticky top-28 w-full z-10">
          <div className="bg-white lg:border text-[#1a1a1a] border-gray-200 lg:rounded-xl lg:p-10 p-6 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-1">Pedido Pronto!</h2>
            <p className="text-gray-600 mb-4">O seu pedido foi gerado com sucesso.</p>
            {successActionButtons}
          </div>
        </div>

        {/* Mobile Modal Cart */}
        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => {}}
            />
            <div className="relative bg-white w-full min-h-[50vh] rounded-t-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-1">Pedido Pronto!</h2>
              <p className="text-gray-600 mb-4 text-base">O seu pedido foi gerado com sucesso.</p>
              {successActionButtons}
            </div>
          </div>
        )}
      </>
    );
  }

  const CartContent = (
    <div className="bg-white lg:border text-[#1a1a1a] border-gray-200 lg:rounded-xl lg:p-5 p-4 shadow-sm flex flex-col h-full max-h-screen lg:max-h-[calc(100vh-140px)] z-10 w-full relative overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-[#8b0000]" /> Meu Pedido
        </h2>
        <button
          onClick={onClose}
          className="lg:hidden p-2 text-gray-500 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 flex-1">
          <ShoppingBag className="w-12 h-12 text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium text-sm">
            O seu pedido está vazio
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 pr-2 min-h-0 overflow-y-auto overscroll-contain mb-4 custom-scrollbar">
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-bold flex-1 leading-snug">
                      {item.quantity}x{" "}
                      {item.isHalfAndHalf && item.halfAndHalfFlavor
                        ? `1/2 ${item.menuItem.name} e 1/2 ${item.halfAndHalfFlavor.name}`
                        : item.menuItem.name}{" "}
                      {item.size && (
                        <span className="text-gray-500 font-normal">
                          ({item.size})
                        </span>
                      )}
                    </span>
                    <span className="font-bold text-[#8b0000] ml-2">
                      € {(item.priceCalculated * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  {item.extras && item.extras.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1 flex flex-col gap-0.5">
                      {item.extras.map((extra) => (
                        <span key={extra.id}>+ {extra.name} (€ {extra.price.toFixed(2)})</span>
                      ))}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 mt-1 font-medium">
                      📝 Obs: {item.notes}
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="p-1 hover:text-[#8b0000] text-gray-500"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="p-1 hover:text-[#8b0000] text-gray-500"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* PROGRESS BAR GANHE A ENTREGA */}
            <div className="mb-4">
              {subtotal >= freeDeliveryThreshold ? (
                <div className="bg-[#4CAF50]/10 text-[#4CAF50] text-sm font-bold py-3 px-3 text-center rounded-xl border border-[#4CAF50]/30 shadow-sm flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-2 text-lg">
                    <span>🎉</span> Parabéns! <span>🎉</span>
                  </div>
                  <span className="flex items-center gap-1 justify-center">Ganhou a <strong>Entrega!</strong> <DeliveryScooter /></span>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm relative overflow-hidden">
                  <div className="flex justify-between text-sm font-bold text-gray-800 mb-2 relative z-10">
                    <span className="flex items-center gap-2">
                      <DeliveryScooter /> Oferta da Entrega
                    </span>
                    <span className="text-[#8b0000]">
                      Meta: €{freeDeliveryThreshold.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden relative z-10">
                    <div
                      className="bg-[#8b0000] h-2 rounded-full transition-all duration-700 ease-out relative"
                      style={{
                        width: `${Math.min(100, (subtotal / freeDeliveryThreshold) * 100)}%`,
                      }}
                    >
                    </div>
                  </div>
                  <div className="text-center text-xs font-medium text-gray-600 relative z-10">
                    Adicione{" "}
                    <span className="text-[#8b0000] font-bold text-[13px] px-0.5">
                      €{(freeDeliveryThreshold - subtotal).toFixed(2)}
                    </span>{" "}
                    e <span className="font-bold underline decoration-[#8b0000]/30 underline-offset-2">ganhe a entrega!</span> 🎯
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 mb-5 mt-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderType("Delivery")}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors border ${orderType === "Delivery" ? "bg-[#8b0000] text-white border-[#8b0000]" : "bg-gray-50 text-gray-600 border-gray-200"}`}
                >
                  Entrega
                </button>
                <button
                  onClick={() => setOrderType("Takeaway")}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors border ${orderType === "Takeaway" ? "bg-[#8b0000] text-white border-[#8b0000]" : "bg-gray-50 text-gray-600 border-gray-200"}`}
                >
                  Retirada
                </button>
              </div>

              <div className="text-center text-sm font-medium text-[#8b0000] bg-[#8b0000]/10 py-2.5 rounded-lg border border-[#8b0000]/20">
                {orderType === "Takeaway"
                  ? `⏱️ Tempo estimado de preparação: ${pickupTimeEstimate}`
                  : `🛵 Tempo estimado de entrega: ${deliveryTimeEstimate}`}
              </div>
              <input
                type="text"
                placeholder="Nome para o pedido"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-[#8b0000] focus:ring-1 focus:ring-[#8b0000]"
              />
              <input
                type="tel"
                placeholder="Telemóvel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-[#8b0000] focus:ring-1 focus:ring-[#8b0000]"
              />
              {orderType === "Delivery" && (
                <>
                  <input
                    type="text"
                    placeholder="Morada completa"
                    value={morada}
                    onChange={(e) => setMorada(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-[#8b0000] focus:ring-1 focus:ring-[#8b0000]"
                  />
                  <select
                    value={zona}
                    onChange={(e) => setZona(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-[#8b0000] focus:ring-1 focus:ring-[#8b0000] bg-white"
                  >
                    <option value="" disabled>
                      Selecione a Zona / Freguesia
                    </option>
                    {Object.keys(zonesFees).map((z) => (
                      <option key={z} value={z}>
                        {z} (
                        {zonesFees[z] === 0
                          ? "GANHE"
                          : `€${zonesFees[z].toFixed(2)}`}
                        )
                      </option>
                    ))}
                    <option value="disabled" disabled>
                      Brejos de Azeitão (Não atendemos)
                    </option>
                    <option value="disabled-vendas" disabled>
                      Vendas de Azeitão (Não atendemos)
                    </option>
                  </select>
                </>
              )}
              <select
                value={pagamento}
                onChange={(e) => setPagamento(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-[#8b0000] focus:ring-1 focus:ring-[#8b0000] bg-white"
              >
                <option value="MB Way">📱 MB Way</option>
                <option value="Numerário">💵 Numerário</option>
              </select>
              {pagamento === "Numerário" && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Troco para quanto? (opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 50"
                    value={trocoPara}
                    onChange={(e) => setTrocoPara(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-[#8b0000] focus:ring-1 focus:ring-[#8b0000]"
                  />
                </div>
              )}
            </div>

            {/* UPSELL SECTION */}
            {items.length > 0 &&
              (() => {
                const hasBebida = items.some(
                  (i) => i.menuItem.category === "bebidas",
                );
                const hasDoce = items.some(
                  (i) =>
                    i.menuItem.category === "doces" ||
                    i.menuItem.category === "esfihas-doces" ||
                    i.menuItem.category === "bordas",
                );

                if (!hasBebida) {
                  const sug = ALL_MENU_ITEMS.find((m) => m.id === "b-1"); // Coca Cola Lata
                  if (sug)
                    return (
                      <div className="bg-gray-100 rounded-lg p-3 mb-4 flex items-center justify-between border border-gray-200">
                        <span className="text-xs font-medium text-gray-700 w-2/3">
                          🥤 Esqueceste-te da bebida? Adiciona uma Coca-Cola por
                          apenas €_{(sug.priceSingle || 0).toFixed(2)}
                        </span>
                        <button
                          onClick={() =>
                            onAddToCart({
                              id: Date.now().toString(),
                              menuItem: sug,
                              quantity: 1,
                              priceCalculated: sug.priceSingle || 0,
                            })
                          }
                          className="bg-white border border-[#25a244] text-[#25a244] text-xs font-bold py-1.5 px-3 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          + Adicionar
                        </button>
                      </div>
                    );
                }
                if (!hasDoce) {
                  const sug = ALL_MENU_ITEMS.find((m) => m.id === "p-46"); // Banana com Canela
                  if (sug)
                    return (
                      <div className="bg-gray-100 rounded-lg p-3 mb-4 flex items-center justify-between border border-gray-200">
                        <span className="text-xs font-medium text-gray-700 w-2/3">
                          🍫 Que tal terminar com algo doce? Experimenta a Pizza
                          Banana
                        </span>
                        <button
                          onClick={() =>
                            onAddToCart({
                              id: Date.now().toString(),
                              menuItem: sug,
                              size: "P",
                              quantity: 1,
                              priceCalculated: sug.priceP || 0,
                            })
                          }
                          className="bg-white border border-[#25a244] text-[#25a244] text-xs font-bold py-1.5 px-3 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          + Adicionar
                        </button>
                      </div>
                    );
                }
                return null;
              })()}
          </div>

          <div className="pt-3 border-t border-gray-200 bg-white shrink-0">
            <div className="flex flex-col gap-2 mb-5">
              <div className="flex justify-between items-center text-gray-600">
                <span className="font-medium text-sm">Subtotal</span>
                <span className="font-bold text-sm">
                  € {subtotal.toFixed(2)}
                </span>
              </div>
              {orderType === "Delivery" && (
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-medium text-sm">
                    Taxa de Entrega
                  </span>
                  <span className="font-bold text-sm">
                    {deliveryFee === 0
                      ? "GANHE"
                      : `€ ${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-gray-800 font-bold">Total</span>
                <span className="text-xl font-black text-[#8b0000]">
                  € {total.toFixed(2)}
                </span>
              </div>
            </div>

            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm font-medium whitespace-pre-line">
                {formError}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={isSubmitting || !businessStatus.isOpen}
              className={`w-full font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2 shadow-sm mb-2 text-sm ${isSubmitting || !businessStatus.isOpen ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-[#8b0000] hover:bg-[#660000] text-white'}`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processando Pedido...
                </>
              ) : !businessStatus.isOpen ? (
                "Loja Fechada no Momento"
              ) : (
                "Finalizar Pedido e Enviar 📱"
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full lg:hidden bg-white hover:bg-gray-50 border-2 border-[#8b0000] text-[#8b0000] font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2 text-sm"
            >
              <Plus className="w-5 h-5" />
              Adicionar mais itens
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Inline Cart */}
      <div className="hidden lg:block sticky top-28 w-full z-10">
        {CartContent}
      </div>

      {/* Mobile Modal Cart */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="relative bg-white w-full h-[85vh] rounded-t-3xl overflow-hidden shadow-2xl flex flex-col">
            {CartContent}
          </div>
        </div>
      )}
    </>
  );
}
