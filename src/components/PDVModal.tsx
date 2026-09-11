import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useMenu } from '../hooks/useMenu';
import { MenuItem, ExtraIngredient } from '../data/menu';
import { findImageForProduct } from '../utils/imageResolver';
import { categoriesUI } from '../App';
import { 
  X, ArrowLeft, Search, Plus, Minus, Trash2, ShoppingBag, 
  DollarSign, CreditCard, Smartphone, Check, 
  Percent, ArrowRight, User, Phone, MapPin, 
  Tag, Utensils, Bike, Store, AlertCircle, 
  RotateCcw, Sparkles, ChevronRight, Hash
} from 'lucide-react';

interface PDVModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId?: string | null;
  onOrderCreated: (order: any) => void;
}

export interface PDVCartItem {
  id: string;
  menuItem: MenuItem;
  size?: 'P' | 'M' | 'G';
  isHalf?: boolean;
  secondFlavor?: MenuItem;
  selectedBorda?: MenuItem | null;
  selectedExtras?: ExtraIngredient[];
  quantity: number;
  notes?: string;
  unitPrice: number;
  totalPrice: number;
}

// Componente para resolver imagens do PDV com tentativa de extensões
const PDVProductImage = ({ product, className }: { product: MenuItem, className?: string }) => {
  const [imgAttempt, setImgAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const exts = ['.png', '.jpg', '.jpeg', '.webp'];

  let photoSrc = product.imageUrl ? product.imageUrl.replace(/^\//, '') : "";
  if (photoSrc === 'none') {
    photoSrc = "";
  } else if (!photoSrc) {
    const autoImage = findImageForProduct(product);
    if (autoImage) photoSrc = autoImage.replace(/^\//, '');
  }

  const getDisplaySrc = () => {
    if (!photoSrc) return "";
    if (photoSrc.startsWith('http') || photoSrc.startsWith('data:')) return imgAttempt > 0 ? '' : photoSrc;
    let base = photoSrc;
    if (imgAttempt > 0) {
      base = base.replace(/\.(png|jpe?g|webp)$/i, '');
      return `/${base}${exts[imgAttempt - 1]}`;
    }
    return `/${base}`;
  };

  const currentSrc = getDisplaySrc();

  if (!currentSrc || failed) {
    return <Utensils size={22} className="text-gray-300 drop-shadow-2xs" />;
  }

  return (
    <img
      src={currentSrc}
      alt={product.name}
      className={className}
      onError={() => {
        if (imgAttempt < exts.length) {
          setImgAttempt(prev => prev + 1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
};

export default function PDVModal({
  isOpen,
  onClose,
  activeSessionId,
  onOrderCreated
}: PDVModalProps) {
  const { menuItems, categories, loading: menuLoading, usingFallback, refresh: refreshMenu } = useMenu();

  // Sempre sincroniza o cardápio ao abrir o PDV para refletir alterações recentes
  useEffect(() => {
    if (isOpen) {
      refreshMenu?.();
    }
  }, [isOpen]);

  // Order Details States
  const [orderType, setOrderType] = useState<'retirada' | 'mesa' | 'entrega'>('retirada');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryReference, setDeliveryReference] = useState('');
  const [deliveryZone, setDeliveryZone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Numerário' | 'Cartão' | 'MB Way'>('MB Way');
  const [cashAmountGiven, setCashAmountGiven] = useState<string>('');

  // Search & Navigation
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart & Pricing
  const [cart, setCart] = useState<PDVCartItem[]>([]);
  const [adjustmentType, setAdjustmentType] = useState<'none' | 'discount' | 'surcharge'>('none');
  const [adjustmentMode, setAdjustmentMode] = useState<'fixed' | 'percent'>('fixed');
  const [adjustmentValue, setAdjustmentValue] = useState<string>('');

  // Zones & Settings
  const [zones, setZones] = useState<{ name: string; fee: number }[]>([]);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(20);
  const [adminLogoUrl, setAdminLogoUrl] = useState('');

  // Submissions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Customizer / Size Modal State
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customSize, setCustomSize] = useState<'P' | 'M' | 'G'>('G');
  const [customIsHalf, setCustomIsHalf] = useState(false);
  const [customSecondFlavor, setCustomSecondFlavor] = useState<MenuItem | null>(null);
  const [customBorda, setCustomBorda] = useState<MenuItem | null>(null);
  const [customNotes, setCustomNotes] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLButtonElement | null)[]>([]);


  // History interception for mobile back button removed to prevent modal crashing/blinking and closing unintentionally

  // Load delivery zones and settings
  useEffect(() => {
    if (!isOpen) return;
    const loadDeliverySettings = async () => {
      try {
        const { data: zonesData } = await supabase
          .from('delivery_zones')
          .select('name, fee')
          .eq('is_active', true)
          .order('sort_order');
        if (zonesData && zonesData.length > 0) {
          setZones(zonesData.map((z: any) => ({ name: z.name, fee: Number(z.fee) })));
          setDeliveryZone(prev => prev || zonesData[0].name);
        }

        const { data: settingsData } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['free_delivery_threshold', 'delivery_min_order', 'admin_logo_url']);
        settingsData?.forEach((row: any) => {
          if (row.key === 'free_delivery_threshold') setFreeDeliveryThreshold(Number(row.value) || 0);
          if (row.key === 'admin_logo_url' && row.value) setAdminLogoUrl(row.value);
        });
      } catch (e) {
        console.warn('Erro ao carregar configurações de entrega no PDV:', e);
      }
    };
    loadDeliverySettings();
  }, [isOpen]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setTableNumber('');
      setDeliveryAddress('');
      setDeliveryReference('');
      setAdjustmentType('none');
      setAdjustmentValue('');
      setCashAmountGiven('');
      setErrorMessage(null);
      setSearchQuery('');
      setSelectedCategory('all');
      setPaymentMethod('MB Way');
    }
  }, [isOpen]);

  // Bordas available


  const bordas = useMemo(() => {
    return menuItems.filter(i => i.category === 'bordas' || i.id.startsWith('bd-'));
  }, [menuItems]);

  // Pizzas for half-and-half
  const pizzasList = useMemo(() => {
    return menuItems.filter(i => i.id.startsWith('p-') || i.category?.includes('pizza') || i.category === 'tradicionais' || i.category === 'especiais');
  }, [menuItems]);

  // Filtered menu items
  const filteredProducts = useMemo(() => {
    return menuItems.filter(item => {
      if (item.category === 'bordas' || item.id.startsWith('bd-')) return false;

      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.name.toLowerCase().includes(q) || 
        (item.ingredients && item.ingredients.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Categories list
  const displayCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    (menuItems || []).forEach(i => {
      if (i.category && !i.category.includes('borda') && !i.id.startsWith('bd-')) {
        counts[i.category] = (counts[i.category] || 0) + 1;
      }
    });

    const activeCats = (categories || []).filter(c => c && c.id && (counts[c.id] > 0 || c.id === 'all'));
    return [
      { id: 'all', name: 'Todos os Itens', count: (menuItems || []).filter(i => !i.id.startsWith('bd-')).length },
      ...activeCats.map(c => ({ id: c.id, name: c.name, count: counts[c.id] || 0 }))
    ];
  }, [categories, menuItems]);

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const isFreeDelivery = useMemo(() => {
    return orderType === 'entrega' && freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold;
  }, [orderType, freeDeliveryThreshold, subtotal]);

  const deliveryFee = useMemo(() => {
    if (orderType !== 'entrega') return 0;
    if (isFreeDelivery) return 0;
    const found = zones.find(z => z.name === deliveryZone);
    return found ? found.fee : 0;
  }, [orderType, deliveryZone, zones, isFreeDelivery]);

  const adjustmentAmount = useMemo(() => {
    if (adjustmentType === 'none') return 0;
    const val = parseFloat(adjustmentValue) || 0;
    if (val <= 0) return 0;

    let calculated = 0;
    if (adjustmentMode === 'percent') {
      calculated = (subtotal * val) / 100;
    } else {
      calculated = val;
    }

    return adjustmentType === 'discount' ? -calculated : calculated;
  }, [adjustmentType, adjustmentMode, adjustmentValue, subtotal]);

  const totalAmount = useMemo(() => {
    const finalVal = subtotal + deliveryFee + adjustmentAmount;
    return Math.max(0, finalVal);
  }, [subtotal, deliveryFee, adjustmentAmount]);

  const calculatedChange = useMemo(() => {
    if (paymentMethod !== 'Numerário') return 0;
    const given = parseFloat(cashAmountGiven) || 0;
    if (given <= totalAmount) return 0;
    return given - totalAmount;
  }, [paymentMethod, cashAmountGiven, totalAmount]);

  // Handle direct item click
  const handleProductClick = (item: MenuItem) => {
    const hasMultipleSizes = Boolean(item.priceP || item.priceM || item.priceG);

    if (hasMultipleSizes) {
      setCustomizingItem(item);
      setCustomSize(item.priceG ? 'G' : item.priceM ? 'M' : 'P');
      setCustomIsHalf(false);
      setCustomSecondFlavor(null);
      setCustomBorda(null);
      setCustomNotes('');
    } else {
      const unitPrice = item.priceSingle || item.priceP || item.priceM || item.priceG || 0;
      addToCart({
        id: `${item.id}-${Date.now()}`,
        menuItem: item,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice
      });
    }
  };

  // Add customized item from modal
  const handleConfirmCustomization = () => {
    if (!customizingItem) return;

    let basePrice = 0;
    if (customSize === 'P') basePrice = customizingItem.priceP || (customizingItem.priceM ? customizingItem.priceM - 2 : customizingItem.priceSingle || 0);
    else if (customSize === 'M') basePrice = customizingItem.priceM || customizingItem.priceSingle || 0;
    else if (customSize === 'G') basePrice = customizingItem.priceG || customizingItem.priceSingle || 0;

    // If half-and-half, take highest price or avg (standard: take highest flavor price)
    if (customIsHalf && customSecondFlavor) {
      let secondPrice = 0;
      if (customSize === 'P') secondPrice = customSecondFlavor.priceP || (customSecondFlavor.priceM ? customSecondFlavor.priceM - 2 : customSecondFlavor.priceSingle || 0);
      else if (customSize === 'M') secondPrice = customSecondFlavor.priceM || customSecondFlavor.priceSingle || 0;
      else if (customSize === 'G') secondPrice = customSecondFlavor.priceG || customSecondFlavor.priceSingle || 0;

      basePrice = Math.max(basePrice, secondPrice);
    }

    const bordaPrice = customBorda?.priceSingle || 0;
    const unitPrice = basePrice + bordaPrice;

    addToCart({
      id: `${customizingItem.id}-${Date.now()}`,
      menuItem: customizingItem,
      size: customSize,
      isHalf: customIsHalf,
      secondFlavor: customIsHalf ? customSecondFlavor : null,
      selectedBorda: customBorda,
      notes: customNotes.trim() || undefined,
      quantity: 1,
      unitPrice,
      totalPrice: unitPrice
    });

    setCustomizingItem(null);
  };

  // Cart operations
  const addToCart = (newItem: PDVCartItem) => {
    setCart(prev => {
      // Find if identical item exists
      const existingIdx = prev.findIndex(item => {
        return (
          item.menuItem.id === newItem.menuItem.id &&
          item.size === newItem.size &&
          item.isHalf === newItem.isHalf &&
          item.secondFlavor?.id === newItem.secondFlavor?.id &&
          item.selectedBorda?.id === newItem.selectedBorda?.id &&
          (item.notes || '') === (newItem.notes || '')
        );
      });

      if (existingIdx >= 0) {
        const updated = [...prev];
        const exist = updated[existingIdx];
        const newQty = exist.quantity + newItem.quantity;
        updated[existingIdx] = {
          ...exist,
          quantity: newQty,
          totalPrice: exist.unitPrice * newQty
        };
        return updated;
      }

      return [...prev, newItem];
    });
  };

  const updateCartQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      const item = updated[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = {
        ...item,
        quantity: newQty,
        totalPrice: item.unitPrice * newQty
      };
      return updated;
    });
  };

  const removeCartItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Finalize order
  const handleFinalizeOrder = async () => {
    if (cart.length === 0) {
      setErrorMessage('O carrinho está vazio. Adicione itens antes de finalizar.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Por favor, informe o nome do cliente.');
      return;
    }

    if (orderType === 'entrega') {
      if (!deliveryAddress.trim()) {
        setErrorMessage('Por favor, informe a morada de entrega (Rua, Número, etc).');
        return;
      }
      if (!deliveryZone.trim()) {
        setErrorMessage('Por favor, selecione a zona de entrega.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formattedItems = cart.map(item => {
        let name = item.menuItem.name;
        if (item.isHalf && item.secondFlavor) {
          name = `1/2 ${item.menuItem.name} + 1/2 ${item.secondFlavor.name}`;
        }
        if (item.size) {
          name += ` (${item.size})`;
        }
        if (item.selectedBorda) {
          name += ` [Borda: ${item.selectedBorda.name}]`;
        }

        return {
          name,
          category: item.menuItem.category || 'Geral',
          quantity: item.quantity,
          priceCalculated: item.unitPrice,
          basePrice: item.unitPrice,
          notes: item.notes || '',
          extras: []
        };
      });

      let dbOrderType = 'balcao';
      if (orderType === 'entrega') dbOrderType = 'entrega';
      else if (orderType === 'mesa') dbOrderType = 'mesa';
      else if (orderType === 'retirada') dbOrderType = 'retirada';

      const changeForNum = parseFloat(cashAmountGiven);

      const fullDeliveryAddress = orderType === 'entrega'
        ? `${deliveryAddress.trim()}${deliveryReference.trim() ? ` (Ref: ${deliveryReference.trim()})` : ''}`
        : (orderType === 'mesa' && tableNumber ? `Mesa ${tableNumber}` : null);

      const payload: any = {
        cash_session_id: activeSessionId || null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        order_type: dbOrderType,
        payment_method: paymentMethod,
        status: 'Em Preparo',
        total_amount: Number(totalAmount.toFixed(2)),
        items: formattedItems,
        delivery_address: fullDeliveryAddress,
        delivery_zone: orderType === 'entrega' ? deliveryZone : null,
        change_for: paymentMethod === 'Numerário' && !isNaN(changeForNum) && changeForNum > totalAmount ? changeForNum : null
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Sincronização automática com tabela de Clientes (CRM)
      if (customerPhone.trim()) {
        try {
          const cleanPhone = customerPhone.trim();
          const cleanName = customerName.trim() || 'Cliente Balcão';
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id, total_orders, total_spent')
            .eq('phone', cleanPhone)
            .maybeSingle();

          if (existingCustomer) {
            await supabase.from('customers').update({
              name: cleanName,
              total_orders: (existingCustomer.total_orders || 0) + 1,
              total_spent: (Number(existingCustomer.total_spent) || 0) + Number(totalAmount.toFixed(2)),
              last_order_at: new Date().toISOString(),
            }).eq('id', existingCustomer.id);
          } else {
            await supabase.from('customers').insert([{
              phone: cleanPhone,
              name: cleanName,
              address: fullDeliveryAddress,
              total_orders: 1,
              total_spent: Number(totalAmount.toFixed(2)),
              last_order_at: new Date().toISOString(),
            }]);
          }
        } catch (custErr) {
          console.warn('[PDV] Não foi possível atualizar o cadastro do cliente (CRM):', custErr);
        }
      }

      if (data) {
        onOrderCreated(data);
      }

      onClose();
    } catch (err: any) {
      console.error('Erro ao finalizar pedido no PDV:', err);
      setErrorMessage(err.message || 'Erro ao registrar o pedido no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

    return (
    <div ref={modalRef} className="fixed inset-0 z-50 flex flex-col bg-gray-100 text-gray-900 select-none overflow-hidden animate-in fade-in duration-200 font-sans">
      
      {/* ────────────────── TOP BAR ────────────────── */}
      <header className="h-14 px-4 bg-white border-b border-gray-200 flex items-center justify-between gap-3 shrink-0 shadow-2xs z-10">
        
        {/* Left: Branding & Order Type Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 pr-3 border-r border-gray-200">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-black border border-stone-800 shrink-0 flex items-center justify-center p-0.5 shadow-sm">
              <img 
                src={adminLogoUrl || "/logo.png"} 
                alt="41 Menu's" 
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/logo.png";
                }}
              />
            </div>
            <div>
              <h1 className="text-sm font-black text-gray-900 tracking-tight leading-none">Terminal PDV</h1>
              <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5 mt-0.5 tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                CAIXA RÁPIDO
              </span>
            </div>
          </div>

          {/* Type Pills */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg">
            <button
              onClick={() => setOrderType('retirada')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                orderType === 'retirada'
                  ? 'bg-white text-red-600 shadow-2xs ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Store size={13} />
              <span>Balcão</span>
            </button>
            <button
              onClick={() => setOrderType('mesa')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                orderType === 'mesa'
                  ? 'bg-white text-yellow-600 shadow-2xs ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Utensils size={13} />
              <span>Mesa</span>
            </button>
            <button
              onClick={() => setOrderType('entrega')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                orderType === 'entrega'
                  ? 'bg-white text-blue-600 shadow-2xs ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Bike size={13} />
              <span>Entrega</span>
            </button>
          </div>
        </div>

        {/* Center: Live Product Search */}
        <div className="flex-1 max-w-md relative mx-2">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full h-9 pl-9 pr-8 bg-white text-gray-800 text-xs rounded-full border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-50 focus:outline-none transition-all font-medium placeholder-gray-400 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 bg-gray-100 rounded-full p-0.5 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Right: Cash Session badge & Close */}
        <div className="flex items-center gap-3">
          {activeSessionId ? (
            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Caixa Aberto
            </span>
          ) : (
            <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <AlertCircle size={12} /> Fechado
            </span>
          )}

          <button
            onClick={() => {
              if (cart.length > 0 && !window.confirm('Deseja cancelar o pedido atual e voltar ao Gestor?')) {
                return;
              }
              onClose();
            }}
            className="h-8 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs active:translate-y-px cursor-pointer"
            title="Voltar ao Gestor de Pedidos"
          >
            <ArrowLeft size={14} className="stroke-[2.5]" />
            <span className="hidden sm:inline font-mono uppercase tracking-wider">Voltar</span>
          </button>
        </div>
      </header>

      {/* ────────────────── MAIN 2-COLUMN WORKSPACE ────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* COLUMN 1: LEFT AREA (CATEGORIES + GRID) */}
        <div className="flex-1 flex flex-col min-w-0 bg-white lg:bg-[var(--pdv-bg)]">
          
          {/* COMPACT CATEGORIES BAR (No cutoff, no scrollbar needed) */}
          <nav className="w-full bg-[var(--pdv-surface)] border-b border-[var(--pdv-border)] flex flex-wrap items-center shrink-0 px-3 py-2 gap-1.5 shadow-[var(--pdv-shadow-sm)] z-10">
            {displayCategories.map(cat => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSearchQuery('');
                  }}
                  className={`flex items-center justify-center px-2.5 py-1 rounded-[var(--pdv-radius-full)] text-[11px] font-bold transition-all cursor-pointer active:scale-95 border ${
                    isActive
                      ? 'bg-[var(--pdv-brand)] text-stone-950 border-[#d8ba39] shadow-xs'
                      : 'bg-[var(--pdv-surface)] text-[var(--pdv-text-secondary)] border-[var(--pdv-border)] hover:bg-[var(--pdv-surface-hover)] hover:text-[var(--pdv-text-primary)]'
                  }`}
                >
                  <span className="whitespace-nowrap">{cat.name}</span>
                </button>
              );
            })}
          </nav>

          {/* PRODUCT CATALOG GRID */}
          <main className="flex-1 p-2.5 sm:p-3.5 lg:p-4 overflow-y-auto custom-scrollbar">
          {menuLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-bold uppercase tracking-wide">Carregando Cardápio...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Search size={36} className="mb-3 opacity-20" />
              <p className="text-base font-bold text-gray-500">Nenhum produto encontrado</p>
              <p className="text-xs mt-0.5">Navegue pelas categorias na lateral.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-2.5">
              {filteredProducts.map(product => {
                const hasSizes = Boolean(product.priceP || product.priceM || product.priceG);
                const displayPrice = product.priceG || product.priceM || product.priceSingle || product.priceP || 0;
                const isPromoItem = 
                  product.category === 'promocoes' || 
                  product.category?.toLowerCase().includes('promo') || 
                  product.id?.startsWith('md-') ||
                  selectedCategory === 'promocoes' ||
                  selectedCategory?.toLowerCase().includes('promo');

                return (
                  <button
                    key={product.id}
                    ref={(el) => {
                      if (el) cardsRef.current.push(el);
                    }}
                    onClick={() => handleProductClick(product)}
                    className="group bg-[var(--pdv-surface)] rounded-xl p-2 pb-2 flex flex-col text-left transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[var(--pdv-shadow-md)] shadow-[var(--pdv-shadow-sm)] cursor-pointer active:scale-95 relative border border-[var(--pdv-border)] touch-manipulation select-none"
                  >
                    {/* Image / Thumbnail (4:5 para Promoção do Dia, 1:1 Quadrado para os demais itens) */}
                    <div className={`w-full ${isPromoItem ? 'aspect-[4/5]' : 'aspect-square'} bg-stone-50 rounded-lg mb-1.5 overflow-hidden flex items-center justify-center relative shadow-inner border border-stone-200/50`}>
                      <PDVProductImage 
                        product={product} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      
                      {/* Multiple sizes badge */}
                      {hasSizes && (
                        <span className="absolute top-1.5 right-1.5 bg-white/95 text-red-600 text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded-full shadow-2xs backdrop-blur-2xs">
                          P · M · G
                        </span>
                      )}
                    </div>

                    {/* Product Name */}
                    <div className="px-0.5 flex-1 flex flex-col">
                      <h3 className="font-bold text-xs text-gray-900 leading-tight mb-0.5 group-hover:text-red-600 transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-[9.5px] text-gray-400 leading-tight line-clamp-1 mb-1.5">
                        {product.ingredients || ''}
                      </p>

                      <div className="mt-auto pt-1.5 border-t border-[var(--pdv-border)] flex items-center justify-between">
                        <div className="flex flex-col">
                          {hasSizes ? (
                            <span className="text-[8px] font-bold text-[var(--pdv-text-secondary)] uppercase tracking-wide">A partir de</span>
                          ) : (
                            <span className="text-[8px] font-bold text-[var(--pdv-text-secondary)] uppercase tracking-wide">Preço</span>
                          )}
                          <span className="font-black text-xs sm:text-[13px] text-[var(--pdv-text-primary)] leading-none">
                            € {displayPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[var(--pdv-brand)] text-stone-950 flex items-center justify-center font-black shadow-2xs hover:bg-[var(--pdv-brand-hover)] transition-colors shrink-0">
                          <Plus size={13} className="stroke-[3]" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>
        </div>

        {/* COLUMN 3: CART & CHECKOUT (Compact ergonomics & expansive catalog) */}
        <aside className="w-full h-[60vh] lg:h-full lg:w-[320px] xl:w-[340px] bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col shrink-0 shadow-2xl z-20 overflow-hidden">
          
          {/* Section 1: Order Type Selector & Customer / Delivery Details (Ultra-Compact) */}
          <div className="p-2 bg-stone-50 border-b border-stone-200 space-y-1.5 shrink-0">
            {/* Direct Order Type Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-stone-200/80 p-0.5 rounded-lg">
              <button
                onClick={() => setOrderType('retirada')}
                className={`flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  orderType === 'retirada'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Store size={11} />
                <span>Balcão</span>
              </button>
              <button
                onClick={() => setOrderType('mesa')}
                className={`flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  orderType === 'mesa'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Utensils size={11} />
                <span>Mesa</span>
              </button>
              <button
                onClick={() => setOrderType('entrega')}
                className={`flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  orderType === 'entrega'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Bike size={11} />
                <span>Entrega</span>
              </button>
            </div>

            {/* Inputs based on Order Type */}
            {orderType === 'retirada' && (
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Nome do Cliente *"
                  className="w-full h-7 px-2 bg-white border border-stone-300 rounded-md text-[11px] font-bold text-stone-900 focus:border-red-500 focus:ring-1 focus:ring-red-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Telefone (opcional)"
                  className="w-full h-7 px-2 bg-white border border-stone-300 rounded-md text-[11px] font-mono font-medium text-stone-900 focus:border-red-500 focus:ring-1 focus:ring-red-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal"
                />
              </div>
            )}

            {orderType === 'mesa' && (
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Nome do Cliente *"
                  className="w-full h-7 px-2 bg-white border border-stone-300 rounded-md text-[11px] font-bold text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal"
                />
                <input
                  type="text"
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  placeholder="Nº Mesa / Comanda *"
                  className="w-full h-7 px-2 bg-white border border-stone-300 rounded-md text-[11px] font-mono font-bold text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal"
                />
              </div>
            )}

            {orderType === 'entrega' && (
              <div className="space-y-1 pt-0.5">
                <div className="grid grid-cols-2 gap-1">
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Nome do Cliente *"
                    className="w-full h-7 px-2 bg-white border border-stone-300 rounded-md text-[11px] font-bold text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal"
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="Telefone (opcional)"
                    className="w-full h-7 px-2 bg-white border border-stone-300 rounded-md text-[11px] font-mono font-medium text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="Morada / Rua, Nº, Andar, Cód. Postal *"
                    className="w-full h-7 px-2 bg-white border border-stone-300 rounded-md text-[11px] font-medium text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal"
                  />
                </div>

                <div className="grid grid-cols-2 gap-1">
                  {zones.length > 0 && (
                    <select
                      value={deliveryZone}
                      onChange={e => setDeliveryZone(e.target.value)}
                      className="w-full h-7 px-1.5 bg-white border border-stone-300 rounded-md text-[11px] font-bold text-stone-800 focus:border-blue-500 focus:outline-none cursor-pointer shadow-2xs"
                    >
                      {zones.map(z => {
                        const feeDisplay = isFreeDelivery ? 'Grátis!' : `+€${z.fee.toFixed(2)}`;
                        return (
                          <option key={z.name} value={z.name}>
                            {z.name} ({feeDisplay})
                          </option>
                        );
                      })}
                    </select>
                  )}
                  <input
                    type="text"
                    value={deliveryReference}
                    onChange={e => setDeliveryReference(e.target.value)}
                    placeholder="Ref. / Complemento"
                    className="w-full h-7 px-2 bg-white border border-stone-300 rounded-md text-[11px] font-medium text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal"
                  />
                </div>

                {isFreeDelivery && (
                  <div className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-mono font-bold flex items-center justify-between">
                    <span>🎉 Entrega Grátis!</span>
                    <span>€ 0.00</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Items in Cart (Ultra-Compact Item Cards) */}
          <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-1.5 bg-white space-y-1 custom-scrollbar">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
              <div className="flex items-center gap-1">
                <ShoppingBag size={12} className="text-stone-700" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-900">
                  Meu Pedido
                </span>
                <span className="bg-stone-900 text-white min-w-4 h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-mono font-bold">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[9px] text-rose-600 hover:text-rose-700 font-bold uppercase flex items-center gap-0.5 cursor-pointer bg-rose-50 hover:bg-rose-100 px-1.5 py-0.2 rounded transition-colors"
                >
                  <Trash2 size={9} /> Limpar
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="h-28 flex flex-col items-center justify-center text-stone-400">
                <div className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center mb-1 border border-dashed border-stone-200 text-stone-300">
                  <ShoppingBag size={14} />
                </div>
                <p className="text-[11px] font-bold text-stone-600">Carrinho Vazio</p>
                <p className="text-[9px] text-stone-400 text-center max-w-[160px] mt-0.5">
                  Toque nos produtos ao lado para incluir.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {cart.map((item, idx) => (
                  <div 
                    key={item.id} 
                    className="bg-stone-50/90 hover:bg-stone-50 border border-stone-200/80 rounded-lg p-1.5 shadow-2xs transition-all flex flex-col gap-0.5"
                  >
                    {/* Top Row: Qty Badge, Product Name, and Item Total */}
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="w-4.5 h-4.5 rounded bg-stone-200 text-stone-800 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                          {item.quantity}x
                        </span>
                        <h4 className="font-bold text-[11px] text-stone-900 truncate leading-tight" title={item.menuItem.name}>
                          {item.menuItem.name}
                        </h4>
                      </div>
                      <span className="font-black font-mono text-[11px] text-stone-900 shrink-0">
                        € {item.totalPrice.toFixed(2)}
                      </span>
                    </div>

                    {/* Customizations / Badges */}
                    {(item.size || item.isHalf || item.selectedBorda || item.notes) && (
                      <div className="flex flex-wrap items-center gap-0.5 pl-6">
                        {item.size && (
                          <span className="px-1 py-0.2 rounded bg-amber-100/90 text-amber-900 border border-amber-200/80 text-[8.5px] font-mono font-bold">
                            Tam {item.size}
                          </span>
                        )}
                        {item.isHalf && item.secondFlavor && (
                          <span className="px-1 py-0.2 rounded bg-orange-100/90 text-orange-900 border border-orange-200/80 text-[8.5px] font-mono font-bold">
                            ½ {item.secondFlavor.name}
                          </span>
                        )}
                        {item.selectedBorda && (
                          <span className="px-1 py-0.2 rounded bg-emerald-100/90 text-emerald-900 border border-emerald-200/80 text-[8.5px] font-mono font-bold">
                            + {item.selectedBorda.name}
                          </span>
                        )}
                        {item.notes && (
                          <span className="px-1 py-0.2 rounded bg-stone-200/90 text-stone-700 text-[8.5px] font-medium italic truncate max-w-[150px]">
                            Obs: {item.notes}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bottom Controls Row: Horizontal Stepper + Unit Price + Delete Button */}
                    <div className="flex items-center justify-between pt-0.5 border-t border-stone-200/60 pl-6">
                      <div className="flex items-center gap-1">
                        <div className="flex items-center bg-white border border-stone-300 rounded overflow-hidden shadow-2xs h-5">
                          <button
                            onClick={() => updateCartQuantity(idx, -1)}
                            className="w-4.5 h-full flex items-center justify-center text-stone-600 hover:bg-stone-100 hover:text-stone-900 active:scale-95 transition-colors cursor-pointer"
                            title="Diminuir"
                          >
                            <Minus size={9} className="stroke-[3]" />
                          </button>
                          <span className="w-5 text-center font-mono font-bold text-[10px] text-stone-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(idx, 1)}
                            className="w-4.5 h-full flex items-center justify-center text-stone-600 hover:bg-stone-100 hover:text-stone-900 active:scale-95 transition-colors cursor-pointer"
                            title="Aumentar"
                          >
                            <Plus size={9} className="stroke-[3]" />
                          </button>
                        </div>
                        <span className="text-[9px] font-mono text-stone-400">
                          (€ {item.unitPrice.toFixed(2)} un)
                        </span>
                      </div>

                      <button
                        onClick={() => removeCartItem(idx)}
                        className="p-0.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Remover item"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Adjustments (Desconto / Acréscimo) - Ultra Compact */}
          <div className="px-2.5 py-1 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-1 shrink-0">
            <div className="flex items-center gap-0.5 bg-stone-200/80 p-0.5 rounded text-[9px] font-mono font-bold">
              <button
                onClick={() => setAdjustmentType(adjustmentType === 'discount' ? 'none' : 'discount')}
                className={`px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                  adjustmentType === 'discount' ? 'bg-white text-rose-700 shadow-2xs border border-stone-200' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Desconto
              </button>
              <button
                onClick={() => setAdjustmentType(adjustmentType === 'surcharge' ? 'none' : 'surcharge')}
                className={`px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                  adjustmentType === 'surcharge' ? 'bg-white text-blue-700 shadow-2xs border border-stone-200' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Acréscimo
              </button>
            </div>

            {adjustmentType !== 'none' && (
              <div className="flex items-center gap-0.5 bg-white border border-stone-300 rounded p-0.5 shadow-2xs h-5.5">
                <button 
                  onClick={() => setAdjustmentMode('fixed')} 
                  className={`px-1 py-0.2 text-[8.5px] font-mono font-bold rounded cursor-pointer ${adjustmentMode === 'fixed' ? 'bg-stone-900 text-white' : 'text-stone-500'}`}
                >
                  €
                </button>
                <button 
                  onClick={() => setAdjustmentMode('percent')} 
                  className={`px-1 py-0.2 text-[8.5px] font-mono font-bold rounded cursor-pointer ${adjustmentMode === 'percent' ? 'bg-stone-900 text-white' : 'text-stone-500'}`}
                >
                  %
                </button>
                <input
                  type="number" step="0.1" min="0"
                  value={adjustmentValue}
                  onChange={e => setAdjustmentValue(e.target.value)}
                  placeholder="0.00"
                  className="w-10 text-right bg-transparent text-[11px] font-mono font-bold text-stone-900 focus:outline-none pr-0.5"
                />
              </div>
            )}
          </div>

          {/* Section 4: Payment Method & Change - Ultra Compact */}
          <div className="px-2.5 py-1.5 bg-white border-t border-stone-200 space-y-1 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-stone-500">
                Pagamento
              </span>
              {paymentMethod === 'Numerário' && calculatedChange > 0 && (
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                  Troco: € {calculatedChange.toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                onClick={() => setPaymentMethod('MB Way')}
                className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-[var(--pdv-radius-md)] text-[10.5px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                  paymentMethod === 'MB Way'
                    ? 'border-purple-500 bg-purple-50 text-purple-800 shadow-[var(--pdv-shadow-sm)]'
                    : 'border-[var(--pdv-border)] bg-[var(--pdv-surface)] text-[var(--pdv-text-secondary)] hover:bg-[var(--pdv-surface-hover)] hover:text-[var(--pdv-text-primary)]'
                }`}
              >
                <Smartphone size={12} className={paymentMethod === 'MB Way' ? 'text-purple-600' : 'text-stone-400'} />
                <span>MB Way</span>
              </button>
              <button
                onClick={() => setPaymentMethod('Numerário')}
                className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-[var(--pdv-radius-md)] text-[10.5px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                  paymentMethod === 'Numerário'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-[var(--pdv-shadow-sm)]'
                    : 'border-[var(--pdv-border)] bg-[var(--pdv-surface)] text-[var(--pdv-text-secondary)] hover:bg-[var(--pdv-surface-hover)] hover:text-[var(--pdv-text-primary)]'
                }`}
              >
                <DollarSign size={12} className={paymentMethod === 'Numerário' ? 'text-emerald-600' : 'text-stone-400'} />
                <span>Dinheiro</span>
              </button>
              <button
                onClick={() => setPaymentMethod('Cartão')}
                className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-[var(--pdv-radius-md)] text-[10.5px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                  paymentMethod === 'Cartão'
                    ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-[var(--pdv-shadow-sm)]'
                    : 'border-[var(--pdv-border)] bg-[var(--pdv-surface)] text-[var(--pdv-text-secondary)] hover:bg-[var(--pdv-surface-hover)] hover:text-[var(--pdv-text-primary)]'
                }`}
              >
                <CreditCard size={12} className={paymentMethod === 'Cartão' ? 'text-blue-600' : 'text-stone-400'} />
                <span>Cartão</span>
              </button>
            </div>

            {/* Dinheiro Drawer if Numerário is active */}
            {paymentMethod === 'Numerário' && (
              <div className="bg-emerald-50/70 p-1.5 rounded border border-emerald-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-emerald-900 uppercase">
                    Recebido (€):
                  </span>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-[10px]">€</span>
                    <input
                      type="number" step="0.5"
                      value={cashAmountGiven}
                      onChange={e => setCashAmountGiven(e.target.value)}
                      placeholder={totalAmount.toFixed(2)}
                      className="w-18 h-5.5 pl-4 pr-1 bg-white border border-emerald-300 rounded text-[11px] text-stone-900 text-right font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>
                <div className="flex gap-1 overflow-x-auto hide-scrollbar justify-end">
                  {[5, 10, 20, 50].map(val => (
                    <button 
                      key={val} 
                      onClick={() => setCashAmountGiven(val.toString())} 
                      className="px-1.5 py-0.2 bg-white text-emerald-800 text-[9px] font-mono font-bold rounded border border-emerald-200 shadow-2xs cursor-pointer hover:bg-emerald-100 shrink-0"
                    >
                      €{val}
                    </button>
                  ))}
                  <button 
                    onClick={() => setCashAmountGiven(totalAmount.toFixed(2))} 
                    className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-mono font-bold rounded shadow-2xs cursor-pointer hover:bg-emerald-700 shrink-0"
                  >
                    Exato
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Financial Summary & Finalize */}
          <div className="mt-auto sticky bottom-0 p-3 lg:p-4 bg-[var(--pdv-surface)] border-t border-[var(--pdv-border)] shrink-0 space-y-2 shadow-[var(--pdv-shadow-lg)]">
            <div className="flex items-baseline justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-stone-500 font-bold uppercase tracking-wider">
                  Total
                </span>
                {(subtotal !== totalAmount || deliveryFee > 0 || adjustmentAmount !== 0) && (
                  <span className="text-[9px] font-mono text-stone-400">
                    Sub: € {subtotal.toFixed(2)}
                    {deliveryFee > 0 && ` + Ent: € ${deliveryFee.toFixed(2)}`}
                    {isFreeDelivery && ` + Ent: Grátis`}
                    {adjustmentAmount !== 0 && ` ${adjustmentAmount < 0 ? '-' : '+'} € ${Math.abs(adjustmentAmount).toFixed(2)}`}
                  </span>
                )}
              </div>
              <span className="text-lg font-black font-mono text-stone-900 tabular-nums">
                € {totalAmount.toFixed(2)}
              </span>
            </div>

            {errorMessage && (
              <div className="p-1.5 rounded bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold flex items-start gap-1 animate-in fade-in">
                <AlertCircle size={12} className="shrink-0 mt-0.5 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              onClick={handleFinalizeOrder}
              disabled={isSubmitting || cart.length === 0}
              className="w-full h-11 bg-[#fdde58] hover:bg-[#e2c23f] active:scale-[0.98] disabled:opacity-40 disabled:bg-gray-300 disabled:text-gray-500 text-stone-950 font-black text-sm uppercase tracking-wider rounded-[var(--pdv-radius-lg)] shadow-[var(--pdv-shadow-md)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#d8ba39]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processando...</span>
                </div>
              ) : (
                <>
                  <Check size={14} className="stroke-[3]" />
                  <span>Finalizar Pedido</span>
                </>
              )}
            </button>
          </div>
        </aside>
      </div>

      {/* ────────────────── PIZZA CUSTOMIZATION MODAL ────────────────── */}
      {customizingItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-black text-base text-gray-900">{customizingItem.name}</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Personalize seu pedido</p>
              </div>
              <button onClick={() => setCustomizingItem(null)} className="p-1.5 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-900 cursor-pointer transition-colors">
                <X size={16} className="stroke-[2.5]" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Tamanho
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['P', 'M', 'G'] as const).map(size => {
                    let p = 0;
                    if (size === 'P') p = customizingItem.priceP || (customizingItem.priceM ? customizingItem.priceM - 2 : 0);
                    if (size === 'M') p = customizingItem.priceM || 0;
                    if (size === 'G') p = customizingItem.priceG || 0;
                    if (p <= 0) return null;

                    const isSelected = customSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => {
                          setCustomSize(size);
                          if (size !== 'G') setCustomIsHalf(false);
                        }}
                        className={`py-2.5 px-2 rounded-xl flex flex-col items-center gap-0.5 border-2 transition-all cursor-pointer shadow-2xs ${
                          isSelected
                            ? 'bg-yellow-50 border-yellow-400 text-yellow-900 ring-1 ring-yellow-400 ring-offset-1'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-200 hover:bg-yellow-50/50'
                        }`}
                      >
                        <span className="text-xs font-black">{size === 'P' ? 'Pequena' : size === 'M' ? 'Média' : 'Grande'}</span>
                        <span className="text-[10px] font-bold text-gray-500">+ € {p.toFixed(2)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {customSize === 'G' && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200 cursor-pointer" onClick={() => setCustomIsHalf(!customIsHalf)}>
                    <div>
                      <label className="text-xs font-black text-gray-900 cursor-pointer">Pizza Meio a Meio</label>
                      <p className="text-[10px] text-gray-500 font-medium">Escolha um segundo sabor</p>
                    </div>
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${customIsHalf ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${customIsHalf ? 'translate-x-5' : ''}`}></div>
                    </div>
                  </div>

                  {customIsHalf && (
                    <div className="animate-in slide-in-from-top-2">
                      <select
                        value={customSecondFlavor?.id || ''}
                        onChange={e => {
                          const found = pizzasList.find(p => p.id === e.target.value);
                          setCustomSecondFlavor(found || null);
                        }}
                        className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:border-red-500 focus:outline-none appearance-none"
                      >
                        <option value="">Selecione o 2º sabor...</option>
                        {pizzasList.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (+ € {p.priceG?.toFixed(2) || '0.00'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {bordas.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    Borda Recheada
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCustomBorda(null)}
                      className={`py-2 px-3 rounded-xl text-left border transition-all cursor-pointer shadow-2xs flex items-center justify-between ${
                        customBorda === null
                          ? 'bg-gray-100 border-gray-900 text-gray-900'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xs font-bold">Sem Borda</span>
                    </button>
                    {bordas.map(b => {
                      const isSelected = customBorda?.id === b.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() => setCustomBorda(b)}
                          className={`py-2 px-3 rounded-xl text-left border transition-all cursor-pointer shadow-2xs flex flex-col justify-center ${
                            isSelected
                              ? 'bg-yellow-50 border-yellow-400 text-yellow-900'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-200'
                          }`}
                        >
                          <span className="text-xs font-bold truncate">{b.name.replace('Borda de ', '')}</span>
                          <span className="text-[9px] font-bold text-gray-500">+ € {b.priceSingle?.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                  Observações
                </label>
                <textarea
                  value={customNotes}
                  onChange={e => setCustomNotes(e.target.value)}
                  placeholder="Ex: sem cebola, ponto da carne..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:border-red-500 focus:bg-white focus:outline-none resize-none transition-colors"
                />
              </div>

            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
              <button
                onClick={() => setCustomizingItem(null)}
                className="w-1/3 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCustomization}
                disabled={customIsHalf && !customSecondFlavor}
                className="flex-1 py-2.5 bg-[#fdde58] hover:bg-[#e2c23f] disabled:opacity-50 text-stone-950 font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-[#d8ba39]"
              >
                <Check size={16} className="stroke-[3]" />
                <span>Confirmar Inclusão</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );

}
