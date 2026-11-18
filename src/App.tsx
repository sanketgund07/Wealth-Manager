import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  Download,
  Landmark,
  Moon,
  Receipt,
  Sun,
  Target,
  Wallet,
} from 'lucide-react';
import { BanksTab } from './components/BanksTab';
import { CalendarTab } from './components/CalendarTab';
import { DataSheet } from './components/DataSheet';
import { ExpensesTab } from './components/ExpensesTab';
import { GoalsTab } from './components/GoalsTab';
import { WealthTab } from './components/WealthTab';
import { createBlankState, createDefaultState } from './data/defaultState';
import { TabId, WealthState } from './types/wealth';

const STORAGE_KEY = 'wealth_manager_state_v1';

const NAV_ITEMS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] =
  [
    { id: 'wealth', label: 'Wealth', icon: Wallet },
    { id: 'banks', label: 'Banks', icon: Landmark },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  ];

function loadInitialState(): WealthState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as WealthState;
      if (parsed && parsed.banks && parsed.investments) {
        return parsed;
      }
    }
  } catch {
    // Fallback to default state
  }
  return createDefaultState();
}

export default function App() {
  const [state, setState] = useState<WealthState>(loadInitialState);
  const [activeTab, setActiveTab] = useState<TabId>('wealth');
  const [dataSheetOpen, setDataSheetOpen] = useState(false);

  // Sync theme class on <html> and persist state
  useEffect(() => {
    const isDark = state.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const toggleTheme = () => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  return (
    <div className="min-h-[100dvh] relative text-slate-900 dark:text-white transition-colors duration-200">
      {/* Subtle Ambient Glassmorphism Backdrop */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-36 -left-24 w-[420px] h-[420px] rounded-full bg-sky-400/15 dark:bg-sky-500/12 blur-[110px]" />
        <div className="absolute top-1/3 -right-28 w-[400px] h-[400px] rounded-full bg-emerald-400/12 dark:bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-32 left-1/3 w-[380px] h-[380px] rounded-full bg-sky-300/12 dark:bg-sky-700/12 blur-[120px]" />
      </div>

      {/* Compact Sticky Top App Bar (52px) */}
      <header className="sticky top-0 z-30 h-[52px] glass-bar border-b px-4 sm:px-6">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('wealth')}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 text-left"
          >
            Wealth Manager
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setDataSheetOpen(true)}
              className="min-h-[44px] px-3 rounded-xl glass-subcard text-xs font-medium text-slate-700 dark:text-white hover:border-sky-500/40 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              aria-label="Export HTML or Backup Data"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">GitHub HTML / Backup</span>
              <span className="sm:hidden">Export</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass-subcard text-slate-700 dark:text-sky-300 hover:border-sky-500/40 transition-colors"
              aria-label={state.theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              title={state.theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
            >
              {state.theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-24">
        {activeTab === 'wealth' && (
          <WealthTab
            state={state}
            onUpdateState={setState}
            onNavigateTab={setActiveTab}
          />
        )}
        {activeTab === 'banks' && <BanksTab state={state} onUpdateState={setState} />}
        {activeTab === 'goals' && <GoalsTab state={state} onUpdateState={setState} />}
        {activeTab === 'expenses' && <ExpensesTab state={state} onUpdateState={setState} />}
        {activeTab === 'calendar' && <CalendarTab state={state} onUpdateState={setState} />}
      </main>

      {/* Fixed Bottom Tab Navigation (64px) */}
      <nav
        aria-label="Primary Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 glass-bar border-t pb-safe"
      >
        <div className="max-w-xl mx-auto h-16 grid grid-cols-5 items-center px-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors relative ${
                  isActive
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0.5 w-6 h-0.5 rounded-full bg-sky-500 dark:bg-sky-400" />
                )}
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium tracking-tight whitespace-nowrap shrink-0">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Export Single-File HTML & Backup Sheet */}
      <DataSheet
        open={dataSheetOpen}
        onClose={() => setDataSheetOpen(false)}
        state={state}
        onImportState={(next) => setState(next)}
        onResetSample={() => setState(createDefaultState())}
        onClearBlank={() => setState((prev) => createBlankState(prev.theme))}
      />
    </div>
  );
}
