"use client";

import type { DebtRow, MortgageProductType } from "@/lib/types";
import { MORTGAGE_PRODUCT_LABELS } from "@/lib/types";
import { useCallback, useState } from "react";

const fieldCls =
  "hit-44 w-full rounded-xl border border-slate-200/90 bg-white/80 px-3 text-[15px] text-slate-900 outline-none ring-emerald-500/20 placeholder:text-slate-400 focus:border-emerald-500/40 focus:ring-2 dark:border-white/15 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-white/35";

const selectCls =
  "hit-44 w-full rounded-xl border border-slate-200/90 bg-white/80 px-3 text-[15px] text-slate-900 outline-none ring-emerald-500/20 focus:border-emerald-500/40 focus:ring-2 dark:border-white/15 dark:bg-white/[0.06] dark:text-white";

type Props = {
  onAdd: (row: Omit<DebtRow, "id" | "source">) => void;
  submitLabel?: string;
  /** Clear inputs after successful add. */
  resetOnSuccess?: boolean;
};

export function ManualMortgageForm({
  onAdd,
  submitLabel = "Add mortgage to map",
  resetOnSuccess = true,
}: Props) {
  const [name, setName] = useState("Mortgage");
  const [bal, setBal] = useState("");
  const [min, setMin] = useState("");
  const [apr, setApr] = useState("");
  const [termYears, setTermYears] = useState("");
  const [productType, setProductType] = useState<MortgageProductType | "">("");
  const [formError, setFormError] = useState("");

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFormError("");
      const balance = Number(bal);
      const minPayment = Number(min);
      const term = Number(termYears);
      if (!Number.isFinite(balance) || balance < 0) {
        setFormError("Enter a valid balance.");
        return;
      }
      if (!Number.isFinite(minPayment) || minPayment < 0) {
        setFormError("Enter a valid monthly payment.");
        return;
      }
      if (!Number.isFinite(term) || term < 1 || term > 50) {
        setFormError("Enter the original loan term in years (1–50).");
        return;
      }
      if (!productType) {
        setFormError("Choose what type of loan this is.");
        return;
      }
      const aprNum = apr === "" ? undefined : Number(apr);
      onAdd({
        name: name.trim() || "Mortgage",
        balance,
        minPayment,
        loanType: "mortgage",
        mortgageMeta: {
          termYears: Math.round(term),
          productType,
        },
        ...(aprNum !== undefined && !Number.isNaN(aprNum) ? { apr: aprNum } : {}),
      });
      if (resetOnSuccess) {
        setBal("");
        setMin("");
        setApr("");
        setTermYears("");
        setProductType("");
        setName("Mortgage");
      }
    },
    [apr, bal, min, name, onAdd, productType, resetOnSuccess, termYears],
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Lender or label (e.g. Primary mortgage)"
        className={fieldCls}
        autoComplete="off"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          min={0}
          value={bal}
          onChange={(e) => setBal(e.target.value)}
          placeholder="Balance owed"
          className={fieldCls}
        />
        <input
          type="number"
          min={0}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          placeholder="Monthly payment"
          className={fieldCls}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/40">
            Original term (years)
          </label>
          <input
            type="number"
            min={1}
            max={50}
            step={1}
            value={termYears}
            onChange={(e) => setTermYears(e.target.value)}
            placeholder="e.g. 30"
            className={fieldCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/40">
            Loan type
          </label>
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value as MortgageProductType | "")}
            className={selectCls}
            aria-label="Mortgage loan type"
          >
            <option value="">Select type…</option>
            {(Object.keys(MORTGAGE_PRODUCT_LABELS) as MortgageProductType[]).map((k) => (
              <option key={k} value={k}>
                {MORTGAGE_PRODUCT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <input
        type="number"
        step="0.01"
        value={apr}
        onChange={(e) => setApr(e.target.value)}
        placeholder="APR % (optional)"
        className={fieldCls}
      />
      {formError ? (
        <p className="text-[13px] font-light text-amber-800 dark:text-amber-200/90">{formError}</p>
      ) : null}
      <button
        type="submit"
        className="hit-44 rounded-xl border border-emerald-500/40 bg-emerald-500/15 py-3 text-sm font-semibold text-emerald-900 dark:text-emerald-100"
      >
        {submitLabel}
      </button>
    </form>
  );
}
