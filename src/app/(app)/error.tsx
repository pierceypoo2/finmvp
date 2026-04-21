"use client";

import { ErrorRecoveryUI } from "@/components/ErrorRecoveryUI";

export default function AppRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorRecoveryUI error={error} reset={reset} variant="app" />;
}
