import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, Trash2, Calendar, CreditCard, Wallet, 
  Search, Check, AlertCircle, X, CheckCircle2,
  RotateCcw, ArrowUpDown, Printer, ChevronDown, 
  Building, DollarSign, Smartphone
} from 'lucide-react';

export interface Expense {
  id: number | string;
  description: string;
  amount: number;
  category: string;
  payment_method: string;
  created_at: string;
}

interface ExpensesManagerProps {
  expenses: Expense[];
  onExpenseChange: () => void;
}

const DEFAULT_CATEGORIES = [
  'Fornecedores & Insumos',
  'Salários & Equipe',
  'Água, Luz, Gás & Net',
  'Aluguel / Renda',
  'Embalagens & Descartáveis',
  'Marketing & Anúncios',
  'Manutenção & Equipamentos',
  'Impostos & Taxas',
  'Outros Gastos'
];

const SUGGESTIONS = [
  { label: 'Queijo Mozzarella', cat: 'Fornecedores & Insumos' },
  { label: 'Farinha de Trigo', cat: 'Fornecedores & Insumos' },
  { label: 'Molho de Tomate', cat: 'Fornecedores & Insumos' },
  { label: 'Caixas de Pizza 8 Fatias', cat: 'Embalagens & Descartáveis' },
  { label: 'Conta de Energia (Luz)', cat: 'Água, Luz, Gás & Net' },
  { label: 'Gás de Cozinha', cat: 'Água, Luz, Gás & Net' },
  { label: 'Diária / Freelancer', cat: 'Salários & Equipe' },
  { label: 'Hortifruti & Verduras', cat: 'Fornecedores & Insumos' },
  { label: 'Bebidas & Refrigerantes', cat: 'Fornecedores & Insumos' },
];

const PAYMENT_METHODS = [
  { id: 'Dinheiro', label: 'Dinheiro', icon: DollarSign },
  { id: 'MB Way', label: 'MB Way', icon: Smartphone },
  { id: 'Cartão', label: 'Cartão / TPA', icon: CreditCard },
  { id: 'Transferência', label: 'Transferência', icon: Building }
];

type PeriodFilterType = 'todos' | 'hoje' | 'ontem' | '7dias' | '30dias' | 'este_mes' | 'mes_passado' | 'custom';
type SortOptionType = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'desc_asc';

const PERIOD_OPTIONS: { id: PeriodFilterType; label: string }[] = [
  { id: 'todos', label: 'Todos os períodos' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: '7dias', label: 'Últimos 7 dias' },
  { id: '30dias', label: 'Últimos 30 dias' },
  { id: 'este_mes', label: 'Este mês' },
  { id: 'mes_passado', label: 'Mês passado' },
  { id: 'custom', label: 'Personalizado' },
];

