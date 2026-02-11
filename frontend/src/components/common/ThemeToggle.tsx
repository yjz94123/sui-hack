import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../stores';

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="app-btn-secondary h-10 w-10 rounded-xl p-0"
      title={isDark ? t('common.theme.light') : t('common.theme.dark')}
      aria-label={t('common.theme.toggle')}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
