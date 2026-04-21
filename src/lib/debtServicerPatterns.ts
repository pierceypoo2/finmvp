/**
 * Loan servicers / bill-pay strings Plaid sometimes omits from LOAN_PAYMENTS PFC.
 * Used for transaction categorization (debt_payment) when amount is an outflow.
 */
export const LOAN_SERVICER_MERCHANT =
  /nelnet|navient|mohela|great\s+lakes|fedloan|aidvantage|sofi|sallie\s*mae|student\s+loan|loan\s+payment|loanpay|earnest|edfinancial|osla|penfed|commonbond|cornerstone|citizens\s+bank|discover\s+student|lendkey|dr\s*bank/i;
