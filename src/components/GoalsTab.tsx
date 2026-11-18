import React, { useState } from 'react';
import { Calendar, Check, Edit3, Plus, Target, Trash2 } from 'lucide-react';
import { Goal, WealthSourceKey, WealthState } from '../types/wealth';
import {
  createId,
  formatDaysRemainingLabel,
  formatDisplayDate,
  formatINR,
  getDaysRemaining,
  getGoalCurrentAmount,
  getWealthSourceValue,
  toISODate,
} from '../utils/format';
import { BottomSheet } from './BottomSheet';

interface GoalsTabProps {
  state: WealthState;
  onUpdateState: (updater: (prev: WealthState) => WealthState) => void;
}

const WEALTH_SOURCE_OPTIONS: { key: WealthSourceKey; label: string }[] = [
  { key: 'icici', label: 'ICICI Bank' },
  { key: 'hdfc', label: 'HDFC Bank' },
  { key: 'mt5', label: 'MT5 Trading' },
  { key: 'pf', label: 'PF (Provident Fund)' },
  { key: 'fd', label: 'FD (Fixed Deposit)' },
];

export const GoalsTab: React.FC<GoalsTabProps> = ({ state, onUpdateState }) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [mode, setMode] = useState<'manual' | 'linked'>('linked');
  const [manualCurrent, setManualCurrent] = useState('');
  const [linkedSources, setLinkedSources] = useState<WealthSourceKey[]>(['icici', 'hdfc']);

  const openCreate = () => {
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 6);
    setEditingGoal(null);
    setName('');
    setTargetAmount('');
    setTargetDate(toISODate(defaultDate));
    setMode('linked');
    setManualCurrent('0');
    setLinkedSources(['icici', 'hdfc']);
    setSheetOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(String(goal.targetAmount));
    setTargetDate(goal.targetDate);
    setMode(goal.mode);
    setManualCurrent(String(goal.manualCurrent));
    setLinkedSources(goal.linkedSources);
    setSheetOpen(true);
  };

  const toggleSource = (key: WealthSourceKey) => {
    setLinkedSources((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const allSelected = linkedSources.length === WEALTH_SOURCE_OPTIONS.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setLinkedSources([]);
    } else {
      setLinkedSources(WEALTH_SOURCE_OPTIONS.map((o) => o.key));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const targetVal = Math.max(1, Number(targetAmount) || 0);
    if (!name.trim() || !targetDate) return;

    const goalData: Goal = {
      id: editingGoal ? editingGoal.id : createId('goal'),
      name: name.trim(),
      targetAmount: targetVal,
      targetDate,
      mode,
      manualCurrent: mode === 'manual' ? Math.max(0, Number(manualCurrent) || 0) : 0,
      linkedSources: mode === 'linked' ? linkedSources : [],
    };

    onUpdateState((prev) => ({
      ...prev,
      goals: editingGoal
        ? prev.goals.map((g) => (g.id === editingGoal.id ? goalData : g))
        : [goalData, ...prev.goals],
    }));

    setSheetOpen(false);
  };

  const handleDelete = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
    }));
  };

  const handleQuickAdjustManual = (goalId: string, delta: number) => {
    onUpdateState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId && g.mode === 'manual'
          ? { ...g, manualCurrent: Math.max(0, g.manualCurrent + delta) }
          : g
      ),
    }));
  };

  const linkedPreviewValue = linkedSources.reduce(
    (sum, key) => sum + getWealthSourceValue(state, key),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Financial Goals
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-white/75 mt-1">
            Track manual targets or auto-sync progress directly from ICICI, HDFC, MT5, PF, and FD.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {state.goals.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center space-y-3">
          <Target className="w-10 h-10 mx-auto text-slate-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            No Goals Created Yet
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-white/75 max-w-md mx-auto">
            Create a milestone with a target date and either update it manually or link it to your bank and investment accounts.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.goals.map((goal) => {
            const current = getGoalCurrentAmount(goal, state);
            const pct =
              goal.targetAmount > 0
                ? Math.min(100, Math.round((current / goal.targetAmount) * 100))
                : 0;
            const daysLeft = getDaysRemaining(goal.targetDate);
            const isComplete = current >= goal.targetAmount;

            return (
              <article
                key={goal.id}
                className="glass-card rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                        {goal.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 dark:text-white/70 mt-1">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDisplayDate(goal.targetDate)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-medium ${
                            daysLeft < 0
                              ? 'text-rose-500'
                              : daysLeft <= 14
                              ? 'text-sky-500'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatDaysRemainingLabel(daysLeft)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center shrink-0 -mr-2 -mt-2">
                      <button
                        type="button"
                        onClick={() => openEdit(goal)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
                        aria-label={`Edit ${goal.name}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(goal.id)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 dark:text-white/60 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        aria-label={`Delete ${goal.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Figures */}
                  <div className="mt-4">
                    <div className="flex items-baseline justify-between gap-2 tabular-nums">
                      <span className="text-xl font-light text-slate-900 dark:text-white">
                        {formatINR(current)}
                      </span>
                      <span className="text-xs font-normal text-slate-600 dark:text-white/70">
                        of {formatINR(goal.targetAmount)}
                      </span>
                    </div>

                    <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          isComplete
                            ? 'bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-500'
                            : 'bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-500'
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-1.5 text-xs tabular-nums">
                      <span
                        className={`font-semibold ${
                          isComplete
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-sky-600 dark:text-sky-400'
                        }`}
                      >
                        {pct}% {isComplete ? 'Achieved' : 'Funded'}
                      </span>
                      <span className="text-slate-600 dark:text-white/70">
                        {isComplete
                          ? 'Target met'
                          : `${formatINR(Math.max(0, goal.targetAmount - current))} left`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Mode Info */}
                <div className="pt-3 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-2">
                  {goal.mode === 'linked' ? (
                    <p className="text-xs text-slate-600 dark:text-white/70 truncate">
                      Auto-linked:{' '}
                      {goal.linkedSources.length === WEALTH_SOURCE_OPTIONS.length
                        ? 'All Wealth Sources'
                        : goal.linkedSources.map((s) => s.toUpperCase()).join(' · ') || 'None'}
                    </p>
                  ) : (
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-xs text-slate-600 dark:text-white/70">
                        Manual entry
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickAdjustManual(goal.id, 5000)}
                          className="min-h-[36px] px-2.5 rounded-lg glass-subcard text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/40"
                        >
                          +₹5,000
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(goal)}
                          className="min-h-[36px] px-2.5 rounded-lg glass-subcard text-xs font-medium text-slate-700 dark:text-white"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Goal Modal */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingGoal ? 'Update Goal' : 'Create New Goal'}
        subtitle="Set target amount, expected date, and funding source"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Goal Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home Downpayment, Emergency Fund"
              required
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Target Value (INR ₹)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="500000"
                required
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Expected Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Value Tracking Mode
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setMode('linked')}
                className={`h-10 rounded-lg text-xs font-semibold transition-colors ${
                  mode === 'linked'
                    ? 'bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Link Wealth Sources
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`h-10 rounded-lg text-xs font-semibold transition-colors ${
                  mode === 'manual'
                    ? 'bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Manual Amount
              </button>
            </div>
          </div>

          {mode === 'manual' ? (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Current Saved Value (INR ₹)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={manualCurrent}
                onChange={(e) => setManualCurrent(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Select Wealth Categories to Sync
                </span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline min-h-[36px] px-2"
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-2">
                {WEALTH_SOURCE_OPTIONS.map((opt) => {
                  const checked = linkedSources.includes(opt.key);
                  const val = getWealthSourceValue(state, opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleSource(opt.key)}
                      className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl border flex items-center justify-between text-left transition-colors ${
                        checked
                          ? 'border-sky-500/60 bg-sky-500/10'
                          : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                            checked
                              ? 'bg-sky-400 border-sky-400 text-slate-950'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {opt.label}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                        {formatINR(val)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1 text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                <span>Live Linked Total</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatINR(linkedPreviewValue)}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
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
              {editingGoal ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
};
