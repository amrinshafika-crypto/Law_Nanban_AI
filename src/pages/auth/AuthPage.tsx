import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scale, Mail, Lock, ArrowRight, AlertCircle, Briefcase, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import type { UserRole } from '@/types';

export function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const isSignUp = mode === 'signup';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('professional');
  const [barNumber, setBarNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, displayName, role);
      if (error) {
        setError(error);
        setLoading(false);
        return;
      }
      navigate(role === 'professional' ? '/app' : '/portal');
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel — branding */}
      <div className="lg:w-2/5 bg-navy-900 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-[length:24px_24px] opacity-20" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl" />

        <div className="relative">
          <Logo size={48} light />
        </div>

        <div className="relative max-w-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center">
              <Scale className="text-gold-400" size={24} />
            </div>
            <h2 className="font-serif text-2xl font-semibold">Justice through Intelligence</h2>
          </div>
          <p className="text-navy-200 text-sm leading-relaxed">
            An Agentic AI platform that coordinates specialised legal AI agents to reduce case backlogs,
            organise court workflows, and make legal assistance accessible to every citizen.
          </p>
          <div className="mt-6 space-y-2.5">
            {['Smart case triage & document intelligence', 'Legal research grounded in Indian law', 'Free legal aid access for citizens'].map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-sm text-navy-100">
                <div className="w-1.5 h-1.5 rounded-full bg-gold-400" />
                {feat}
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-navy-300">
          Bharat Agentic AI Hackathon 2026 · Problem: Timely Justice — Legal Backlog
        </div>
      </div>

      {/* Right panel — form */}
      <div className="lg:w-3/5 flex items-center justify-center p-8 lg:p-12 bg-navy-50">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-serif font-semibold text-navy-900">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-navy-500 mt-1.5 mb-6">
            {isSignUp ? 'Choose your role to get started.' : 'Sign in to access your workspace.'}
          </p>

          {isSignUp && (
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => setRole('professional')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${role === 'professional' ? 'border-accent-500 bg-accent-50' : 'border-navy-200 bg-white hover:border-navy-300'}`}
              >
                <Briefcase size={20} className={role === 'professional' ? 'text-accent-600' : 'text-navy-400'} />
                <p className="text-sm font-semibold text-navy-800 mt-2">Legal Professional</p>
                <p className="text-xs text-navy-500 mt-0.5">Lawyers & court personnel</p>
              </button>
              <button
                type="button"
                onClick={() => setRole('citizen')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${role === 'citizen' ? 'border-accent-500 bg-accent-50' : 'border-navy-200 bg-white hover:border-navy-300'}`}
              >
                <Users size={20} className={role === 'citizen' ? 'text-accent-600' : 'text-navy-400'} />
                <p className="text-sm font-semibold text-navy-800 mt-2">Citizen</p>
                <p className="text-xs text-navy-500 mt-0.5">Legal info & assistance</p>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input"
                  placeholder="Adv. Rajesh Kumar"
                />
              </div>
            )}
            {isSignUp && role === 'professional' && (
              <div>
                <label className="label">Bar Registration Number (optional)</label>
                <input
                  type="text"
                  value={barNumber}
                  onChange={(e) => setBarNumber(e.target.value)}
                  className="input"
                  placeholder="TN/1234/2020"
                />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Min. 6 characters"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-50 text-danger-700 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="text-sm text-navy-500 text-center mt-5">
            {isSignUp ? (
              <>Already have an account? <Link to="/signin" className="text-accent-600 font-medium hover:underline">Sign in</Link></>
            ) : (
              <>Don't have an account? <Link to="/signup" className="text-accent-600 font-medium hover:underline">Sign up</Link></>
            )}
          </p>

          <div className="mt-6 pt-6 border-t border-navy-100">
            <p className="text-xs text-navy-400 text-center">
              <Link to="/portal" className="hover:text-navy-600">Continue as guest to the Citizen Portal</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
