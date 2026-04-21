export type LinkPurpose = "credit" | "bank" | "loan";

export type AuditKind = "need" | "want" | "review" | "uncategorized";

export type SpendCategory =
  | "income"
  | "rent"
  | "groceries"
  | "restaurants"
  | "travel"
  | "subscriptions"
  | "amazon"
  | "transportation"
  | "utilities"
  | "shopping"
  | "entertainment"
  | "transfer"
  | "food"
  | "health"
  | "debt_payment"
  | "other"
  | "uncategorized";

export const CATEGORY_META: Record<SpendCategory, { label: string; emoji: string; essential: boolean }> = {
  income:         { label: "Income",         emoji: "💰", essential: false },
  rent:           { label: "Rent / Mortgage",emoji: "🏠", essential: true },
  groceries:      { label: "Groceries",      emoji: "🛒", essential: true },
  restaurants:    { label: "Restaurants",     emoji: "🍽️", essential: false },
  travel:         { label: "Travel",         emoji: "✈️", essential: false },
  subscriptions:  { label: "Subscriptions",  emoji: "📱", essential: false },
  amazon:         { label: "Amazon",         emoji: "📦", essential: false },
  transportation: { label: "Transportation", emoji: "🚗", essential: true },
  utilities:      { label: "Utilities",      emoji: "⚡", essential: true },
  shopping:       { label: "Shopping",       emoji: "🛍️", essential: false },
  entertainment:  { label: "Entertainment",  emoji: "🎮", essential: false },
  transfer:       { label: "Transfer",       emoji: "🔄", essential: false },
  food:           { label: "Food & Drink",   emoji: "☕", essential: false },
  health:         { label: "Health",         emoji: "🏥", essential: true },
  debt_payment:   { label: "Debt payments",  emoji: "📉", essential: true },
  other:          { label: "Other",          emoji: "📋", essential: false },
  uncategorized:  { label: "Uncategorized",  emoji: "❓", essential: false },
};

/** Pending confirmation — do not count as debt_payment until user confirms. */
export type DebtPaymentSuggestion = {
  debtId: string;
  debtName: string;
  matchedOn: "min_payment" | "scheduled_payment" | "last_payment";
};

export type TxRow = {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  pending?: boolean;
  /** Plaid account_id — used to show transactions under the correct linked account. */
  accountId?: string;
  /** Plaid account type for this transaction (credit, depository, loan, investment, …). */
  accountType?: string | null;
  /** Which Link item the row came from; use accountType for spend/income logic when set. */
  source?: "credit" | "bank";
  audit: AuditKind;
  category: SpendCategory;
  /** True when Plaid personal_finance_category marks this row as income (metrics use this only). */
  plaidPfcIncome?: boolean;
  /**
   * Inflow between the user’s own accounts (Plaid detailed PFC), not new money — exclude from “cash in”.
   */
  plaidLikelyInternalTransfer?: boolean;
  /** true when auto-categorization couldn't tell if income vs expense */
  ambiguous?: boolean;
  isRent?: boolean;
  topicLabel?: string;
  /**
   * Amount matches a linked debt payment (min / scheduled / last payment) — user must confirm before counting as debt_payment.
   */
  debtPaymentSuggestion?: DebtPaymentSuggestion;
};

/** Fields Plaid returns for student loans (servicer e.g. Aidvantage, Great Lakes). */
export type StudentLoanMeta = {
  loanName: string | null;
  expectedPayoffDate: string | null;
  nextPaymentDueDate: string | null;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;
  lastStatementIssueDate: string | null;
  /** Total owed on last statement (Plaid); can differ slightly from live account balance. */
  lastStatementBalance: number | null;
  originationPrincipalAmount: number | null;
  originationDate: string | null;
  outstandingInterestAmount: number | null;
  paymentReferenceNumber: string | null;
  accountNumber: string | null;
  sequenceNumber: string | null;
  isOverdue: boolean | null;
  loanStatusType: string | null;
  loanStatusEndDate: string | null;
  repaymentPlanDescription: string | null;
  repaymentPlanType: string | null;
  disbursementDates: string[] | null;
  ytdInterestPaid: number | null;
  ytdPrincipalPaid: number | null;
  guarantor: string | null;
  servicerAddressLine: string | null;
};

/** Manual mortgages: original term + product (linked loans may omit until user adds details). */
export type MortgageProductType =
  | "conventional_fixed"
  | "conventional_arm"
  | "fha"
  | "va"
  | "usda"
  | "jumbo"
  | "heloc"
  | "other";

export type MortgageMeta = {
  /** Original loan term in years at origination (e.g. 30). */
  termYears: number;
  productType: MortgageProductType;
};

export const MORTGAGE_PRODUCT_LABELS: Record<MortgageProductType, string> = {
  conventional_fixed: "Conventional (fixed)",
  conventional_arm: "Conventional (ARM)",
  fha: "FHA",
  va: "VA",
  usda: "USDA / RHS",
  jumbo: "Jumbo",
  heloc: "HELOC",
  other: "Other",
};

export type DebtRow = {
  id: string;
  name: string;
  balance: number;
  minPayment: number;
  apr?: number;
  source: "plaid" | "manual";
  /** Plaid liability kind when known (e.g. credit_card, student, auto_loan). */
  loanType?: string;
  /** Present for Plaid student loans when liabilities include extra servicer fields. */
  studentLoanMeta?: StudentLoanMeta;
  /** Term + program for home loans when captured (manual entry or user edit). */
  mortgageMeta?: MortgageMeta;
};

export type ManualCashRow = {
  id: string;
  label: string;
  amount: number;
  kind: "income" | "essential" | "discretionary";
};

/** Monthly rent + housing context (mortgage is a DebtRow, usually manual). */
export type HousingSnapshot = {
  /** Monthly rent if the user rents (not a loan balance). */
  monthlyRent: number | null;
};

export type PlaidTokenSlot = {
  access_token: string;
  item_id: string;
};

export type PlaidBundle = {
  /** All linked Plaid Items (preferred; unified cashflow + debt). */
  items?: PlaidTokenSlot[];
  /** @deprecated Merged into `items` via allPlaidItems() for older saves */
  credit?: PlaidTokenSlot;
  bank?: PlaidTokenSlot;
  extra?: PlaidTokenSlot[];
};

export type LinkedAccount = {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  mask: string | null;
  balance: number | null;
};
