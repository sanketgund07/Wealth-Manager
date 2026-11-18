import React, { useState } from 'react';
import { Check, Edit3, Plus, Trash2 } from 'lucide-react';
import {
  BankId,
  CreditCardId,
  ExpectedExpense,
  PaymentSourceId,
  WealthState,
} from '../types/wealth';
import { createId, formatDisplayDate, formatINR, toISODate } from '../utils/format';
import { BottomSheet } from './BottomSheet';

interface ExpensesTabProps {
  state: WealthState;
  onUpdateState: (updater: (prev: WealthState) => WealthState) => void;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({ state, onUpdateState }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<PaymentSourceId>('icici');
  const [selectedCatKey, setSelectedCatKey] = useState<string>(() => {
    const first = state.banks.icici.categories[0];
    return first ? `icici|${first.id}` : '';
  });
  const [date, setDate] = useState(toISODate(new Date()));

  // Quick Add Budget Category Modal
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatBank, setNewCatBank] = useState<BankId>('icici');
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');

  // Edit / Add Planned Expense Modal
  const [plannedModalOpen, setPlannedModalOpen] = useState(false);
  const [editingPlanned, setEditingPlanned] = useState<ExpectedExpense | null>(null);
  const [plannedTitle, setPlannedTitle] = useState('');
  const [plannedAmount, setPlannedAmount] = useState('');
  const [plannedBank, setPlannedBank] = useState<BankId>('icici');
  const [plannedCatId, setPlannedCatId] = useState('');

  const correspondingBankId: BankId =
    source === 'icici' || source === 'icici_cc' ? 'icici' : 'hdfc';

  const handleSourceChange = (nextSource: PaymentSourceId) => {
    setSource(nextSource);
    const bankKey: BankId =
      nextSource === 'icici' || nextSource === 'icici_cc' ? 'icici' : 'hdfc';
    const cats = state.banks[bankKey].categories;
    const defaultCat = cats.find((c) => c.kind === 'expense') ?? cats[0];
    setSelectedCatKey(defaultCat ? `${bankKey}|${defaultCat.id}` : '');
  };

  const handleCreateQuickCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const allocated = Math.max(0, Number(newCatBudget) || 0);
    const createdId = createId(`${newCatBank}_cat`);

    onUpdateState((prev) => ({
      ...prev,
      banks: {
        ...prev.banks,
        [newCatBank]: {
          ...prev.banks[newCatBank],
          categories: [
            ...prev.banks[newCatBank].categories,
            {
              id: createdId,
              name: newCatName.trim(),
              allocated,
              spent: 0,
              kind: 'expense',
            },
          ],
        },
      },
    }));

