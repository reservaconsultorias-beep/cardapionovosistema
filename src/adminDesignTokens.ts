/**
 * Tokens de Design Oficiais — Redesign Visual do Painel Administrativo (41 Menus)
 * Conceito: "Balcão de Comanda"
 */

export const ADMIN_COLORS = {
  bg: '#FAFAF9',           // Quase branco levemente quente
  surface: '#FFFFFF',      // Cards e tabelas
  border: '#E7E5E1',       // Borda suave
  textPrimary: '#1C1917',  // Texto principal
  textSecondary: '#78716C',// Texto secundário
  textTertiary: '#A8A29E', // Labels/legenda

  brand: '#C81E3A',        // Vermelho refinado 41 Menus
  brandHover: '#A8172F',
  brandLight: '#FDEEF0',

  accentGold: '#D4AF6A',   // Dourado sóbrio da sidebar (item ativo)
  darkBg: '#1C1917',       // Preto-tinta da sidebar

  success: '#15803D',
  successLight: '#F0FDF4',
  warning: '#B45309',
  warningLight: '#FFFBEB',
  danger: '#B91C1C',
  dangerLight: '#FEF2F2',
  info: '#1D4ED8',
  infoLight: '#EFF6FF',
};

export const ADMIN_STYLES = {
  card: 'bg-white rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)]',
  cardPadding: 'p-6',
  cardPaddingCompact: 'p-4',
  pageTitle: 'text-2xl font-bold tracking-tight text-[#1C1917]',
  cardTitle: 'text-base font-bold text-[#1C1917]',
  label: 'text-xs font-semibold uppercase tracking-wide text-[#A8A29E]',
  kpiNumber: 'text-3xl font-bold font-mono tabular-nums text-[#1C1917]',
  monoText: 'font-mono tabular-nums',
  input: 'bg-[#FAFAF9] border border-[#E7E5E1] rounded-lg text-sm focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20 outline-none transition-all',
  btnPrimary: 'px-4 py-2.5 bg-[#C81E3A] hover:bg-[#A8172F] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:opacity-50',
  btnSecondary: 'px-4 py-2.5 bg-transparent border border-[#E7E5E1] hover:bg-[#FAFAF9] text-[#1C1917] rounded-lg font-semibold text-sm transition-colors',
  btnDanger: 'px-4 py-2.5 bg-transparent border border-[#B91C1C] text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg font-semibold text-sm transition-colors',
};
