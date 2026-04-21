/**
 * Single catalog of point amounts (behavior is wired in pages + FinancialContext).
 *
 * **Anti-cheat:** Anything stored only in the browser (`ta_points`, award ids) can be
 * edited in devtools. Strong guarantees need a server ledger (Clerk user id + append-only
 * rows) and awards tied to verified signals (e.g. liability `last_statement_balance` down
 * month-over-month, or `debt_payment` txs matched to Plaid categories + amount caps).
 *
 * **Debt paydown (future):** Prefer awarding on server from normalized liability snapshots
 * or from confirmed payment rows, with monthly caps and minimum principal drop thresholds.
 */
export const POINTS = {
  TX_FIRST_CATEGORIZE: 10,
  TX_FIRST_AUDIT: 5,
  DISMISS_DEBT_SUGGEST: 5,
  MANUAL_DEBT_ADD: 25,
  MANUAL_MORTGAGE_FORM_BONUS: 75,
  LINK_ACCOUNT_GENERIC: 100,
  INTAKE_CREDIT_LINK: 200,
  INTAKE_CREDIT_SWIPE_DONE: 150,
  INTAKE_BANK_LINK: 200,
  INTAKE_BANK_SWIPE_DONE: 150,
  INTAKE_MORE_ACCOUNT: 100,
  INTAKE_FIX_EXTRA_LINK: 100,
  INTAKE_FINISH_CASHFLOW: 300,
  CALIBRATION_BATCH: 50,
  CALIBRATION_QUEUE_CLEAR: 200,
  DEBT_LOAN_LINK: 100,
  DEBT_CREDIT_DEBT_LINK: 500,
} as const;
