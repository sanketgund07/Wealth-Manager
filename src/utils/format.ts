import { BankAccount, Goal, WealthSourceKey, WealthState } from '../types/wealth';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrDecimalFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatINR(amount: number, showDecimals = false): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return showDecimals ? inrDecimalFormatter.format(safe) : inrFormatter.format(Math.round(safe));
}

export function formatINRCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_00_00_000) {
    return `${sign}₹${(abs / 1_00_00_000).toFixed(2).replace(/\.00$/, '')} Cr`;
  }
  if (abs >= 1_00_000) {
    return `${sign}₹${(abs / 1_00_000).toFixed(2).replace(/\.00$/, '')} L`;
  }
  if (abs >= 1_000) {
    return `${sign}₹${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return formatINR(amount);
}

export interface BankMetrics {
  balance: number;
  plannedAllocated: number;
  plannedSpent: number;
  yetToSpend: number; // Yellow
  savingsAllocated: number;
  availableBalance: number; // Green (balance - yetToSpend)
}

export function getBankMetrics(bank: BankAccount): BankMetrics {
  let plannedAllocated = 0;
  let plannedSpent = 0;
  let yetToSpend = 0;
  let savingsAllocated = 0;

  for (const cat of bank.categories) {
    if (cat.kind === 'expense') {
      plannedAllocated += cat.allocated;
      plannedSpent += cat.spent;
      yetToSpend += Math.max(0, cat.allocated - cat.spent);
    } else {
      savingsAllocated += Math.max(0, cat.allocated - cat.spent);
    }
  }

  const availableBalance = bank.balance - yetToSpend;

  return {
    balance: bank.balance,
    plannedAllocated,
    plannedSpent,
    yetToSpend,
    savingsAllocated,
    availableBalance,
  };
}

export function getWealthTotals(state: WealthState) {
  const iciciBalance = state.banks.icici.balance;
  const hdfcBalance = state.banks.hdfc.balance;
  const totalBankBalance = iciciBalance + hdfcBalance;
  const tradingCapital = state.investments.mt5;
  const totalInvestments = state.investments.fd + state.investments.pf;
  const grossWealth = totalBankBalance + tradingCapital + totalInvestments;

  const iciciCCUnpaid = state.creditCardExpenses
    .filter((item) => item.card === 'icici_cc' && !item.isPaid)
    .reduce((sum, item) => sum + item.amount, 0);

  const hdfcCCUnpaid = state.creditCardExpenses
    .filter((item) => item.card === 'hdfc_cc' && !item.isPaid)
    .reduce((sum, item) => sum + item.amount, 0);

  const totalCCDue = iciciCCUnpaid + hdfcCCUnpaid;
  const netWorth = grossWealth - totalCCDue;

  return {
    iciciBalance,
    hdfcBalance,
    totalBankBalance,
    tradingCapital,
    fd: state.investments.fd,
    pf: state.investments.pf,
    totalInvestments,
    grossWealth,
    iciciCCUnpaid,
    hdfcCCUnpaid,
    totalCCDue,
    netWorth,
  };
}

export function getWealthSourceValue(state: WealthState, source: WealthSourceKey): number {
  switch (source) {
    case 'icici':
      return state.banks.icici.balance;
    case 'hdfc':
      return state.banks.hdfc.balance;
    case 'mt5':
      return state.investments.mt5;
    case 'pf':
      return state.investments.pf;
    case 'fd':
      return state.investments.fd;
  }
}

export function getGoalCurrentAmount(goal: Goal, state: WealthState): number {
  if (goal.mode === 'manual') {
    return goal.manualCurrent;
  }
  return goal.linkedSources.reduce((sum, key) => sum + getWealthSourceValue(state, key), 0);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDaysRemaining(targetDateStr: string): number {
  if (!targetDateStr) return 0;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const [y, m, d] = targetDateStr.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const targetMidnight = new Date(y, m - 1, d).getTime();
  return Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
}

export function formatDaysRemainingLabel(days: number): string {
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';
  if (days > 1) return `${days} days left`;
  if (days === -1) return '1 day overdue';
  return `${Math.abs(days)} days overdue`;
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function createId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
