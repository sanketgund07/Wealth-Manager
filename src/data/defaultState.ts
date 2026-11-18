import { WealthState } from '../types/wealth';
import { toISODate } from '../utils/format';

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function currentMonthDayISO(day: number): string {
  const now = new Date();
  const maxDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(day, maxDay);
  return toISODate(new Date(now.getFullYear(), now.getMonth(), safeDay));
}

export function createDefaultState(): WealthState {
  return {
    theme: 'dark',
    banks: {
      icici: {
        id: 'icici',
        name: 'ICICI Bank',
        shortName: 'ICICI',
        balance: 100000,
        categories: [
          {
            id: 'icici_cat_monthly',
            name: 'Monthly Expenses',
            allocated: 40000,
            spent: 0,
            kind: 'expense',
          },
          {
            id: 'icici_cat_savings',
            name: 'Core Savings',
            allocated: 45000,
            spent: 0,
            kind: 'savings',
          },
          {
            id: 'icici_cat_buffer',
            name: 'Emergency Buffer',
            allocated: 15000,
            spent: 0,
            kind: 'savings',
          },
        ],
      },
      hdfc: {
        id: 'hdfc',
        name: 'HDFC Bank',
        shortName: 'HDFC',
        balance: 145000,
        categories: [
          {
            id: 'hdfc_cat_bills',
            name: 'Bills & Utilities',
            allocated: 25000,
            spent: 4500,
            kind: 'expense',
          },
          {
            id: 'hdfc_cat_lifestyle',
            name: 'Lifestyle & Dining',
            allocated: 15000,
            spent: 2500,
            kind: 'expense',
          },
          {
            id: 'hdfc_cat_savings',
            name: 'SIP & Wealth Reserve',
            allocated: 80000,
            spent: 0,
            kind: 'savings',
          },
        ],
      },
    },
    investments: {
      mt5: 120000,
      fd: 300000,
      pf: 410000,
    },
    expectedExpenses: [
      {
        id: 'exp_rent',
        title: 'Apartment Rent',
        amount: 22000,
        bankId: 'icici',
        categoryId: 'icici_cat_monthly',
        isPaid: false,
      },
      {
        id: 'exp_groceries',
        title: 'Groceries & Household',
        amount: 9500,
        bankId: 'icici',
        categoryId: 'icici_cat_monthly',
        isPaid: false,
      },
      {
        id: 'exp_fuel',
        title: 'Fuel & Commute',
        amount: 4500,
        bankId: 'icici',
        categoryId: 'icici_cat_monthly',
        isPaid: false,
      },
      {
        id: 'exp_utilities',
        title: 'Electricity & Maid',
        amount: 4000,
        bankId: 'hdfc',
        categoryId: 'hdfc_cat_bills',
        isPaid: false,
      },
    ],
    creditCardExpenses: [
      {
        id: 'cc_icici_1',
        card: 'icici_cc',
        title: 'Amazon Electronics & Essentials',
        amount: 8400,
        date: addDaysISO(-4),
        isPaid: false,
      },
      {
        id: 'cc_icici_2',
        card: 'icici_cc',
        title: 'Dining & Coffee',
        amount: 2650,
        date: addDaysISO(-1),
        isPaid: false,
      },
      {
        id: 'cc_hdfc_1',
        card: 'hdfc_cc',
        title: 'Flight Booking (Domestic)',
        amount: 11200,
        date: addDaysISO(-6),
        isPaid: false,
      },
      {
        id: 'cc_hdfc_2',
        card: 'hdfc_cc',
        title: 'OTT & Cloud Subscriptions',
        amount: 1499,
        date: addDaysISO(-2),
        isPaid: false,
      },
    ],
    goals: [
      {
        id: 'goal_emergency',
        name: '12-Month Financial Runway',
        targetAmount: 1500000,
        targetDate: addDaysISO(240),
        mode: 'linked',
        manualCurrent: 0,
        linkedSources: ['icici', 'hdfc', 'mt5', 'pf', 'fd'],
      },
      {
        id: 'goal_liquid',
        name: 'Liquid Cash & Trading Target',
        targetAmount: 500000,
        targetDate: addDaysISO(95),
        mode: 'linked',
        manualCurrent: 0,
        linkedSources: ['icici', 'hdfc', 'mt5'],
      },
      {
        id: 'goal_trip',
        name: 'Japan Autumn Trip',
        targetAmount: 250000,
        targetDate: addDaysISO(160),
        mode: 'manual',
        manualCurrent: 115000,
        linkedSources: [],
      },
    ],
    expenseEntries: [
      {
        id: 'tx_1',
        title: 'BESCOM Electricity Bill',
        amount: 2800,
        categoryName: 'Bills & Utilities',
        source: 'hdfc',
        bankCategoryId: 'hdfc_cat_bills',
        date: addDaysISO(-3),
      },
      {
        id: 'tx_2',
        title: 'Broadband Fiber Plan',
        amount: 1700,
        categoryName: 'Bills & Utilities',
        source: 'hdfc',
        bankCategoryId: 'hdfc_cat_bills',
        date: addDaysISO(-5),
      },
      {
        id: 'tx_3',
        title: 'Weekend Dinner',
        amount: 2500,
        categoryName: 'Lifestyle & Dining',
        source: 'hdfc',
        bankCategoryId: 'hdfc_cat_lifestyle',
        date: addDaysISO(-2),
      },
    ],
    bills: [
      {
        id: 'bill_wifi',
        name: 'ACT Fibernet WiFi Renewal',
        amount: 1179,
        dueDate: addDaysISO(2),
        recurringMonthly: true,
        isDone: false,
        bankId: 'hdfc',
      },
      {
        id: 'bill_mobile',
        name: 'Jio Postpaid / Recharge',
        amount: 799,
        dueDate: addDaysISO(5),
        recurringMonthly: true,
        isDone: false,
        bankId: 'icici',
      },
      {
        id: 'bill_insurance',
        name: 'Health & Term Insurance',
        amount: 6450,
        dueDate: addDaysISO(9),
        recurringMonthly: false,
        isDone: false,
        bankId: 'hdfc',
      },
      {
        id: 'bill_rent',
        name: 'Monthly House Rent',
        amount: 22000,
        dueDate: currentMonthDayISO(28),
        recurringMonthly: true,
        isDone: false,
        bankId: 'icici',
      },
      {
        id: 'bill_gym',
        name: 'Fitness Membership',
        amount: 2000,
        dueDate: addDaysISO(-2),
        recurringMonthly: true,
        isDone: true,
        bankId: 'hdfc',
      },
    ],
  };
}

