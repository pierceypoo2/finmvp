import { AppShell } from "@/components/AppShell";
import { FinancialProvider } from "@/context/FinancialContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FinancialProvider>
      <AppShell>{children}</AppShell>
    </FinancialProvider>
  );
}
