"use client";

import { useFinancial } from "@/context/FinancialContext";
import type { MortgageMeta, MortgageProductType } from "@/lib/types";
import { MORTGAGE_PRODUCT_LABELS } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

const inp =
  "rounded-lg border border-slate-200/90 bg-white/90 px-2 py-1.5 text-[12px] text-slate-900 outline-none focus:border-emerald-500/40 dark:border-white/15 dark:bg-white/[0.06] dark:text-white";

type Props = {
  debtId: string;
  /** Merged meta from Plaid + local override. */
  meta: MortgageMeta | undefined;
};

export function PlaidMortgageMetaAttach({ debtId, meta }: Props) {
  const { setDebtMortgageMeta } = useFinancial();
  const [termYears, setTermYears] = useState("");
  const [productType, setProductType] = useState<MortgageProductType | "">("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (meta) {
      setTermYears(String(meta.termYears));
      setProductType(meta.productType);
    } else {
      setTermYears("");
      setProductType("");
    }
  }, [debtId, meta]);

  const save = useCallback(() => {
    setErr("");
    const t = Number(termYears);
    if (!Number.isFinite(t) || t < 1 || t > 50) {
      setErr("Term: 1–50 years.");
      return;
    }
    if (!productType) {
      setErr("Choose a loan type.");
      return;
    }
    setDebtMortgageMeta(debtId, {
      termYears: Math.round(t),
      productType,
    });
  }, [debtId, productType, setDebtMortgageMeta, termYears]);

  const clear = useCallback(() => {
    setErr("");
    setDebtMortgageMeta(debtId, undefined);
    setTermYears("");
    setProductType("");
  }, [debtId, setDebtMortgageMeta]);

  return (
    <div className="mt-2 rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">
        Linked mortgage — add details (saved on this device)
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[100px]">
          <label className="mb-0.5 block text-[10px] text-slate-500 dark:text-white/40">Term (yr)</label>
          <input
            type="number"
            min={1}
            max={50}
            value={termYears}
            onChange={(e) => setTermYears(e.target.value)}
            placeholder="30"
            className={`${inp} w-full sm:w-20`}
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="mb-0.5 block text-[10px] text-slate-500 dark:text-white/40">Loan type</label>
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value as MortgageProductType | "")}
            className={`${inp} w-full`}
            aria-label="Mortgage loan type"
          >
            <option value="">Select…</option>
            {(Object.keys(MORTGAGE_PRODUCT_LABELS) as MortgageProductType[]).map((k) => (
              <option key={k} value={k}>
                {MORTGAGE_PRODUCT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            className="rounded-lg bg-emerald-600/90 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-emerald-600 active:scale-[0.98] dark:bg-emerald-500/80"
          >
            Save
          </button>
          {meta ? (
            <button
              type="button"
              onClick={clear}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] text-slate-600 transition hover:bg-slate-100 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
      {err ? <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-200/90">{err}</p> : null}
    </div>
  );
}
