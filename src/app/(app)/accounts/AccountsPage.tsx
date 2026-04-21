"use client";

import { GlassCard } from "@/components/GlassCard";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { useFinancial } from "@/context/FinancialContext";
import { stablePointAwardId } from "@/lib/pointAwards";
import { POINTS } from "@/lib/pointsRules";
import { motion, AnimatePresence } from "framer-motion";
import { springSnappy } from "@/lib/motion";
import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const KIND_LABEL: Record<"income" | "essential" | "discretionary", string> = {
  income: "Income",
  essential: "Essential",
  discretionary: "Discretionary",
};

export default function AccountsPage() {
  const {
    accounts,
    manualMode,
    manualCashRows,
    manualDebts,
    refreshTransactions,
    refreshAccounts,
    refreshDebts,
    unlinkAccount,
    awardPointsOnce,
    setManualMode,
  } = useFinancial();

  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const manualSectionRef = useRef<HTMLDivElement | null>(null);
  const [manualNavTick, setManualNavTick] = useState(0);

  useEffect(() => {
    if (manualNavTick === 0) return;
    const id = requestAnimationFrame(() => {
      manualSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [manualNavTick]);

  async function handleUnlink(accountId: string) {
    setUnlinking(accountId);
    await unlinkAccount(accountId);
    setUnlinking(null);
  }

  return (
    <div className="flex flex-col gap-7 pt-2">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hit-44 flex items-center justify-center rounded-full hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="label-light text-slate-400 dark:text-white/35">Manage</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Linked Accounts
            </h1>
          </div>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowLink((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 transition hover:bg-emerald-500/20"
        >
          <Plus className="h-5 w-5" />
        </motion.button>
      </div>

      {/* link new account panel */}
      <AnimatePresence>
        {showLink && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <GlassCard>
              <p className="mb-4 text-[13px] font-medium">
                Link a new account via Plaid
              </p>
              <div className="flex flex-col gap-2.5">
                <PlaidLinkButton
                  purpose="bank"
                  onSuccess={async (info) => {
                    await Promise.all([refreshTransactions(), refreshAccounts()]);
                    awardPointsOnce(
                      stablePointAwardId("accounts_link_bank", info.publicToken),
                      POINTS.LINK_ACCOUNT_GENERIC,
                    );
                    setShowLink(false);
                  }}
                >
                  Link bank account
                </PlaidLinkButton>
                <PlaidLinkButton
                  purpose="credit"
                  onSuccess={async (info) => {
                    await Promise.all([refreshTransactions(), refreshAccounts()]);
                    awardPointsOnce(
                      stablePointAwardId("accounts_link_credit", info.publicToken),
                      POINTS.LINK_ACCOUNT_GENERIC,
                    );
                    setShowLink(false);
                  }}
                >
                  Link credit card
                </PlaidLinkButton>
                <PlaidLinkButton
                  purpose="loan"
                  onSuccess={async (info) => {
                    await Promise.all([refreshAccounts(), refreshDebts()]);
                    awardPointsOnce(
                      stablePointAwardId("accounts_link_loan", info.publicToken),
                      POINTS.LINK_ACCOUNT_GENERIC,
                    );
                    setShowLink(false);
                  }}
                >
                  Link loan (student loan, mortgage)
                </PlaidLinkButton>
              </div>
              <div className="relative my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200/70 dark:bg-white/[0.1]" />
                <span className="text-[11px] font-light uppercase tracking-wide text-slate-400 dark:text-white/35">
                  or
                </span>
                <div className="h-px flex-1 bg-slate-200/70 dark:bg-white/[0.1]" />
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                transition={springSnappy}
                onClick={() => {
                  setManualMode(true);
                  setShowLink(false);
                  setManualNavTick((n) => n + 1);
                }}
                className="hit-44 w-full rounded-2xl border border-slate-200/90 bg-white/50 py-3.5 text-[14px] font-medium text-slate-800 transition hover:bg-white/80 dark:border-white/15 dark:bg-white/[0.06] dark:text-white/90 dark:hover:bg-white/[0.1]"
              >
                Skip Plaid — add cash flow manually
              </motion.button>
              <p className="mt-2 text-center text-[11px] font-light leading-snug text-slate-500 dark:text-white/40">
                Turns on manual mode and scrolls to the section below. Use{" "}
                <span className="text-slate-700 dark:text-white/60">Settings</span> in the header to
                add income and expense lines (no bank login).
              </p>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {(manualMode || manualCashRows.length > 0 || manualDebts.length > 0) && (
        <div ref={manualSectionRef} className="scroll-mt-28">
        <GlassCard>
          <p className="label-light mb-1 text-slate-400 dark:text-white/35">Manual</p>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            Budget &amp; debts you entered
          </h2>
          <p className="mt-1 text-[13px] font-light text-slate-500 dark:text-white/40">
            {manualMode
              ? "These drive cash-flow math while Manual mode is on (not Plaid transactions)."
              : "Saved lines from Settings. Turn on Manual mode to use them for dashboard totals."}
          </p>
          {manualCashRows.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
              {manualCashRows.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 text-[14px]"
                >
                  <span className="font-light text-slate-700 dark:text-white/85">
                    {r.label}
                    <span className="ml-2 text-[11px] text-slate-400 dark:text-white/35">
                      {KIND_LABEL[r.kind]}
                    </span>
                  </span>
                  <span className="numeral shrink-0 font-medium tabular-nums text-slate-900 dark:text-white">
                    ${r.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    <span className="ml-1 text-[10px] font-light text-white/30">/mo</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {manualDebts.length > 0 && (
            <ul
              className={`space-y-2 ${manualCashRows.length > 0 ? "mt-3 border-t border-white/[0.06] pt-3" : "mt-4 border-t border-white/[0.06] pt-4"}`}
            >
              {manualDebts.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 text-[14px]"
                >
                  <span className="font-light text-slate-700 dark:text-white/85">{d.name}</span>
                  <span className="numeral shrink-0 text-right font-medium tabular-nums">
                    <span className="text-slate-900 dark:text-white">
                      ${d.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className="block text-[10px] font-light text-white/30">balance</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {manualCashRows.length === 0 && manualDebts.length === 0 && (
            <p className="mt-4 text-[13px] font-light text-amber-200/80 dark:text-amber-200/50">
              Open Settings (header) and enable Manual mode to add monthly income and expense lines, or
              use Manual debt entry for balances.
            </p>
          )}
        </GlassCard>
        </div>
      )}

      {/* account list */}
      {accounts.length > 0 ? (
        <div className="flex flex-col gap-2">
          {accounts.map((a) => (
            <GlassCard key={a.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[11px] font-bold uppercase text-white/50">
                    {a.type.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-[14px] font-medium leading-tight">
                      {a.name}
                    </p>
                    <p className="text-[12px] font-light capitalize text-slate-400 dark:text-white/30">
                      {a.subtype ?? a.type}
                      {a.mask && <span> ••{a.mask}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {a.balance != null && (
                    <div className="text-right">
                      <p className="numeral text-[14px] font-semibold">
                        ${a.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[9px] font-light text-white/20">
                        balance
                      </p>
                    </div>
                  )}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    disabled={unlinking === a.id}
                    onClick={() => handleUnlink(a.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" />
                  </motion.button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard>
          <div className="py-8 text-center">
            <p className="text-[15px] font-medium text-white/50">
              No accounts linked yet
            </p>
            <p className="mt-2 text-[13px] font-light text-white/30">
              Tap the + button above to connect your first account.
            </p>
          </div>
        </GlassCard>
      )}

      {/* count */}
      {accounts.length > 0 && (
        <p className="text-center text-[11px] font-light text-white/20">
          {accounts.length} account{accounts.length !== 1 ? "s" : ""} linked via Plaid
        </p>
      )}
    </div>
  );
}
