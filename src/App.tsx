import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/auth/AuthPage';
import { ProfessionalLayout } from '@/components/ProfessionalLayout';
import { CitizenLayout } from '@/components/CitizenLayout';
import { Dashboard } from '@/pages/professional/Dashboard';
import { Cases } from '@/pages/professional/Cases';
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
import { CitizenHome } from '@/pages/citizen/CitizenHome';
import { CitizenAsk } from '@/pages/citizen/CitizenAsk';
import { CitizenRights } from '@/pages/citizen/CitizenRights';
import { CitizenExplain } from '@/pages/citizen/CitizenExplain';
import { CitizenAid } from '@/pages/citizen/CitizenAid';
import { CitizenCaseStatus } from '@/pages/citizen/CitizenCaseStatus';
import { CitizenLanguage } from '@/pages/citizen/CitizenLanguage';
import { useState, ReactNode } from 'react';
import type { Lang } from '@/i18n';

function RequireAuth({ children, role }: { children: ReactNode; role: 'professional' | 'citizen' }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-navy-200 border-t-navy-600" /></div>;
  if (!user) return <Navigate to="/signin" replace />;
  if (profile && profile.role !== role && profile.role !== 'admin') {
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
          <Route path="cases/:id" element={<CaseDetail />} />
          <Route path="triage" element={<CaseTriage />} />
          <Route path="documents" element={<Documents />} />
          <Route path="timeline" element={<CaseTimeline />} />
          <Route path="research" element={<LegalResearch />} />
          <Route path="calendar" element={<HearingCalendar />} />
          <Route path="legal-aid" element={<LegalAidResources />} />
          <Route path="assistant" element={<AIAssistant />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Routes>
      </ProfessionalLayout>
    </RequireAuth>
  );
}

function CitizenRoutes() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('ln-lang') as Lang) || 'en');
  return (
    <CitizenLayout lang={lang} setLang={(l) => { setLang(l); localStorage.setItem('ln-lang', l); }}>
      <Routes>
        <Route index element={<CitizenHome lang={lang} />} />
        <Route path="ask" element={<CitizenAsk lang={lang} />} />
        <Route path="rights" element={<CitizenRights lang={lang} />} />
        <Route path="explain" element={<CitizenExplain lang={lang} />} />
        <Route path="aid" element={<CitizenAid lang={lang} />} />
        <Route path="case-status" element={<CitizenCaseStatus lang={lang} />} />
        <Route path="language" element={<CitizenLanguage lang={lang} setLang={setLang} />} />
      </Routes>
    </CitizenLayout>
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