export function createBlankState(theme: 'dark' | 'light' = 'dark'): WealthState {
  return {
    theme,
    banks: {
      icici: {
        id: 'icici',
        name: 'ICICI Bank',
        shortName: 'ICICI',
        balance: 0,
        categories: [
          {
            id: 'icici_cat_monthly',
            name: 'Monthly Expenses',
            allocated: 0,
            spent: 0,
            kind: 'expense',
          },
          {
            id: 'icici_cat_savings',
            name: 'Savings',
            allocated: 0,
            spent: 0,
            kind: 'savings',
          },
        ],
      },
      hdfc: {
        id: 'hdfc',
        name: 'HDFC Bank',
        shortName: 'HDFC',
        balance: 0,
        categories: [
          {
            id: 'hdfc_cat_monthly',
            name: 'Monthly Expenses',
            allocated: 0,
            spent: 0,
            kind: 'expense',
          },
          {
            id: 'hdfc_cat_savings',
            name: 'Savings',
            allocated: 0,
            spent: 0,
            kind: 'savings',
          },
        ],
      },
    },
    investments: {
      mt5: 0,
      fd: 0,
      pf: 0,
    },
    expectedExpenses: [],
    creditCardExpenses: [],
    goals: [],
    expenseEntries: [],
    bills: [],
  };
}
