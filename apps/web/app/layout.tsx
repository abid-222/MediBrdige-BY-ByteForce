import "./globals.css";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";

export const metadata = { title: "MediBridge AI", description: "AI assists. Doctors decide. Patients stay in control." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600&family=Inter:wght@400;500;600&family=JetBrains+Mono&display=swap" />
      </head>
      <body>
        <ThemeProvider><I18nProvider><AppShell>{children}</AppShell></I18nProvider></ThemeProvider>
      </body>
    </html>
  );
}
