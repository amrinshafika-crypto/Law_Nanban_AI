import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function AuthCallbackPage() {
  const { completeOAuthSignIn, completeProfessionalRegistration } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<string | null>(null);
  const [registrationIntentInvalid, setRegistrationIntentInvalid] = useState(false);

  useEffect(() => {
    let active = true;
    async function finish() {
      const registrationIntent = searchParams.get('registration_intent');
      const result = await completeOAuthSignIn();
      if (!active) return;
      if (result.error || !result.role) {
        setError(searchParams.has('error')
          ? 'Google sign-in was cancelled or expired. Please try again.'
          : result.error || 'The signed-in account role could not be loaded.');
        setLoading(false);
        return;
      }

      // URL state can only present a signed registration intent; the server verifies
      // its signature and the Auth user's creation time before assigning a role.
      if (result.role === 'citizen' && registrationIntent) {
        const completed = await completeProfessionalRegistration(registrationIntent);
        if (!active) return;
        if (completed.error) {
          setRegistrationIntentInvalid(Boolean(completed.registrationIntentInvalid));
          if (!completed.registrationIntentInvalid) setPendingIntent(registrationIntent);
          setError(completed.error);
          setLoading(false);
          return;
        }
        if (completed.role) {
          navigate(completed.role === 'citizen' ? '/portal' : '/app', { replace: true });
          return;
        }
      }

      navigate(result.role === 'citizen' ? '/portal' : '/app', { replace: true });
    }
    void finish();
    return () => { active = false; };
  }, [completeOAuthSignIn, completeProfessionalRegistration, navigate, searchParams]);

  async function retryProfessionalRegistration() {
    if (!pendingIntent || loading) return;
    setLoading(true);
    setError(null);
    const result = await completeProfessionalRegistration(pendingIntent);
    if (result.error || !result.role) {
      if (result.registrationIntentInvalid) {
        setPendingIntent(null);
        setRegistrationIntentInvalid(true);
      }
      setError(result.error || 'Professional registration could not be completed.');
      setLoading(false);
      return;
    }
    navigate(result.role === 'citizen' ? '/portal' : '/app', { replace: true });
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-navy-200 border-t-navy-600" /></div>;

  return <main className="min-h-screen flex items-center justify-center bg-navy-50 p-6"><section className="w-full max-w-md rounded-xl border border-navy-100 bg-white p-6 shadow-card">
    <h1 className="font-serif text-xl font-semibold text-navy-900">Sign-in could not be completed</h1>
    <p role="alert" className="mt-3 text-sm text-danger-700">{error}</p>
    {registrationIntentInvalid && <Link to="/signup" className="btn-primary mt-5 w-full">Restart Professional registration</Link>}
    {pendingIntent && <button type="button" disabled={loading} className="btn-primary mt-5 w-full" onClick={() => void retryProfessionalRegistration()}>Retry Professional registration</button>}
    <button type="button" className="btn-outline mt-3 w-full" onClick={() => navigate('/portal', { replace: true })}>Continue to Citizen Portal</button>
    <button type="button" className="btn-outline mt-3 w-full" onClick={() => navigate('/signin', { replace: true })}>Return to sign in</button>
  </section></main>;
}
