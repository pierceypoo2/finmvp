import { cn } from "@/lib/cn";

export function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-6 shadow-lg backdrop-blur-xl",
        "bg-white/60 border-white/40 text-slate-900",
        "sundown:border-amber-200/60 sundown:bg-white/70 sundown:shadow-md",
        "dark:bg-white/[0.08] dark:border-white/[0.12] dark:text-white",
        className,
      )}
    >
      {children}
    </div>
  );
}
