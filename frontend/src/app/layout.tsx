import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegistrar } from "@/components/PwaManager";
import { AppStateProvider } from "@/lib/app-state";
import { LocaleProvider } from "@/lib/i18n";
import { ThemeInitializer } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FPT Swapper — Kết nối đổi lớp sinh viên FPT",
  description:
    "Nền tảng kết nối sinh viên FPT để tìm người đổi lớp học tương thích theo cơ chế matching hai chiều.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/fpt-logo2.png",
    apple: "/fpt-logo2.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <ThemeInitializer />
        <PwaRegistrar />
        <LocaleProvider>
          <AppStateProvider>{children}</AppStateProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
