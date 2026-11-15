import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, Brain, FileText, GitBranch,
  BookOpen, Calendar, HeartHandshake, Bot, BarChart3, Settings, PenTool,
  LogOut, Menu, X, Bell, Search, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';

const navItems = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/cases', label: 'Cases', icon: FolderKanban },
  { to: '/app/triage', label: 'Smart Case Triage', icon: Brain },
  { to: '/app/documents', label: 'Documents', icon: FileText },
  { to: '/app/timeline', label: 'Case Timeline', icon: GitBranch },
  { to: '/app/research', label: 'Legal Research', icon: BookOpen },
  { to: '/app/drafting', label: 'Legal Drafting', icon: PenTool },
  { to: '/app/library', label: 'Legal Library', icon: BookOpen },
  { to: '/app/calendar', label: 'Hearing Calendar', icon: Calendar },
  { to: '/app/legal-aid', label: 'Legal Aid Resources', icon: HeartHandshake },
  { to: '/app/assistant', label: 'AI Assistant', icon: Bot },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export function ProfessionalLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSignOut() {
    setSignOutError(null);
    const result = await signOut();
    if (result.error) {
      setSignOutError(result.error);
      return;
    }
    navigate('/signin', { replace: true });
  }

  return (
    <div className="min-h-screen bg-navy-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-navy-900 text-white z-40 transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col`}
      >
        <div className="p-5 border-b border-white/10">
          <Logo size={36} light />
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
            <div className="w-9 h-9 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-300 font-semibold text-sm">
              {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.display_name || 'User'}</p>
              <p className="text-xs text-navy-300 truncate">{profile?.bar_number || profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="nav-link w-full mt-2 text-navy-300 hover:text-danger-300 hover:bg-danger-500/10"
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
          {signOutError && <p role="alert" className="px-3 pt-2 text-xs text-danger-300">{signOutError}</p>}
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-navy-900/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-navy-100 px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-navy-100"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-navy-500">
              <ShieldCheck size={16} className="text-success-600" />
              <span>Professional Workspace</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-50 border border-navy-100">
              <Search size={16} className="text-navy-400" />
              <input
                type="text"
                placeholder="Search cases..."
                className="bg-transparent text-sm outline-none w-40 placeholder:text-navy-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    navigate(`/app/cases?q=${encodeURIComponent(e.currentTarget.value)}`);
                  }
                }}
              />
            </div>
            <button className="relative p-2 rounded-lg hover:bg-navy-100">
              <Bell size={18} className="text-navy-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger-500" />
            </button>
            <div className="w-9 h-9 rounded-full bg-navy-800 text-white flex items-center justify-center font-semibold text-sm">
              {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>

        <footer className="px-6 py-3 border-t border-navy-100 text-xs text-navy-400 text-center">
          Law Nanban AI · Agentic AI for Legal Intelligence · Recommendations are advisory and require human review.
        </footer>
      </div>
    </div>
  );
}
