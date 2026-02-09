import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
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
    { label: t('nav.smartMoney'), path: '/smart-money', disabled: true },
    { label: t('nav.reefboard'), path: '/reefboard', disabled: true },
    { label: t('nav.referral'), path: '/referral', disabled: true },
    { label: t('nav.portfolio'), path: '/portfolio' },
  ];

  return (
    <div className="min-h-screen bg-base text-fg-primary font-sans selection:bg-primary-500/30">
      <header className="sticky top-0 z-50 border-b border-border bg-base/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                <span className="font-bold text-black text-xs">0G</span>
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:block">0G Predict</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'text-sm font-medium transition-colors',
                    location.pathname === item.path
                      ? 'text-fg-primary'
                      : 'text-fg-secondary hover:text-fg-primary',
                    item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
                  )}
                >
                  {item.label}
                  {item.disabled && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-elevated text-fg-secondary rounded-sm">
                      {t('nav.soon')}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />

            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-fg-secondary hover:text-fg-primary transition-colors rounded-lg hover:bg-elevated"
                title="Switch Language"
              >
                <Globe className="w-4 h-4" />
                <span>{i18n.language === 'en' ? 'English' : '中文'}</span>
                <ChevronDown className={clsx("w-3 h-3 transition-transform", isLangMenuOpen && "rotate-180")} />
              </button>
              
              {isLangMenuOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-base border border-border rounded-lg shadow-xl py-1 z-50">
                  <button
                    onClick={() => changeLanguage('en')}
                    className={clsx(
                      "w-full text-left px-4 py-2 text-sm hover:bg-elevated transition-colors",
                      i18n.language === 'en' ? "text-primary-500 font-medium" : "text-fg-secondary"
                    )}
                  >
                    English
                  </button>
                  <button
                    onClick={() => changeLanguage('zh')}
                    className={clsx(
                      "w-full text-left px-4 py-2 text-sm hover:bg-elevated transition-colors",
                      i18n.language === 'zh' ? "text-primary-500 font-medium" : "text-fg-secondary"
                    )}
                  >
                    中文
                  </button>
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center bg-surface rounded-lg border border-border px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
              <span className="text-xs text-fg-secondary font-mono">{t('nav.testnetLive')}</span>
            </div>
            <ConnectButton 
              accountStatus="avatar"
              chainStatus="icon"
              showBalance={false}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-surface mt-auto">
          <div className="container mx-auto px-4 py-8 flex items-center justify-between text-xs text-fg-muted">
           <div>© 2026 0G Predict. {t('common.poweredBy')}</div>
           <div className="flex gap-4">
             <a href="#" className="hover:text-fg-primary transition">{t('nav.docs')}</a>
             <a href="#" className="hover:text-fg-primary transition">{t('nav.twitter')}</a>
             <a href="#" className="hover:text-fg-primary transition">{t('nav.support')}</a>
           </div>
         </div>
      </footer>
    </div>
  );
};

export default MainLayout;