    setSelectedCatKey(`${newCatBank}|${createdId}`);
    setNewCatName('');
    setNewCatBudget('');
    setNewCatOpen(false);
  };

  // Tick or untick an already planned expense -> automatically updates bank balance & category spent
  const togglePlannedExpense = (exp: ExpectedExpense) => {
    const nextPaid = !exp.isPaid;

    onUpdateState((prev) => {
      const bank = prev.banks[exp.bankId];
      const targetCatId =
        exp.categoryId && bank.categories.some((c) => c.id === exp.categoryId)
          ? exp.categoryId
          : bank.categories.find((c) => c.kind === 'expense')?.id ?? bank.categories[0]?.id;

      const updatedBalance = nextPaid
        ? Math.max(0, bank.balance - exp.amount)
        : bank.balance + exp.amount;

      const updatedCategories = bank.categories.map((cat) => {
        if (cat.id !== targetCatId) return cat;
        return {
          ...cat,
          spent: nextPaid ? cat.spent + exp.amount : Math.max(0, cat.spent - exp.amount),
        };
      });

      const updatedEntries = nextPaid
        ? [
            {
              id: createId('tx'),
              title: exp.title,
              amount: exp.amount,
              categoryName:
                bank.categories.find((c) => c.id === targetCatId)?.name ?? 'Planned Expense',
              source: exp.bankId,
              bankCategoryId: targetCatId,
              date: toISODate(new Date()),
              plannedExpenseId: exp.id,
            },
            ...prev.expenseEntries,
          ]
        : prev.expenseEntries.filter((entry) => entry.plannedExpenseId !== exp.id);

      return {
        ...prev,
        banks: {
          ...prev.banks,
          [exp.bankId]: {
            ...bank,
            balance: updatedBalance,
            categories: updatedCategories,
          },
        },
        expectedExpenses: prev.expectedExpenses.map((item) =>
          item.id === exp.id ? { ...item, isPaid: nextPaid } : item
        ),
        expenseEntries: updatedEntries,
      };
    });
  };

  const openAddPlanned = () => {
    setEditingPlanned(null);
    setPlannedTitle('');
    setPlannedAmount('');
    setPlannedBank('icici');
    const cats = state.banks.icici.categories;
    setPlannedCatId((cats.find((c) => c.kind === 'expense') ?? cats[0])?.id ?? '');
    setPlannedModalOpen(true);
  };

  const openEditPlanned = (exp: ExpectedExpense) => {
    setEditingPlanned(exp);
    setPlannedTitle(exp.title);
    setPlannedAmount(String(exp.amount));
    setPlannedBank(exp.bankId);
    const cats = state.banks[exp.bankId].categories;
    setPlannedCatId(exp.categoryId ?? cats[0]?.id ?? '');
    setPlannedModalOpen(true);
  };

  const handleSavePlanned = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Math.max(1, Number(plannedAmount) || 0);
    if (!plannedTitle.trim()) return;

    const cats = state.banks[plannedBank].categories;
    const resolvedCatId =
      plannedCatId && cats.some((c) => c.id === plannedCatId)
        ? plannedCatId
        : (cats.find((c) => c.kind === 'expense') ?? cats[0])?.id;

    if (editingPlanned) {
      onUpdateState((prev) => ({
        ...prev,
        expectedExpenses: prev.expectedExpenses.map((item) =>
          item.id === editingPlanned.id
            ? {
                ...item,
                title: plannedTitle.trim(),
                amount: amt,
                bankId: plannedBank,
                categoryId: resolvedCatId,
              }
            : item
        ),
      }));
    } else {
      onUpdateState((prev) => ({
        ...prev,
        expectedExpenses: [
          ...prev.expectedExpenses,
          {
            id: createId('exp'),
            title: plannedTitle.trim(),
            amount: amt,
            bankId: plannedBank,
            categoryId: resolvedCatId,
            isPaid: false,
          },
        ],
      }));
    }

    setPlannedModalOpen(false);
  };

  const handleDeletePlanned = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      expectedExpenses: prev.expectedExpenses.filter((item) => item.id !== id),
    }));
    setPlannedModalOpen(false);
  };

  // Manual Spent Entry -> deducts from selected bank & budget category OR adds to credit card expenses
  const handleAddSpentEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Math.max(0, Number(amount) || 0);
    if (!title.trim() || amt <= 0) return;

    const cleanTitle = title.trim();
    const entryDate = date || toISODate(new Date());
    const [parsedBankId, parsedCatId] = selectedCatKey ? selectedCatKey.split('|') : ['', ''];
    const budgetBankId = (parsedBankId === 'icici' || parsedBankId === 'hdfc'
      ? parsedBankId
      : undefined) as BankId | undefined;
    const matchedCat = budgetBankId
      ? state.banks[budgetBankId].categories.find((c) => c.id === parsedCatId)
      : undefined;

    onUpdateState((prev) => {
      let nextBanks = { ...prev.banks };

      if (budgetBankId && matchedCat) {
        const b = nextBanks[budgetBankId];
        nextBanks[budgetBankId] = {
          ...b,
          categories: b.categories.map((c) =>
            c.id === matchedCat.id ? { ...c, spent: c.spent + amt } : c
          ),
        };
      }

      if (source === 'icici' || source === 'hdfc') {
        const payBank = nextBanks[source];
        nextBanks[source] = {
          ...payBank,
          balance: Math.max(0, payBank.balance - amt),
        };

        return {
          ...prev,
          banks: nextBanks,
          expenseEntries: [
            {
              id: createId('tx'),
              title: cleanTitle,
              amount: amt,
              categoryName: matchedCat?.name ?? 'General',
              source,
              bankCategoryId: matchedCat?.id,
              budgetBankId,
              date: entryDate,
            },
            ...prev.expenseEntries,
          ],
        };
      }

      // Credit Card expense (with optional budget category tag)
      const ccId: CreditCardId = source;
      return {
        ...prev,
        banks: nextBanks,
        creditCardExpenses: [
          {
            id: createId('cc'),
            card: ccId,
            title: cleanTitle,
            amount: amt,
            date: entryDate,
            isPaid: false,
          },
          ...prev.creditCardExpenses,
        ],
        expenseEntries: [
          {
            id: createId('tx'),
            title: cleanTitle,
            amount: amt,
            categoryName:
              matchedCat?.name ??
              (ccId === 'icici_cc' ? 'ICICI Credit Card' : 'HDFC Credit Card'),
            source: ccId,
            bankCategoryId: matchedCat?.id,
            budgetBankId,
            date: entryDate,
          },
          ...prev.expenseEntries,
        ],
      };
    });

    setTitle('');
    setAmount('');
  };

  const deleteExpenseEntry = (entryId: string) => {
    const entry = state.expenseEntries.find((e) => e.id === entryId);
    if (!entry) return;

    onUpdateState((prev) => {
      let nextBanks = { ...prev.banks };
      let nextExpected = prev.expectedExpenses;

      if (entry.source === 'icici' || entry.source === 'hdfc') {
        const bId: BankId = entry.source;
        nextBanks[bId] = {
          ...nextBanks[bId],
          balance: nextBanks[bId].balance + entry.amount,
        };
      }

      const catBankId =
        entry.budgetBankId ??
        (entry.source === 'icici' || entry.source === 'hdfc' ? entry.source : undefined);
      if (catBankId && entry.bankCategoryId) {
        const b = nextBanks[catBankId];
        nextBanks[catBankId] = {
          ...b,
          categories: b.categories.map((c) =>
            c.id === entry.bankCategoryId
              ? { ...c, spent: Math.max(0, c.spent - entry.amount) }
              : c
          ),
        };
      }

      if (entry.plannedExpenseId) {
        nextExpected = prev.expectedExpenses.map((ex) =>
          ex.id === entry.plannedExpenseId ? { ...ex, isPaid: false } : ex
        );
      }

      return {
        ...prev,
        banks: nextBanks,
        expectedExpenses: nextExpected,
        expenseEntries: prev.expenseEntries.filter((e) => e.id !== entryId),
      };
    });
  };

  const totalSpentLogged = state.expenseEntries.reduce((s, e) => s + e.amount, 0);
  const plannedPaidCount = state.expectedExpenses.filter((e) => e.isPaid).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Expenses &amp; Budgets
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-white/75 mt-1">
          Tick planned expenses or log a manual spend to deduct automatically from your bank balance and budget category.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Log Manual Expense + Planned Checklist */}
        <div className="lg:col-span-6 space-y-6">
          {/* Manual Spent Entry Form */}
          <section className="glass-card rounded-2xl p-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              Log New Spent Entry
            </h2>
            <p className="text-xs text-slate-600 dark:text-white/75 mb-4">
              Select payment source and budget category to track spending
            </p>

            <form onSubmit={handleAddSpentEntry} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Expense Name
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Supermarket, Petrol"
                    required
                    className="w-full h-11 px-3.5 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Amount (INR ₹)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    required
                    className="w-full h-11 px-3.5 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Payment Source
                  </label>
                  <select
                    value={source}
                    onChange={(e) => handleSourceChange(e.target.value as PaymentSourceId)}
                    className="w-full h-11 px-3 rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  >
                    <option value="icici">ICICI Bank ({formatINR(state.banks.icici.balance)})</option>
                    <option value="hdfc">HDFC Bank ({formatINR(state.banks.hdfc.balance)})</option>
                    <option value="icici_cc">ICICI Credit Card</option>
                    <option value="hdfc_cc">HDFC Credit Card</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Budget Category
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCatBank(correspondingBankId);
                        setNewCatOpen(true);
                      }}
                      className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      + New Category
                    </button>
                  </div>
                  <select
                    value={selectedCatKey}
                    onChange={(e) => setSelectedCatKey(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  >
                    <optgroup label="ICICI Bank Categories">
                      {state.banks.icici.categories.map((cat) => (
                        <option key={cat.id} value={`icici|${cat.id}`}>
                          ICICI · {cat.name} (Left {formatINR(Math.max(0, cat.allocated - cat.spent))})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="HDFC Bank Categories">
                      {state.banks.hdfc.categories.map((cat) => (
                        <option key={cat.id} value={`hdfc|${cat.id}`}>
                          HDFC · {cat.name} (Left {formatINR(Math.max(0, cat.allocated - cat.spent))})
                        </option>
                      ))}
                    </optgroup>
                    <option value="">General / Uncategorized</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Record Spent Entry
              </button>
            </form>
          </section>

          {/* Planned Expenses Checklist */}
          <section className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Planned Expenses Checklist
                </h2>
                <p className="text-xs text-slate-600 dark:text-white/75">
                  {plannedPaidCount}/{state.expectedExpenses.length} paid · Tick to deduct or pencil to edit
                </p>
              </div>
              <button
                type="button"
                onClick={openAddPlanned}
                className="min-h-[40px] px-3 rounded-xl glass-subcard text-xs font-semibold text-sky-600 dark:text-sky-400 hover:border-sky-500/40 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {state.expectedExpenses.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-white/70 py-5 text-center">
                No planned expenses yet. Tap Add above or add them on the Wealth page.
              </p>
            ) : (
              <div className="divide-y divide-slate-200/70 dark:divide-white/10">
                {state.expectedExpenses.map((exp) => {
                  const catName = state.banks[exp.bankId].categories.find(
                    (c) => c.id === exp.categoryId
                  )?.name;

                  return (
                    <div
                      key={exp.id}
                      className="py-2.5 flex items-center justify-between gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => togglePlannedExpense(exp)}
                        className="flex-1 min-w-0 min-h-[48px] flex items-center gap-3 text-left rounded-xl px-1.5 -ml-1.5 hover:bg-slate-100/40 dark:hover:bg-white/[0.03] transition-colors"
                      >
                        <span
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                            exp.isPaid
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 dark:border-slate-500'
                          }`}
                        >
                          {exp.isPaid && <Check className="w-4 h-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium truncate ${
                              exp.isPaid
                                ? 'line-through text-slate-400 dark:text-white/40'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {exp.title}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-white/70 truncate">
                            {exp.bankId.toUpperCase()}
                            {catName ? ` · ${catName}` : ''} · {exp.isPaid ? 'Deducted' : 'Pending'}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                          {formatINR(exp.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openEditPlanned(exp)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
                          aria-label={`Edit ${exp.title}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right: Category Budgets & Spent History */}
        <div className="lg:col-span-6 space-y-6">
          {/* Category Budget Status */}
          <section className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Category Budget Utilization
              </h2>
              <button
                type="button"
                onClick={() => setNewCatOpen(true)}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline min-h-[36px] px-2"
              >
                + Add Budget
              </button>
            </div>
            <div className="space-y-4">
              {(['icici', 'hdfc'] as BankId[]).map((bId) => {
                const bank = state.banks[bId];
                const expenseCats = bank.categories.filter((c) => c.kind === 'expense');
                if (expenseCats.length === 0) return null;
                return (
                  <div key={bId} className="space-y-2.5">
                    <p className="text-xs font-semibold text-slate-600 dark:text-white/75">
                      {bank.name}
                    </p>
                    {expenseCats.map((cat) => {
                      const pct =
                        cat.allocated > 0
                          ? Math.min(100, Math.round((cat.spent / cat.allocated) * 100))
                          : 0;
                      const over = cat.spent > cat.allocated;
                      return (
                        <div key={cat.id} className="glass-subcard rounded-xl p-3">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-medium text-slate-900 dark:text-white">
                              {cat.name}
                            </span>
                            <span className="tabular-nums text-slate-600 dark:text-white/80">
                              {formatINR(cat.spent)} / {formatINR(cat.allocated)}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className={`h-full rounded-full transition-all duration-300 ${
                                over ? 'bg-rose-500' : 'bg-sky-400'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent Spent Ledger */}
          <section className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Spent Ledger
              </h2>
              <span className="text-xs font-semibold text-slate-600 dark:text-white/80 tabular-nums">
                Total {formatINR(totalSpentLogged)}
              </span>
            </div>

            {state.expenseEntries.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-white/70 py-6 text-center">
                No spent transactions recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-200/70 dark:divide-white/10 max-h-[380px] overflow-y-auto pr-1">
                {state.expenseEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {entry.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-white/70 mt-0.5 truncate">
                        {entry.categoryName} · {entry.source.toUpperCase().replace('_', ' ')} ·{' '}
                        {formatDisplayDate(entry.date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                        -{formatINR(entry.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteExpenseEntry(entry.id)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 dark:text-white/60 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Remove & refund bank balance"
                        aria-label={`Delete ${entry.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Edit / Add Planned Expense Modal */}
      <BottomSheet
        open={plannedModalOpen}
        onClose={() => setPlannedModalOpen(false)}
        title={editingPlanned ? 'Edit Planned Expense' : 'Add Planned Expense'}
        subtitle="Changes sync directly with your Wealth overview"
      >
        <form onSubmit={handleSavePlanned} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Expense Name
            </label>
            <input
              type="text"
              value={plannedTitle}
              onChange={(e) => setPlannedTitle(e.target.value)}
              placeholder="e.g. Apartment Rent"
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
                value={plannedAmount}
                onChange={(e) => setPlannedAmount(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Bank
              </label>
              <select
                value={plannedBank}
                onChange={(e) => {
                  const b = e.target.value as BankId;
                  setPlannedBank(b);
                  const cats = state.banks[b].categories;
                  setPlannedCatId((cats.find((c) => c.kind === 'expense') ?? cats[0])?.id ?? '');
                }}
                className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              >
                <option value="icici">ICICI Bank</option>
                <option value="hdfc">HDFC Bank</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Budget Category
            </label>
            <select
              value={plannedCatId}
              onChange={(e) => setPlannedCatId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              {state.banks[plannedBank].categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            {editingPlanned && (
              <button
                type="button"
                onClick={() => handleDeletePlanned(editingPlanned.id)}
                className="h-11 px-4 rounded-xl border border-rose-500/30 text-sm font-medium text-rose-500 hover:bg-rose-500/10"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => setPlannedModalOpen(false)}
              className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-white/15 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold"
            >
              {editingPlanned ? 'Save Changes' : 'Add Planned'}
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Quick Create Budget Category Modal */}
      <BottomSheet
        open={newCatOpen}
        onClose={() => setNewCatOpen(false)}
        title="Add Budget Category"
        subtitle="Creates a budget category on your selected bank"
      >
        <form onSubmit={handleCreateQuickCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Bank Account
            </label>
            <select
              value={newCatBank}
              onChange={(e) => setNewCatBank(e.target.value as BankId)}
              className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              <option value="icici">ICICI Bank</option>
              <option value="hdfc">HDFC Bank</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Category Name
            </label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Dining, Travel, Groceries"
              required
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Monthly Budget (INR ₹)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={newCatBudget}
              onChange={(e) => setNewCatBudget(e.target.value)}
              placeholder="10000"
              required
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setNewCatOpen(false)}
              className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-white/15 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold"
            >
              Create Budget
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
};
