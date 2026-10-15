import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import { themeBootstrapScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "WordSwap",
  description:
    "Swap one letter, form a new word. Pass-and-play word game for up to 20 players with an AI Referee.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript() }} />
      </head>
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <span className="text-logo">
              Word<span className="text-logo-accent">Swap</span>
            </span>
            <div className="row row-sm">
              <ThemeToggle />
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
