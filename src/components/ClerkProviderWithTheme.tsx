"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import { useMemo } from "react";

export function ClerkProviderWithTheme({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  const appearance = useMemo(() => {
    if (theme === "dark") {
      return {
        variables: {
          colorBackground: "#020617",
          colorInputBackground: "rgba(15, 23, 42, 0.75)",
          colorText: "#f1f5f9",
          colorTextSecondary: "rgba(241, 245, 249, 0.65)",
        },
      };
    }
    if (theme === "sundown") {
      return {
        variables: {
          colorBackground: "#fffbeb",
          colorInputBackground: "rgba(255, 251, 235, 0.92)",
          colorText: "#1c1917",
          colorTextSecondary: "rgba(41, 37, 36, 0.68)",
        },
      };
    }
    return {
      variables: {
        colorBackground: "#f8fafc",
        colorInputBackground: "#ffffff",
        colorText: "#0f172a",
        colorTextSecondary: "#64748b",
      },
    };
  }, [theme]);

  return <ClerkProvider appearance={appearance}>{children}</ClerkProvider>;
}
