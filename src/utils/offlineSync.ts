import { supabase } from '../lib/supabase';

export interface PdvDraft {
  cart: any[];
  orderType: 'retirada' | 'mesa' | 'entrega';
  customerName: string;
  customerNif: string;
  customerPhone: string;
  tableNumber: string;
  deliveryAddress: string;
  deliveryReference: string;
  deliveryZone: string;
  paymentMethod: 'Numerário' | 'MB Way';
  cashAmountGiven: string;
  orderNotes: string;
  adjustmentType: 'none' | 'discount' | 'surcharge';
  adjustmentMode: 'fixed' | 'percent';
  adjustmentValue: string;
  savedAt: number;
}

const PDV_DRAFT_KEY = 'pdv_active_order_draft';
const PDV_OFFLINE_QUEUE_KEY = 'pdv_offline_orders_queue';

/**
 * Salva rascunho do pedido atual do PDV para nunca perder dados caso a tela feche ou a internet caia.
 */
export function savePdvDraft(draft: Partial<PdvDraft>) {
  try {
    if (!draft.cart || draft.cart.length === 0) {
      // Se o carrinho estiver vazio e não houver dados, não precisa salvar
      if (!draft.customerName && !draft.customerPhone && !draft.tableNumber) {
        localStorage.removeItem(PDV_DRAFT_KEY);
        return;
      }
    }
    const payload = {
      ...draft,
      savedAt: Date.now()
    };
    localStorage.setItem(PDV_DRAFT_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('[OfflineSync] Erro ao salvar rascunho do PDV:', e);
  }
}

/**
 * Recupera o rascunho do PDV salvo localmente.
 */
export function getPdvDraft(): PdvDraft | null {
  try {
    const raw = localStorage.getItem(PDV_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Ignora rascunhos com mais de 24 horas
    if (parsed.savedAt && Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(PDV_DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

/**
 * Limpa o rascunho do PDV (chamado após salvar com sucesso ou por descarte manual).
 */
export function clearPdvDraft() {
  try {
    localStorage.removeItem(PDV_DRAFT_KEY);
  } catch (e) {}
}

/**
 * Enfileira um pedido para envio posterior quando o PDV estiver sem internet.
 */
export function enqueueOfflineOrder(payload: any) {
  try {
    const raw = localStorage.getItem(PDV_OFFLINE_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    const offlineItem = {
      tempId: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      payload,
      createdAt: new Date().toISOString()
    };
    queue.push(offlineItem);
    localStorage.setItem(PDV_OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return offlineItem;
  } catch (e) {
    console.error('[OfflineSync] Erro ao enfileirar pedido offline:', e);
    return null;
  }
}

/**
 * Retorna os pedidos atualmente na fila offline.
 */
export function getOfflineOrders(): any[] {
  try {
    const raw = localStorage.getItem(PDV_OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Tenta sincronizar todos os pedidos enfileirados offline com o Supabase.
 */
export async function syncOfflineOrders(
  onSynced?: (tempId: string, serverOrder: any) => void
): Promise<{ syncedCount: number; errorsCount: number }> {
  const queue = getOfflineOrders();
  if (queue.length === 0) return { syncedCount: 0, errorsCount: 0 };

  let syncedCount = 0;
  let errorsCount = 0;
  const remainingQueue: any[] = [];

  for (const item of queue) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([item.payload])
        .select()
        .single();

      if (error) throw error;

      syncedCount++;
      if (onSynced && data) {
        onSynced(item.tempId, data);
      }
    } catch (err) {
      console.error(`[OfflineSync] Falha ao sincronizar pedido ${item.tempId}:`, err);
      errorsCount++;
      remainingQueue.push(item);
    }
  }

  try {
    localStorage.setItem(PDV_OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  } catch (e) {}

  return { syncedCount, errorsCount };
}
