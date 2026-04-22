import Link from "next/link";
import { ArrowLeft, Compass, Layers, Sparkles } from "lucide-react";

export const metadata = {
  title: "What is Transparency",
  description: "What this app is, what each area does, and how to read the home screen.",
};

export default function IntroPage() {
  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-lg px-6 py-10 pb-24">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-[14px] font-medium text-emerald-700 transition hover:opacity-80 dark:text-emerald-300/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg">
          <Compass className="h-8 w-8 text-white" />
        </div>

        <h1 className="text-[clamp(1.75rem,5vw,2.25rem)] font-semibold leading-tight tracking-tight">
          What you&apos;re looking at
        </h1>
        <p className="mt-4 text-[15px] font-light leading-relaxed text-slate-600 dark:text-white/50">
          <span className="font-medium text-slate-800 dark:text-white/70">Transparency</span> is built around cash flow and
          payoff math—not guilt charts or a second job as your own bookkeeper. Connect accounts (or use manual mode) if and
          when you want, tune what counts as income and living spend, and use the picture to think about debt and, later,
          deployment. There is no “right” speed.
        </p>

        <section className="mt-10">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-white/40">
              The app map
            </h2>
          </div>
          <ul className="space-y-4 text-[15px] font-light leading-relaxed text-slate-700 dark:text-white/60">
            <li>
              <span className="font-medium text-slate-900 dark:text-white/80">Home / Dashboard</span> — A single place to
              see the headline numbers, a 6-month overview when data is in, and the pillar cards. Intake is there whenever
              you choose to connect or enter manual numbers.
            </li>
            <li>
              <span className="font-medium text-slate-900 dark:text-white/80">Intake</span> — Connect Plaid or turn on
              manual budget lines so the model has something to measure.
            </li>
            <li>
              <span className="font-medium text-slate-900 dark:text-white/80">Cash Flow</span> — The living picture:
              income vs spend vs debt payments; calibrate uncategorized items here.
            </li>
            <li>
              <span className="font-medium text-slate-900 dark:text-white/80">Debt</span> — Balances, APRs, and payoff
              framing when the rest of the picture is in place.
            </li>
            <li>
              <span className="font-medium text-slate-900 dark:text-white/80">Accounts</span> — What&apos;s linked and
              what feeds transactions.
            </li>
            <li>
              <span className="font-medium text-slate-900 dark:text-white/80">Settings</span> — Theme, manual mode, and
              other preferences.
            </li>
            <li>
              <span className="font-medium text-slate-900 dark:text-white/80">Partner lab (sidebar)</span> — Future
              partner tools, offered when the numbers support them—no blinking promos.
            </li>
          </ul>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-200/80 bg-white/70 p-5 dark:border-white/[0.08] dark:bg-white/[0.04]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white/80">If you like a suggested order</h2>
          </div>
          <p className="mt-2 text-[13px] font-light text-slate-500 dark:text-white/40">
            Totally optional. Skip steps, come back later, or wander—the app will meet you where you are.
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[14px] font-light leading-relaxed text-slate-600 dark:text-white/50">
            <li>When you want numbers, do intake (link or manual) so cash flow can be computed.</li>
            <li>Visit Cash Flow and tidy categories / debt-payment prompts—only if your feed needs it.</li>
            <li>Check Home for the 6-month strip; open Debt when you&apos;re ready for that layer.</li>
            <li>Accounts and Settings are for fixes and preferences—use them if something feels off.</li>
          </ol>
        </section>

        <p className="mt-8 text-center text-[13px] font-light text-slate-500 dark:text-white/35">
          After you sign in, you land on the dashboard. This page is always here; nothing is forcing you through it.
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex w-full max-w-sm items-center justify-center rounded-full border border-slate-200/80 bg-slate-900 py-3.5 text-[15px] font-medium text-white transition active:scale-[0.99] dark:border-white/[0.12] dark:bg-white dark:text-slate-900"
          >
            Open dashboard
          </Link>
          <Link
            href="/sign-up"
            className="text-[14px] font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300/90"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
