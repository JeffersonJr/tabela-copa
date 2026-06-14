'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read from localStorage
    const stored = localStorage.getItem('copa-theme') as Theme | null;
    const initial: Theme = stored === 'dark' ? 'dark' : 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial === 'dark' ? 'dark' : '');
  }, []);

  const toggle = () => {
    setTheme(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('copa-theme', next);
      document.documentElement.setAttribute('data-theme', next === 'dark' ? 'dark' : '');
      return next;
    });
  };

  // Avoid flash: don't render until mounted
  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
