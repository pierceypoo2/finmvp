"use client";

import { GlassCard } from "@/components/GlassCard";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { SwipeDeck } from "@/components/SwipeDeck";
import { VaultMatch } from "@/components/VaultMatch";
import { useFinancial } from "@/context/FinancialContext";
import {
  essentialVsDiscretionary,
  estimatedDebtPayments30d,
  estimatedIncome30d,
  estimatedSpend30d,
  estimatedTotalOutflows30d,
  forCashflowWindow,
} from "@/lib/cashflow";
import { springSnappy } from "@/lib/motion";
import { isCreditAccountTx } from "@/lib/txAccount";
import { stablePointAwardId } from "@/lib/pointAwards";
import { POINTS } from "@/lib/pointsRules";
import { saveUnlockFlags } from "@/lib/unlocks";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, CreditCard, Landmark, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Step =
  | "credit_link"
  | "credit_game"
  | "bank_link"
  | "bank_game"
  | "more_accounts"
  | "summary"
  | "fix";

const BATCH = 8;
const LS_KEY = "ta_intake_step";

function loadStep(): Step {
  if (typeof window === "undefined") return "credit_link";
  return (localStorage.getItem(LS_KEY) as Step) || "credit_link";
}

function persistStep(s: Step) {
  localStorage.setItem(LS_KEY, s);
}

const pageTransition = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

