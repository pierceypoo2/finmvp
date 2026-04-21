"use client";

import { PlaidLinkButton, type PlaidLinkSuccessPayload } from "@/components/PlaidLinkButton";
import { GlassCard } from "@/components/GlassCard";
import { useFinancial } from "@/context/FinancialContext";
import { rankDebtsByCashFlowIndexOrder } from "@/lib/debtCashflowRank";
import { stablePointAwardId } from "@/lib/pointAwards";
import { POINTS } from "@/lib/pointsRules";
import { DebtMapGamify } from "@/components/debt/DebtMapGamify";
import { ManualMortgageForm } from "@/components/debt/ManualMortgageForm";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Building2, Plus, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_STEP = "ta_debt_intake_step";

type IntakeStep = "loading" | "student" | "auto" | "housing" | "other" | "done";

const SECTION_KEY = "ta_active_section";

export default function DebtPage() {
  const router = useRouter();
  const {
    debtsWithApr,
    manualDebts,
    refreshDebts,
    debtsInitialized,
    refreshTransactions,
    refreshAccounts,
    awardPointsOnce,
    addManualDebt,
    housingSnapshot,
    setHousingSnapshot,
  } = useFinancial();

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [showLink, setShowLink] = useState(false);
  const [intakeStep, setIntakeStep] = useState<IntakeStep>("loading");
  const [showStudentLoanLink, setShowStudentLoanLink] = useState(false);
  const [showAutoLoanLink, setShowAutoLoanLink] = useState(false);
  const [showOtherDebtLink, setShowOtherDebtLink] = useState(false);
  useEffect(() => {
    localStorage.setItem(SECTION_KEY, "debt");
  }, []);

  const all = [...debtsWithApr, ...manualDebts];
  const totalDebt = all.reduce((sum, d) => sum + (Number.isFinite(d.balance) ? d.balance : 0), 0);
  const hasLinkedMortgage = debtsWithApr.some((d) => d.loanType === "mortgage");

  const sortedDebts = useMemo(
    () => rankDebtsByCashFlowIndexOrder([...debtsWithApr, ...manualDebts]),
    [debtsWithApr, manualDebts],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !debtsInitialized) return;
    const key = localStorage.getItem(STORAGE_STEP);

    if (key === "done") {
      setIntakeStep("done");
      return;
    }
    if (key === "other") {
      setIntakeStep("other");
      return;
    }
    if (key === "housing") {
      setIntakeStep("housing");
      return;
    }
    if (key === "auto") {
      setIntakeStep("auto");
      return;
    }
    if (key === "student") {
      setIntakeStep("student");
      return;
    }

    const hasDebts = debtsWithApr.length + manualDebts.length > 0;
    if (hasDebts) {
      localStorage.setItem(STORAGE_STEP, "done");
      setIntakeStep("done");
    } else {
      localStorage.setItem(STORAGE_STEP, "student");
      setIntakeStep("student");
    }
  }, [debtsInitialized, debtsWithApr.length, manualDebts.length]);

  function goToAutoQuestions() {
    localStorage.setItem(STORAGE_STEP, "auto");
    setIntakeStep("auto");
    setShowStudentLoanLink(false);
  }

  function goToHousingQuestions() {
    localStorage.setItem(STORAGE_STEP, "housing");
    setIntakeStep("housing");
    setShowAutoLoanLink(false);
  }

  function goToOtherQuestions() {
    localStorage.setItem(STORAGE_STEP, "other");
    setIntakeStep("other");
    setShowOtherDebtLink(false);
  }

  function finishIntake() {
    localStorage.setItem(STORAGE_STEP, "done");
    setIntakeStep("done");
    setShowOtherDebtLink(false);
  }

  const onLoanLinkSuccess = async (info: PlaidLinkSuccessPayload) => {
    await Promise.all([refreshAccounts(), refreshDebts()]);
    awardPointsOnce(stablePointAwardId("debt_link_loan", info.publicToken), POINTS.DEBT_LOAN_LINK);
  };

  const onCreditLinkSuccess = async (info: PlaidLinkSuccessPayload) => {
    await Promise.all([refreshDebts(), refreshTransactions(), refreshAccounts()]);
    awardPointsOnce(
      stablePointAwardId("debt_link_credit_debt", info.publicToken),
      POINTS.DEBT_CREDIT_DEBT_LINK,
    );
  };

  async function handlePdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/upload/debt-pdf", { method: "POST", body: form });
      const j = await r.json();
      setUploadMsg(r.ok ? `Uploaded (${j.documentId?.slice(0, 8)}…)` : j.error || "Upload failed");
    } catch {
      setUploadMsg("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const showMainContent = intakeStep === "done";

  const intakeRound =
    intakeStep === "student" ? 1
    : intakeStep === "auto" ? 2
    : intakeStep === "housing" ? 3
    : intakeStep === "other" ? 4
    : 0;

  return (
    <div className="flex flex-col gap-8 pt-2">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            onClick={() => localStorage.removeItem(SECTION_KEY)}
            className="hit-44 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-200/80 dark:text-white dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="label-light text-slate-400 dark:text-white/35">Pillar 2</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Debt management
            </h1>
          </div>
        </div>
        {showMainContent && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowLink((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 transition hover:bg-emerald-500/20 dark:border-emerald-500/20 dark:text-emerald-400"
          >
            <Plus className="h-5 w-5" />
          </motion.button>
        )}
      </div>

      {/* Total debt — after intake */}
      {showMainContent && (
        <div className="-mt-2 space-y-3">
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/90 px-4 py-4 dark:border-white/15 dark:bg-white/[0.05]">
            <p className="text-[13px] font-medium text-slate-500 dark:text-white/45">
              Total debt you owe
            </p>
            <p className="numeral mt-1 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              ${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          {(housingSnapshot.monthlyRent != null && housingSnapshot.monthlyRent > 0) ||
          all.some((d) => d.loanType === "mortgage") ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 dark:bg-white/[0.03]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/35">
                Housing on file
              </p>
              {housingSnapshot.monthlyRent != null && housingSnapshot.monthlyRent > 0 && (
                <p className="mt-1.5 text-[14px] font-light text-slate-700 dark:text-white/75">
                  Monthly rent:{" "}
                  <span className="numeral font-medium text-slate-900 dark:text-white">
                    ${housingSnapshot.monthlyRent.toLocaleString()}
                  </span>
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Intake quest (gamified) */}
      <AnimatePresence mode="wait">
        {intakeStep === "student" && (
          <motion.div
            key="student"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            <GlassCard>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400/90">
                  Quest round {intakeRound} of 4 · Map your money
                </p>
              </div>
              <p className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                Any student loans?
              </p>
              <p className="mt-2 text-[14px] font-light leading-relaxed text-slate-500 dark:text-white/45">
                Quick tap—no wrong answers. Link your servicer so we can pull balances for you.
              </p>
              {!showStudentLoanLink ? (
                <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowStudentLoanLink(true)}
                    className="hit-44 flex-1 rounded-xl border border-emerald-500/35 bg-emerald-500/15 py-3.5 text-sm font-semibold text-emerald-900 shadow-sm dark:text-emerald-200 dark:shadow-none"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={goToAutoQuestions}
                    className="hit-44 flex-1 rounded-xl border border-slate-200 bg-slate-100 py-3.5 text-sm font-semibold text-slate-800 transition active:scale-[0.98] dark:border-white/15 dark:bg-white/10 dark:text-white"
                  >
                    No
                  </button>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-3">
                  <PlaidLinkButton
                    purpose="loan"
                    onSuccess={async (info) => {
                      await onLoanLinkSuccess(info);
                      goToAutoQuestions();
                    }}
                  >
                    Connect student loan
                  </PlaidLinkButton>
                  <button
                    type="button"
                    onClick={goToAutoQuestions}
                    className="hit-44 rounded-xl py-3 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline dark:text-white/45 dark:hover:text-white/70"
                  >
                    Skip for now
                  </button>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {intakeStep === "auto" && (
          <motion.div
            key="auto"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            <GlassCard>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400/90">
                  Quest round {intakeRound} of 4 · Map your money
                </p>
              </div>
              <p className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                Car loan or auto financing?
              </p>
              <p className="mt-2 text-[14px] font-light leading-relaxed text-slate-500 dark:text-white/45">
                Link your auto loan so we can count it alongside everything else.
              </p>
              {!showAutoLoanLink ? (
                <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowAutoLoanLink(true)}
                    className="hit-44 flex-1 rounded-xl border border-emerald-500/35 bg-emerald-500/15 py-3.5 text-sm font-semibold text-emerald-900 shadow-sm dark:text-emerald-200 dark:shadow-none"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={goToHousingQuestions}
                    className="hit-44 flex-1 rounded-xl border border-slate-200 bg-slate-100 py-3.5 text-sm font-semibold text-slate-800 transition active:scale-[0.98] dark:border-white/15 dark:bg-white/10 dark:text-white"
                  >
                    No
                  </button>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-3">
                  <PlaidLinkButton
                    purpose="loan"
                    onSuccess={async (info) => {
                      await onLoanLinkSuccess(info);
                      goToHousingQuestions();
                    }}
                  >
                    Connect auto loan
                  </PlaidLinkButton>
                  <button
                    type="button"
                    onClick={goToHousingQuestions}
                    className="hit-44 rounded-xl py-3 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline dark:text-white/45 dark:hover:text-white/70"
                  >
                    Skip for now
                  </button>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {intakeStep === "housing" && (
          <motion.div
            key="housing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            <GlassCard>
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400/90" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400/90">
                  Quest round {intakeRound} of 4 · Rent &amp; mortgage
                </p>
              </div>
              <p className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                Housing costs
              </p>
              <p className="mt-2 text-[14px] font-light leading-relaxed text-slate-500 dark:text-white/45">
                Mortgages often don&rsquo;t come through Plaid reliably—add yours by hand. If you rent,
                that isn&rsquo;t debt, but we still record the monthly number for your picture.
              </p>

              {hasLinkedMortgage && (
                <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[12px] font-light text-emerald-900 dark:text-emerald-100/85">
                  We already found a mortgage from a linked account. You can still add another property
                  manually if needed.
                </p>
              )}

              <div className="mt-6 space-y-2">
                <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/40">
                  Monthly rent (if you rent)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={housingSnapshot.monthlyRent ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setHousingSnapshot({
                      monthlyRent: v === "" ? null : Math.max(0, Number(v) || 0),
                    });
                  }}
                  className="hit-44 w-full rounded-xl border border-slate-200/90 bg-white/80 px-3 text-[15px] text-slate-900 outline-none ring-emerald-500/20 placeholder:text-slate-400 focus:border-emerald-500/40 focus:ring-2 dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
                />
              </div>

              <div className="mt-6 border-t border-slate-200/90 pt-6 dark:border-white/[0.08]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">
                  Home loan (manual)
                </p>
                <p className="mt-1 text-[12px] font-light text-slate-500 dark:text-white/40">
                  Mortgages rarely auto-import cleanly—we need the balance, payment, original term
                  (years), and loan program so payoff math matches reality.
                </p>
                <div className="mt-4">
                  <ManualMortgageForm
                    submitLabel="Add mortgage to map"
                    onAdd={(row) => {
                      const mid = addManualDebt(row);
                      awardPointsOnce(
                        `manual_debt:mortgage_wizard_bonus:${mid}`,
                        POINTS.MANUAL_MORTGAGE_FORM_BONUS,
                      );
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={goToOtherQuestions}
                  className="hit-44 flex-1 rounded-xl bg-emerald-500/90 py-3.5 text-sm font-semibold text-white transition active:scale-[0.98]"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={goToOtherQuestions}
                  className="hit-44 flex-1 rounded-xl border border-slate-200 py-3.5 text-sm font-medium text-slate-600 dark:border-white/15 dark:text-white/70"
                >
                  Skip
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {intakeStep === "other" && (
          <motion.div
            key="other"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            <GlassCard>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400/90">
                  Quest round {intakeRound} of 4 · Map your money
                </p>
              </div>
              <p className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                Any other debt?
              </p>
              <p className="mt-2 text-[14px] font-light leading-relaxed text-slate-500 dark:text-white/45">
                Credit cards, bank loans, lines of credit—one link at a time.
              </p>
              {!showOtherDebtLink ? (
                <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowOtherDebtLink(true)}
                    className="hit-44 flex-1 rounded-xl border border-emerald-500/35 bg-emerald-500/15 py-3.5 text-sm font-semibold text-emerald-900 shadow-sm dark:text-emerald-200 dark:shadow-none"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={finishIntake}
                    className="hit-44 flex-1 rounded-xl border border-slate-200 bg-slate-100 py-3.5 text-sm font-semibold text-slate-800 transition active:scale-[0.98] dark:border-white/15 dark:bg-white/10 dark:text-white"
                  >
                    No
                  </button>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-2.5">
                  <PlaidLinkButton
                    purpose="loan"
                    onSuccess={async (info) => {
                      await onLoanLinkSuccess(info);
                      finishIntake();
                    }}
                  >
                    Link student loan
                  </PlaidLinkButton>
                  <PlaidLinkButton
                    purpose="credit"
                    onSuccess={async (info) => {
                      await onCreditLinkSuccess(info);
                      finishIntake();
                    }}
                  >
                    Link other debt
                  </PlaidLinkButton>
                  <button
                    type="button"
                    onClick={finishIntake}
                    className="hit-44 mt-1 rounded-xl py-3 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline dark:text-white/45 dark:hover:text-white/70"
                  >
                    I&apos;m done for now
                  </button>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {(intakeStep === "loading" || !debtsInitialized) && (
        <GlassCard>
          <p className="text-sm font-light text-slate-600 dark:text-white/45">Loading your map…</p>
        </GlassCard>
      )}

      {showMainContent && (
        <>
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
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/35">
                    Link Plaid accounts
                  </p>
                  <p className="mb-4 text-xs font-light text-slate-500 dark:text-white/40">
                    Connect student loans or other debt. Or upload a statement for manual OCR below.
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <PlaidLinkButton
                      purpose="loan"
                      onSuccess={async (info) => {
                        await Promise.all([refreshAccounts(), refreshDebts()]);
                        awardPointsOnce(
                          stablePointAwardId("debt_panel_link_loan", info.publicToken),
                          POINTS.DEBT_LOAN_LINK,
                        );
                        setShowLink(false);
                      }}
                    >
                      Link student loan
                    </PlaidLinkButton>
                    <PlaidLinkButton
                      purpose="credit"
                      onSuccess={async (info) => {
                        await Promise.all([refreshDebts(), refreshTransactions(), refreshAccounts()]);
                        awardPointsOnce(
                          stablePointAwardId("debt_panel_link_credit", info.publicToken),
                          POINTS.DEBT_CREDIT_DEBT_LINK,
                        );
                        setShowLink(false);
                      }}
                    >
                      Link other debt
                    </PlaidLinkButton>
                  </div>
                  <p className="mt-3 text-[11px] font-light leading-relaxed text-slate-500 dark:text-white/40">
                    Mortgages linked via Plaid: use the Debt tab payoff list below—each linked loan has a
                    slot to save original term and loan type on this device without creating a second loan.
                  </p>
                  <div className="mt-5 border-t border-slate-200/90 pt-5 dark:border-white/[0.08]">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/35">
                      Add mortgage manually
                    </p>
                    <p className="mb-3 text-xs font-light text-slate-500 dark:text-white/40">
                      Home loans often won&rsquo;t sync without documents. Enter balance, payment,{" "}
                      <span className="text-slate-700 dark:text-white/55">original term</span>, and{" "}
                      <span className="text-slate-700 dark:text-white/55">loan type</span> here.
                    </p>
                    <ManualMortgageForm
                      submitLabel="Save mortgage"
                      onAdd={(row) => {
                        const mid = addManualDebt(row);
                        awardPointsOnce(
                          `manual_debt:mortgage_panel_bonus:${mid}`,
                          POINTS.MANUAL_MORTGAGE_FORM_BONUS,
                        );
                        setShowLink(false);
                      }}
                    />
                  </div>
                  <div className="mt-5 border-t border-slate-200/90 pt-5 dark:border-white/[0.08]">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/35">
                      Manual statement (OCR)
                    </p>
                    <p className="mb-3 text-xs font-light text-slate-500 dark:text-white/40">
                      Upload a debt statement and we&rsquo;ll extract the details. Max 5 MB.
                    </p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handlePdf}
                    />
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="hit-44 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-3.5 text-sm font-medium text-slate-800 transition disabled:opacity-40 dark:border-white/20 dark:bg-white/[0.04] dark:text-white"
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? "Uploading…" : "Choose PDF"}
                    </motion.button>
                    {uploadMsg && (
                      <p className="mt-2 text-xs font-light text-emerald-700 dark:text-emerald-400/80">
                        {uploadMsg}
                      </p>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          <DebtMapGamify sortedDebts={sortedDebts} />

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(SECTION_KEY);
              router.push("/dashboard");
            }}
            className="hit-44 rounded-2xl bg-emerald-500/90 py-4 text-[15px] font-semibold text-white transition active:scale-[0.97]"
          >
            Continue to dashboard
          </button>
        </>
      )}
    </div>
  );
}
