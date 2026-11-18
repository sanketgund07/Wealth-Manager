import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  Repeat,
} from 'lucide-react';
import { BankId, BillReminder, WealthState } from '../types/wealth';
import {
  createId,
  formatDaysRemainingLabel,
  formatDisplayDate,
  formatINR,
  getDaysRemaining,
  toISODate,
} from '../utils/format';
import { BottomSheet } from './BottomSheet';

interface CalendarTabProps {
  state: WealthState;
  onUpdateState: (updater: (prev: WealthState) => WealthState) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarTab: React.FC<CalendarTabProps> = ({ state, onUpdateState }) => {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillReminder | null>(null);
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState(toISODate(now));
  const [billRecurring, setBillRecurring] = useState(true);
  const [billBank, setBillBank] = useState<BankId | ''>('icici');

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: { day: number | null; iso: string | null }[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null, iso: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        iso: toISODate(new Date(viewYear, viewMonth, d)),
      });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const billsByDate = useMemo(() => {
    const map = new Map<string, BillReminder[]>();
    for (const bill of state.bills) {
      const list = map.get(bill.dueDate) ?? [];
      list.push(bill);
      map.set(bill.dueDate, list);
    }
    return map;
  }, [state.bills]);

  const sortedBills = useMemo(() => {
    return [...state.bills].sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [state.bills]);

  const displayedList = selectedDate
    ? sortedBills.filter((b) => b.dueDate === selectedDate)
    : sortedBills;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const openAddBill = (defaultIso?: string) => {
    setEditingBill(null);
    setBillName('');
    setBillAmount('');
    setBillDueDate(defaultIso ?? selectedDate ?? toISODate(new Date()));
    setBillRecurring(true);
    setBillBank('icici');
    setSheetOpen(true);
  };

  const openEditBill = (bill: BillReminder) => {
    setEditingBill(bill);
    setBillName(bill.name);
    setBillAmount(String(bill.amount));
    setBillDueDate(bill.dueDate);
    setBillRecurring(bill.recurringMonthly);
    setBillBank(bill.bankId ?? '');
    setSheetOpen(true);
  };

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Math.max(0, Number(billAmount) || 0);
    if (!billName.trim() || amt <= 0 || !billDueDate) return;

    const newBill: BillReminder = {
      id: editingBill ? editingBill.id : createId('bill'),
      name: billName.trim(),
      amount: amt,
      dueDate: billDueDate,
      recurringMonthly: billRecurring,
      isDone: editingBill ? editingBill.isDone : false,
      bankId: billBank || undefined,
    };

    onUpdateState((prev) => ({
      ...prev,
      bills: editingBill
        ? prev.bills.map((b) => (b.id === editingBill.id ? newBill : b))
        : [...prev.bills, newBill],
    }));

    setSheetOpen(false);
  };

  const toggleBillDone = (bill: BillReminder) => {
    const nextDone = !bill.isDone;
    onUpdateState((prev) => {
      let nextBanks = prev.banks;
      if (bill.bankId) {
        const bank = prev.banks[bill.bankId];
        nextBanks = {
          ...prev.banks,
          [bill.bankId]: {
            ...bank,
            balance: nextDone
              ? Math.max(0, bank.balance - bill.amount)
              : bank.balance + bill.amount,
          },
        };
      }
      return {
        ...prev,
        banks: nextBanks,
        bills: prev.bills.map((b) => (b.id === bill.id ? { ...b, isDone: nextDone } : b)),
      };
    });
  };