export default function ExpensesManager({ expenses = [], onExpenseChange }: ExpensesManagerProps) {
  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [autoSangria, setAutoSangria] = useState(true);
  const [expenseDate, setExpenseDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  
  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilterType>('todos');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [sortBy, setSortBy] = useState<SortOptionType>('date_desc');

  // Period Popover Dropdown State
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const periodPopoverRef = useRef<HTMLDivElement>(null);

  // Close period popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (periodPopoverRef.current && !periodPopoverRef.current.contains(e.target as Node)) {
        setIsPeriodOpen(false);
      }
    };
    if (isPeriodOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPeriodOpen]);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const descInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss feedback message
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Focus description input when form opens
  useEffect(() => {
    if (isFormOpen) {
      setTimeout(() => descInputRef.current?.focus(), 150);
    }
  }, [isFormOpen]);

  // Combine default categories with custom categories already recorded in expenses
  const allCategories = useMemo(() => {
    const existing = new Set<string>(DEFAULT_CATEGORIES);
    expenses.forEach(e => {
      if (e.category && e.category.trim()) {
        existing.add(e.category.trim());
      }
    });
    return Array.from(existing);
  }, [expenses]);

  // Distinct payment methods available
  const availablePaymentMethods = useMemo(() => {
    const methods = new Set<string>(['Dinheiro', 'MB Way', 'Cartão', 'Transferência']);
    expenses.forEach(e => {
      if (e.payment_method && e.payment_method.trim()) {
        methods.add(e.payment_method.trim());
      }
    });
    return Array.from(methods);
  }, [expenses]);

  // Safe Date parsing helper
  const parseExpenseDate = (dateStr: string | Date | undefined): Date | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Filtered & Sorted expenses list
  const filteredExpenses = useMemo(() => {
    const getLocalDateStr = (dateObj: Date): string => {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const now = new Date();
    const todayStr = getLocalDateStr(now);

    // Yesterday string
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    // 7 days ago
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 30 days ago
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Month calculations
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const filtered = expenses.filter(exp => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDesc = (exp.description || '').toLowerCase().includes(q);
        const matchesCat = (exp.category || '').toLowerCase().includes(q);
        const matchesPay = (exp.payment_method || '').toLowerCase().includes(q);
        const matchesAmt = String(exp.amount || '').includes(q);
        if (!matchesDesc && !matchesCat && !matchesPay && !matchesAmt) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) {
        return false;
      }

      // 3. Payment Method Filter
      if (selectedPaymentMethod !== 'all' && exp.payment_method !== selectedPaymentMethod) {
        return false;
      }

      // 4. Period Filter
      if (selectedPeriod !== 'todos') {
        const d = parseExpenseDate(exp.created_at);
        if (!d) return false;

        const expDateStr = getLocalDateStr(d);

        if (selectedPeriod === 'hoje') {
          if (expDateStr !== todayStr) return false;
        } else if (selectedPeriod === 'ontem') {
          if (expDateStr !== yesterdayStr) return false;
        } else if (selectedPeriod === '7dias') {
          if (d < sevenDaysAgo) return false;
        } else if (selectedPeriod === '30dias') {
          if (d < thirtyDaysAgo) return false;
        } else if (selectedPeriod === 'este_mes') {
          if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return false;
        } else if (selectedPeriod === 'mes_passado') {
          if (d.getMonth() !== lastMonth || d.getFullYear() !== lastMonthYear) return false;
        } else if (selectedPeriod === 'custom') {
          if (customStartDate) {
            const start = new Date(`${customStartDate}T00:00:00`);
            if (d < start) return false;
          }
          if (customEndDate) {
            const end = new Date(`${customEndDate}T23:59:59.999`);
            if (d > end) return false;
          }
        }
      }

      return true;
    });

    // 5. Sorting
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime() || 0;
      const dateB = new Date(b.created_at).getTime() || 0;
      const amtA = Number(a.amount) || 0;
      const amtB = Number(b.amount) || 0;

      if (sortBy === 'date_desc') return dateB - dateA;
      if (sortBy === 'date_asc') return dateA - dateB;
      if (sortBy === 'amount_desc') return amtB - amtA;
      if (sortBy === 'amount_asc') return amtA - amtB;
      if (sortBy === 'desc_asc') return (a.description || '').localeCompare(b.description || '');
      return dateB - dateA;
    });
  }, [expenses, searchQuery, selectedCategory, selectedPaymentMethod, selectedPeriod, customStartDate, customEndDate, sortBy]);

  // Financial Stats
  const filteredTotalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const topCategory = useMemo(() => {
    if (filteredExpenses.length === 0) return { name: 'Nenhuma', amount: 0, percent: 0 };
    const counts: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || 'Outros Gastos';
      counts[cat] = (counts[cat] || 0) + (Number(e.amount) || 0);
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const topAmt = sorted[0][1];
      const pct = filteredTotalAmount > 0 ? (topAmt / filteredTotalAmount) * 100 : 0;
      return { name: sorted[0][0], amount: topAmt, percent: pct };
    }
    return { name: 'Nenhuma', amount: 0, percent: 0 };
  }, [filteredExpenses, filteredTotalAmount]);

  const topPaymentMethod = useMemo(() => {
    if (filteredExpenses.length === 0) return { name: 'Nenhum', count: 0, amount: 0 };
    const counts: Record<string, { count: number; amount: number }> = {};
    filteredExpenses.forEach(e => {
      const pay = e.payment_method || 'Dinheiro';
      if (!counts[pay]) counts[pay] = { count: 0, amount: 0 };
      counts[pay].count += 1;
      counts[pay].amount += Number(e.amount) || 0;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1].amount - a[1].amount);
    if (sorted.length > 0) {
      return { name: sorted[0][0], count: sorted[0][1].count, amount: sorted[0][1].amount };
    }
    return { name: 'Nenhum', count: 0, amount: 0 };
  }, [filteredExpenses]);

  const averageExpense = useMemo(() => {
    if (filteredExpenses.length === 0) return 0;
    return filteredTotalAmount / filteredExpenses.length;
  }, [filteredExpenses, filteredTotalAmount]);

  const hasActiveFilters = useMemo(() => {
    return (
      selectedPeriod !== 'todos' ||
      selectedCategory !== 'all' ||
      selectedPaymentMethod !== 'all' ||
      searchQuery.trim() !== ''
    );
  }, [selectedPeriod, selectedCategory, selectedPaymentMethod, searchQuery]);

  const handleResetFilters = () => {
    setSelectedPeriod('todos');
    setSelectedCategory('all');
    setSelectedPaymentMethod('all');
    setSearchQuery('');
    setCustomStartDate('');
    setCustomEndDate('');
    setSortBy('date_desc');
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'hoje': return 'Hoje';
      case 'ontem': return 'Ontem';
      case '7dias': return 'Últimos 7 dias';
      case '30dias': return 'Últimos 30 dias';
      case 'este_mes': return 'Este mês';
      case 'mes_passado': return 'Mês passado';
      case 'custom': {
        if (customStartDate && customEndDate) {
          const formatD = (iso: string) => {
            const parts = iso.split('-');
            return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
          };
          return `${formatD(customStartDate)} — ${formatD(customEndDate)}`;
        }
        if (customStartDate) return `A partir de ${customStartDate}`;
        if (customEndDate) return `Até ${customEndDate}`;
        return 'Personalizado';
      }
      default: return 'Todos os períodos';
    }
  };

  const handlePrintExpenses = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setFeedback({ type: 'error', message: 'A descrição da despesa é obrigatória.' });
      return;
    }
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      setFeedback({ type: 'error', message: 'Informe um valor numérico válido maior que zero.' });
      return;
    }

    const finalCategory = isCustomCategory ? newCategoryName.trim() : category;
    if (!finalCategory) {
      setFeedback({ type: 'error', message: 'Selecione ou informe uma categoria válida.' });
      return;
    }

    setSubmitting(true);
    try {
      const dateParts = expenseDate.split('-');
      const createdDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]), 12, 0, 0);

      const { error } = await supabase.from('expenses').insert({
        description: description.trim(),
        amount: Number(numAmount.toFixed(2)),
        category: finalCategory,
        payment_method: paymentMethod,
        created_at: createdDate.toISOString()
      });

      if (error) throw error;

      let sangriaPerformed = false;
      if (paymentMethod === 'Dinheiro' && autoSangria) {
        try {
          const { data: openSession } = await supabase
            .from('cash_sessions')
            .select('id')
            .eq('status', 'aberto')
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (openSession) {
            const { data: userData } = await supabase.auth.getUser();
            const newMovement = {
              id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              session_id: openSession.id,
              type: 'sangria',
              amount: Number(numAmount.toFixed(2)),
              reason: `Despesa: ${description.trim()} (${finalCategory})`,
              created_by: userData?.user?.id || null,
              created_at: new Date().toISOString()
            };

            const { error: movErr } = await supabase.from('cash_movements').insert([newMovement]);
            if (!movErr) {
              sangriaPerformed = true;
            } else {
              const { data: settingRow } = await supabase
                .from('settings')
                .select('value')
                .eq('key', `cash_movements_${openSession.id}`)
                .maybeSingle();

              let currentList: any[] = [];
              try {
                if (settingRow?.value) currentList = JSON.parse(settingRow.value);
              } catch (e) {}
              currentList.unshift(newMovement);

              const { error: setErr } = await supabase.from('settings').upsert({
                key: `cash_movements_${openSession.id}`,
                value: JSON.stringify(currentList),
                updated_at: new Date().toISOString()
              }, { onConflict: 'key' });

              if (!setErr) sangriaPerformed = true;
            }
          }
        } catch (sangriaErr) {
          console.warn('Não foi possível registrar sangria automática para a despesa:', sangriaErr);
        }
      }

      setFeedback({ 
        type: 'success', 
        message: sangriaPerformed 
          ? 'Despesa registrada e sangria realizada no caixa aberto!' 
          : 'Despesa registrada com sucesso!' 
      });
      setDescription('');
      setAmount('');
      setIsCustomCategory(false);
      setNewCategoryName('');
      setIsFormOpen(false);
      onExpenseChange();
    } catch (err: any) {
      console.error('Erro ao lançar despesa:', err);
      setFeedback({ type: 'error', message: 'Erro ao salvar despesa: ' + (err.message || String(err)) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta despesa permanentemente?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setFeedback({ type: 'success', message: 'Despesa excluída com sucesso.' });
      onExpenseChange();
    } catch (err: any) {
      console.error('Erro ao excluir despesa:', err);
      setFeedback({ type: 'error', message: 'Erro ao excluir: ' + (err.message || String(err)) });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3.5 max-w-7xl mx-auto font-sans pb-8">
      
      {/* ────────────────── ETAPA 2 / ETAPA 6: CABEÇALHO REFINADO ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1.5 border-b border-stone-200/80">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900">
            Despesas & Saídas de Caixa
          </h1>
          <p className="text-xs text-stone-500 mt-0.5 max-w-2xl">
            Lançamento e controle de custos operacionais, fornecedores, insumos e contas a pagar.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {filteredExpenses.length > 0 && (
            <button
              onClick={handlePrintExpenses}
              title="Imprimir extrato de despesas"
              className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <Printer size={14} className="text-stone-500" />
              <span>Imprimir</span>
            </button>
          )}

          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-[0.98] ${
              isFormOpen 
                ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300' 
                : 'bg-[#fdde58] hover:bg-[#e2c23f] text-stone-950 font-bold border border-[#d8ba39] shadow-xs'
            }`}
          >
            {isFormOpen ? <X size={15} /> : <Plus size={15} className="stroke-[2.5]" />}
            <span>{isFormOpen ? 'Fechar formulário' : 'Lançar despesa'}</span>
          </button>
        </div>
      </div>

      {/* ────────────────── FEEDBACK NOTIFICATION ────────────────── */}
      {feedback && (
        <div className={`p-3.5 rounded-lg text-xs font-medium flex items-center gap-2.5 border shadow-2xs transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : 'bg-rose-50 text-rose-900 border-rose-200'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ────────────────── FORMULÁRIO DE LANÇAMENTO (EXPANDÍVEL) ────────────────── */}
      {isFormOpen && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 sm:p-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900">
                Lançar Nova Despesa
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Preencha os dados do custo para registro contábil e dedução no caixa.
              </p>
            </div>
            <button
              onClick={() => setIsFormOpen(false)}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {/* Sugestões Rápidas */}
            <div>
              <span className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Sugestões rápidas
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map(sug => (
                  <button
                    key={sug.label}
                    type="button"
                    onClick={() => {
                      setDescription(sug.label);
                      setCategory(sug.cat);
                      setIsCustomCategory(false);
                    }}
                    className="px-2.5 py-1 text-xs rounded-md bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 transition-colors cursor-pointer"
                  >
                    {sug.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4">
              {/* Descrição */}
              <div className="md:col-span-6 space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Descrição / Fornecedor *
                </label>
                <input
                  ref={descInputRef}
                  type="text"
                  required
                  placeholder="Ex: Fornecedor de Queijo Mozzarella"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all"
                />
              </div>

              {/* Valor */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Valor (€) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full h-10 pl-7 pr-3 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-900 tabular-nums placeholder:text-stone-400 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Data */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Data de Competência *
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-900 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all cursor-pointer"
                />
              </div>

              {/* Categoria */}
              <div className="md:col-span-6 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-700">
                    Categoria de Custo *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(!isCustomCategory)}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
                  >
                    {isCustomCategory ? 'Escolher existente' : '+ Nova categoria'}
                  </button>
                </div>
                {isCustomCategory ? (
                  <input
                    type="text"
                    required
                    placeholder="Digite a nova categoria..."
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all"
                  />
                ) : (
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-900 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all cursor-pointer"
                  >
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Meio de Pagamento */}
              <div className="md:col-span-6 space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Meio de Pagamento *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map(pm => {
                    const isSelected = paymentMethod === pm.id;
                    const Icon = pm.icon;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`h-10 flex items-center justify-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                          isSelected 
                            ? 'bg-stone-900 text-white border-stone-900 shadow-2xs' 
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <Icon size={13} className={isSelected ? 'text-amber-400' : 'text-stone-400'} />
                        <span className="truncate">{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-Sangria Toggle quando Dinheiro */}
              {paymentMethod === 'Dinheiro' && (
                <div className="md:col-span-12">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-200">
                    <div className="flex items-center gap-2.5">
                      <Wallet size={16} className="text-amber-600 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-stone-900 block">
                          Descontar do Caixa aberto (Sangria)
                        </span>
                        <span className="text-[11px] text-stone-500 block">
                          Registra a saída física de dinheiro na gaveta da sessão de caixa ativa
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                      <input
                        type="checkbox"
                        checked={autoSangria}
                        onChange={e => setAutoSangria(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Ações do Formulário */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="h-9 px-4 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-9 px-4 bg-[#fdde58] hover:bg-[#e2c23f] disabled:opacity-50 text-stone-950 font-bold text-xs rounded-lg transition-all shadow-xs border border-[#d8ba39] flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span>{submitting ? 'Salvando...' : 'Confirmar lançamento'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────── ETAPA 3: FAIXA DE MÉTRICAS (KPIS) ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total de Despesas (Métrica Âncora Principal) */}
        <div className="bg-stone-950 text-white rounded-xl p-5 border border-stone-850 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
              Total de Despesas
            </span>
            <p className="text-3xl font-bold tracking-tight text-white mt-2 tabular-nums">
              € {filteredTotalAmount.toFixed(2)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-850 flex items-center justify-between text-xs text-stone-400">
            <span>{hasActiveFilters ? 'No período filtrado' : 'Histórico total'}</span>
            <span className="font-semibold text-stone-200 tabular-nums">
              {filteredExpenses.length} {filteredExpenses.length === 1 ? 'saída' : 'saídas'}
            </span>
          </div>
        </div>

        {/* Card 2: Média por Saída (Secundário) */}
        <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
              Média por Saída
            </span>
            <p className="text-2xl font-bold tracking-tight text-stone-900 mt-2 tabular-nums">
              € {averageExpense.toFixed(2)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Ticket de custo</span>
            <span className="text-stone-700">por registro</span>
          </div>
        </div>

        {/* Card 3: Maior Categoria (Secundário) */}
        <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
              Maior Categoria
            </span>
            <p className="text-lg font-bold tracking-tight text-stone-900 mt-2 truncate" title={topCategory.name}>
              {topCategory.name}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold text-stone-900 tabular-nums">€ {topCategory.amount.toFixed(2)}</span>
            <span className="text-stone-400">({topCategory.percent.toFixed(0)}% do total)</span>
          </div>
        </div>

        {/* Card 4: Meio Principal (Secundário) */}
        <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
              Meio Principal
            </span>
            <p className="text-lg font-bold tracking-tight text-stone-900 mt-2 truncate">
              {topPaymentMethod.name}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold text-stone-900 tabular-nums">€ {topPaymentMethod.amount.toFixed(2)}</span>
            <span className="text-stone-400">({topPaymentMethod.count} {topPaymentMethod.count === 1 ? 'registro' : 'registros'})</span>
          </div>
        </div>
      </div>

      {/* ────────────────── ETAPA 1: BARRA DE FILTROS UNIFICADA COM POPOVER DE PERÍODO ────────────────── */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-2xs p-3.5 sm:p-4 space-y-3">
        
        {/* Linha Única de Filtros: Buscar + Categoria + Meio + Período + Ordenar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          
          {/* 1. Busca */}
          <div className="lg:col-span-3 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar descrição ou fornecedor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-8 pr-7 bg-white border border-stone-200 hover:border-stone-300 rounded-lg text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-colors shadow-2xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                title="Limpar busca"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* 2. Categoria */}
          <div className="lg:col-span-2 relative">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className={`w-full h-10 px-3 border rounded-lg text-xs font-medium focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-colors cursor-pointer appearance-none pr-7 shadow-2xs ${
                selectedCategory !== 'all' 
                  ? 'border-amber-400/80 bg-amber-50/50 text-stone-900 font-semibold' 
                  : 'border-stone-200 hover:border-stone-300 bg-white text-stone-800'
              }`}
            >
              <option value="all">Todas as categorias</option>
              {allCategories.map(cat => {
                const count = expenses.filter(e => e.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>

          {/* 3. Meio de Pagamento */}
          <div className="lg:col-span-2 relative">
            <select
              value={selectedPaymentMethod}
              onChange={e => setSelectedPaymentMethod(e.target.value)}
              className={`w-full h-10 px-3 border rounded-lg text-xs font-medium focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-colors cursor-pointer appearance-none pr-7 shadow-2xs ${
                selectedPaymentMethod !== 'all' 
                  ? 'border-amber-400/80 bg-amber-50/50 text-stone-900 font-semibold' 
                  : 'border-stone-200 hover:border-stone-300 bg-white text-stone-800'
              }`}
            >
              <option value="all">Todos os meios</option>
              {availablePaymentMethods.map(pm => {
                const count = expenses.filter(e => e.payment_method === pm).length;
                return (
                  <option key={pm} value={pm}>
                    {pm} ({count})
                  </option>
                );
              })}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>

          {/* 4. Filtro de Período Compacto (Popover) */}
          <div className="lg:col-span-3 relative" ref={periodPopoverRef}>
            <button
              type="button"
              onClick={() => setIsPeriodOpen(!isPeriodOpen)}
              className={`w-full h-10 px-3 border rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer shadow-2xs ${
                selectedPeriod !== 'todos'
                  ? 'border-amber-400/80 bg-amber-50/50 text-stone-900 font-semibold'
                  : 'border-stone-200 hover:border-stone-300 bg-white text-stone-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Calendar size={14} className={selectedPeriod !== 'todos' ? 'text-amber-600 shrink-0' : 'text-stone-400 shrink-0'} />
                <span className="truncate">{getPeriodLabel()}</span>
              </div>
              <ChevronDown size={14} className={`text-stone-400 transition-transform duration-200 shrink-0 ${isPeriodOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Menu Popover Suspenso */}
            {isPeriodOpen && (
              <div className="absolute left-0 lg:right-0 lg:left-auto mt-1.5 w-72 bg-white rounded-xl border border-stone-200 shadow-lg z-30 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider border-b border-stone-100 mb-1">
                  Filtrar por Período
                </div>

                {PERIOD_OPTIONS.map(opt => {
                  const isSelected = selectedPeriod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedPeriod(opt.id);
                        if (opt.id !== 'custom') {
                          setIsPeriodOpen(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                        isSelected 
                          ? 'bg-stone-100 text-stone-900 font-semibold' 
                          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check size={14} className="text-amber-600" />}
                    </button>
                  );
                })}

                {/* Sub-painel Personalizado */}
                {selectedPeriod === 'custom' && (
                  <div className="pt-2 mt-1 border-t border-stone-100 px-1 space-y-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-semibold text-stone-500 uppercase">
                        Data Inicial
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={e => setCustomStartDate(e.target.value)}
                        className="w-full h-8 px-2.5 bg-stone-50 border border-stone-200 rounded text-xs font-medium text-stone-900 focus:bg-white focus:border-stone-900 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-semibold text-stone-500 uppercase">
                        Data Final
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={e => setCustomEndDate(e.target.value)}
                        className="w-full h-8 px-2.5 bg-stone-50 border border-stone-200 rounded text-xs font-medium text-stone-900 focus:bg-white focus:border-stone-900 outline-none"
                      />
                    </div>

                    {customStartDate && customEndDate && customEndDate < customStartDate && (
                      <span className="block text-[11px] font-semibold text-rose-600">
                        ⚠ Data final anterior à inicial
                      </span>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      {(customStartDate || customEndDate) && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomStartDate('');
                            setCustomEndDate('');
                          }}
                          className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 underline cursor-pointer"
                        >
                          Limpar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsPeriodOpen(false)}
                        className="ml-auto px-3 py-1 bg-stone-900 hover:bg-black text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Ordenação */}
          <div className="lg:col-span-2 relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOptionType)}
              className="w-full h-10 px-3 bg-white border border-stone-200 hover:border-stone-300 rounded-lg text-xs font-medium text-stone-800 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-colors cursor-pointer appearance-none pr-7 shadow-2xs"
            >
              <option value="date_desc">Mais recentes</option>
              <option value="date_asc">Mais antigas</option>
              <option value="amount_desc">Maior valor</option>
              <option value="amount_asc">Menor valor</option>
              <option value="desc_asc">Descrição (A-Z)</option>
            </select>
            <ArrowUpDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>

        </div>

        {/* Indicadores Discretos de Filtros Ativos */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-stone-400 mr-1">
                Filtros:
              </span>

              {selectedPeriod !== 'todos' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-800 text-[11px] font-medium border border-stone-200">
                  <span>{getPeriodLabel()}</span>
                  <button onClick={() => setSelectedPeriod('todos')} className="hover:text-stone-950 cursor-pointer">
                    <X size={11} />
                  </button>
                </span>
              )}

              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-800 text-[11px] font-medium border border-stone-200">
                  <span>{selectedCategory}</span>
                  <button onClick={() => setSelectedCategory('all')} className="hover:text-stone-950 cursor-pointer">
                    <X size={11} />
                  </button>
                </span>
              )}

              {selectedPaymentMethod !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-800 text-[11px] font-medium border border-stone-200">
                  <span>{selectedPaymentMethod}</span>
                  <button onClick={() => setSelectedPaymentMethod('all')} className="hover:text-stone-950 cursor-pointer">
                    <X size={11} />
                  </button>
                </span>
              )}

              {searchQuery.trim() !== '' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-800 text-[11px] font-medium border border-stone-200">
                  <span>"{searchQuery}"</span>
                  <button onClick={() => setSearchQuery('')} className="hover:text-stone-950 cursor-pointer">
                    <X size={11} />
                  </button>
                </span>
              )}

              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 hover:underline px-1.5 py-0.5 cursor-pointer ml-1"
              >
                <RotateCcw size={11} />
                <span>Limpar todos</span>
              </button>
            </div>

            <div className="text-[11px] text-stone-500">
              Mostrando <strong className="text-stone-800 tabular-nums">{filteredExpenses.length}</strong> de <strong className="text-stone-800 tabular-nums">{expenses.length}</strong>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────── ETAPA 4 / ETAPA 5: TABELA EXTRATO DE DESPESAS ────────────────── */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-2xs overflow-hidden">
        
        {/* Cabeçalho Limpo da Tabela */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-stone-100 bg-white">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-stone-900 tracking-tight">
              Extrato de Despesas
            </h3>
            <span className="text-xs text-stone-500 font-medium">
              {filteredExpenses.length} {filteredExpenses.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <div className="text-xs text-stone-500">
            Total filtrado: <span className="text-stone-900 font-bold tabular-nums">€ {filteredTotalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-stone-50/75 text-stone-500 uppercase text-[11px] font-semibold tracking-wider border-b border-stone-100">
              <tr>
                <th className="px-5 py-3 text-left">Data</th>
                <th className="px-5 py-3 text-left">Descrição / Fornecedor</th>
                <th className="px-5 py-3 text-left">Categoria</th>
                <th className="px-5 py-3 text-left">Pagamento</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3 text-center w-16">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-sans">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <Wallet size={20} className="mx-auto text-stone-400" />
                      <p className="text-sm font-semibold text-stone-800">Nenhuma despesa encontrada</p>
                      <p className="text-xs text-stone-500">
                        {hasActiveFilters 
                          ? 'Nenhum registro corresponde aos filtros selecionados.' 
                          : 'Clique em "Lançar despesa" acima para registrar a primeira saída.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-1 text-xs font-semibold text-stone-900 hover:underline cursor-pointer"
                        >
                          Limpar filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp: any) => {
                  const d = new Date(exp.created_at);
                  const formattedDate = !isNaN(d.getTime()) ? d.toLocaleDateString('pt-PT') : '-';
                  const isBeingDeleted = deletingId === exp.id;

                  return (
                    <tr key={exp.id} className="hover:bg-stone-50/60 transition-colors group">
                      <td className="px-5 py-3.5 text-stone-500 tabular-nums whitespace-nowrap text-xs">
                        {formattedDate}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-stone-900">
                        {exp.description}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700">
                          {exp.category || 'Outros Gastos'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-stone-600 text-xs whitespace-nowrap">
                        {exp.payment_method || 'Dinheiro'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-stone-900 tabular-nums text-sm whitespace-nowrap">
                        € {Number(exp.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleDelete(exp.id)}
                          disabled={isBeingDeleted}
                          className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer disabled:opacity-30"
                          title="Excluir despesa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot className="bg-stone-50/75 border-t border-stone-200 text-xs font-semibold text-stone-700">
                <tr>
                  <td colSpan={4} className="px-5 py-3.5 text-stone-500">
                    Total ({filteredExpenses.length} {filteredExpenses.length === 1 ? 'saída' : 'saídas'})
                  </td>
                  <td className="px-5 py-3.5 text-right text-stone-950 font-bold tabular-nums text-sm">
                    € {filteredTotalAmount.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
