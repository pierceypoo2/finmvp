"use client";

import { LiquidGlassIconSurface } from "@/components/LiquidGlassIconSurface";
import { ProductsRail } from "@/components/ProductsRail";
import { SettingsSheet } from "@/components/SettingsSheet";
import { useFinancial } from "@/context/FinancialContext";
import { useTheme } from "@/context/ThemeContext";
import { springSnappy } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import { Moon, Settings, Sun, Sunset, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function UserAvatar() {
  const [mounted, setMounted] = useState(false);
  const [ClerkBtn, setClerkBtn] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    setMounted(true);
    const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (key && !key.includes("PASTE")) {
      import("@clerk/nextjs").then((mod) => {
        setClerkBtn(() => mod.UserButton);
      }).catch(() => {});
    }
  }, []);

  if (!mounted) return null;

  if (ClerkBtn) {
    return <ClerkBtn />;
  }

  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white/50">
      <User className="h-3.5 w-3.5" />
    </div>
  );
}

function PointsChip() {
  const { points } = useFinancial();
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1">
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      <span className="numeral text-xs font-semibold text-emerald-400">
        {points.toLocaleString()}
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const headerBar = cn(
    "fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b px-5 py-2 backdrop-blur-2xl",
    theme === "dark" && "border-white/[0.06] bg-white/[0.04]",
    theme === "light" && "border-slate-200/70 bg-white/60",
    theme === "sundown" && "border-amber-950/[0.08] bg-[#fffbeb]/[0.78]",
  );

  const titleClass = cn(
    "text-[15px] font-semibold tracking-tight",
    theme === "dark" && "text-white/90",
    (theme === "light" || theme === "sundown") && "text-slate-900",
  );

  const iconAccent = cn(
    theme === "dark" && "text-white/80",
    theme === "light" && "text-slate-700",
    theme === "sundown" && "text-amber-950/85",
  );

  const themeLabel =
    theme === "light" ? "Light appearance" : theme === "sundown" ? "Sundown appearance" : "Dark appearance";

  return (
    <div className="relative min-h-dvh pb-32">
      <header className={headerBar}>
        <Link href="/dashboard" className={titleClass}>
          Transparency
        </Link>
        <div className="flex items-center gap-2">
          <PointsChip />
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            transition={springSnappy}
            onClick={toggle}
            className={cn(
              "hit-44 relative isolate flex items-center justify-center overflow-hidden rounded-full",
              "transition-[transform,opacity] active:brightness-95",
              theme === "light" && "hover:bg-slate-900/[0.03]",
              theme === "sundown" && "hover:bg-amber-950/[0.04]",
              theme === "dark" && "hover:bg-white/[0.06]",
            )}
            aria-label={`Cycle appearance. ${themeLabel}.`}
          >
            <LiquidGlassIconSurface mode={theme} />
            <span className={cn("relative z-10 flex items-center justify-center", iconAccent)}>
              {theme === "light" ? (
                <Sun className="h-[18px] w-[18px]" strokeWidth={2} />
              ) : theme === "sundown" ? (
                <Sunset className="h-[18px] w-[18px]" strokeWidth={2} />
              ) : (
                <Moon className="h-[18px] w-[18px]" strokeWidth={2} />
              )}
            </span>
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            transition={springSnappy}
            onClick={() => setSettingsOpen(true)}
            className={cn(
              "hit-44 relative isolate flex items-center justify-center overflow-hidden rounded-full",
              "transition-[transform,opacity] active:brightness-95",
              theme === "light" && "hover:bg-slate-900/[0.03]",
              theme === "sundown" && "hover:bg-amber-950/[0.04]",
              theme === "dark" && "hover:bg-white/[0.06]",
            )}
            aria-label="Settings"
          >
            <LiquidGlassIconSurface mode={theme} />
            <span className={cn("relative z-10 flex items-center justify-center", iconAccent)}>
              <Settings className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
          </motion.button>
          <UserAvatar />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl justify-center gap-0 lg:gap-10 lg:px-8">
        <main className="mx-auto w-full max-w-lg flex-1 px-5 pt-20">{children}</main>
        <aside
          className="hidden w-[min(220px,22vw)] shrink-0 pt-20 lg:block"
          aria-label="Partner products"
        >
          <ProductsRail />
        </aside>
      </div>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
