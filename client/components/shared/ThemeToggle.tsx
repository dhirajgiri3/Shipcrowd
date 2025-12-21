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
          "relative h-10 w-10 rounded-xl",
          "flex items-center justify-center",
          "transition-all duration-300 ease-out",
          "bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]",
          "border border-[var(--border-default)]",
          "hover:border-[var(--border-strong)]",
          "hover:scale-110 active:scale-95",
          "focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] focus:ring-offset-2",
          "overflow-hidden"
        )}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}
      >
        {/* Animated Background Gradient */}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300",
          "bg-gradient-to-br",
          gradient
        )} />

        {/* Icon with Rotation Animation */}
        <Icon
          className={cn(
            "h-5 w-5 text-[var(--text-primary)] relative z-10",
            "transition-all duration-500 ease-out",
            "group-hover:rotate-12 group-hover:scale-110"
          )}
        />

        {/* Pulse Effect on Click */}
        <span className="absolute inset-0 rounded-xl animate-ping opacity-0 group-active:opacity-20 bg-[var(--primary-blue)]" />
      </button>

      {/* Tooltip */}
      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 top-full mt-2",
        "px-3 py-1.5 rounded-lg",
        "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
        "shadow-lg backdrop-blur-sm",
        "text-xs font-medium text-[var(--text-primary)] whitespace-nowrap",
        "opacity-0 invisible group-hover:opacity-100 group-hover:visible",
        "transition-all duration-200 ease-out",
        "pointer-events-none z-50",
        "group-hover:translate-y-0 translate-y-[-4px]"
      )}>
        {label}
        {/* Tooltip Arrow */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rotate-45 bg-[var(--bg-elevated)] border-l border-t border-[var(--border-default)]" />
      </div>

      {/* Theme Indicator Dots */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
        {/* Light Dot */}
        <div className={cn(
          "w-1 h-1 rounded-full transition-all duration-300",
          theme === 'light'
            ? "bg-amber-500 scale-125 shadow-sm shadow-amber-500/50"
            : "bg-[var(--border-default)]"
        )} />
        {/* Dark Dot */}
        <div className={cn(
          "w-1 h-1 rounded-full transition-all duration-300",
          theme === 'dark'
            ? "bg-indigo-500 scale-125 shadow-sm shadow-indigo-500/50"
            : "bg-[var(--border-default)]"
        )} />
        {/* System Dot */}
        <div className={cn(
          "w-1 h-1 rounded-full transition-all duration-300",
          theme === 'system'
            ? "bg-blue-500 scale-125 shadow-sm shadow-blue-500/50"
            : "bg-[var(--border-default)]"
        )} />
      </div>
    </div>
  );
}
