import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/auth/AuthPage';
import { ProfessionalLayout } from '@/components/ProfessionalLayout';
import { CitizenLayout } from '@/components/CitizenLayout';
import { Dashboard } from '@/pages/professional/Dashboard';
import { Cases } from '@/pages/professional/Cases';
import { CaseEditor } from '@/pages/professional/CaseEditor';
import { CaseDetail } from '@/pages/professional/CaseDetail';
import { CaseTriage } from '@/pages/professional/CaseTriage';
import { Documents } from '@/pages/professional/Documents';
import { CaseTimeline } from '@/pages/professional/CaseTimeline';
import { LegalResearch } from '@/pages/professional/LegalResearch';
import { HearingCalendar } from '@/pages/professional/HearingCalendar';
import { LegalAidResources } from '@/pages/professional/LegalAidResources';
import { AIAssistant } from '@/pages/professional/AIAssistant';
import { Analytics } from '@/pages/professional/Analytics';
import { Settings } from '@/pages/professional/Settings';
import { Drafting } from '@/pages/professional/Drafting';
import { CitizenHome } from '@/pages/citizen/CitizenHome';
import { CitizenAsk } from '@/pages/citizen/CitizenAsk';
import { CitizenExplain } from '@/pages/citizen/CitizenExplain';
import { CitizenAid } from '@/pages/citizen/CitizenAid';
import { CitizenCaseStatus } from '@/pages/citizen/CitizenCaseStatus';
import { CitizenLanguage } from '@/pages/citizen/CitizenLanguage';
import { CitizenKnowledge } from '@/pages/citizen/CitizenKnowledge';
import { LegalLibrary } from '@/pages/citizen/LegalLibrary';
import { LegalLibraryDetail } from '@/pages/citizen/LegalLibraryDetail';
import { useEffect, useState, ReactNode } from 'react';
import { isLang } from '@/i18n';
import type { Lang } from '@/i18n';

function RequireAuth({ children, role, allowGuest = false }: { children: ReactNode; role: 'professional' | 'citizen'; allowGuest?: boolean }) {
  const { user, profile, profileError, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-navy-200 border-t-navy-600" /></div>;
  if (!user) return allowGuest ? <>{children}</> : <Navigate to="/signin" replace />;
  if (profileError || !profile || profile.id !== user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-danger-200 bg-white p-6 text-center shadow-card">
          <h1 className="font-serif text-xl font-semibold text-navy-900">Account profile unavailable</h1>
          <p role="alert" className="mt-3 text-sm text-danger-700">
            {profileError || 'A valid profile for this signed-in account could not be found. Access is blocked.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button type="button" className="btn-outline" onClick={() => void refreshProfile()}>Retry</button>
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                const result = await signOut();
                if (result.error) {
                  setSignOutError(result.error);
                } else {
                  navigate('/signin', { replace: true });
                }
              }}
            >
              Sign out
            </button>
          </div>
          {signOutError && <p role="alert" className="mt-3 text-sm text-danger-700">{signOutError}</p>}
        </div>
      </div>
    );
  }
  if (!['citizen', 'professional', 'admin'].includes(profile.role)) {
    return <Navigate to="/signin" replace />;
  }
  if (profile.role !== role && profile.role !== 'admin') {
    if (role === 'professional') return <div className="min-h-screen flex items-center justify-center p-6"><div className="max-w-md rounded-xl border border-gold-200 bg-white p-6 text-center shadow-card"><h1 className="font-serif text-xl font-semibold text-navy-900">Professional access required</h1><p className="mt-3 text-sm leading-6 text-navy-600">This account is registered as a {profile.role}. The professional workspace requires an authorized professional account. Contact your Law Nanban administrator to request professional access.</p><div className="mt-5 flex justify-center gap-3"><button type="button" className="btn-outline" onClick={() => navigate('/portal')}>Open citizen portal</button><button type="button" className="btn-primary" onClick={async () => { const result = await signOut(); if (result.error) setSignOutError(result.error); else navigate('/signin', { replace: true }); }}>Sign out</button></div>{signOutError && <p role="alert" className="mt-3 text-sm text-danger-700">{signOutError}</p>}</div></div>;
    return <Navigate to={profile.role === 'professional' ? '/app' : '/portal'} replace />;
  }
  return <>{children}</>;
}

function ProfessionalRoutes() {
  return (
    <RequireAuth role="professional">
      <ProfessionalLayout>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="cases" element={<Cases />} />
          <Route path="cases/new" element={<CaseEditor />} />
          <Route path="cases/:id/edit" element={<CaseEditor />} />
          <Route path="cases/:id" element={<CaseDetail />} />
          <Route path="triage" element={<CaseTriage />} />
          <Route path="documents" element={<Documents />} />
          <Route path="timeline" element={<CaseTimeline />} />
          <Route path="research" element={<LegalResearch />} />
          <Route path="drafting" element={<Drafting />} />
          <Route path="calendar" element={<HearingCalendar />} />
          <Route path="legal-aid" element={<LegalAidResources />} />
          <Route path="library" element={<LegalLibrary />} />
          <Route path="assistant" element={<AIAssistant />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </ProfessionalLayout>
    </RequireAuth>
  );
}

function CitizenRoutes() {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('ln-lang');
      return isLang(saved) ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === 'ln-lang' && isLang(event.newValue)) setLang(event.newValue);
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  function updateLang(nextLang: Lang) {
    if (!isLang(nextLang)) return;
    setLang(nextLang);
    try { localStorage.setItem('ln-lang', nextLang); } catch { /* Keep the in-memory preference for this visit. */ }
  }

  return (
    <RequireAuth role="citizen" allowGuest>
      <CitizenLayout lang={lang} setLang={updateLang}>
        <Routes>
          <Route index element={<CitizenHome lang={lang} />} />
          <Route path="ask" element={<CitizenAsk lang={lang} />} />
          <Route path="rights" element={<CitizenKnowledge lang={lang} />} />
          <Route path="legal-library" element={<CitizenKnowledge lang={lang} />} />
          <Route path="legal-library/:slug" element={<LegalLibraryDetail />} />
          <Route path="explain" element={<CitizenExplain lang={lang} />} />
          <Route path="aid" element={<CitizenAid lang={lang} />} />
          <Route path="case-status" element={<CitizenCaseStatus lang={lang} />} />
          <Route path="language" element={<CitizenLanguage lang={lang} setLang={setLang} />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </CitizenLayout>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<AuthPage mode="signin" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/app/*" element={<ProfessionalRoutes />} />
          <Route path="/portal/*" element={<CitizenRoutes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
