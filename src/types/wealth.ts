export type BankId = 'icici' | 'hdfc';
export type CreditCardId = 'icici_cc' | 'hdfc_cc';
export type PaymentSourceId = BankId | CreditCardId;
export type WealthSourceKey = 'icici' | 'hdfc' | 'mt5' | 'pf' | 'fd';
export type TabId = 'wealth' | 'banks' | 'goals' | 'expenses' | 'calendar';

export interface BankCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  kind: 'expense' | 'savings';
}

export interface BankAccount {
  id: BankId;
  name: string;
  shortName: string;
  balance: number;
  categories: BankCategory[];
}

export interface TradingInvestments {
  mt5: number;
  fd: number;
  pf: number;
}

export interface ExpectedExpense {
  id: string;
  title: string;
  amount: number;
  bankId: BankId;
  categoryId?: string;
  isPaid: boolean;
}

export interface CreditCardExpense {
  id: string;
  card: CreditCardId;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  isPaid: boolean;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string; // YYYY-MM-DD
  mode: 'manual' | 'linked';
  manualCurrent: number;
  linkedSources: WealthSourceKey[];
}

export interface ExpenseEntry {
  id: string;
  title: string;
  amount: number;
  categoryName: string;
  source: PaymentSourceId;
  bankCategoryId?: string;
  budgetBankId?: BankId;
  date: string; // YYYY-MM-DD
  plannedExpenseId?: string;
}

export interface BillReminder {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  recurringMonthly: boolean;
  isDone: boolean;
  bankId?: BankId;
}

export interface WealthState {
  theme: 'dark' | 'light';
  banks: Record<BankId, BankAccount>;
  investments: TradingInvestments;
  expectedExpenses: ExpectedExpense[];
  creditCardExpenses: CreditCardExpense[];
  goals: Goal[];
  expenseEntries: ExpenseEntry[];
  bills: BillReminder[];
}
