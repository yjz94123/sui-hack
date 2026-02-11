import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Dot, Globe } from 'lucide-react';
import { clsx } from 'clsx';
import { ConnectButton } from '../common/ConnectButton';
import { ThemeToggle } from '../common/ThemeToggle';
import { isSimMode } from '../../api/sim-mode';

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

  const changeLanguage = (lang: 'en' | 'zh') => {
    i18n.changeLanguage(lang);
    setIsLangMenuOpen(false);
  };

  const navItems = [
    { label: t('nav.explorer'), path: '/' },
    { label: t('nav.portfolio'), path: '/portfolio' },
  ];

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="relative min-h-screen overflow-x-clip bg-base text-fg-primary">
      <div className="pointer-events-none fixed inset-x-0 top-[-28rem] z-0 h-[36rem] bg-[radial-gradient(circle_at_top,rgba(10,132,255,0.18),transparent_62%)]" />

      <header className="sticky top-0 z-50 border-b border-border/70 bg-base/92 backdrop-blur-2xl">
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[6rem] items-center justify-between gap-4 py-3">
            <div className="flex min-w-0 items-center gap-4 sm:gap-8">
              <Link to="/" className="group inline-flex min-w-0 items-center gap-3.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-accent/25 bg-accent text-sm font-semibold tracking-wide text-white shadow-md shadow-accent/30 transition group-hover:scale-[1.02]">
                  SP
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-fg-muted">Prediction Market</p>
                  <p className="truncate text-[1.95rem] font-semibold leading-none tracking-[-0.012em] text-fg-primary">Sui Predict</p>
                </div>
              </Link>

              <nav className="hidden items-center gap-1.5 rounded-full border border-border bg-surface/88 p-1.5 shadow-sm md:flex">
                {navItems.map((item) => {
                  const active = isActivePath(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={clsx(
                        'rounded-full px-4 py-2 text-sm transition',
                        active
                          ? 'bg-accent text-white font-semibold shadow-md shadow-accent/30'
                          : 'text-fg-muted font-medium hover:bg-elevated hover:text-fg-secondary'
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="hidden items-center rounded-full border border-border bg-surface px-3 py-2 text-xs font-medium text-fg-secondary lg:inline-flex">
                <Dot className="-ml-1 h-4 w-4 text-success" />
                {isSimMode ? 'Simulation Mode' : t('nav.testnetLive')}
              </div>

              <ThemeToggle />

              <div className="relative" ref={langMenuRef}>
                <button
                  onClick={() => setIsLangMenuOpen((prev) => !prev)}
                  className="app-btn-secondary h-10 gap-1.5 rounded-xl px-3 text-[13px] font-semibold"
                  title="Switch Language"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>{i18n.language === 'zh' ? '中文' : 'EN'}</span>
                  <ChevronDown className={clsx('h-3.5 w-3.5 transition', isLangMenuOpen && 'rotate-180')} />
                </button>

                {isLangMenuOpen && (
                  <div className="absolute right-0 mt-2 w-36 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-soft">
                    {[
                      { code: 'en', label: 'English' },
                      { code: 'zh', label: '中文' },
                    ].map((item) => (
                      <button
                        key={item.code}
                        onClick={() => changeLanguage(item.code as 'en' | 'zh')}
                        className={clsx(
                          'w-full rounded-lg px-3 py-2 text-left text-sm transition',
                          i18n.language === item.code
                            ? 'bg-accent-soft font-medium text-accent'
                            : 'text-fg-secondary hover:bg-elevated hover:text-fg-primary'
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <ConnectButton />
            </div>
          </div>

          <nav className="scrollbar-hide -mx-1 mb-4 flex items-center gap-1.5 overflow-x-auto px-1 md:hidden">
            {navItems.map((item) => {
              const active = isActivePath(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition',
                    active
                      ? 'border-accent/30 bg-accent-soft text-accent font-semibold'
                      : 'border-border bg-surface text-fg-muted font-medium hover:text-fg-secondary'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1240px] px-4 pb-10 pt-12 sm:px-6 sm:pb-11 sm:pt-14 lg:px-8">
        <Outlet />
      </main>

      <footer className="relative z-10 mt-12 border-t border-border/70 bg-surface/55">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col items-start justify-between gap-4 px-4 py-6 text-xs text-fg-muted sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <p className="font-medium text-fg-secondary">© 2026 Sui Predict</p>
            <p className="mt-1">{isSimMode ? 'Demo mode with local simulated market + AI data' : t('common.poweredBy')}</p>
          </div>

          <div className="flex items-center gap-5">
            <a href="#" className="text-fg-secondary transition hover:text-fg-primary">
              {t('nav.docs')}
            </a>
            <a href="#" className="text-fg-secondary transition hover:text-fg-primary">
              {t('nav.twitter')}
            </a>
            <a href="#" className="text-fg-secondary transition hover:text-fg-primary">
              {t('nav.support')}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
