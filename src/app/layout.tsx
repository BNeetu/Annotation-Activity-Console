import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Self-hosted via next/font (downloaded at build time), not a runtime Google
// Fonts <link> tag. Inter for everything; JetBrains Mono only for ids and
// timestamps, since a monospace face makes fixed-width data (a task id, a
// clock reading) easier to scan than regular prose -- a functional choice,
// not a decorative one.
const bodyFont = Inter({ subsets: ["latin"], variable: "--font-body" });
const monoFont = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Annotation Activity Console",
  description: "Internal console for annotator task activity",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${monoFont.variable}`}>
      <body className="bg-slate-50 font-sans text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
