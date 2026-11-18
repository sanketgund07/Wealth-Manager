import { WealthState } from '../types/wealth';

export function buildStandaloneHtml(currentState: WealthState): string {
  const serializedState = JSON.stringify(currentState, null, 2).replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="en" class="${currentState.theme === 'light' ? '' : 'dark'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Wealth Manager — Personal Net Worth & Expense Tracker</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Hind:wght@300;400;500;600;700&text=%E2%82%B9&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Hind"', '"DM Sans"', 'system-ui', 'sans-serif']
          }
        }
      }
    };
  </script>
  <style>
    body { font-family: 'Hind', 'DM Sans', system-ui, sans-serif; min-height: 100dvh; }
    .tabular-nums { font-variant-numeric: normal; }
    .glass-card {
      background: rgba(255, 255, 255, 0.74);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(15, 23, 42, 0.08);
    }
    .dark .glass-card {
      background: rgba(17, 24, 39, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.09);
    }
    .glass-sub {
      background: rgba(248, 250, 252, 0.7);
      border: 1px solid rgba(15, 23, 42, 0.07);
    }
    .dark .glass-sub {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
  </style>
</head>
<body class="bg-slate-100 text-slate-900 dark:bg-[#070b14] dark:text-white pb-24">
  <!-- Ambient Glass Background -->
  <div class="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
    <div class="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-sky-500/15 blur-3xl"></div>
    <div class="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl"></div>
  </div>

  <!-- Top Bar -->
  <header class="sticky top-0 z-30 h-14 px-4 border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#090d16]/85 backdrop-blur-xl">
    <div class="max-w-5xl mx-auto h-full flex items-center justify-between gap-4">
      <span class="text-lg font-bold tracking-tight dark:text-white">Wealth Manager</span>
      <div class="flex items-center gap-2">
        <button id="themeToggleBtn" class="h-10 px-3 rounded-xl glass-sub text-xs font-medium dark:text-white" type="button">Theme</button>
        <button id="resetDataBtn" class="h-10 px-3 rounded-xl glass-sub text-xs font-medium text-rose-500" type="button">Reset</button>
      </div>
    </div>
  </header>

  <main id="appRoot" class="max-w-5xl mx-auto px-4 py-5 space-y-6"></main>

  <!-- Fixed Bottom Navigation -->
  <nav class="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#090d16]/90 backdrop-blur-xl">
    <div id="bottomNav" class="max-w-xl mx-auto h-full grid grid-cols-5 items-center"></div>
  </nav>

  <script>
    // =========================================================================
    // EASY-TO-EDIT INITIAL DATA (Also saved automatically in browser localStorage)
    // =========================================================================
    const STORAGE_KEY = 'wealth_manager_single_html_v1';
    const DEFAULT_STATE = ${serializedState};

    let state = loadState();
    let activeTab = 'wealth';
    let calYear = new Date().getFullYear();
    let calMonth = new Date().getMonth();
    let calSelected = null;

    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : structuredClone(DEFAULT_STATE);
      } catch {
        return structuredClone(DEFAULT_STATE);
      }
    }

    function saveState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      applyTheme();
      render();
    }

    function applyTheme() {
      document.documentElement.classList.toggle('dark', state.theme !== 'light');
      document.getElementById('themeToggleBtn').textContent = state.theme === 'light' ? 'Dark Mode' : 'Light Mode';
    }

    const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(n || 0));
    const uid = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const todayIso = () => new Date().toISOString().slice(0, 10);
    const daysLeft = (iso) => {
      if (!iso) return 0;
      const now = new Date();
      const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const [y, m, d] = iso.split('-').map(Number);
      return Math.round((new Date(y, m - 1, d).getTime() - t0) / 86400000);
    };
    const daysLabel = (d) => d === 0 ? 'Due today' : d > 0 ? d + ' days left' : Math.abs(d) + ' days overdue';

    function bankMetrics(bank) {
      let yetToSpend = 0;
      for (const c of bank.categories) {
        if (c.kind === 'expense') yetToSpend += Math.max(0, c.allocated - c.spent);
      }
      return {
        balance: bank.balance,
        yetToSpend,
        available: bank.balance - yetToSpend
      };
    }

    function goalValue(g) {
      if (g.mode === 'manual') return g.manualCurrent || 0;
      const map = {
        icici: state.banks.icici.balance,
        hdfc: state.banks.hdfc.balance,
        mt5: state.investments.mt5,
        pf: state.investments.pf,
        fd: state.investments.fd
      };
      return (g.linkedSources || []).reduce((s, k) => s + (map[k] || 0), 0);
    }

    function iciciSvg() {
      return '<svg viewBox="0 0 40 40" class="w-8 h-8 shrink-0"><rect width="40" height="40" rx="10" fill="#B02A30"/><path d="M11 28.5C11 21.8 15.8 14.5 24.5 11.2C21.8 15.1 20.8 19.6 21.5 23.4C24.2 21.1 26.8 17.6 29 13.5C29.4 20.6 25.4 27.2 18.6 29.4C15.8 30.3 13 29.8 11 28.5Z" fill="#F37021"/></svg>';
    }

    function hdfcSvg() {
      return '<svg viewBox="0 0 40 40" class="w-8 h-8 shrink-0"><rect width="40" height="40" rx="10" fill="#004C8F"/><rect x="8" y="8" width="24" height="24" rx="2" fill="#ED1C24"/><rect x="13" y="13" width="14" height="14" fill="#FFF"/><rect x="18.6" y="8" width="2.8" height="24" fill="#FFF"/><rect x="8" y="18.6" width="24" height="2.8" fill="#FFF"/><rect x="16.5" y="16.5" width="7" height="7" fill="#004C8F"/></svg>';
    }

    function pencilSvg() {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>';
    }

    function renderNav() {
      const tabs = [
        { id: 'wealth', label: 'Wealth' },
        { id: 'banks', label: 'Banks' },
        { id: 'goals', label: 'Goals' },
        { id: 'expenses', label: 'Expenses' },
        { id: 'calendar', label: 'Calendar' }
      ];
      document.getElementById('bottomNav').innerHTML = tabs.map(t => {
        const active = activeTab === t.id;
        return '<button onclick="setTab(\\'' + t.id + '\\')" class="h-full flex flex-col items-center justify-center text-xs font-semibold ' + (active ? 'text-sky-500 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400') + '">' + t.label + '</button>';
      }).join('');
    }

    window.setTab = (id) => { activeTab = id; render(); };

    function render() {
      renderNav();
      const root = document.getElementById('appRoot');
      if (activeTab === 'wealth') root.innerHTML = renderWealth();
      else if (activeTab === 'banks') root.innerHTML = renderBanks();
      else if (activeTab === 'goals') root.innerHTML = renderGoals();
      else if (activeTab === 'expenses') root.innerHTML = renderExpenses();
      else root.innerHTML = renderCalendar();
    }

    function renderWealth() {
      const icici = bankMetrics(state.banks.icici);
      const hdfc = bankMetrics(state.banks.hdfc);
      const ccDue = state.creditCardExpenses.filter(c => !c.isPaid).reduce((s, c) => s + c.amount, 0);
      const gross = icici.balance + hdfc.balance + state.investments.mt5 + state.investments.fd + state.investments.pf;
      const netWorth = gross - ccDue;
      const expectedTotal = state.expectedExpenses.reduce((s, e) => s + e.amount, 0);

      return \`
        <section class="glass-card rounded-3xl p-6">
          <p class="text-xs uppercase tracking-[0.14em] text-amber-600 dark:text-[#F4C95D]">Total Net Worth</p>
          <h1 class="font-light text-4xl sm:text-5xl mt-2 tabular-nums text-slate-900 dark:text-white">\${inr(netWorth)}</h1>
          <p class="text-xs text-slate-600 dark:text-white/80 mt-2 tabular-nums font-light">Gross Assets \${inr(gross)} · Credit Dues \${inr(ccDue)}</p>
        </section>

        <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="glass-card rounded-2xl p-5 space-y-3">
            <div class="flex justify-between items-center"><h2 class="font-semibold dark:text-white">Bank Accounts</h2><button onclick="setTab('banks')" class="text-xs text-sky-500 dark:text-sky-400 font-medium">Manage</button></div>
            <div class="glass-sub rounded-xl p-3 flex items-center justify-between">
              <div class="flex items-center gap-2.5">\${iciciSvg()}<div><p class="text-sm font-semibold dark:text-white">ICICI</p><p class="text-xs text-emerald-500 tabular-nums">Free \${inr(icici.available)}</p></div></div>
              <div class="text-right"><p class="font-light tabular-nums dark:text-white">\${inr(icici.balance)}</p><p class="text-xs text-sky-500 dark:text-sky-400 tabular-nums">Yet \${inr(icici.yetToSpend)}</p></div>
            </div>
            <div class="glass-sub rounded-xl p-3 flex items-center justify-between">
              <div class="flex items-center gap-2.5">\${hdfcSvg()}<div><p class="text-sm font-semibold dark:text-white">HDFC</p><p class="text-xs text-emerald-500 tabular-nums">Free \${inr(hdfc.available)}</p></div></div>
              <div class="text-right"><p class="font-light tabular-nums dark:text-white">\${inr(hdfc.balance)}</p><p class="text-xs text-sky-500 dark:text-sky-400 tabular-nums">Yet \${inr(hdfc.yetToSpend)}</p></div>
            </div>
          </div>

          <div class="glass-card rounded-2xl p-5 flex flex-col justify-between">
            <div><h2 class="font-semibold dark:text-white">Trading Capital (MT5)</h2><p class="text-2xl font-light mt-4 tabular-nums dark:text-white">\${inr(state.investments.mt5)}</p></div>
            <button onclick="editInvest('mt5')" class="mt-4 h-10 rounded-xl glass-sub text-xs font-semibold text-sky-500 dark:text-sky-400">Update MT5 Capital</button>
          </div>

          <div class="glass-card rounded-2xl p-5 space-y-3">
            <h2 class="font-semibold dark:text-white">Investments (FD & PF)</h2>
            <button onclick="editInvest('fd')" class="w-full glass-sub rounded-xl p-3 flex justify-between items-center text-left"><span class="text-xs text-slate-500 dark:text-white/75">Fixed Deposit (FD)</span><span class="font-normal tabular-nums dark:text-white">\${inr(state.investments.fd)}</span></button>
            <button onclick="editInvest('pf')" class="w-full glass-sub rounded-xl p-3 flex justify-between items-center text-left"><span class="text-xs text-slate-500 dark:text-white/75">Provident Fund (PF)</span><span class="font-normal tabular-nums dark:text-white">\${inr(state.investments.pf)}</span></button>
          </div>
        </section>

        <section class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="glass-card rounded-2xl p-5">
            <h2 class="font-semibold mb-3 dark:text-white">Expected Monthly Expenses</h2>
            <form onsubmit="addExpected(event)" class="flex gap-2 mb-3">
              <input id="expTitle" required placeholder="Expense name" class="flex-1 h-10 px-3 rounded-xl glass-sub text-sm dark:text-white" />
              <input id="expAmt" required type="number" placeholder="₹" class="w-24 h-10 px-3 rounded-xl glass-sub text-sm tabular-nums dark:text-white" />
              <select id="expBank" class="h-10 px-2 rounded-xl glass-sub text-xs dark:text-white dark:bg-slate-800"><option value="icici">ICICI</option><option value="hdfc">HDFC</option></select>
              <button class="h-10 px-3 rounded-xl bg-sky-400 text-slate-950 font-semibold text-xs">Add</button>
            </form>
            <div class="divide-y divide-slate-200/70 dark:divide-white/10">
              \${state.expectedExpenses.map(e => '<div class="py-2.5 flex justify-between items-center text-sm"><div><p class="dark:text-white ' + (e.isPaid ? 'line-through opacity-50' : '') + '">' + e.title + '</p><p class="text-xs text-slate-500 dark:text-white/70">' + e.bankId.toUpperCase() + '</p></div><div class="flex items-center gap-3"><span class="font-semibold tabular-nums dark:text-white">' + inr(e.amount) + '</span><button onclick="delExpected(\\'' + e.id + '\\')" class="text-xs text-rose-500">Del</button></div></div>').join('')}
            </div>
            <div class="mt-3 pt-3 border-t border-slate-200/70 dark:border-white/10 flex justify-between font-bold">
              <span class="dark:text-white">Total</span><span class="text-sky-500 dark:text-sky-400 tabular-nums">\${inr(expectedTotal)}</span>
            </div>
          </div>

          <div class="space-y-4">
            \${['icici_cc', 'hdfc_cc'].map(card => {
              const items = state.creditCardExpenses.filter(c => c.card === card);
              const due = items.filter(c => !c.isPaid).reduce((s, c) => s + c.amount, 0);
              const title = card === 'icici_cc' ? 'ICICI Credit Card' : 'HDFC Credit Card';
              return '<div class="glass-card rounded-2xl p-5"><div class="flex justify-between items-center mb-3"><div><h3 class="font-semibold dark:text-white">' + title + '</h3><p class="text-xs text-slate-500 dark:text-white/75 tabular-nums">Pending ' + inr(due) + '</p></div><button onclick="promptCc(\\'' + card + '\\')" class="h-9 px-3 rounded-xl bg-sky-400 text-slate-950 text-xs font-semibold">+ Add</button></div>' +
                items.map(c => '<div class="py-2 flex justify-between items-center text-sm border-t border-slate-200/60 dark:border-white/10"><button onclick="toggleCc(\\'' + c.id + '\\')" class="text-left dark:text-white ' + (c.isPaid ? 'line-through opacity-50' : '') + '">' + c.title + '</button><div class="flex items-center gap-2"><span class="font-semibold tabular-nums dark:text-white">' + inr(c.amount) + '</span><button onclick="delCc(\\'' + c.id + '\\')" class="text-xs text-rose-500">Del</button></div></div>').join('') +
              '</div>';
            }).join('')}
          </div>
        </section>
      \`;
    }

    function renderBanks() {
      return '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">' + ['icici', 'hdfc'].map(id => {
        const bank = state.banks[id];
        const m = bankMetrics(bank);
        return \`
          <section class="glass-card rounded-3xl p-5 space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">\${id === 'icici' ? iciciSvg() : hdfcSvg()}<div><h2 class="text-lg font-semibold dark:text-white">\${bank.name}</h2><p class="text-xs text-slate-500 dark:text-white/75">Balance \${inr(m.balance)}</p></div></div>
              <button onclick="editBankBal('\${id}')" class="h-10 px-3 rounded-xl glass-sub text-xs font-semibold dark:text-white">Edit Balance</button>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3"><p class="text-xs text-emerald-500">Available Balance</p><p class="text-lg font-bold text-emerald-500 tabular-nums">\${inr(m.available)}</p></div>
              <div class="rounded-xl bg-sky-500/10 border border-sky-500/20 p-3"><p class="text-xs text-sky-400">Yet to Spend</p><p class="text-lg font-bold text-sky-400 tabular-nums">\${inr(m.yetToSpend)}</p></div>
            </div>
            <div class="flex justify-between items-center"><h3 class="text-sm font-semibold dark:text-white">Categories</h3><button onclick="addCat('\${id}')" class="h-9 px-3 rounded-xl bg-sky-400 text-slate-950 text-xs font-semibold">+ Category</button></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              \${bank.categories.map(c => '<div class="glass-sub rounded-xl p-3 space-y-2"><div class="flex justify-between items-start"><div><p class="font-semibold text-sm dark:text-white">' + c.name + '</p><p class="text-xs ' + (c.kind === 'expense' ? 'text-sky-400' : 'text-emerald-500') + '">' + (c.kind === 'expense' ? 'Planned Expense' : 'Savings') + '</p></div><button onclick="delCat(\\'' + id + '\\',\\'' + c.id + '\\')" class="text-xs text-rose-500">Del</button></div><div class="flex justify-between text-xs tabular-nums dark:text-white/80"><span>Left ' + inr(Math.max(0, c.allocated - c.spent)) + '</span><span>' + inr(c.allocated) + '</span></div><button onclick="spendCat(\\'' + id + '\\',\\'' + c.id + '\\')" class="w-full h-8 rounded-lg bg-sky-500/15 text-sky-400 text-xs font-semibold">Spend</button></div>').join('')}
            </div>
          </section>
        \`;
      }).join('') + '</div>';
    }

    function renderGoals() {
      return \`
        <div class="flex justify-between items-center"><h1 class="text-2xl font-bold dark:text-white">Goals</h1><button onclick="addGoal()" class="h-10 px-4 rounded-xl bg-sky-400 text-slate-950 text-xs font-semibold">+ New Goal</button></div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          \${state.goals.map(g => {
            const cur = goalValue(g);
            const pct = g.targetAmount > 0 ? Math.min(100, Math.round((cur / g.targetAmount) * 100)) : 0;
            const d = daysLeft(g.targetDate);
            return '<div class="glass-card rounded-2xl p-5 space-y-3"><div class="flex justify-between items-start"><div><h2 class="font-semibold dark:text-white">' + g.name + '</h2><p class="text-xs text-slate-500 dark:text-white/70">' + g.targetDate + ' · ' + daysLabel(d) + '</p></div><button onclick="delGoal(\\'' + g.id + '\\')" class="text-xs text-rose-500">Del</button></div><div class="flex justify-between items-baseline tabular-nums"><span class="text-lg font-bold dark:text-white">' + inr(cur) + '</span><span class="text-xs text-slate-500 dark:text-white/70">of ' + inr(g.targetAmount) + '</span></div><div class="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden"><div style="width:' + pct + '%" class="h-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-500"></div></div><p class="text-xs text-slate-500 dark:text-white/70">' + pct + '% · ' + (g.mode === 'linked' ? 'Linked: ' + (g.linkedSources || []).join(', ').toUpperCase() : 'Manual') + '</p></div>';
          }).join('')}
        </div>
      \`;
    }

    function renderExpenses() {
      const allCats = ['icici', 'hdfc'].flatMap(bId => state.banks[bId].categories.map(c => ({ bankId: bId, ...c })));
      return \`
        <h1 class="text-2xl font-bold dark:text-white">Expenses & Budgets</h1>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section class="glass-card rounded-2xl p-5 space-y-3">
            <h2 class="font-semibold dark:text-white">Log Spent Entry</h2>
            <form onsubmit="addSpend(event)" class="space-y-3">
              <input id="spTitle" required placeholder="Expense title" class="w-full h-10 px-3 rounded-xl glass-sub text-sm dark:text-white" />
              <input id="spAmt" required type="number" placeholder="Amount ₹" class="w-full h-10 px-3 rounded-xl glass-sub text-sm tabular-nums dark:text-white" />
              <select id="spBank" class="w-full h-10 px-3 rounded-xl glass-sub text-sm dark:text-white dark:bg-slate-800"><option value="icici">ICICI Bank</option><option value="hdfc">HDFC Bank</option></select>
              <select id="spCat" class="w-full h-10 px-3 rounded-xl glass-sub text-sm dark:text-white dark:bg-slate-800">
                \${allCats.map(c => '<option value="' + c.bankId + '|' + c.id + '">' + c.bankId.toUpperCase() + ' · ' + c.name + '</option>').join('')}
              </select>
              <button class="w-full h-10 rounded-xl bg-sky-400 text-slate-950 font-semibold text-sm">Record & Deduct</button>
            </form>
          </section>
          <section class="glass-card rounded-2xl p-5 space-y-2">
            <h2 class="font-semibold mb-2 dark:text-white">Planned Expenses Checklist</h2>
            \${state.expectedExpenses.map(e => '<div class="py-2.5 flex justify-between items-center border-b border-slate-200/60 dark:border-white/10 text-sm gap-2"><button onclick="toggleExp(\\'' + e.id + '\\')" class="flex-1 text-left dark:text-white ' + (e.isPaid ? 'line-through opacity-50' : '') + '">' + (e.isPaid ? '✓ ' : '○ ') + e.title + ' (' + e.bankId.toUpperCase() + ')</button><div class="flex items-center gap-2"><span class="font-semibold tabular-nums dark:text-white">' + inr(e.amount) + '</span><button onclick="editExpected(\\'' + e.id + '\\')" class="p-2 text-slate-400 hover:text-white" aria-label="Edit">' + pencilSvg() + '</button></div></div>').join('')}
          </section>
        </div>
      \`;
    }

    function renderCalendar() {
      const firstDay = new Date(calYear, calMonth, 1).getDay();
      const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
      const monthName = new Date(calYear, calMonth, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const sorted = [...state.bills].sort((a, b) => (a.isDone !== b.isDone ? (a.isDone ? 1 : -1) : a.dueDate.localeCompare(b.dueDate)));
      let cells = '';
      for (let i = 0; i < firstDay; i++) cells += '<div></div>';
      for (let d = 1; d <= totalDays; d++) {
        const iso = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        const has = state.bills.some(b => b.dueDate === iso && !b.isDone);
        cells += '<button onclick="selectCal(\\'' + iso + '\\')" class="h-11 rounded-xl text-xs font-medium dark:text-white ' + (calSelected === iso ? 'bg-sky-400 text-slate-950 font-bold' : 'glass-sub') + '">' + d + (has ? '<span class="block w-1.5 h-1.5 rounded-full bg-sky-400 mx-auto mt-0.5"></span>' : '') + '</button>';
      }
      return \`
        <div class="flex justify-between items-center"><h1 class="text-2xl font-bold dark:text-white">Bills Calendar</h1><button onclick="addBill()" class="h-10 px-4 rounded-xl bg-sky-400 text-slate-950 text-xs font-semibold">+ Add Bill</button></div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section class="glass-card rounded-2xl p-5">
            <div class="flex justify-between items-center mb-3"><h2 class="font-semibold dark:text-white">\${monthName}</h2><div class="flex gap-2"><button onclick="shiftMonth(-1)" class="h-9 px-3 rounded-lg glass-sub text-xs dark:text-white">Prev</button><button onclick="shiftMonth(1)" class="h-9 px-3 rounded-lg glass-sub text-xs dark:text-white">Next</button></div></div>
            <div class="grid grid-cols-7 gap-1.5">\${cells}</div>
          </section>
          <section class="glass-card rounded-2xl p-5 space-y-2">
            <h2 class="font-semibold mb-2 dark:text-white">Upcoming Payments First</h2>
            \${sorted.filter(b => !calSelected || b.dueDate === calSelected).map(b => '<div class="py-2.5 flex justify-between items-center border-b border-slate-200/60 dark:border-white/10 text-sm gap-2"><button onclick="toggleBill(\\'' + b.id + '\\')" class="flex-1 text-left dark:text-white ' + (b.isDone ? 'line-through opacity-50' : '') + '">' + (b.isDone ? '✓ ' : '○ ') + b.name + ' <span class="text-xs text-slate-500 dark:text-white/70">(' + b.dueDate + ')</span></button><div class="flex items-center gap-1.5 shrink-0"><span class="font-semibold tabular-nums dark:text-white">' + inr(b.amount) + '</span><button onclick="editOrDelBill(\\'' + b.id + '\\')" class="p-2 text-slate-400 hover:text-white" aria-label="Edit bill">' + pencilSvg() + '</button></div></div>').join('')}
          </section>
        </div>
      \`;
    }

    // Actions
    window.editInvest = (k) => { const v = prompt('Enter amount in INR:', state.investments[k]); if (v !== null) { state.investments[k] = Math.max(0, Number(v) || 0); saveState(); } };
    window.addExpected = (e) => { e.preventDefault(); state.expectedExpenses.push({ id: uid('exp'), title: expTitle.value.trim(), amount: Number(expAmt.value) || 0, bankId: expBank.value, isPaid: false }); saveState(); };
    window.editExpected = (id) => { const ex = state.expectedExpenses.find(x => x.id === id); if (!ex) return; const t = prompt('Edit expense name:', ex.title); if (t === null) return; const a = Number(prompt('Edit amount INR:', ex.amount) || ex.amount); ex.title = t.trim() || ex.title; ex.amount = Math.max(1, a); saveState(); };
    window.delExpected = (id) => { state.expectedExpenses = state.expectedExpenses.filter(x => x.id !== id); saveState(); };
    window.promptCc = (card) => { const t = prompt('Expense title:'); const a = Number(prompt('Amount INR:') || 0); if (t && a > 0) { state.creditCardExpenses.unshift({ id: uid('cc'), card, title: t, amount: a, date: todayIso(), isPaid: false }); saveState(); } };
    window.toggleCc = (id) => { state.creditCardExpenses = state.creditCardExpenses.map(c => c.id === id ? { ...c, isPaid: !c.isPaid } : c); saveState(); };
    window.delCc = (id) => { state.creditCardExpenses = state.creditCardExpenses.filter(c => c.id !== id); saveState(); };
    window.editBankBal = (id) => { const v = prompt('Enter total balance:', state.banks[id].balance); if (v !== null) { state.banks[id].balance = Math.max(0, Number(v) || 0); saveState(); } };
    window.addCat = (id) => { const name = prompt('Category name:'); const amt = Number(prompt('Allocated INR:') || 0); const kind = confirm('OK = Planned Expense (Sky Blue), Cancel = Savings (Green)') ? 'expense' : 'savings'; if (name) { state.banks[id].categories.push({ id: uid('cat'), name, allocated: amt, spent: 0, kind }); saveState(); } };
    window.delCat = (id, cid) => { state.banks[id].categories = state.banks[id].categories.filter(c => c.id !== cid); saveState(); };
    window.spendCat = (id, cid) => { const a = Number(prompt('Amount spent INR:') || 0); if (a > 0) { state.banks[id].balance = Math.max(0, state.banks[id].balance - a); state.banks[id].categories = state.banks[id].categories.map(c => c.id === cid ? { ...c, spent: c.spent + a } : c); saveState(); } };
    window.addGoal = () => { const name = prompt('Goal name:'); const targetAmount = Number(prompt('Target INR:') || 0); const targetDate = prompt('Expected Date (YYYY-MM-DD):', todayIso()); const linked = confirm('OK = Link to all wealth sources, Cancel = Manual value'); if (name && targetAmount > 0) { const manualCurrent = linked ? 0 : Number(prompt('Current saved INR:') || 0); state.goals.push({ id: uid('g'), name, targetAmount, targetDate: targetDate || todayIso(), mode: linked ? 'linked' : 'manual', manualCurrent, linkedSources: linked ? ['icici', 'hdfc', 'mt5', 'pf', 'fd'] : [] }); saveState(); } };
    window.delGoal = (id) => { state.goals = state.goals.filter(g => g.id !== id); saveState(); };
    window.addSpend = (e) => { e.preventDefault(); const amt = Number(spAmt.value) || 0; const [catBank, catId] = (spCat.value || '').split('|'); const b = catBank || spBank.value; if (amt > 0 && state.banks[b]) { state.banks[b].balance = Math.max(0, state.banks[b].balance - amt); state.banks[b].categories = state.banks[b].categories.map(c => c.id === catId ? { ...c, spent: c.spent + amt } : c); saveState(); } };
    window.toggleExp = (id) => { const ex = state.expectedExpenses.find(x => x.id === id); if (!ex) return; const next = !ex.isPaid; ex.isPaid = next; state.banks[ex.bankId].balance = Math.max(0, state.banks[ex.bankId].balance + (next ? -ex.amount : ex.amount)); saveState(); };
    window.shiftMonth = (d) => { calMonth += d; if (calMonth < 0) { calMonth = 11; calYear--; } if (calMonth > 11) { calMonth = 0; calYear++; } render(); };
    window.selectCal = (iso) => { calSelected = calSelected === iso ? null : iso; render(); };
    window.addBill = () => { const name = prompt('Bill name (e.g. WiFi, Recharge, Insurance):'); const amount = Number(prompt('Amount INR:') || 0); const dueDate = prompt('Due Date (YYYY-MM-DD):', calSelected || todayIso()); if (name && amount > 0) { state.bills.push({ id: uid('b'), name, amount, dueDate: dueDate || todayIso(), recurringMonthly: true, isDone: false }); saveState(); } };
    window.toggleBill = (id) => { state.bills = state.bills.map(b => b.id === id ? { ...b, isDone: !b.isDone } : b); saveState(); };
    window.editOrDelBill = (id) => { const b = state.bills.find(x => x.id === id); if (!b) return; const action = prompt('Edit name (or type DELETE to remove):', b.name); if (action === null) return; if (action.trim().toUpperCase() === 'DELETE') { state.bills = state.bills.filter(x => x.id !== id); saveState(); return; } const amt = Number(prompt('Amount INR:', b.amount) || b.amount); const due = prompt('Due Date (YYYY-MM-DD):', b.dueDate) || b.dueDate; b.name = action.trim() || b.name; b.amount = Math.max(1, amt); b.dueDate = due; saveState(); };

    document.getElementById('themeToggleBtn').onclick = () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; saveState(); };
    document.getElementById('resetDataBtn').onclick = () => { if (confirm('Reset back to default data?')) { state = structuredClone(DEFAULT_STATE); saveState(); } };

    applyTheme();
    render();
  </script>
</body>
</html>`;
}
