import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface BusinessHoursStatus {
  isOpen: boolean;
  loading: boolean;
  todayLabel: string;
  reason: 'loading' | 'closed_today' | 'outside_hours' | 'open' | 'manual_closed';
}

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export function useBusinessHours(): BusinessHoursStatus {
  const [status, setStatus] = useState<BusinessHoursStatus>({
    isOpen: true,
    loading: true,
    todayLabel: '',
    reason: 'loading',
  });

  const checkStatus = async () => {
    try {
      const { data: settingsRow } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'manual_store_closed')
        .maybeSingle();

      if (settingsRow?.value === true) {
        setStatus({ isOpen: false, loading: false, todayLabel: '', reason: 'manual_closed' });
        return;
      }

      const { data, error } = await supabase.from('business_hours').select('*');
      if (error) throw error;
      if (!data || data.length === 0) {
        setStatus({ isOpen: true, loading: false, todayLabel: '', reason: 'open' });
        return;
      }

      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
      const dayOfWeek = now.getDay();
      const today = data.find((d: any) => d.day_of_week === dayOfWeek);

      if (!today || today.is_closed || !today.opens_at || !today.closes_at) {
        setStatus({
          isOpen: false,
          loading: false,
          todayLabel: DAY_NAMES[dayOfWeek],
          reason: 'closed_today',
        });
        return;
      }

      const [openH, openM] = today.opens_at.split(':').map(Number);
      const [closeH, closeM] = today.closes_at.split(':').map(Number);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;

      const isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes;

      setStatus({
        isOpen,
        loading: false,
        todayLabel: `${today.opens_at.slice(0,5)} às ${today.closes_at.slice(0,5)}`,
        reason: isOpen ? 'open' : 'outside_hours',
      });
    } catch (err) {
      console.warn('[useBusinessHours] Não foi possível verificar o horário, assumindo loja aberta.', err);
      setStatus({ isOpen: true, loading: false, todayLabel: '', reason: 'open' });
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return status;
}
