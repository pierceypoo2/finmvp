import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProviderWithTheme } from "@/components/ClerkProviderWithTheme";
import { ThemeProvider } from "@/context/ThemeContext";
import { CHUNK_RECOVERY_SCRIPT } from "@/lib/chunkRecoveryScript";
import { clerkConfigured } from "@/lib/getUser";
import { THEME_INIT_SCRIPT } from "@/lib/themeInitScript";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Transparency Audit",
  description: "Cash flow and debt clarity — one calm screen at a time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline so a layout chunk timeout doesn’t block theme init on a separate script chunk */}
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        {/* Inline only — ChunkLoadRecovery lived in a client chunk and could not run if layout.js failed */}
        <script dangerouslySetInnerHTML={{ __html: CHUNK_RECOVERY_SCRIPT }} />
      </head>
      <body className={`${inter.variable} antialiased`}>
        {/* Mesh is not on `body` so `filter` in meshShift doesn’t break Plaid’s fixed iframe. */}
        <div
          id="bg-mesh"
          className="pointer-events-none fixed inset-0 -z-10 min-h-dvh mesh-bg-dark"
          aria-hidden
        />
        <ThemeProvider>
          {clerkConfigured ? (
            <ClerkProviderWithTheme>{children}</ClerkProviderWithTheme>
          ) : (
            children
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
