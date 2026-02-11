import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '../common/ConnectButton';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { ThemeToggle } from '../common/ThemeToggle';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setIsLangMenuOpen(false);
  };

  const navItems = [
    { label: t('nav.explorer'), path: '/' },
    { label: t('nav.portfolio'), path: '/portfolio' },
  ];

  return (
    <div className="min-h-screen bg-base text-fg-primary font-sans selection:bg-primary-500/30">
      <header className="sticky top-0 z-50 border-b border-border bg-base/95 backdrop-blur-lg shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <span className="font-bold text-white text-sm">S</span>
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:block bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">SUi Predict</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'px-3 py-2 text-sm font-medium transition-all rounded-lg relative',
                    location.pathname === item.path
                      ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400'
                      : 'text-fg-secondary hover:text-fg-primary hover:bg-elevated'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-fg-secondary hover:text-fg-primary transition-all rounded-lg hover:bg-elevated"
                title="Switch Language"
              >
                <Globe className="w-4 h-4" />
                <span className="hidden lg:inline">{i18n.language === 'en' ? 'EN' : '中文'}</span>
                <ChevronDown className={clsx("w-3 h-3 transition-transform", isLangMenuOpen && "rotate-180")} />
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-base border border-border rounded-xl shadow-2xl py-1.5 z-50 overflow-hidden">
                  <button
                    onClick={() => changeLanguage('en')}
                    className={clsx(
                      "w-full text-left px-4 py-2.5 text-sm hover:bg-elevated transition-all",
                      i18n.language === 'en' ? "text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/20" : "text-fg-secondary"
                    )}
                  >
                    English
                  </button>
                  <button
                    onClick={() => changeLanguage('zh')}
                    className={clsx(
                      "w-full text-left px-4 py-2.5 text-sm hover:bg-elevated transition-all",
                      i18n.language === 'zh' ? "text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/20" : "text-fg-secondary"
                    )}
                  >
                    中文
                  </button>
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800/40 px-3 py-1.5 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2 shadow-sm shadow-green-400" />
              <span className="text-xs text-green-700 dark:text-green-400 font-medium">{t('nav.testnetLive')}</span>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-surface/50 backdrop-blur-sm mt-auto">
          <div className="container mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-fg-muted">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <span className="font-bold text-white text-[10px]">S</span>
                </div>
                <div>
                  <div className="font-medium text-fg-secondary">© 2026 SUi Predict</div>
                  <div className="text-[10px] mt-0.5">{t('common.poweredBy')}</div>
                </div>
              </div>
              <div className="flex gap-6">
                <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">{t('nav.docs')}</a>
                <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">{t('nav.twitter')}</a>
                <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">{t('nav.support')}</a>
              </div>
            </div>
          </div>
      </footer>
    </div>
  );
};

export default MainLayout;
