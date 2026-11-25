"use client";

import { useEffect, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "fpt_classswap_theme_v1";

let currentTheme: ThemeMode = "light";
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function applyDomTheme(mode: ThemeMode) {
  currentTheme = mode;
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", mode === "dark");
    document.documentElement.style.colorScheme = mode;
  }
  emitChange();
}

export function setThemeMode(mode: ThemeMode) {
  applyDomTheme(mode);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore storage failure
    }
  }
}

export function toggleThemeMode() {
  setThemeMode(currentTheme === "dark" ? "light" : "dark");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ThemeMode {
  return currentTheme;
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    theme,
    isDark: theme === "dark",
    setTheme: setThemeMode,
    toggleTheme: toggleThemeMode,
  };
}

export function ThemeInitializer() {
  useEffect(() => {
    let initial: ThemeMode = "light";
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") {
        initial = saved;
      } else if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        initial = "dark";
      }
    } catch {
      // ignore storage error
    }
    applyDomTheme(initial);
  }, []);

  return null;
}
