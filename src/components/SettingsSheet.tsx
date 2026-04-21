"use client";

import { useFinancial } from "@/context/FinancialContext";
import { ManualMortgageForm } from "@/components/debt/ManualMortgageForm";
import { MORTGAGE_PRODUCT_LABELS, type ManualCashRow } from "@/lib/types";
import { springSnappy } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/25 focus:border-white/25";

function CashTable({
  rows,
  kind,
  label,
  onAdd,
  onRemove,
}: {
  rows: ManualCashRow[];
  kind: ManualCashRow["kind"];
  label: string;
  onAdd: (row: Omit<ManualCashRow, "id">) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [amt, setAmt] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !amt) return;
    onAdd({ label: name, amount: Number(amt) || 0, kind });
    setName("");
    setAmt("");
  }

  const filtered = rows.filter((r) => r.kind === kind);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">
        {label}
      </p>
      {filtered.length > 0 && (
        <table className="mb-3 w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] font-light uppercase tracking-wider text-white/30">
              <th className="pb-1.5 text-left font-light">Name</th>
              <th className="pb-1.5 text-right font-light">Amount</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-white/[0.04]">
                <td className="py-2 font-light">{r.label}</td>
                <td className="py-2 text-right tabular-nums font-medium">
                  ${r.amount.toLocaleString()}
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onRemove(r.id)}
                    className="rounded p-1 text-white/30 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <input
          className={inputCls}
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={`${inputCls} w-28`}
          placeholder="$"
          type="number"
          step="0.01"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
        />
        <button
          type="submit"
          className="hit-44 flex shrink-0 items-center justify-center rounded-lg bg-white/10 px-3"
        >
          <Plus className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    manualMode, setManualMode, manualCashRows,
    addManualCashRow, removeManualCashRow,
    manualDebts, addManualDebt, removeManualDebt,
    manualDebtEntryEnabled, setManualDebtEntryEnabled,
  } = useFinancial();

  const [dName, setDName] = useState("");
  const [dBal, setDBal] = useState("");
  const [dMin, setDMin] = useState("");
  const [dApr, setDApr] = useState("");
  const [dLoanType, setDLoanType] = useState<"" | "mortgage">("");

  function addDebt(e: React.FormEvent) {
    e.preventDefault();
    if (!dName) return;
    const aprNum = dApr === "" ? undefined : Number(dApr);
    addManualDebt({
      name: dName,
      balance: Number(dBal) || 0,
      minPayment: Number(dMin) || 0,
      ...(dLoanType === "mortgage" ? { loanType: "mortgage" as const } : {}),
      ...(aprNum !== undefined && !Number.isNaN(aprNum) ? { apr: aprNum } : {}),
    });
    setDName("");
    setDBal("");
    setDMin("");
    setDApr("");
    setDLoanType("");
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/[0.06] bg-slate-950/[0.97] p-6 text-white shadow-2xl backdrop-blur-3xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={springSnappy}
          >
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
              <button type="button" onClick={onClose} className="hit-44 flex items-center justify-center rounded-full hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-4 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div>
                <p className="text-sm font-medium">Manual debt entry</p>
                <p className="mt-1 text-xs font-light text-white/45">
                  Add debts by hand (name, balance, min payment, APR). Use when Plaid doesn&rsquo;t list something or you want to correct details.
                </p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-400"
                checked={manualDebtEntryEnabled}
                onChange={(e) => setManualDebtEntryEnabled(e.target.checked)}
              />
            </label>

            {/* manual mode toggle */}
            <label className="mb-6 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div>
                <p className="text-sm font-medium">Manual mode</p>
                <p className="mt-1 text-xs font-light text-white/45">
                  Enter income, expenses, and debts in spreadsheet tables below.
                </p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-400"
                checked={manualMode}
                onChange={(e) => setManualMode(e.target.checked)}
              />
            </label>

            {manualDebtEntryEnabled && (
              <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-300/80">
                  Add debt manually
                </p>
                {manualDebts.length > 0 && (
                  <table className="mb-3 w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-[10px] font-light uppercase tracking-wider text-white/30">
                        <th className="pb-1.5 text-left font-light">Name</th>
                        <th className="pb-1.5 text-right font-light">Bal</th>
                        <th className="pb-1.5 text-right font-light">Min</th>
                        <th className="pb-1.5 text-right font-light">APR</th>
                        <th className="pb-1.5 text-left font-light">Mortgage</th>
                        <th className="w-8 pb-1.5" aria-label="Remove" />
                      </tr>
                    </thead>
                    <tbody>
                      {manualDebts.map((d) => (
                        <tr key={d.id} className="border-b border-white/[0.04]">
                          <td className="py-2 font-light">{d.name}</td>
                          <td className="py-2 text-right tabular-nums">${d.balance.toLocaleString()}</td>
                          <td className="py-2 text-right tabular-nums">${d.minPayment}</td>
                          <td className="py-2 text-right tabular-nums text-white/60">
                            {d.apr != null ? `${d.apr}%` : "—"}
                          </td>
                          <td className="max-w-[140px] py-2 text-[11px] font-light text-white/50">
                            {d.loanType === "mortgage" && d.mortgageMeta ? (
                              <>
                                {d.mortgageMeta.termYears} yr ·{" "}
                                {MORTGAGE_PRODUCT_LABELS[d.mortgageMeta.productType]}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2 text-right align-middle">
                            <button
                              type="button"
                              onClick={() => removeManualDebt(d.id)}
                              className="rounded p-1 text-white/30 hover:text-red-400"
                              aria-label={`Remove ${d.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <label className="mb-2 block text-[10px] font-medium uppercase tracking-wide text-white/40">
                  What are you adding?
                </label>
                <select
                  className={`${inputCls} mb-3`}
                  value={dLoanType}
                  onChange={(e) => setDLoanType(e.target.value as "" | "mortgage")}
                  aria-label="Debt category"
                >
                  <option value="">Other debt (cards, personal loans…)</option>
                  <option value="mortgage">Mortgage (term + loan type required)</option>
                </select>
                {dLoanType === "mortgage" ? (
                  <ManualMortgageForm
                    submitLabel="Add mortgage"
                    onAdd={(row) => {
                      addManualDebt(row);
                    }}
                  />
                ) : (
                  <form onSubmit={addDebt} className="flex flex-col gap-2">
                    <input className={inputCls} placeholder="Debt name" value={dName} onChange={(e) => setDName(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <input className={inputCls} placeholder="Balance" type="number" value={dBal} onChange={(e) => setDBal(e.target.value)} />
                      <input className={inputCls} placeholder="Min payment" type="number" value={dMin} onChange={(e) => setDMin(e.target.value)} />
                    </div>
                    <input
                      className={inputCls}
                      placeholder="APR % (optional)"
                      type="number"
                      step="0.01"
                      value={dApr}
                      onChange={(e) => setDApr(e.target.value)}
                    />
                    <button type="submit" className="rounded-lg bg-emerald-500/30 py-2.5 text-sm font-medium text-emerald-100 transition active:scale-[0.97]">
                      Add debt
                    </button>
                  </form>
                )}
              </div>
            )}

            {manualMode && (
              <p className="mb-6 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs font-light text-amber-200/90">
                Manual mode active — figures are only as accurate as what you enter. Dashboard and Cash
                flow use these monthly totals instead of linked-account transactions.
              </p>
            )}

            {!manualMode ? (
              <p className="mb-6 text-xs font-light text-white/40">
                Turn on <span className="text-white/70">Manual mode</span> above to add monthly income
                and expense lines. They appear under Manual entries on Accounts.
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                <CashTable
                  rows={manualCashRows}
                  kind="income"
                  label="Income (monthly)"
                  onAdd={addManualCashRow}
                  onRemove={removeManualCashRow}
                />
                <CashTable
                  rows={manualCashRows}
                  kind="essential"
                  label="Essential expenses (monthly)"
                  onAdd={addManualCashRow}
                  onRemove={removeManualCashRow}
                />
                <CashTable
                  rows={manualCashRows}
                  kind="discretionary"
                  label="Discretionary expenses (monthly)"
                  onAdd={addManualCashRow}
                  onRemove={removeManualCashRow}
                />
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
