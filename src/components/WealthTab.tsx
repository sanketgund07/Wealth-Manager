import React, { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  CreditCard,
  Edit3,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  BankId,
  CreditCardId,
  ExpectedExpense,
  TabId,
  WealthState,
} from '../types/wealth';
import {
  createId,
  formatDisplayDate,
  formatINR,
  getBankMetrics,
  getWealthTotals,
  toISODate,
} from '../utils/format';
import { BankLogoBadge, InvestmentLogo, Mt5Logo } from './BrandLogos';
import { BottomSheet } from './BottomSheet';

interface WealthTabProps {
  state: WealthState;
  onUpdateState: (updater: (prev: WealthState) => WealthState) => void;
  onNavigateTab: (tab: TabId) => void;
}

export const WealthTab: React.FC<WealthTabProps> = ({
  state,
  onUpdateState,
  onNavigateTab,
}) => {
  const totals = getWealthTotals(state);
  const iciciMetrics = getBankMetrics(state.banks.icici);
  const hdfcMetrics = getBankMetrics(state.banks.hdfc);

  // Edit Investments / Trading modal
  const [editAsset, setEditAsset] = useState<'mt5' | 'fd' | 'pf' | null>(null);
  const [assetInput, setAssetInput] = useState('');

  // Add / Edit Expected Expense
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expBank, setExpBank] = useState<BankId>('icici');
  const [expCategoryId, setExpCategoryId] = useState<string>(
    state.banks.icici.categories[0]?.id ?? ''
  );
  const [editingExp, setEditingExp] = useState<ExpectedExpense | null>(null);

  // Credit Card Add Sheet
  const [ccModalCard, setCcModalCard] = useState<CreditCardId | null>(null);
  const [ccTitle, setCcTitle] = useState('');
  const [ccAmount, setCcAmount] = useState('');
  const [ccDate, setCcDate] = useState(toISODate(new Date()));

  const expectedTotal = state.expectedExpenses.reduce((sum, e) => sum + e.amount, 0);

  const openAssetEditor = (key: 'mt5' | 'fd' | 'pf') => {
    setEditAsset(key);
    setAssetInput(String(state.investments[key] || 0));
  };

  const saveAssetEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAsset) return;
    const val = Math.max(0, Number(assetInput) || 0);
    onUpdateState((prev) => ({
      ...prev,
      investments: {
        ...prev.investments,
        [editAsset]: val,
      },
    }));
    setEditAsset(null);
  };

  const handleExpBankChange = (nextBank: BankId) => {
    setExpBank(nextBank);
    const cats = state.banks[nextBank].categories;
    const defaultCat = cats.find((c) => c.kind === 'expense') ?? cats[0];
    setExpCategoryId(defaultCat?.id ?? '');
  };

  const handleSaveExpectedExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Math.max(0, Number(expAmount) || 0);
    if (!expTitle.trim() || amount <= 0) return;

    const bankCats = state.banks[expBank].categories;
    const resolvedCatId =
      expCategoryId && bankCats.some((c) => c.id === expCategoryId)
        ? expCategoryId
        : (bankCats.find((c) => c.kind === 'expense') ?? bankCats[0])?.id;

    if (editingExp) {
      onUpdateState((prev) => ({
        ...prev,
        expectedExpenses: prev.expectedExpenses.map((item) =>
          item.id === editingExp.id
            ? {
                ...item,
                title: expTitle.trim(),
                amount,
                bankId: expBank,
                categoryId: resolvedCatId,
              }
            : item
        ),
      }));
      setEditingExp(null);
    } else {
      const newItem: ExpectedExpense = {
        id: createId('exp'),
        title: expTitle.trim(),
        amount,
        bankId: expBank,
        categoryId: resolvedCatId,
        isPaid: false,
      };
      onUpdateState((prev) => ({
        ...prev,
        expectedExpenses: [...prev.expectedExpenses, newItem],
      }));
    }
    setExpTitle('');
    setExpAmount('');
  };

  const startEditExpected = (item: ExpectedExpense) => {
    setEditingExp(item);
    setExpTitle(item.title);
    setExpAmount(String(item.amount));
    setExpBank(item.bankId);
    const cats = state.banks[item.bankId].categories;
    setExpCategoryId(item.categoryId ?? cats[0]?.id ?? '');
  };

  const deleteExpected = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      expectedExpenses: prev.expectedExpenses.filter((item) => item.id !== id),
    }));
  };

  const handleAddCcExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ccModalCard) return;
    const amount = Math.max(0, Number(ccAmount) || 0);
    if (!ccTitle.trim() || amount <= 0) return;

    onUpdateState((prev) => ({
      ...prev,
      creditCardExpenses: [
        {
          id: createId('cc'),
          card: ccModalCard,
          title: ccTitle.trim(),
          amount,
          date: ccDate || toISODate(new Date()),
          isPaid: false,
        },
        ...prev.creditCardExpenses,
      ],
    }));

    setCcTitle('');
    setCcAmount('');
    setCcModalCard(null);
  };

  const toggleCcPaid = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      creditCardExpenses: prev.creditCardExpenses.map((item) =>
        item.id === id ? { ...item, isPaid: !item.isPaid } : item
      ),
    }));
  };

  const deleteCcExpense = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      creditCardExpenses: prev.creditCardExpenses.filter((item) => item.id !== id),
    }));
  };

  const settleAllCard = (card: CreditCardId) => {
    const bankToDeduct: BankId = card === 'icici_cc' ? 'icici' : 'hdfc';
    const unpaidSum = state.creditCardExpenses
      .filter((c) => c.card === card && !c.isPaid)
      .reduce((s, c) => s + c.amount, 0);
    if (unpaidSum <= 0) return;

    onUpdateState((prev) => ({
      ...prev,
      banks: {
        ...prev.banks,
        [bankToDeduct]: {
          ...prev.banks[bankToDeduct],
          balance: Math.max(0, prev.banks[bankToDeduct].balance - unpaidSum),
        },
      },
      creditCardExpenses: prev.creditCardExpenses.map((c) =>
        c.card === card ? { ...c, isPaid: true } : c
      ),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Hero Net Worth Card */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-xs font-medium tracking-[0.14em] uppercase text-amber-600 dark:text-[#F4C95D]">
              Total Net Worth
            </p>
            <h1 className="font-light tracking-tight text-[clamp(2.5rem,7vw,4rem)] leading-[1.06] text-slate-900 dark:text-white mt-2 tabular-nums">
              {formatINR(totals.netWorth)}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs sm:text-sm text-slate-600 dark:text-white/80 tabular-nums font-light">
              <span>Gross Assets {formatINR(totals.grossWealth)}</span>
              <span aria-hidden="true">·</span>
              <span>Credit Dues {formatINR(totals.totalCCDue)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-5 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-200/70 dark:border-white/10">
            <div>
              <p className="text-xs text-slate-600 dark:text-white/75">Banks</p>
              <p className="text-sm sm:text-base font-normal text-slate-900 dark:text-white tabular-nums mt-0.5">
                {formatINR(totals.totalBankBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-white/75">Trading</p>
              <p className="text-sm sm:text-base font-normal text-slate-900 dark:text-white tabular-nums mt-0.5">
                {formatINR(totals.tradingCapital)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-white/75">FD &amp; PF</p>
              <p className="text-sm sm:text-base font-normal text-slate-900 dark:text-white tabular-nums mt-0.5">
                {formatINR(totals.totalInvestments)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Main Sub-Boxes: 1) Bank (ICICI & HDFC), 2) Trading Capital, 3) Investments (FD & PF) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 1) Bank Box with ICICI & HDFC sub-boxes */}
        <div className="glass-card rounded-2xl p-5 lg:col-span-6 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Bank Accounts
              </h2>
              <p className="text-xs text-slate-600 dark:text-white/75 mt-0.5 tabular-nums">
                Combined {formatINR(totals.totalBankBalance)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('banks')}
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
            >
              Manage Banks
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ICICI Sub-box */}
            <button
              type="button"
              onClick={() => onNavigateTab('banks')}
              className="glass-subcard rounded-xl p-4 text-left hover:border-sky-500/40 transition-colors group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <BankLogoBadge bankId="icici" className="w-8 h-8 shrink-0" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    ICICI Bank
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-400 transition-colors shrink-0" />
              </div>
              <p className="text-xl font-light text-slate-900 dark:text-white tabular-nums mt-3">
                {formatINR(iciciMetrics.balance)}
              </p>
              <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-200/70 dark:border-white/10 tabular-nums font-normal">
                <span className="text-emerald-600 dark:text-emerald-400">
                  Free {formatINR(iciciMetrics.availableBalance)}
                </span>
                <span className="text-sky-600 dark:text-sky-400">
                  Yet {formatINR(iciciMetrics.yetToSpend)}
                </span>
              </div>
            </button>

            {/* HDFC Sub-box */}
            <button
              type="button"
              onClick={() => onNavigateTab('banks')}
              className="glass-subcard rounded-xl p-4 text-left hover:border-sky-500/40 transition-colors group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <BankLogoBadge bankId="hdfc" className="w-8 h-8 shrink-0" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    HDFC Bank
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-400 transition-colors shrink-0" />
              </div>
              <p className="text-xl font-light text-slate-900 dark:text-white tabular-nums mt-3">
                {formatINR(hdfcMetrics.balance)}
              </p>
              <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-200/70 dark:border-white/10 tabular-nums font-normal">
                <span className="text-emerald-600 dark:text-emerald-400">
                  Free {formatINR(hdfcMetrics.availableBalance)}
                </span>
                <span className="text-sky-600 dark:text-sky-400">
                  Yet {formatINR(hdfcMetrics.yetToSpend)}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* 2) Trading Capital Box */}
        <div className="glass-card rounded-2xl p-5 lg:col-span-3 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Mt5Logo className="w-8 h-8 shrink-0" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Trading Capital
                </h2>
                <p className="text-xs text-slate-600 dark:text-white/75">MT5 Equity</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openAssetEditor('mt5')}
              className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-white/75 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
              aria-label="Edit Trading Capital"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-5">
            <p className="text-2xl font-light text-slate-900 dark:text-white tabular-nums">
              {formatINR(totals.tradingCapital)}
            </p>
            <button
              type="button"
              onClick={() => openAssetEditor('mt5')}
              className="mt-3 text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline min-h-[44px] inline-flex items-center"
            >
              Update MT5 Capital
            </button>
          </div>
        </div>

        {/* 3) Investments (FD and PF) Box */}
        <div className="glass-card rounded-2xl p-5 lg:col-span-3 flex flex-col justify-between">
          <div className="flex items-center gap-2.5 mb-4">
            <InvestmentLogo className="w-8 h-8 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Investments
              </h2>
              <p className="text-xs text-slate-600 dark:text-white/75 tabular-nums font-light">
                Total {formatINR(totals.totalInvestments)}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => openAssetEditor('fd')}
              className="w-full glass-subcard rounded-xl px-3.5 py-2.5 flex items-center justify-between hover:border-sky-500/40 transition-colors min-h-[48px]"
            >
              <div className="text-left">
                <span className="text-xs text-slate-600 dark:text-white/75 block">
                  Fixed Deposit (FD)
                </span>
                <span className="text-sm font-normal text-slate-900 dark:text-white tabular-nums">
                  {formatINR(totals.fd)}
                </span>
              </div>
              <Edit3 className="w-3.5 h-3.5 text-slate-400 dark:text-white/60" />
            </button>

            <button
              type="button"
              onClick={() => openAssetEditor('pf')}
              className="w-full glass-subcard rounded-xl px-3.5 py-2.5 flex items-center justify-between hover:border-sky-500/40 transition-colors min-h-[48px]"
            >
              <div className="text-left">
                <span className="text-xs text-slate-600 dark:text-white/75 block">
                  Provident Fund (PF)
                </span>
                <span className="text-sm font-normal text-slate-900 dark:text-white tabular-nums">
                  {formatINR(totals.pf)}
                </span>
              </div>
              <Edit3 className="w-3.5 h-3.5 text-slate-400 dark:text-white/60" />
            </button>
          </div>
        </div>
      </section>

      {/* Expected Monthly Expenses & Credit Cards Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Expected Monthly Expenses */}
        <div className="glass-card rounded-2xl p-5 lg:col-span-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Expected Monthly Expenses
              </h2>
              <p className="text-xs text-slate-600 dark:text-white/75 mt-0.5">
                Planned recurring outlays for the month
              </p>
            </div>
            <span className="text-xs text-slate-600 dark:text-white/75 tabular-nums">
              {state.expectedExpenses.length} items
            </span>
          </div>

          <form
            onSubmit={handleSaveExpectedExpense}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 mb-4"
          >
            <input
              type="text"
              value={expTitle}
              onChange={(e) => setExpTitle(e.target.value)}
              placeholder="Expense name (e.g. Rent)"
              className="sm:col-span-5 h-11 px-3.5 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
            <input
              type="number"
              inputMode="numeric"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              placeholder="Amount ₹"
              className="sm:col-span-3 h-11 px-3.5 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
            <select
              value={expBank}
              onChange={(e) => handleExpBankChange(e.target.value as BankId)}
              aria-label="Bank account"
              className="sm:col-span-2 h-11 px-2.5 rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              <option value="icici">ICICI</option>
              <option value="hdfc">HDFC</option>
            </select>
            <button
              type="submit"
              className="sm:col-span-2 h-11 px-3 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 font-semibold text-sm hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              {editingExp ? 'Save' : 'Add'}
            </button>
          </form>

          {state.expectedExpenses.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-white/70 py-6 text-center">
              No expected expenses added yet. Add your monthly commitments above.
            </p>
          ) : (
            <div className="divide-y divide-slate-200/70 dark:divide-white/10">
              {state.expectedExpenses.map((item) => {
                const catName =
                  state.banks[item.bankId].categories.find((c) => c.id === item.categoryId)?.name;
                return (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          item.isPaid
                            ? 'line-through text-slate-400 dark:text-white/40'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-white/70 mt-0.5 truncate">
                        {item.bankId.toUpperCase()}
                        {catName ? ` · ${catName}` : ''} · {item.isPaid ? 'Paid' : 'Planned'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm font-normal text-slate-900 dark:text-white tabular-nums mr-1">
                        {formatINR(item.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditExpected(item)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
                        aria-label={`Edit ${item.title}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteExpected(item.id)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 dark:text-white/60 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        aria-label={`Delete ${item.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-white/15 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800 dark:text-white">
              Total Expected Monthly Expenses
            </span>
            <span className="text-lg font-normal text-sky-600 dark:text-sky-400 tabular-nums">
              {formatINR(expectedTotal)}
            </span>
          </div>
        </div>

        {/* Credit Card Expenses: ICICI & HDFC separate categories */}
        <div className="lg:col-span-6 space-y-4">
          {(['icici_cc', 'hdfc_cc'] as CreditCardId[]).map((cardId) => {
            const isIcici = cardId === 'icici_cc';
            const bankId: BankId = isIcici ? 'icici' : 'hdfc';
            const cardName = isIcici ? 'ICICI Credit Card' : 'HDFC Credit Card';
            const cardItems = state.creditCardExpenses.filter((c) => c.card === cardId);
            const unpaidTotal = cardItems
              .filter((c) => !c.isPaid)
              .reduce((s, c) => s + c.amount, 0);

            return (
              <div key={cardId} className="glass-card rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <BankLogoBadge bankId={bankId} className="w-9 h-9 shrink-0" />
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-slate-400 dark:text-white/60" />
                        {cardName}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-white/75 tabular-nums">
                        Unpaid Bill {formatINR(unpaidTotal)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {unpaidTotal > 0 && (
                      <button
                        type="button"
                        onClick={() => settleAllCard(cardId)}
                        className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors whitespace-nowrap shrink-0"
                      >
                        Settle via {isIcici ? 'ICICI' : 'HDFC'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setCcModalCard(cardId);
                        setCcDate(toISODate(new Date()));
                      }}
                      className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 hover:opacity-90 inline-flex items-center gap-1 transition-opacity whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Spend
                    </button>
                  </div>
                </div>

                {cardItems.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-white/70 py-4 text-center">
                    No {cardName} expenses logged.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200/70 dark:divide-white/10">
                    {cardItems.map((item) => (
                      <div
                        key={item.id}
                        className="py-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleCcPaid(item.id)}
                            className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-xl transition-colors"
                            aria-label={
                              item.isPaid ? `Mark ${item.title} unpaid` : `Mark ${item.title} paid`
                            }
                          >
                            <span
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                item.isPaid
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-300 dark:border-slate-500'
                              }`}
                            >
                              {item.isPaid && <Check className="w-3.5 h-3.5" />}
                            </span>
                          </button>
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-medium truncate ${
                                item.isPaid
                                  ? 'line-through text-slate-400 dark:text-white/40'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {item.title}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-white/70">
                              {formatDisplayDate(item.date)} · {item.isPaid ? 'Paid' : 'Pending'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-sm font-normal text-slate-900 dark:text-white tabular-nums">
                            {formatINR(item.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteCcExpense(item.id)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 dark:text-white/60 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Edit Trading / Investment Asset Modal */}
      <BottomSheet
        open={editAsset !== null}
        onClose={() => setEditAsset(null)}
        title={
          editAsset === 'mt5'
            ? 'Update Trading Capital (MT5)'
            : editAsset === 'fd'
            ? 'Update Fixed Deposit (FD)'
            : 'Update Provident Fund (PF)'
        }
        subtitle="Enter current total valuation in INR"
      >
        <form onSubmit={saveAssetEditor} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Amount (INR ₹)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={assetInput}
              onChange={(e) => setAssetInput(e.target.value)}
              autoFocus
              className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-lg font-semibold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEditAsset(null)}
              className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-white/15 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold"
            >
              Save Value
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Add Credit Card Expense Modal */}
      <BottomSheet
        open={ccModalCard !== null}
        onClose={() => setCcModalCard(null)}
        title={ccModalCard === 'icici_cc' ? 'Add ICICI Credit Card Expense' : 'Add HDFC Credit Card Expense'}
        subtitle="Tracked separately under credit card liabilities"
      >
        <form onSubmit={handleAddCcExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={ccTitle}
              onChange={(e) => setCcTitle(e.target.value)}
              placeholder="e.g. Amazon order, Fuel, Dining"
              required
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Amount (INR ₹)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={ccAmount}
                onChange={(e) => setCcAmount(e.target.value)}
                placeholder="0"
                required
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={ccDate}
                onChange={(e) => setCcDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setCcModalCard(null)}
              className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-white/15 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold"
            >
              Add Expense
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
};
