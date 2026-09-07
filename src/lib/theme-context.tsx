import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark';
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('tricci-theme') as Theme | null;
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      setThemeState(savedTheme);
    }
    setMounted(true);
  }, []);

  // Update effective theme based on preference and system
  useEffect(() => {
    let effective: 'light' | 'dark' = 'dark';

    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effective = prefersDark ? 'dark' : 'light';
    } else {
      effective = theme;
    }

    setEffectiveTheme(effective);
    
    // Apply to document
    const root = document.documentElement;
    if (effective === 'dark') {
      root.classList.add('dark');
      root.style.background = '#080808';
      root.style.color = '#ffffff';
    } else {
      root.classList.remove('dark');
      root.style.background = '#ffffff';
      root.style.color = '#1a1a1a';
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('tricci-theme', newTheme);
  };

  if (!mounted) return children;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme, isDark: effectiveTheme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// Theme color system
export const themes = {
  light: {
    bg: {
      primary: '#ffffff',
      secondary: '#f5f5f5',
      tertiary: '#e8e8e8',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#666666',
      tertiary: '#999999',
    },
    border: '#e0e0e0',
    card: '#ffffff',
    hover: '#f0f0f0',
  },
  dark: {
    bg: {
      primary: '#080808',
      secondary: '#1a1a1a',
      tertiary: '#2a2a2a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#d0d0d0',
      tertiary: '#999999',
    },
    border: '#333333',
    card: '#0d0d0d',
    hover: '#1a1a1a',
  },
};

export function getThemeColors(theme: 'light' | 'dark') {
  return themes[theme];
}
