import React, { useState } from 'react';
import { Edit3, MinusCircle, Plus, Trash2 } from 'lucide-react';
import { BankCategory, BankId, WealthState } from '../types/wealth';
import { createId, formatINR, getBankMetrics, toISODate } from '../utils/format';
import { BankLogoBadge } from './BrandLogos';
import { BottomSheet } from './BottomSheet';

interface BanksTabProps {
  state: WealthState;
  onUpdateState: (updater: (prev: WealthState) => WealthState) => void;
}

export const BanksTab: React.FC<BanksTabProps> = ({ state, onUpdateState }) => {
  const [editingBank, setEditingBank] = useState<BankId | null>(null);
  const [balanceInput, setBalanceInput] = useState('');

  const [catModalBank, setCatModalBank] = useState<BankId | null>(null);
  const [editingCat, setEditingCat] = useState<BankCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catAllocated, setCatAllocated] = useState('');
  const [catKind, setCatKind] = useState<'expense' | 'savings'>('expense');

  const [spendTarget, setSpendTarget] = useState<{
    bankId: BankId;
    category: BankCategory;
  } | null>(null);
  const [spendTitle, setSpendTitle] = useState('');
  const [spendAmount, setSpendAmount] = useState('');

  const openBalanceEditor = (bankId: BankId) => {
    setEditingBank(bankId);
    setBalanceInput(String(state.banks[bankId].balance));
  };

  const saveBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBank) return;
    const val = Math.max(0, Number(balanceInput) || 0);
    onUpdateState((prev) => ({
      ...prev,
      banks: {
        ...prev.banks,
        [editingBank]: {
          ...prev.banks[editingBank],
          balance: val,
        },
      },
    }));
    setEditingBank(null);
  };

  const openAddCategory = (bankId: BankId) => {
    setCatModalBank(bankId);
    setEditingCat(null);
    setCatName('');
    setCatAllocated('');
    setCatKind('expense');
  };

  const openEditCategory = (bankId: BankId, cat: BankCategory) => {
    setCatModalBank(bankId);
    setEditingCat(cat);
    setCatName(cat.name);
    setCatAllocated(String(cat.allocated));
    setCatKind(cat.kind);
  };

  const saveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catModalBank || !catName.trim()) return;
    const allocated = Math.max(0, Number(catAllocated) || 0);

    onUpdateState((prev) => {
      const bank = prev.banks[catModalBank];
      const updatedCategories = editingCat
        ? bank.categories.map((c) =>
            c.id === editingCat.id
              ? { ...c, name: catName.trim(), allocated, kind: catKind }
              : c
          )
        : [
            ...bank.categories,
            {
              id: createId(`${catModalBank}_cat`),
              name: catName.trim(),
              allocated,
              spent: 0,
              kind: catKind,
            },
          ];

      return {
        ...prev,
        banks: {
          ...prev.banks,
          [catModalBank]: {
            ...bank,
            categories: updatedCategories,
          },
        },
      };
    });

    setCatModalBank(null);
    setEditingCat(null);
  };

  const deleteCategory = (bankId: BankId, catId: string) => {
    onUpdateState((prev) => ({
      ...prev,
      banks: {
        ...prev.banks,
        [bankId]: {
          ...prev.banks[bankId],
          categories: prev.banks[bankId].categories.filter((c) => c.id !== catId),
        },
      },
    }));
  };

  const handleQuickSpend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spendTarget) return;
    const amt = Math.max(0, Number(spendAmount) || 0);
    if (amt <= 0) return;

    const { bankId, category } = spendTarget;
    const title = spendTitle.trim() || `${category.name} Spend`;

    onUpdateState((prev) => {
      const bank = prev.banks[bankId];
      return {
        ...prev,
        banks: {
          ...prev.banks,
          [bankId]: {
            ...bank,
            balance: Math.max(0, bank.balance - amt),
            categories: bank.categories.map((c) =>
              c.id === category.id ? { ...c, spent: c.spent + amt } : c
            ),
          },
        },
        expenseEntries: [
          {
            id: createId('tx'),
            title,
            amount: amt,
            categoryName: category.name,
            source: bankId,
            bankCategoryId: category.id,
            date: toISODate(new Date()),
          },
          ...prev.expenseEntries,
        ],
      };
    });

    setSpendTarget(null);
    setSpendTitle('');
    setSpendAmount('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Bank Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-white/75 mt-1">
            Enter total bank balance and segregate funds into planned expenses (sky blue) and available reserves (green).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {(['icici', 'hdfc'] as BankId[]).map((bankId) => {
          const bank = state.banks[bankId];
          const metrics = getBankMetrics(bank);
          const safeTotal = Math.max(1, metrics.balance);
          const freePct = Math.max(0, Math.min(100, (metrics.availableBalance / safeTotal) * 100));
          const yetPct = Math.max(0, Math.min(100 - freePct, (metrics.yetToSpend / safeTotal) * 100));

          return (
            <section key={bankId} className="glass-card rounded-3xl p-5 sm:p-6 space-y-5">
              {/* Bank Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <BankLogoBadge bankId={bankId} className="w-11 h-11 shrink-0" />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {bank.name}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-white/75">
                      {bank.categories.length} segregated categories
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openBalanceEditor(bankId)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl glass-subcard text-xs font-medium text-slate-800 dark:text-white hover:border-sky-500/40 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Balance
                </button>
              </div>

              {/* Total Balance + Green / Sky Blue Split */}
              <div className="glass-subcard rounded-2xl p-4 space-y-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-white/75">
                    Current Bank Balance
                  </span>
                  <span className="text-2xl sm:text-3xl font-light text-slate-900 dark:text-white tabular-nums">
                    {formatINR(metrics.balance)}
                  </span>
                </div>

                {/* Proportional Visual Bar */}
                <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                  <div
                    style={{ width: `${freePct}%` }}
                    className="bg-emerald-500 transition-all duration-300"
                    title={`Available Balance: ${formatINR(metrics.availableBalance)}`}
                  />
                  <div
                    style={{ width: `${yetPct}%` }}
                    className="bg-sky-400 transition-all duration-300"
                    title={`Yet to Spend: ${formatINR(metrics.yetToSpend)}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
                    <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                      Available Balance
                    </p>
                    <p
                      className={`text-base sm:text-lg font-normal tabular-nums mt-0.5 ${
                        metrics.availableBalance < 0
                          ? 'text-rose-500'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatINR(metrics.availableBalance)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 px-3 py-2.5">
                    <p className="text-[11px] font-medium text-sky-700 dark:text-sky-300">
                      Yet to Spend
                    </p>
                    <p className="text-base sm:text-lg font-normal text-sky-600 dark:text-sky-400 tabular-nums mt-0.5">
                      {formatINR(metrics.yetToSpend)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Small Boxes Grid for Category-wise Segregation */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Category Segregation
                  </h3>
                  <button
                    type="button"
                    onClick={() => openAddCategory(bankId)}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Category
                  </button>
                </div>

                {bank.categories.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-white/70 py-5 text-center glass-subcard rounded-xl">
                    No categories yet. Add Savings or Monthly Expenses above.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {bank.categories.map((cat) => {
                      const remaining = Math.max(0, cat.allocated - cat.spent);
                      const isExpense = cat.kind === 'expense';
                      const pct =
                        cat.allocated > 0
                          ? Math.min(100, Math.round((cat.spent / cat.allocated) * 100))
                          : 0;

                      return (
                        <div
                          key={cat.id}
                          className="glass-subcard rounded-2xl p-3.5 flex flex-col justify-between gap-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {cat.name}
                              </p>
                              <p
                                className={`text-[11px] font-medium mt-0.5 ${
                                  isExpense
                                    ? 'text-sky-600 dark:text-sky-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {isExpense ? 'Planned Expense' : 'Savings Reserve'}
                              </p>
                            </div>
                            <div className="flex items-center shrink-0 -mr-1.5 -mt-1.5">
                              <button
                                type="button"
                                onClick={() => openEditCategory(bankId, cat)}
                                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                                aria-label={`Edit ${cat.name}`}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCategory(bankId, cat.id)}
                                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 dark:text-white/60 hover:text-rose-500 transition-colors"
                                aria-label={`Delete ${cat.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-baseline justify-between text-xs tabular-nums">
                              <span className="text-slate-600 dark:text-white/75">
                                Left {formatINR(remaining)}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {formatINR(cat.allocated)}
                              </span>
                            </div>

                            {isExpense && (
                              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                <div
                                  style={{ width: `${pct}%` }}
                                  className="h-full bg-sky-400 rounded-full transition-all duration-300"
                                />
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/70 dark:border-white/10">
                              <span className="text-[11px] text-slate-600 dark:text-white/75 tabular-nums">
                                Spent {formatINR(cat.spent)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSpendTarget({ bankId, category: cat });
                                  setSpendTitle('');
                                  setSpendAmount('');
                                }}
                                className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium text-sky-600 dark:text-sky-300 hover:bg-sky-500/15 inline-flex items-center gap-1 transition-colors"
                              >
                                <MinusCircle className="w-3.5 h-3.5" />
                                Spend
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Edit Bank Total Balance Modal */}
      <BottomSheet
        open={editingBank !== null}
        onClose={() => setEditingBank(null)}
        title={`Edit ${editingBank === 'icici' ? 'ICICI Bank' : 'HDFC Bank'} Balance`}
        subtitle="Enter current total account balance in INR"
      >
        <form onSubmit={saveBalance} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Total Balance (INR ₹)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              autoFocus
              className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-lg font-semibold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEditingBank(null)}
              className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-white/15 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold"
            >
              Save Balance
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Add / Edit Bank Category Modal */}
      <BottomSheet
        open={catModalBank !== null}
        onClose={() => setCatModalBank(null)}
        title={`${editingCat ? 'Edit' : 'Add'} ${
          catModalBank === 'icici' ? 'ICICI' : 'HDFC'
        } Category`}
        subtitle="Segregate bank funds into planned expenses or savings"
      >
        <form onSubmit={saveCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Category Name
            </label>
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Monthly Expenses, Savings, Rent"
              required
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Allocated Amount (INR ₹)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={catAllocated}
              onChange={(e) => setCatAllocated(e.target.value)}
              placeholder="0"
              required
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Segregation Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setCatKind('expense')}
                className={`h-10 rounded-lg text-xs font-semibold transition-colors ${
                  catKind === 'expense'
                    ? 'bg-sky-400 text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Planned Expense
              </button>
              <button
                type="button"
                onClick={() => setCatKind('savings')}
                className={`h-10 rounded-lg text-xs font-semibold transition-colors ${
                  catKind === 'savings'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Savings Reserve
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setCatModalBank(null)}
              className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-white/15 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold"
            >
              {editingCat ? 'Update Category' : 'Save Category'}
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Quick Spend from Category Modal */}
      <BottomSheet
        open={spendTarget !== null}
        onClose={() => setSpendTarget(null)}
        title={`Spend from ${spendTarget?.category.name ?? ''}`}
        subtitle={`Deducts automatically from ${
          spendTarget?.bankId === 'icici' ? 'ICICI Bank' : 'HDFC Bank'
        } balance`}
      >
        <form onSubmit={handleQuickSpend} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Expense Note
            </label>
            <input
              type="text"
              value={spendTitle}
              onChange={(e) => setSpendTitle(e.target.value)}
              placeholder={`e.g. ${spendTarget?.category.name ?? 'Expense'}`}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Amount Spent (INR ₹)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={spendAmount}
              onChange={(e) => setSpendAmount(e.target.value)}
              placeholder="0"
              required
              autoFocus
              className="w-full h-12 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-lg font-semibold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSpendTarget(null)}
              className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-white/15 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold"
            >
              Record &amp; Deduct
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
};
