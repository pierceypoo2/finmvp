"use client";

import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Catches errors in the root layout. Must define html/body (replaces root layout when active).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <div className="mesh-bg-dark flex min-h-dvh flex-col items-center justify-center px-5 text-slate-100">
          <div className="w-full max-w-md rounded-3xl border border-white/12 bg-white/[0.08] p-8 shadow-xl backdrop-blur-xl">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/35">
              Something went wrong
            </p>
            <h1 className="text-xl font-semibold tracking-tight">We couldn&apos;t load the app</h1>
            <p className="mt-3 text-sm font-light leading-relaxed text-white/55">
              Try again. If this keeps happening, refresh the page or clear the site cache.
            </p>
            {process.env.NODE_ENV === "development" && error.message && (
              <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-[11px] text-orange-200/90">
                {error.message}
              </p>
            )}
            <button
              type="button"
              onClick={() => reset()}
              className="hit-44 mt-6 w-full rounded-2xl bg-emerald-500/90 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