export default function IntakePage() {
  const {
    transactions,
    accounts,
    refreshTransactions,
    refreshAccounts,
    awardPointsOnce,
    trueFreeCashFlow,
  } = useFinancial();

  const router = useRouter();
  const [step, setStep] = useState<Step>("credit_link");
  const [hydrated, setHydrated] = useState(false);
  const [gameMode, setGameMode] = useState<"swipe" | "match">("swipe");

  useEffect(() => {
    const saved = loadStep();
    setStep(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) persistStep(step);
  }, [step, hydrated]);

  const uncategorized = useMemo(
    () =>
      transactions.filter((t) => t.category === "uncategorized" && !t.debtPaymentSuggestion),
    [transactions],
  );

  const creditTxBatch = useMemo(
    () => uncategorized.filter((t) => isCreditAccountTx(t)).slice(0, BATCH),
    [uncategorized],
  );

  const bankTxBatch = useMemo(
    () => uncategorized.filter((t) => !isCreditAccountTx(t)).slice(0, BATCH),
    [uncategorized],
  );

  const gameBatch =
    step === "credit_game" ? creditTxBatch :
    step === "bank_game" ? bankTxBatch :
    uncategorized.slice(0, BATCH);

  const txRoll = useMemo(() => forCashflowWindow(transactions, null), [transactions]);
  const income = useMemo(() => estimatedIncome30d(txRoll), [txRoll]);
  const livingSpend = useMemo(() => estimatedSpend30d(txRoll), [txRoll]);
  const debtPayments = useMemo(() => estimatedDebtPayments30d(txRoll), [txRoll]);
  const totalOutflows = useMemo(() => estimatedTotalOutflows30d(txRoll), [txRoll]);
  const { essential } = useMemo(() => essentialVsDiscretionary(txRoll), [txRoll]);
  const cashflow = trueFreeCashFlow;

  const goTo = useCallback(
    (next: Step) => {
      setStep(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [],
  );

  const onCreditLinked = useCallback(async (info: { publicToken: string }) => {
    await Promise.all([refreshTransactions(), refreshAccounts()]);
    awardPointsOnce(
      stablePointAwardId("intake_credit_plaid", info.publicToken),
      POINTS.INTAKE_CREDIT_LINK,
    );
    saveUnlockFlags({ creditLinked: true });
    goTo("credit_game");
  }, [refreshTransactions, refreshAccounts, awardPointsOnce, goTo]);

  const onCreditGameDone = useCallback(() => {
    awardPointsOnce("milestone:intake_credit_swipe_done", POINTS.INTAKE_CREDIT_SWIPE_DONE);
    goTo("bank_link");
  }, [awardPointsOnce, goTo]);

  const onBankLinked = useCallback(async (info: { publicToken: string }) => {
    await Promise.all([refreshTransactions(), refreshAccounts()]);
    awardPointsOnce(
      stablePointAwardId("intake_bank_plaid", info.publicToken),
      POINTS.INTAKE_BANK_LINK,
    );
    saveUnlockFlags({ bankLinked: true });
    goTo("bank_game");
  }, [refreshTransactions, refreshAccounts, awardPointsOnce, goTo]);

  const onBankGameDone = useCallback(() => {
    awardPointsOnce("milestone:intake_bank_swipe_done", POINTS.INTAKE_BANK_SWIPE_DONE);
    goTo("more_accounts");
  }, [awardPointsOnce, goTo]);

  const onMoreAccountLinked = useCallback(
    async (info: { publicToken: string }) => {
      await Promise.all([refreshTransactions(), refreshAccounts()]);
      awardPointsOnce(
        stablePointAwardId("intake_more_account", info.publicToken),
        POINTS.INTAKE_MORE_ACCOUNT,
      );
    },
    [refreshTransactions, refreshAccounts, awardPointsOnce],
  );

  const finishCashflow = useCallback(() => {
    awardPointsOnce("milestone:intake_cashflow_complete", POINTS.INTAKE_FINISH_CASHFLOW);
    saveUnlockFlags({ cashflowComplete: true });
    localStorage.removeItem(LS_KEY);
    router.push("/dashboard");
  }, [awardPointsOnce, router]);

  const stepIndex =
    step === "credit_link" ? 0 :
    step === "credit_game" ? 1 :
    step === "bank_link" ? 2 :
    step === "bank_game" ? 3 :
    step === "more_accounts" ? 4 :
    5;

  if (!hydrated) return null;

  return (
    <div className="flex flex-col gap-8 pt-2">
      {/* progress dots */}
      <div className="flex items-center justify-center gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === stepIndex ? "w-5 bg-emerald-400" :
              i < stepIndex ? "w-1.5 bg-emerald-400/50" :
              "w-1.5 bg-white/15"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ────────────────── STEP 1: LINK CREDIT CARD ────────────────── */}
        {step === "credit_link" && (
          <motion.div key="credit_link" {...pageTransition} className="flex flex-col gap-8">
            <div>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500">
                <CreditCard className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-[clamp(1.75rem,5vw,2.5rem)] font-semibold leading-[1.1] tracking-tight">
                Connect your credit card
              </h1>
              <p className="mt-4 text-[15px] font-light leading-relaxed text-slate-500 dark:text-white/50">
                We&rsquo;ll start with your spending. Connect your primary credit card
                to see where your money actually goes.
              </p>
            </div>
            <PlaidLinkButton purpose="credit" onSuccess={onCreditLinked}>
              Connect credit card
            </PlaidLinkButton>
          </motion.div>
        )}

        {/* ────────────────── STEP 2: CREDIT CARD MINIGAME ────────────────── */}
        {step === "credit_game" && (
          <motion.div key="credit_game" {...pageTransition} className="flex flex-col gap-6">
            <div>
              <p className="label-light mb-2 text-emerald-400/70">Credit card transactions</p>
              <h1 className="text-2xl font-semibold tracking-tight">
                Quick calibration
              </h1>
              <p className="mt-3 text-[15px] font-light text-slate-500 dark:text-white/50">
                We&rsquo;ll guess the category — confirm or pick a different one.
              </p>
            </div>
            {gameBatch.length > 0 ? (
              gameMode === "swipe" ? (
                <SwipeDeck queue={gameBatch} onComplete={() => {
                  if (uncategorized.filter((t) => isCreditAccountTx(t)).length > BATCH) {
                    setGameMode("match");
                  } else {
                    onCreditGameDone();
                  }
                }} />
              ) : (
                <VaultMatch queue={gameBatch} onComplete={onCreditGameDone} />
              )
            ) : (
              <div className="flex flex-col items-center gap-4 py-10">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                <p className="text-sm font-light text-white/50">No transactions to calibrate yet.</p>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={onCreditGameDone}
                  className="hit-44 rounded-2xl bg-emerald-500/20 px-8 py-3.5 text-sm font-semibold text-emerald-300"
                >
                  Continue
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {/* ────────────────── STEP 3: LINK BANK ACCOUNT ────────────────── */}
        {step === "bank_link" && (
          <motion.div key="bank_link" {...pageTransition} className="flex flex-col gap-8">
            <div>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500">
                <Landmark className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-[clamp(1.75rem,5vw,2.5rem)] font-semibold leading-[1.1] tracking-tight">
                Now, your bank account
              </h1>
              <p className="mt-4 text-[15px] font-light leading-relaxed text-slate-500 dark:text-white/50">
                Connect the account where you get paid. This shows your income and
                completes your cash flow picture.
              </p>
            </div>
            <PlaidLinkButton purpose="bank" onSuccess={onBankLinked}>
              Connect checking account
            </PlaidLinkButton>
          </motion.div>
        )}

        {/* ────────────────── STEP 4: BANK MINIGAME ────────────────── */}
        {step === "bank_game" && (
          <motion.div key="bank_game" {...pageTransition} className="flex flex-col gap-6">
            <div>
              <p className="label-light mb-2 text-cyan-400/70">Bank transactions</p>
              <h1 className="text-2xl font-semibold tracking-tight">
                Quick calibration
              </h1>
              <p className="mt-3 text-[15px] font-light text-slate-500 dark:text-white/50">
                A few more from your bank — confirm or recategorize each one.
              </p>
            </div>
            {gameBatch.length > 0 ? (
              gameMode === "swipe" ? (
                <SwipeDeck queue={gameBatch} onComplete={() => {
                  if (uncategorized.filter((t) => !isCreditAccountTx(t)).length > BATCH) {
                    setGameMode("match");
                  } else {
                    onBankGameDone();
                  }
                }} />
              ) : (
                <VaultMatch queue={gameBatch} onComplete={onBankGameDone} />
              )
            ) : (
              <div className="flex flex-col items-center gap-4 py-10">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                <p className="text-sm font-light text-white/50">No transactions to calibrate yet.</p>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={onBankGameDone}
                  className="hit-44 rounded-2xl bg-emerald-500/20 px-8 py-3.5 text-sm font-semibold text-emerald-300"
                >
                  Continue
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {/* ────────────────── STEP 5: MORE ACCOUNTS? ────────────────── */}
        {step === "more_accounts" && (
          <motion.div key="more_accounts" {...pageTransition} className="flex flex-col gap-8">
            <div>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500">
                <Link2 className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-[clamp(1.75rem,5vw,2.5rem)] font-semibold leading-[1.1] tracking-tight">
                Any other accounts?
              </h1>
              <p className="mt-4 text-[15px] font-light leading-relaxed text-slate-500 dark:text-white/50">
                Venmo, CashApp, a secondary checking — adding more accounts gives
                a more accurate picture.
              </p>
            </div>

            <PlaidLinkButton purpose="bank" onSuccess={onMoreAccountLinked}>
              Link another account
            </PlaidLinkButton>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              transition={springSnappy}
              onClick={() => goTo("summary")}
              className="hit-44 rounded-2xl border border-white/10 py-4 text-[15px] font-light text-slate-500 dark:text-white/50"
            >
              No, show me my results
            </motion.button>
          </motion.div>
        )}

        {/* ────────────────── STEP 6: CASHFLOW SUMMARY ────────────────── */}
        {(step === "summary" || step === "fix") && (
          <motion.div key="summary" {...pageTransition} className="flex flex-col gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <GlassCard className="py-8">
                <p className="label-light mb-6 text-center text-slate-400 dark:text-white/35">
                  Your Cash Flow
                </p>

                <div className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[15px] font-medium">Monthly Income</span>
                    <span className="numeral text-lg font-semibold">
                      ${income.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[15px] font-medium">Living &amp; other spending</span>
                    <span className="numeral text-lg font-semibold">
                      ${livingSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[15px] font-medium">Debt payments</span>
                    <span className="numeral text-lg font-semibold">
                      ${debtPayments.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-light text-slate-400 dark:text-white/35">
                      Total outflows
                    </span>
                    <span className="numeral text-sm font-light text-slate-400 dark:text-white/35">
                      ${totalOutflows.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-light text-slate-400 dark:text-white/35">
                      Essential spending
                    </span>
                    <span className="numeral text-sm font-light text-slate-400 dark:text-white/35">
                      ${essential.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  <div className="border-t border-white/[0.08] pt-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[15px] font-semibold">Total Cashflow</span>
                      <span className={`numeral text-2xl font-bold tracking-tight ${
                        cashflow >= 0 ? "text-emerald-400" : "text-orange-400"
                      }`}>
                        {cashflow < 0 ? "-" : ""}${Math.abs(cashflow).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* linked accounts */}
                {accounts.length > 0 && (
                  <div className="mt-6 border-t border-white/[0.08] pt-5">
                    <p className="mb-3 text-[11px] font-light uppercase tracking-wider text-slate-400 dark:text-white/30">
                      Linked Accounts ({accounts.length})
                    </p>
                    <ul className="space-y-2.5">
                      {accounts.map((a) => (
                        <li key={a.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[10px] font-bold uppercase text-white/50">
                              {a.type.slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-[13px] font-medium leading-tight">{a.name}</p>
                              <p className="text-[11px] font-light capitalize text-slate-400 dark:text-white/30">
                                {a.subtype ?? a.type}
                                {a.mask && <span> ••{a.mask}</span>}
                              </p>
                            </div>
                          </div>
                          {a.balance != null && (
                            <span className="numeral text-[13px] font-medium">
                              ${a.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {cashflow < 0 && step === "summary" && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <GlassCard className="border-orange-500/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
                    <p className="text-[15px] font-light leading-relaxed text-slate-600 dark:text-white/60">
                      Your monthly burn rate is running a little hot. We&rsquo;ll
                      help you find areas to cut — let&rsquo;s keep going.
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {step === "fix" && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3"
              >
                <p className="text-[15px] font-medium">How would you like to fix it?</p>
                <PlaidLinkButton
                  purpose="bank"
                  onSuccess={async (info) => {
                    await Promise.all([refreshTransactions(), refreshAccounts()]);
                    awardPointsOnce(
                      stablePointAwardId("intake_fix_extra_bank", info.publicToken),
                      POINTS.INTAKE_FIX_EXTRA_LINK,
                    );
                    goTo("summary");
                  }}
                >
                  Link another account
                </PlaidLinkButton>
                <PlaidLinkButton
                  purpose="credit"
                  onSuccess={async (info) => {
                    await Promise.all([refreshTransactions(), refreshAccounts()]);
                    awardPointsOnce(
                      stablePointAwardId("intake_fix_extra_credit", info.publicToken),
                      POINTS.INTAKE_FIX_EXTRA_LINK,
                    );
                    goTo("summary");
                  }}
                >
                  Link another credit card
                </PlaidLinkButton>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => goTo("summary")}
                  className="hit-44 rounded-2xl border border-white/10 py-4 text-sm font-light text-white/40"
                >
                  Go back to summary
                </motion.button>
              </motion.div>
            )}

            {step === "summary" && (
              <div className="flex flex-col gap-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  transition={springSnappy}
                  onClick={() => goTo("fix")}
                  className="hit-44 rounded-2xl border border-orange-500/20 bg-orange-500/10 py-4 text-[15px] font-medium text-orange-300"
                >
                  No, these aren&rsquo;t correct
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  transition={springSnappy}
                  onClick={finishCashflow}
                  className="hit-44 rounded-2xl bg-emerald-500/90 py-4 text-[15px] font-semibold text-white transition"
                >
                  Looks good, continue
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
