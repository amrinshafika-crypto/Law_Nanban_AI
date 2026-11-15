import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scale, Mail, Lock, ArrowRight, AlertCircle, Briefcase, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';

type AccountIntent = 'citizen' | 'professional';

export function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const { signIn, signUp, signInWithGoogle, prepareProfessionalRegistration, completeProfessionalRegistration } = useAuth();
  const navigate = useNavigate();
  const isSignUp = mode === 'signup';
  const [accountType, setAccountType] = useState<AccountIntent>('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [registrationIntent, setRegistrationIntent] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function routeForRole(role: 'citizen' | 'professional' | 'admin') {
    navigate(role === 'citizen' ? '/portal' : '/app', { replace: true });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (isSignUp) {
        if (accountCreated) {
          if (!registrationIntent) {
            setError('Professional registration could not be resumed. Please sign in and try again.');
            return;
          }
          const completed = await completeProfessionalRegistration(registrationIntent);
          if (completed.error) {
            setError(completed.error);
            if (completed.registrationIntentInvalid) {
              setAccountCreated(false);
              setRegistrationIntent(null);
            }
          }
          else if (completed.role) routeForRole(completed.role);
          return;
        }

        let intent: string | undefined;
        if (accountType === 'professional') {
          const prepared = await prepareProfessionalRegistration();
          if (prepared.error || !prepared.registrationIntent) {
            setError(prepared.error || 'Professional registration could not be started.');
            return;
          }
          intent = prepared.registrationIntent;
        }

        const result = await signUp(email, password, displayName, accountType, intent);
        if (result.error) {
          setError(result.error);
        } else if (result.confirmationRequired) {
          setMessage(accountType === 'professional'
            ? 'Confirm your email to finish creating your Professional account. The registration flow will validate the new account before assigning its role.'
            : 'If registration was accepted, a confirmation email will be sent. Confirm your address before signing in. If this email is already registered, try signing in.');
        } else if (accountType === 'professional' && intent) {
          setRegistrationIntent(intent);
          setAccountCreated(true);
          const completed = await completeProfessionalRegistration(intent);
          if (completed.error) {
            setError(completed.error);
            if (completed.registrationIntentInvalid) {
              setAccountCreated(false);
              setRegistrationIntent(null);
            }
          }
          else if (completed.role) routeForRole(completed.role);
        } else {
          navigate('/portal', { replace: true });
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) setError(result.error);
        else if (result.role) routeForRole(result.role);
        else setError('Sign in succeeded but no valid account role was returned. Please try again or contact support.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (loading) return;
    setError(null);
    setLoading(true);
    const result = await signInWithGoogle(isSignUp ? accountType : 'citizen');
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="lg:w-2/5 bg-navy-900 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-[length:24px_24px] opacity-20" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl" />
        <div className="relative"><Logo size={48} light /></div>
        <div className="relative max-w-sm">
          <div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center"><Scale className="text-gold-400" size={24} /></div><h2 className="font-serif text-2xl font-semibold">Justice through Intelligence</h2></div>
          <p className="text-navy-200 text-sm leading-relaxed">An Agentic AI platform that coordinates specialised legal AI agents to reduce case backlogs, organise court workflows, and make legal assistance accessible to every citizen.</p>
          <div className="mt-6 space-y-2.5">{['Smart case triage & document intelligence', 'Legal research grounded in Indian law', 'Free legal aid access for citizens'].map((feature) => <div key={feature} className="flex items-center gap-2 text-sm text-navy-100"><div className="w-1.5 h-1.5 rounded-full bg-gold-400" />{feature}</div>)}</div>
        </div>
        <div className="relative text-xs text-navy-300">Bharat Agentic AI Hackathon 2026 · Problem: Timely Justice — Legal Backlog</div>
      </div>

      <div className="lg:w-3/5 flex items-center justify-center p-8 lg:p-12 bg-navy-50">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-serif font-semibold text-navy-900">{isSignUp ? 'Create your account' : 'Welcome back'}</h1>
          <p className="text-sm text-navy-500 mt-1.5 mb-6">{isSignUp ? 'Choose a Citizen or Legal Professional account.' : 'Your existing account role determines your workspace after sign-in.'}</p>

          {isSignUp && <div className="grid grid-cols-2 gap-3 mb-5" role="group" aria-label="Account type">
            {(['professional', 'citizen'] as const).map((type) => {
              const selected = accountType === type;
              const Icon = type === 'professional' ? Briefcase : Users;
              return <button key={type} type="button" disabled={accountCreated} aria-pressed={selected} onClick={() => { setAccountType(type); setError(null); setMessage(null); }} className={`p-4 rounded-lg border-2 text-left ${selected ? 'border-accent-500 bg-accent-50' : 'border-navy-200 bg-white hover:bg-navy-50'} ${accountCreated ? 'cursor-not-allowed opacity-70' : ''}`}>
                <Icon size={20} className={selected ? 'text-accent-600' : 'text-navy-400'} />
                <p className="text-sm font-semibold text-navy-800 mt-2">{type === 'professional' ? 'Legal Professional' : 'Citizen'}</p>
                <p className="text-xs text-navy-500 mt-0.5">{type === 'professional' ? 'Professional workspace' : 'Legal info & assistance'}</p>
              </button>;
            })}
          </div>}

          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            {isSignUp && <div><label htmlFor="display-name" className="label">Full Name</label><input id="display-name" type="text" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="input" placeholder="Your full name" autoComplete="name" /></div>}
            <div><label htmlFor="email" className="label">Email</label><div className="relative"><Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" /><input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="input pl-10" placeholder="you@example.com" autoComplete="email" /></div></div>
            <div><label htmlFor="password" className="label">Password</label><div className="relative"><Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" /><input id="password" type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="input pl-10" placeholder="Min. 6 characters" autoComplete={isSignUp ? 'new-password' : 'current-password'} /></div></div>
            {error && <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-danger-50 text-danger-700 text-sm"><AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
            {message && <p role="status" className="rounded-lg bg-success-50 p-3 text-sm text-success-700">{message}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Please wait...' : isSignUp ? (accountCreated ? 'Complete Professional registration' : `Create ${accountType === 'professional' ? 'Professional' : 'Citizen'} account`) : 'Sign in'}{!loading && <ArrowRight size={16} />}</button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-navy-400"><span className="h-px flex-1 bg-navy-200" />or<span className="h-px flex-1 bg-navy-200" /></div>
          <button type="button" disabled={loading} onClick={() => void handleGoogleSignIn()} className="btn-outline w-full justify-center">{loading ? 'Connecting...' : 'Continue with Google'}</button>

          <p className="text-sm text-navy-500 text-center mt-5">{isSignUp ? <>Already have an account? <Link to="/signin" className="text-accent-600 font-medium hover:underline">Sign in</Link></> : <>Don't have an account? <Link to="/signup" className="text-accent-600 font-medium hover:underline">Sign up</Link></>}</p>
          <div className="mt-6 pt-6 border-t border-navy-100"><p className="text-xs text-navy-400 text-center"><Link to="/portal" className="hover:text-navy-600">Continue as guest to the Citizen Portal</Link></p></div>
        </div>
      </div>
    </div>
  );
}
