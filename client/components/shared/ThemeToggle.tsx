"use client";

import { useTheme } from './ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Modern Animated Theme Toggle
 * Beautiful, smooth animations with enhanced UX
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // Cycle through themes: light -> dark -> system -> light
  const cycleTheme = () => {
    const nextTheme = {
      light: 'dark',
      dark: 'system',
      system: 'light',
    }[theme] as 'light' | 'dark' | 'system';
    setTheme(nextTheme);
  };

  // Get current icon and label based on theme
  const getThemeInfo = () => {
    switch (theme) {
      case 'light':
        return { icon: Sun, label: 'Light Mode', gradient: 'from-amber-400 to-orange-500' };
      case 'dark':
        return { icon: Moon, label: 'Dark Mode', gradient: 'from-indigo-500 to-purple-600' };
      case 'system':
        return { icon: Monitor, label: 'System', gradient: 'from-blue-500 to-cyan-500' };
    }
  };

  const { icon: Icon, label, gradient } = getThemeInfo();

  return (
    <div className="relative group">
      {/* Main Toggle Button */}
      <button
        onClick={cycleTheme}
        className={cn(
          "relative h-9 w-9 rounded-xl",
          "flex items-center justify-center",
          "transition-all duration-300 ease-out",
          "bg-transparent hover:bg-[var(--bg-secondary)]",
          "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          "hover:scale-105 active:scale-95",
          "focus:outline-none focus:ring-1 focus:ring-[var(--primary-blue)]/30",
          "overflow-hidden"
        )}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}
      >
        {/* Animated Background Gradient (Subtler) */}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300",
          "bg-gradient-to-br",
          gradient
        )} />

        {/* Icon with Rotation Animation */}
        <Icon
          className={cn(
            "h-4.5 w-4.5 relative z-10",
            "transition-all duration-500 ease-out",
            "group-hover:rotate-12"
          )}
        />
      </button>

      {/* Tooltip - Elegant & Minimal */}
      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 top-full mt-2",
        "px-2.5 py-1 rounded-md",
        "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
        "shadow-lg backdrop-blur-sm",
        "text-[10px] font-medium text-[var(--text-primary)] whitespace-nowrap",
        "opacity-0 invisible group-hover:opacity-100 group-hover:visible",
        "transition-all duration-200 ease-out",
        "pointer-events-none z-50",
        "translate-y-[-4px] group-hover:translate-y-0"
      )}>
        {label}
      </div>
    </div>
  );
}
