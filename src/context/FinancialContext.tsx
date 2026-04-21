"use client";

import type {
  AuditKind,
  DebtRow,
  HousingSnapshot,
  LinkedAccount,
  ManualCashRow,
  MortgageMeta,
  SpendCategory,
  TxRow,
} from "@/lib/types";
import { MORTGAGE_PRODUCT_LABELS } from "@/lib/types";
import { getCategoryLocks, mergeAudits, patchAudit } from "@/lib/auditStorage";
import { attachDebtPaymentSuggestions } from "@/lib/debtPaymentAmountMatch";
import {
  estimatedIncome30d,
  estimatedTotalOutflows30d,
  forCashflowWindow,
  manualCashRowTotals,
  manualMonthlyNet,
} from "@/lib/cashflow";
import {
  cheatCodeAprBandDebts as listCheatCodeAprBandDebts,
  hardBlockNoCheatDebts as listHardBlockNoCheatDebts,
  blockingHighAprDebts as listBlockingHighAprDebts,
  pillar3MathClear as computePillar3MathClear,
} from "@/lib/pillar3Gate";
import { tryConsumePointAwardId } from "@/lib/pointAwards";
import { POINTS } from "@/lib/pointsRules";
import { loadUnlockFlags, saveUnlockFlags } from "@/lib/unlocks";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type FinCtx = {
  transactions: TxRow[];
  accounts: LinkedAccount[];
  debts: DebtRow[];
  /** Plaid debts with user APR overrides applied (read-only merge). */
  debtsWithApr: DebtRow[];
  manualDebts: DebtRow[];
  manualCashRows: ManualCashRow[];
  manualMode: boolean;
  setManualMode: (v: boolean) => void;
  manualDebtEntryEnabled: boolean;
  setManualDebtEntryEnabled: (v: boolean) => void;
  points: number;
  addPoints: (n: number) => void;
  /** Grants points only the first time `id` is seen (persists id in localStorage). */
  awardPointsOnce: (id: string, n: number) => void;
  debtsComplete: boolean;
  setDebtsComplete: (v: boolean) => void;
  refreshTransactions: (year?: number, month?: number) => Promise<void>;
  selectedMonth: { year: number; month: number } | null;
  setSelectedMonth: (ym: { year: number; month: number } | null) => void;
  refreshDebts: () => Promise<void>;
  /** True after the first liabilities fetch finishes (success or error). */
  debtsInitialized: boolean;
  refreshAccounts: () => Promise<void>;
  unlinkAccount: (accountId: string) => Promise<void>;
  updateTxAudit: (id: string, audit: AuditKind) => void;
  updateTxCategory: (id: string, category: SpendCategory) => void;
  addManualDebt: (row: Omit<DebtRow, "id" | "source">) => string;
  removeManualDebt: (id: string) => void;
  updateManualDebt: (id: string, patch: Partial<Pick<DebtRow, "name" | "balance" | "minPayment" | "apr" | "mortgageMeta">>) => void;
  /** Set APR for any debt (Plaid overrides stored locally; manual updates the row). Pass undefined to clear Plaid override. */
  setDebtApr: (id: string, apr: number | undefined) => void;
  /** Term + loan type for linked mortgages (local override); manual debts use `updateManualDebt`. Pass undefined to clear. */
  setDebtMortgageMeta: (id: string, meta: MortgageMeta | undefined) => void;
  addManualCashRow: (row: Omit<ManualCashRow, "id">) => void;
  removeManualCashRow: (id: string) => void;
  trueFreeCashFlow: number;
  savingsRatePct: number | null;
  /** Rows with amount matching a linked debt — user must confirm before they count as debt_payment. */
  pendingDebtPaymentConfirmations: number;
  confirmDebtPaymentSuggestion: (txId: string) => void;
  dismissDebtPaymentSuggestion: (txId: string) => void;
  housingSnapshot: HousingSnapshot;
  setHousingSnapshot: (patch: Partial<HousingSnapshot>) => void;
  /** No debt above ~10% APR with a balance (unknown APR with balance blocks). */
  pillar3MathClear: boolean;
  debtsBlockingPillar3: DebtRow[];
  /** Known APR &gt; 15% with balance — cannot use refi cheat code; pay down first. */
  hardBlockDebtsNoCheat: DebtRow[];
  /** (10%, 15%] with balance — only band eligible for partner refi cheat when payment history qualifies. */
  debtsInCheatAprBand: DebtRow[];
  riskPillarSlideUnlocked: boolean;
  setRiskPillarSlideUnlocked: (v: boolean) => void;
  /** Partner lab / wealth deploy: cleared APR gate + Risk pillar slide. */
  wealthLabUnlocked: boolean;
};

