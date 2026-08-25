"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type ThemeMode = "light" | "dark" | "professional";
type ColorTheme = "blue" | "green" | "red" | "purple";

interface ThemeContextType {
  mode: ThemeMode;
  colorTheme: ColorTheme;
  setMode: (mode: ThemeMode) => void;
  setColorTheme: (theme: ColorTheme) => void;
  resolvedTheme: string;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "light",
  colorTheme: "blue",
  setMode: () => {},
  setColorTheme: () => {},
  resolvedTheme: "light-blue",
});

export function useThemeContext() {
  return useContext(ThemeContext);
}

/**
 * ThemeProvider v2 — FIX React #310
 * 
 * ALWAYS wraps children with ThemeContext.Provider, even before mount.
 * This ensures the React fiber tree is identical between server and client,
 * preventing hydration mismatches in React 19.
 * 
 * Before: server/client rendered <>{children}</> then switched to <Provider> after mount.
 * After: always renders <Provider>{children}</Provider> — only the VALUE changes after mount.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [colorTheme, setColorTheme] = useState<ColorTheme>("blue");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("nexus-one-pos-theme");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.mode) setMode(parsed.mode);
        if (parsed.colorTheme) setColorTheme(parsed.colorTheme);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.setAttribute("data-theme", colorTheme);
    if (mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    if (mode === "professional") {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "blue");
    }
    localStorage.setItem("nexus-one-pos-theme", JSON.stringify({ mode, colorTheme }));
  }, [mode, colorTheme, mounted]);

  const resolvedTheme = `${mode}-${colorTheme}`;

  // ALWAYS provide context — never switch between <>{children}</> and <Provider>
  // This is critical for React 19 hydration compatibility
  return (
    <ThemeContext.Provider value={{ mode, colorTheme, setMode, setColorTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
