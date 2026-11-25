"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Locale = "vi" | "en";

const MESSAGES = {
  vi: {
    "nav.dashboard": "Tổng quan",
    "nav.discover": "Discover",
    "nav.requests": "Yêu cầu đổi lớp",
    "nav.matches": "Matches",
    "nav.chat": "Tin nhắn",
    "nav.notifications": "Thông báo",
    "nav.profile": "Hồ sơ",
    "nav.admin": "Admin",
    "auth.login": "Đăng nhập tài khoản",
    "auth.logout": "Đăng xuất",
    "a11y.skipToContent": "Bỏ qua đến nội dung chính",
    "pwa.install": "Cài ứng dụng",
    "legal.privacy": "Chính sách bảo mật",
    "legal.terms": "Điều khoản sử dụng",
    "lang.toggleTitle": "Chuyển sang tiếng Anh",
    "lang.short": "VI",
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.discover": "Discover",
    "nav.requests": "Swap Requests",
    "nav.matches": "Matches",
    "nav.chat": "Messages",
    "nav.notifications": "Notifications",
    "nav.profile": "Profile",
    "nav.admin": "Admin",
    "auth.login": "Sign in",
    "auth.logout": "Sign out",
    "a11y.skipToContent": "Skip to main content",
    "pwa.install": "Install App",
    "legal.privacy": "Privacy Policy",
    "legal.terms": "Terms of Use",
    "lang.toggleTitle": "Switch to Vietnamese",
    "lang.short": "EN",
  },
} as const;

type MessageKey = keyof typeof MESSAGES.vi;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  toggleLocale: () => void;
  t: (key: MessageKey) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "vi",
  setLocale: () => {},
  toggleLocale: () => {},
  t: (key) => MESSAGES.vi[key],
});

const STORAGE_KEY = "fpt_classswap_locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "vi") {
        queueMicrotask(() => setLocaleState(saved));
        document.documentElement.lang = saved;
      }
    } catch {
      // ignore storage access issues
    }
  }, []);

  const setLocale = (loc: Locale) => {
    setLocaleState(loc);
    try {
      window.localStorage.setItem(STORAGE_KEY, loc);
      document.documentElement.lang = loc;
    } catch {
      // ignore
    }
  };

  const toggleLocale = () => setLocale(locale === "vi" ? "en" : "vi");
  const t = (key: MessageKey) => MESSAGES[locale][key] ?? MESSAGES.vi[key];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