const Ctx = createContext<FinCtx | null>(null);

const PTS = "ta_points";
const MDEBTS = "ta_manual_debts";
const MMODE = "ta_manual_mode";
const DCOMPLETE = "ta_debts_done";
const MCASH = "ta_manual_cash";
const DAPR = "ta_debt_apr_overrides";
const MDEBT_ENTRY = "ta_manual_debt_entry";
const DISMISS_DEBT_SUGGESTION = "ta_debt_suggestion_dismissed";
const HOUSING_KEY = "ta_housing_snapshot";
const MMORT = "ta_mortgage_meta_overrides";

function loadHousingSnapshot(): HousingSnapshot {
  if (typeof window === "undefined") return { monthlyRent: null };
  try {
    const raw = localStorage.getItem(HOUSING_KEY);
    if (!raw) return { monthlyRent: null };
    const j = JSON.parse(raw) as Partial<HousingSnapshot>;
    return {
      monthlyRent:
        typeof j.monthlyRent === "number" && Number.isFinite(j.monthlyRent) ? j.monthlyRent : null,
    };
  } catch {
    return { monthlyRent: null };
  }
}

function loadMortgageMetaOverrides(): Record<string, MortgageMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MMORT);
    if (!raw) return {};
    const j = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, MortgageMeta> = {};
    for (const [id, v] of Object.entries(j)) {
      if (!v || typeof v !== "object") continue;
      const o = v as Partial<MortgageMeta>;
      const ty = typeof o.termYears === "number" && Number.isFinite(o.termYears) ? o.termYears : null;
      const pt = typeof o.productType === "string" ? o.productType : null;
      if (
        ty != null &&
        ty >= 1 &&
        ty <= 50 &&
        pt &&
        Object.prototype.hasOwnProperty.call(MORTGAGE_PRODUCT_LABELS, pt)
      ) {
        out[id] = { termYears: Math.round(ty), productType: pt as MortgageMeta["productType"] };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function loadDismissedDebtSuggestionIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISS_DEBT_SUGGESTION);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function FinancialProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [debtsInitialized, setDebtsInitialized] = useState(false);
  const [manualDebts, setManualDebtsState] = useState<DebtRow[]>([]);
  const [manualCashRows, setManualCashRows] = useState<ManualCashRow[]>([]);
  const [manualMode, setManualModeState] = useState(false);
  const [points, setPoints] = useState(0);
  const [debtsComplete, setDebtsCompleteState] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
  const [aprOverrides, setAprOverridesState] = useState<Record<string, number>>({});
  const [mortgageMetaOverrides, setMortgageMetaOverridesState] = useState<Record<string, MortgageMeta>>({});
  const [manualDebtEntryEnabled, setManualDebtEntryState] = useState(false);
  const [dismissedDebtSuggestions, setDismissedDebtSuggestions] = useState<Set<string>>(() => new Set());
  const [housingSnapshot, setHousingSnapshotState] = useState<HousingSnapshot>({ monthlyRent: null });
  const [riskPillarSlideUnlocked, setRiskPillarSlideUnlockedState] = useState(false);

  useEffect(() => {
    setDismissedDebtSuggestions(loadDismissedDebtSuggestionIds());
  }, []);

  useEffect(() => {
    setHousingSnapshotState(loadHousingSnapshot());
  }, []);

  useEffect(() => {
    try {
      setPoints(Number(localStorage.getItem(PTS) || "0") || 0);
      setManualModeState(localStorage.getItem(MMODE) === "1");
      const md = localStorage.getItem(MDEBTS);
      if (md) setManualDebtsState(JSON.parse(md) as DebtRow[]);
      const mc = localStorage.getItem(MCASH);
      if (mc) setManualCashRows(JSON.parse(mc) as ManualCashRow[]);
      setDebtsCompleteState(localStorage.getItem(DCOMPLETE) === "1");
      const ao = localStorage.getItem(DAPR);
      if (ao) setAprOverridesState(JSON.parse(ao) as Record<string, number>);
      setMortgageMetaOverridesState(loadMortgageMetaOverrides());
      setManualDebtEntryState(localStorage.getItem(MDEBT_ENTRY) === "1");
      setRiskPillarSlideUnlockedState(!!loadUnlockFlags().riskPillarSlideUnlocked);
    } catch { /* ignore */ }
  }, []);

  const setManualMode = useCallback((v: boolean) => {
    setManualModeState(v);
    localStorage.setItem(MMODE, v ? "1" : "0");
  }, []);

  const addPoints = useCallback((n: number) => {
    setPoints((p) => {
      const next = p + n;
      localStorage.setItem(PTS, String(next));
      return next;
    });
  }, []);

  const awardPointsOnce = useCallback((id: string, n: number) => {
    if (!tryConsumePointAwardId(id)) return;
    setPoints((p) => {
      const next = p + n;
      localStorage.setItem(PTS, String(next));
      return next;
    });
  }, []);

  const setDebtsComplete = useCallback((v: boolean) => {
    setDebtsCompleteState(v);
    localStorage.setItem(DCOMPLETE, v ? "1" : "0");
  }, []);

  const setManualDebtEntryEnabled = useCallback((v: boolean) => {
    setManualDebtEntryState(v);
    localStorage.setItem(MDEBT_ENTRY, v ? "1" : "0");
  }, []);

  const debtsWithApr = useMemo(() => {
    return debts.map((d) => {
      const apr = aprOverrides[d.id] !== undefined ? aprOverrides[d.id] : d.apr;
      const mortgageMeta =
        d.source === "plaid" && d.loanType === "mortgage"
          ? mortgageMetaOverrides[d.id] ?? d.mortgageMeta
          : d.mortgageMeta;
      return { ...d, apr, mortgageMeta };
    });
  }, [debts, aprOverrides, mortgageMetaOverrides]);

  const allDebtsResolved = useMemo(
    () => [...debtsWithApr, ...manualDebts],
    [debtsWithApr, manualDebts],
  );

  const pillar3MathClear = useMemo(
    () => computePillar3MathClear(allDebtsResolved),
    [allDebtsResolved],
  );

  const debtsBlockingPillar3 = useMemo(
    () => listBlockingHighAprDebts(allDebtsResolved),
    [allDebtsResolved],
  );

  const hardBlockDebtsNoCheat = useMemo(
    () => listHardBlockNoCheatDebts(allDebtsResolved),
    [allDebtsResolved],
  );

  const debtsInCheatAprBand = useMemo(
    () => listCheatCodeAprBandDebts(allDebtsResolved),
    [allDebtsResolved],
  );

  const wealthLabUnlocked = pillar3MathClear && riskPillarSlideUnlocked;

  const setRiskPillarSlideUnlocked = useCallback((v: boolean) => {
    setRiskPillarSlideUnlockedState(v);
    saveUnlockFlags({ riskPillarSlideUnlocked: v });
  }, []);

  const transactionsResolved = useMemo(() => {
    const locks = typeof window !== "undefined" ? getCategoryLocks() : undefined;
    return attachDebtPaymentSuggestions(
      transactions,
      [...debtsWithApr, ...manualDebts],
      locks,
      dismissedDebtSuggestions,
    );
  }, [transactions, debtsWithApr, manualDebts, dismissedDebtSuggestions]);

  const pendingDebtPaymentConfirmations = useMemo(
    () => transactionsResolved.filter((t) => t.debtPaymentSuggestion).length,
    [transactionsResolved],
  );

  const dismissDebtPaymentSuggestion = useCallback((txId: string) => {
    setDismissedDebtSuggestions((prev) => {
      const next = new Set(prev);
      next.add(txId);
      if (typeof window !== "undefined") {
        localStorage.setItem(DISMISS_DEBT_SUGGESTION, JSON.stringify([...next]));
      }
      return next;
    });
    awardPointsOnce(`tx:debt_suggest_dismiss:${txId}`, POINTS.DISMISS_DEBT_SUGGEST);
  }, [awardPointsOnce]);

  const updateManualDebt = useCallback(
    (id: string, patch: Partial<Pick<DebtRow, "name" | "balance" | "minPayment" | "apr" | "mortgageMeta">>) => {
      setManualDebtsState((prev) => {
        const next = prev.map((d) => {
          if (d.id !== id) return d;
          const merged = { ...d, ...patch };
          if (Object.prototype.hasOwnProperty.call(patch, "apr") && patch.apr === undefined) {
            delete merged.apr;
          }
          if (Object.prototype.hasOwnProperty.call(patch, "mortgageMeta") && patch.mortgageMeta === undefined) {
            delete merged.mortgageMeta;
          }
          return merged;
        });
        localStorage.setItem(MDEBTS, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const setDebtApr = useCallback(
    (id: string, apr: number | undefined) => {
      const isManual = manualDebts.some((d) => d.id === id);
      if (isManual) {
        updateManualDebt(id, { apr: apr === undefined ? undefined : apr });
        return;
      }
      setAprOverridesState((prev) => {
        const next = { ...prev };
        if (apr === undefined || Number.isNaN(apr)) {
          delete next[id];
        } else {
          next[id] = Math.round(apr * 1000) / 1000;
        }
        localStorage.setItem(DAPR, JSON.stringify(next));
        return next;
      });
    },
    [manualDebts, updateManualDebt],
  );

  const setDebtMortgageMeta = useCallback(
    (id: string, meta: MortgageMeta | undefined) => {
      const isManual = manualDebts.some((d) => d.id === id);
      if (isManual) {
        updateManualDebt(id, { mortgageMeta: meta });
        return;
      }
      setMortgageMetaOverridesState((prev) => {
        const next = { ...prev };
        if (meta === undefined) {
          delete next[id];
        } else {
          next[id] = {
            termYears: meta.termYears,
            productType: meta.productType,
          };
        }
        localStorage.setItem(MMORT, JSON.stringify(next));
        return next;
      });
    },
    [manualDebts, updateManualDebt],
  );

  const refreshTransactions = useCallback(async (year?: number, month?: number) => {
    try {
      const qs = year && month ? `?year=${year}&month=${month}` : "";
      const r = await fetch(`/api/transactions${qs}`);
      if (!r.ok) return;
      const j = await r.json();
      setTransactions(mergeAudits((j.transactions || []) as TxRow[]));
    } catch { /* offline */ }
  }, []);

  const refreshDebts = useCallback(async () => {
    try {
      const r = await fetch("/api/liabilities");
      if (!r.ok) return;
      const j = await r.json();
      setDebts((j.debts || []) as DebtRow[]);
    } catch { /* offline */ }
    finally {
      setDebtsInitialized(true);
    }
  }, []);

  const refreshAccounts = useCallback(async () => {
    try {
      const r = await fetch("/api/accounts");
      if (!r.ok) return;
      const j = await r.json();
      setAccounts((j.accounts || []) as LinkedAccount[]);
    } catch { /* offline */ }
  }, []);

  const unlinkAccount = useCallback(async (accountId: string) => {
    try {
      const r = await fetch("/api/accounts/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (!r.ok) return;
      const j = (await r.json()) as { removedAccountIds?: string[] };
      const gone = Array.isArray(j.removedAccountIds) ? j.removedAccountIds : [];
      if (gone.length > 0) {
        setAccounts((prev) => prev.filter((a) => !gone.includes(a.id)));
        setTransactions((prev) => prev.filter((t) => !t.accountId || !gone.includes(t.accountId)));
      }
      await Promise.all([refreshTransactions(), refreshAccounts()]);
    } catch { /* offline */ }
  }, [refreshTransactions, refreshAccounts]);

  useEffect(() => {
    void refreshTransactions();
    void refreshDebts();
    void refreshAccounts();
  }, [refreshTransactions, refreshDebts, refreshAccounts]);

  const updateTxAudit = useCallback(
    (id: string, audit: AuditKind) => {
      patchAudit(id, { audit });
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, audit } : t)));
      awardPointsOnce(`tx:first_audit:${id}`, POINTS.TX_FIRST_AUDIT);
    },
    [awardPointsOnce],
  );

  const updateTxCategory = useCallback(
    (id: string, category: SpendCategory) => {
      const priorCategory = transactions.find((t) => t.id === id)?.category;
      const audit = category === "uncategorized" ? "uncategorized" as const : "need" as const;
      const tx = transactions.find((t) => t.id === id);
      patchAudit(id, { category, audit }, tx?.merchant);
      /** Re-merge from storage so merchant memory applies to all rows from that merchant. */
      setTransactions((prev) => mergeAudits(prev));
      if (priorCategory === "uncategorized" && category !== "uncategorized") {
        awardPointsOnce(`tx:first_category:${id}`, POINTS.TX_FIRST_CATEGORIZE);
      }
    },
    [awardPointsOnce, transactions],
  );

  const confirmDebtPaymentSuggestion = useCallback(
    (txId: string) => {
      updateTxCategory(txId, "debt_payment");
    },
    [updateTxCategory],
  );

  const addManualDebt = useCallback(
    (row: Omit<DebtRow, "id" | "source">): string => {
      const id = `manual-${Date.now()}`;
      const full: DebtRow = { ...row, id, source: "manual" };
      setManualDebtsState((prev) => {
        const next = [...prev, full];
        localStorage.setItem(MDEBTS, JSON.stringify(next));
        return next;
      });
      awardPointsOnce(`manual_debt:add:${id}`, POINTS.MANUAL_DEBT_ADD);
      return id;
    },
    [awardPointsOnce],
  );

  const removeManualDebt = useCallback((id: string) => {
    setManualDebtsState((prev) => {
      const next = prev.filter((d) => d.id !== id);
      localStorage.setItem(MDEBTS, JSON.stringify(next));
      return next;
    });
    setAprOverridesState((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      localStorage.setItem(DAPR, JSON.stringify(next));
      return next;
    });
    setMortgageMetaOverridesState((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      localStorage.setItem(MMORT, JSON.stringify(next));
      return next;
    });
  }, []);

  const setHousingSnapshot = useCallback((patch: Partial<HousingSnapshot>) => {
    setHousingSnapshotState((prev) => {
      const next: HousingSnapshot = {
        monthlyRent:
          patch.monthlyRent !== undefined ? patch.monthlyRent : prev.monthlyRent,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(HOUSING_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const addManualCashRow = useCallback((row: Omit<ManualCashRow, "id">) => {
    const full: ManualCashRow = { ...row, id: `mcash-${Date.now()}` };
    setManualCashRows((prev) => {
      const next = [...prev, full];
      localStorage.setItem(MCASH, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeManualCashRow = useCallback((id: string) => {
    setManualCashRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      localStorage.setItem(MCASH, JSON.stringify(next));
      return next;
    });
  }, []);

  const trueFreeCashFlow = useMemo(() => {
    if (manualMode) {
      return manualMonthlyNet(manualCashRows);
    }
    const windowed = forCashflowWindow(transactionsResolved, selectedMonth);
    const plaidIncome = estimatedIncome30d(windowed);
    const plaidOut = estimatedTotalOutflows30d(windowed);
    return Math.round((plaidIncome - plaidOut) * 100) / 100;
  }, [manualMode, manualCashRows, transactionsResolved, selectedMonth]);

  const savingsRatePct = useMemo(() => {
    if (manualMode) {
      const { income, essential, discretionary } = manualCashRowTotals(manualCashRows);
      if (income <= 0) return null;
      const net = income - essential - discretionary;
      return Math.round((net / income) * 1000) / 10;
    }
    if (!transactionsResolved.length) return null;
    const windowed = forCashflowWindow(transactionsResolved, selectedMonth);
    const plaidIncome = estimatedIncome30d(windowed);
    if (plaidIncome <= 0) return null;
    const plaidOut = estimatedTotalOutflows30d(windowed);
    const net = plaidIncome - plaidOut;
    const sr = net / plaidIncome;
    return Math.round(sr * 1000) / 10;
  }, [manualMode, manualCashRows, transactionsResolved, selectedMonth]);

  const value = useMemo<FinCtx>(
    () => ({
      transactions: transactionsResolved, accounts, debts, debtsWithApr, manualDebts, manualCashRows, manualMode, setManualMode,
      manualDebtEntryEnabled, setManualDebtEntryEnabled,
      points, addPoints, awardPointsOnce, debtsComplete, setDebtsComplete,
      refreshTransactions, selectedMonth, setSelectedMonth,
      refreshDebts, debtsInitialized, refreshAccounts, unlinkAccount,
      updateTxAudit, updateTxCategory, addManualDebt, removeManualDebt, updateManualDebt, setDebtApr, setDebtMortgageMeta,
      addManualCashRow, removeManualCashRow,
      trueFreeCashFlow, savingsRatePct,
      pendingDebtPaymentConfirmations, confirmDebtPaymentSuggestion, dismissDebtPaymentSuggestion,
      housingSnapshot, setHousingSnapshot,
      pillar3MathClear,
      debtsBlockingPillar3,
      hardBlockDebtsNoCheat,
      debtsInCheatAprBand,
      riskPillarSlideUnlocked,
      setRiskPillarSlideUnlocked,
      wealthLabUnlocked,
    }),
    [
      transactionsResolved, accounts, debts, debtsWithApr, manualDebts, manualCashRows, manualMode, setManualMode,
      manualDebtEntryEnabled, setManualDebtEntryEnabled,
      points, addPoints, awardPointsOnce, debtsComplete, setDebtsComplete,
      refreshTransactions, selectedMonth, setSelectedMonth,
      refreshDebts, debtsInitialized, refreshAccounts, unlinkAccount,
      updateTxAudit, updateTxCategory, addManualDebt, removeManualDebt, updateManualDebt, setDebtApr, setDebtMortgageMeta,
      addManualCashRow, removeManualCashRow,
      trueFreeCashFlow, savingsRatePct,
      pendingDebtPaymentConfirmations, confirmDebtPaymentSuggestion, dismissDebtPaymentSuggestion,
      housingSnapshot, setHousingSnapshot,
      pillar3MathClear,
      debtsBlockingPillar3,
      hardBlockDebtsNoCheat,
      debtsInCheatAprBand,
      riskPillarSlideUnlocked,
      setRiskPillarSlideUnlocked,
      wealthLabUnlocked,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFinancial() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFinancial must be inside FinancialProvider");
  return c;
}
