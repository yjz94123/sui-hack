import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../stores';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-elevated transition-colors"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-fg-secondary hover:text-fg-primary transition-colors" />
      ) : (
        <Moon className="w-4 h-4 text-fg-secondary hover:text-fg-primary transition-colors" />
      )}
    </button>
  );
}
