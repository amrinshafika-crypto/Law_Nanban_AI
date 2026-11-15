import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, MessageCircle, Scale, FileText, HeartHandshake,
  FolderSearch, Languages, LogOut, Menu, X,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { useTranslations } from '@/i18n';
import type { Lang } from '@/i18n';

const navItems = [
  { to: '/portal', labelKey: 'home', icon: Home, end: true },
  { to: '/portal/ask', labelKey: 'ask', icon: MessageCircle },
  { to: '/portal/rights', labelKey: 'rightsLibrary', icon: Scale },
  { to: '/portal/explain', labelKey: 'explain', icon: FileText },
  { to: '/portal/aid', labelKey: 'aid', icon: HeartHandshake },
  { to: '/portal/case-status', labelKey: 'caseStatus', icon: FolderSearch },
  { to: '/portal/language', labelKey: 'language', icon: Languages },
];

export function CitizenLayout({ children, lang, setLang }: { children: ReactNode; lang: Lang; setLang: (l: Lang) => void }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const t = useTranslations(lang);

  async function handleSignOut() {
    setSignOutError(null);
    const result = await signOut();
    if (result.error) {
      setSignOutError(result.error);
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-navy-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-navy-900 text-white">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size={36} light />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors"
            >
              {lang === 'en' ? 'தமிழ்' : 'English'}
            </button>
            {profile ? (
              <button onClick={handleSignOut} className="p-2 rounded-lg hover:bg-white/10" aria-label={lang === 'ta' ? 'வெளியேறு' : 'Sign out'}>
                <LogOut size={18} />
              </button>
            ) : (
              <button
                onClick={() => navigate('/signin')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gold-500 text-navy-900 hover:bg-gold-400"
              >
                {lang === 'ta' ? 'உள்நுழை' : 'Sign in'}
              </button>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-white/10">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          {signOutError && <p role="alert" className="px-4 pb-2 text-xs text-danger-300 text-center">{signOutError}</p>}
        </div>
      </header>

      {/* Nav bar (desktop) */}
      <nav className="sticky top-16 z-20 bg-white border-b border-navy-100 hidden md:block">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive ? 'border-accent-500 text-accent-700' : 'border-transparent text-navy-600 hover:text-navy-900 hover:bg-navy-50'
                  }`
                }
              >
                <Icon size={16} />
                {t.nav[item.labelKey as keyof typeof t.nav]}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden bg-white border-b border-navy-100 animate-slide-in">
          <div className="px-4 py-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-accent-50 text-accent-700' : 'text-navy-600 hover:bg-navy-50'
                    }`
                  }
                >
                  <Icon size={18} />
                  {t.nav[item.labelKey as keyof typeof t.nav]}
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}

      <main className="flex-1 p-4 lg:p-6">
        <div className="max-w-5xl mx-auto w-full">{children}</div>
      </main>

      <footer className="bg-navy-900 text-navy-300 py-6 px-4 text-center text-xs">
        <p>{t.appName} — {t.tagline}</p>
        <p className="mt-1">{lang === 'ta' ? 'பொதுவான சட்டத் தகவல் மட்டுமே; சட்டப் பிரதிநிதித்துவமோ தகுதியான வழக்கறிஞரின் ஆலோசனைக்கு மாற்றோ அல்ல.' : 'General legal information only. This is not legal representation or a substitute for advice from a qualified lawyer.'}</p>
      </footer>
    </div>
  );
}
