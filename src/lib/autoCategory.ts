import { isCreditAccountTx } from "@/lib/txAccount";
import type { SpendCategory, TxRow } from "@/lib/types";

type Rule = { pattern: RegExp; category: SpendCategory };

/**
 * Patterns that are clearly identifiable as a specific category.
 * Order matters — first match wins.
 */
const rules: Rule[] = [
  // Income – high-confidence payroll keywords
  { pattern: /gusto|payroll|direct dep|paycheck|salary|adp|paychex/i, category: "income" },
  { pattern: /interest payment|dividend/i, category: "income" },

  // Debt payments (before generic "transfer" catches "payment")
  {
    pattern:
      /nelnet|navient|mohela|great lakes|fedloan|aidvantage|sofi|sallie Mae|student loan|loan payment|loanpay|credit card payment|card payment|autopay.*loan|loan autopay|lendingclub|upstart|marcus pay|earnest|edfinancial|osla|penfed|commonbond|cornerstone/i,
    category: "debt_payment",
  },

  // Transfers – clearly labeled movements
  { pattern: /transfer|xfer|wire|venmo|cashapp|cash app|zelle|paypal.*transfer/i, category: "transfer" },

  // Rent / Mortgage
  { pattern: /rent|mortgage|hoa|homeowner|landlord|property mgmt/i, category: "rent" },

  // Groceries
  { pattern: /whole foods|trader joe|kroger|safeway|publix|aldi|costco|walmart(?!\.com)|target(?!\.com)|heb|wegmans|sprouts|giant|food lion|piggly|stop.*shop/i, category: "groceries" },

  // Restaurants
  { pattern: /doordash|uber eats|grubhub|postmates|mcdonald|starbucks|chipotle|chick.fil|subway|domino|pizza|taco bell|wendy|burger|panera|dunkin|panda express|five guys|shake shack|noodles/i, category: "restaurants" },

  // Subscriptions
  { pattern: /netflix|spotify|hulu|disney\+|apple\.com|icloud|youtube.*premium|hbo|paramount|peacock|adobe|dropbox|google.*storage|microsoft 365|openai|chatgpt/i, category: "subscriptions" },

  // Amazon
  { pattern: /amazon|amzn|prime video/i, category: "amazon" },

  // Transportation
  { pattern: /uber(?! eats)|lyft|gas|shell|chevron|exxon|bp|speedway|parking|toll|transit|metro|bart|wmata/i, category: "transportation" },
  { pattern: /geico|state farm|allstate|progressive|car insurance|auto insurance/i, category: "transportation" },

  // Travel
  { pattern: /airline|united air|delta|american air|southwest|jetblue|spirit|frontier|hotel|marriott|hilton|hyatt|airbnb|vrbo|booking\.com|expedia|tsa/i, category: "travel" },
  { pattern: /touchstone climbing/i, category: "entertainment" },

  // Utilities
  { pattern: /electric|gas.*company|water.*utility|internet|comcast|verizon|at&t|t-mobile|sprint|xfinity|spectrum|cox|centurylink/i, category: "utilities" },

  // Health
  { pattern: /pharmacy|cvs|walgreens|doctor|hospital|medical|dental|optom|health|rx|copay|clinic/i, category: "health" },

  // Entertainment
  { pattern: /movie|theater|cinema|concert|ticket|steam|playstation|xbox|nintendo/i, category: "entertainment" },
  { pattern: /gym|fitness|peloton|planet fitness|equinox|crossfit/i, category: "health" },

  // Food & Drink
  { pattern: /coffee|cafe|bar\b|brewery|wine|liquor|boba/i, category: "food" },

  // Shopping
  { pattern: /target\.com|walmart\.com|best buy|apple store|nike|zara|h&m|nordstrom|macys|gap|old navy|tjmaxx|marshalls|ross|ikea|home depot|lowes/i, category: "shopping" },
];

/**
 * Patterns that signal ambiguity — could be income OR an expense.
 * "ACH Credit" might be a paycheck or a refund.
 * "Thank you" / "automatic payment" could be a bill pay or a credit.
 * "Refund" looks like income but it's really a reversed expense.
 */
const AMBIGUOUS_PATTERNS = /ach.*credit|ach.*debit|ach|automatic payment|autopay|payment.*thank|thank.*payment|bill pay|credit|refund|deposit|adjustment|courtesy|reversal|cr\b/i;

type DetectResult = {
  category: SpendCategory;
  ambiguous: boolean;
};

export function autoDetectCategory(tx: TxRow): DetectResult {
  for (const r of rules) {
    // "Transfer" matches payroll / ACH credits / wires in — those are inflows (negative on bank).
    // Tagging them as `transfer` zeroes cash-in metrics; keep them uncategorized for user review instead.
    if (
      r.category === "transfer" &&
      tx.amount < 0 &&
      !isCreditAccountTx(tx)
    ) {
      continue;
    }
    if (r.pattern.test(tx.merchant)) {
      return { category: r.category, ambiguous: false };
    }
  }

  if (AMBIGUOUS_PATTERNS.test(tx.merchant)) {
    return { category: "uncategorized", ambiguous: true };
  }

  // Positive amount on credit card that didn't match any rule → expense but unknown type
  if (tx.amount > 0 && isCreditAccountTx(tx)) {
    return { category: "uncategorized", ambiguous: false };
  }

  // Negative amount on depository that didn't match any rule → likely income but flag for confirmation
  if (tx.amount < 0 && !isCreditAccountTx(tx)) {
    return { category: "uncategorized", ambiguous: true };
  }

  // Negative on credit card, unknown merchant → ambiguous (payment? refund?)
  if (tx.amount < 0 && isCreditAccountTx(tx)) {
    return { category: "uncategorized", ambiguous: true };
  }

  return { category: "uncategorized", ambiguous: false };
}

export function autoCategorizeAll(txs: TxRow[]): TxRow[] {
  return txs.map((t) => {
    if (t.category !== "uncategorized") return t;
    const { category, ambiguous } = autoDetectCategory(t);
    return { ...t, category, ambiguous };
  });
}