  const deleteBill = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      bills: prev.bills.filter((b) => b.id !== id),
    }));
    setSheetOpen(false);
  };

  const pendingBillsTotal = state.bills
    .filter((b) => !b.isDone)
    .reduce((sum, b) => sum + b.amount, 0);

  const todayISO = toISODate(now);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Bills &amp; Due Calendar
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-white/75 mt-1">
            Track WiFi, mobile recharge, insurance, and recurring due dates. Pending total{' '}
            <span className="font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
              {formatINR(pendingBillsTotal)}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => openAddBill()}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Bill / Due Date
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Monthly Calendar Grid */}
        <section className="glass-card rounded-3xl p-4 sm:p-6 lg:col-span-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {monthLabel}
            </h2>
            <div className="flex items-center gap-1">
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="min-h-[40px] px-2.5 rounded-xl text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 mr-1"
                >
                  Show All
                </button>
              )}
              <button
                type="button"
                onClick={prevMonth}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass-subcard text-slate-700 dark:text-white hover:border-sky-500/40"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass-subcard text-slate-700 dark:text-white hover:border-sky-500/40"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="text-[11px] font-medium text-slate-600 dark:text-white/65 py-1"
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell, idx) => {
              if (!cell.day || !cell.iso) {
                return <div key={`empty_${idx}`} className="min-h-[48px]" />;
              }
              const dayBills = billsByDate.get(cell.iso) ?? [];
              const hasUnpaid = dayBills.some((b) => !b.isDone);
              const hasOverdue = dayBills.some((b) => !b.isDone && b.dueDate < todayISO);
              const allDone = dayBills.length > 0 && dayBills.every((b) => b.isDone);
              const isToday = cell.iso === todayISO;
              const isSelected = cell.iso === selectedDate;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() =>
                    setSelectedDate((prev) => (prev === cell.iso ? null : cell.iso))
                  }
                  className={`min-h-[48px] sm:min-h-[54px] rounded-xl flex flex-col items-center justify-center gap-1 border transition-colors tabular-nums ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 border-transparent font-bold'
                      : isToday
                      ? 'border-sky-500/60 bg-sky-500/10 text-slate-900 dark:text-white font-semibold'
                      : 'border-transparent hover:bg-slate-200/60 dark:hover:bg-white/5 text-slate-700 dark:text-white'
                  }`}
                >
                  <span className="text-xs sm:text-sm">{cell.day}</span>
                  {dayBills.length > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          hasOverdue
                            ? 'bg-rose-500'
                            : hasUnpaid
                            ? 'bg-sky-400'
                            : allDone
                            ? 'bg-emerald-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      {dayBills.length > 1 && (
                        <span className="text-[9px] opacity-80">{dayBills.length}</span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-200/70 dark:border-white/10 text-xs text-slate-600 dark:text-white/75">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              Upcoming Due
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Overdue
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Paid
            </span>
          </div>
        </section>

        {/* Upcoming Expenses 1st List */}
        <section className="glass-card rounded-3xl p-5 sm:p-6 lg:col-span-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {selectedDate
                  ? `Bills on ${formatDisplayDate(selectedDate)}`
                  : 'Upcoming Payments First'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-white/75 mt-0.5">
                {selectedDate
                  ? 'Tap Show All to view complete schedule'
                  : 'Sorted chronologically with unpaid bills on top'}
              </p>
            </div>
            {selectedDate && (
              <button
                type="button"
                onClick={() => openAddBill(selectedDate)}
                className="min-h-[40px] px-3 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Here
              </button>
            )}
          </div>

          {displayedList.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-white/70 py-8 text-center">
              {selectedDate
                ? 'No bills due on this date.'
                : 'No bills scheduled yet. Add WiFi, mobile recharge, or insurance reminders.'}
            </p>
          ) : (
            <div className="divide-y divide-slate-200/70 dark:divide-white/10">
              {displayedList.map((bill) => {
                const days = getDaysRemaining(bill.dueDate);
                return (
                  <div
                    key={bill.id}
                    className="py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleBillDone(bill)}
                        className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-xl shrink-0"
                        aria-label={bill.isDone ? `Mark ${bill.name} unpaid` : `Mark ${bill.name} paid`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                            bill.isDone
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 dark:border-slate-500'
                          }`}
                        >
                          {bill.isDone && <Check className="w-4 h-4" />}
                        </span>
                      </button>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium truncate ${
                            bill.isDone
                              ? 'line-through text-slate-400 dark:text-white/40'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {bill.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-600 dark:text-white/70 mt-0.5">
                          <span>{formatDisplayDate(bill.dueDate)}</span>
                          <span aria-hidden="true">·</span>
                          {bill.isDone ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Done
                            </span>
                          ) : (
                            <span
                              className={`font-medium ${
                                days < 0
                                  ? 'text-rose-500'
                                  : days <= 3
                                  ? 'text-sky-500'
                                  : 'text-slate-700 dark:text-white/85'
                              }`}
                            >
                              {formatDaysRemainingLabel(days)}
                            </span>
                          )}
                          {bill.recurringMonthly && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-0.5">
                                <Repeat className="w-3 h-3" />
                                Monthly
                              </span>
                            </>
                          )}
                          {bill.bankId && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{bill.bankId.toUpperCase()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                        {formatINR(bill.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditBill(bill)}
                        className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-400 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
                        aria-label={`Edit or delete ${bill.name}`}
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

      {/* Add / Edit Bill Modal (Delete action inside edit modal) */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingBill ? 'Edit Bill Reminder' : 'Add Bill / Payment Due'}
        subtitle="Track WiFi, mobile recharge, insurance, or subscriptions"
      >
        <form onSubmit={handleSaveBill} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Bill / Expense Name
            </label>
            <input
              type="text"
              value={billName}
              onChange={(e) => setBillName(e.target.value)}
              placeholder="e.g. WiFi Renewal, Jio Recharge, Health Insurance"
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
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                placeholder="1179"
                required
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={billDueDate}
                onChange={(e) => setBillDueDate(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Deduct From Bank When Ticked Done (Optional)
            </label>
            <select
              value={billBank}
              onChange={(e) => setBillBank(e.target.value as BankId | '')}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              <option value="icici">ICICI Bank</option>
              <option value="hdfc">HDFC Bank</option>
              <option value="">Track reminder only (No bank deduction)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setBillRecurring((v) => !v)}
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between text-sm text-slate-800 dark:text-slate-200"
          >
            <span className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-slate-400" />
              Recurring Monthly Bill
            </span>
            <span
              className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                billRecurring
                  ? 'bg-sky-400 border-sky-400 text-slate-950'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {billRecurring && <Check className="w-3.5 h-3.5" />}
            </span>
          </button>

          <div className="flex gap-3 pt-1">
            {editingBill && (
              <button
                type="button"
                onClick={() => deleteBill(editingBill.id)}
                className="h-11 px-4 rounded-xl border border-rose-500/30 text-sm font-medium text-rose-500 hover:bg-rose-500/10"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-white/15 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold"
            >
              {editingBill ? 'Update Bill' : 'Save Bill'}
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
};
