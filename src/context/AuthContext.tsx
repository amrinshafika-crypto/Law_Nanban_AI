import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  profileError: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; role: UserRole | null }>;
  signUp: (email: string, password: string, displayName: string, intent?: 'citizen' | 'professional', registrationIntent?: string) => Promise<{ error: string | null; confirmationRequired: boolean }>;
  signInWithGoogle: (intent: 'citizen' | 'professional') => Promise<{ error: string | null }>;
  completeOAuthSignIn: () => Promise<{ error: string | null; role: UserRole | null }>;
  prepareProfessionalRegistration: () => Promise<{ error: string | null; registrationIntent: string | null }>;
  completeProfessionalRegistration: (registrationIntent: string) => Promise<ProfessionalRegistrationResult>;
  signOut: () => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

type ProfessionalRegistrationResult = {
  error: string | null;
  role: UserRole | null;
  registrationIntentInvalid?: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function registrationFunctionError(error: unknown, fallback: string) {
  const context = error && typeof error === 'object' ? (error as { context?: unknown }).context : undefined;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: { message?: unknown } };
      if (typeof payload.error?.message === 'string') return payload.error.message;
    } catch { /* Keep a safe default. */ }
  }
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequest = useRef(0);
  const authEventVersion = useRef(0);
  const activeProfileUser = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string): Promise<Profile> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw new Error(`Failed to load profile: ${error.message}`);
    if (!data || data.id !== userId) throw new Error('No profile is provisioned for this account.');
    if (!['citizen', 'professional', 'admin'].includes(data.role)) {
      throw new Error('The account profile has an invalid role.');
    }

    return data as Profile;
  }, []);

  const restoreSession = useCallback(async (nextSession: Session | null): Promise<{ profile: Profile | null; error: string | null }> => {
    const requestId = ++profileRequest.current;
    const nextUser = nextSession?.user ?? null;

    activeProfileUser.current = nextUser?.id ?? null;
    setSession(nextSession);
    setUser(nextUser);
    setProfile(null);
    setProfileError(null);
    setLoading(true);

    if (!nextUser) {
      setLoading(false);
      return { profile: null, error: null };
    }

    try {
      const nextProfile = await loadProfile(nextUser.id);
      if (profileRequest.current !== requestId) {
        return activeProfileUser.current === nextUser.id
          ? { profile: nextProfile, error: null }
          : { profile: null, error: 'Authentication state changed before profile validation completed.' };
      }
      setProfile(nextProfile);
      return { profile: nextProfile, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load account profile.';
      console.error(message);
      if (profileRequest.current === requestId) setProfileError(message);
      return { profile: null, error: message };
    } finally {
      if (profileRequest.current === requestId) setLoading(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    let active = true;
    let deferredRestore: number | undefined;

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authEventVersion.current += 1;
      if (event === 'SIGNED_IN') return;
      if (deferredRestore !== undefined) window.clearTimeout(deferredRestore);
      deferredRestore = window.setTimeout(() => {
        if (active) void restoreSession(nextSession);
      }, 0);
    });
    const initialAuthEventVersion = authEventVersion.current;

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (authEventVersion.current !== initialAuthEventVersion) return;
        if (error) {
          console.error('Failed to restore auth session:', error.message);
          void restoreSession(null);
          return;
        }
        void restoreSession(data.session);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (authEventVersion.current !== initialAuthEventVersion) return;
        console.error('Failed to restore auth session:', error);
        void restoreSession(null);
      });

    return () => {
      active = false;
      if (deferredRestore !== undefined) window.clearTimeout(deferredRestore);
      profileRequest.current += 1;
      authListener.subscription.unsubscribe();
    };
  }, [restoreSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message, role: null };
      if (!data.session) return { error: 'Sign in did not create an active session. Check your email confirmation and try again.', role: null };

      const restored = await restoreSession(data.session);
      return restored.error
        ? { error: `Signed in, but account access could not be validated: ${restored.error}`, role: null }
        : { error: null, role: restored.profile?.role ?? null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign in failed.', role: null };
    }
  }, [restoreSession]);

  const signUp = useCallback(async (email: string, password: string, displayName: string, intent: 'citizen' | 'professional' = 'citizen', registrationIntent?: string) => {
    if (intent === 'professional' && !registrationIntent) {
      return { error: 'Professional registration could not be started. Please try again.', confirmationRequired: false };
    }
    try {
      const options: { data: { display_name: string }; emailRedirectTo?: string } = {
        data: { display_name: displayName },
      };
      if (intent === 'professional' && registrationIntent) {
        const callback = new URL('/auth/callback', window.location.origin);
        callback.searchParams.set('registration_intent', registrationIntent);
        options.emailRedirectTo = callback.toString();
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options,
      });
      if (error) return { error: error.message, confirmationRequired: false };
      if (!data.user) return { error: 'Account creation did not return a user. Please try again.', confirmationRequired: false };
      if (!data.session) return { error: null, confirmationRequired: true };

      const restored = await restoreSession(data.session);
      if (restored.error || restored.profile?.role !== 'citizen') {
        return {
          error: `Your account was created, but access could not be validated: ${restored.error || 'The account does not have the expected citizen role.'}`,
          confirmationRequired: false,
        };
      }
      return { error: null, confirmationRequired: false };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign up failed.', confirmationRequired: false };
    }
  }, [restoreSession]);

  const prepareProfessionalRegistration = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('law-nanban-professional-registration', {
        body: { action: 'prepare' },
      });
      if (error) return { error: await registrationFunctionError(error, 'Professional registration could not be started.'), registrationIntent: null };
      if (typeof data?.registrationIntent !== 'string' || data.registrationIntent.length > 2_048) {
        return { error: 'Professional registration returned an invalid response.', registrationIntent: null };
      }
      return { error: null, registrationIntent: data.registrationIntent };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Professional registration could not be started.', registrationIntent: null };
    }
  }, []);

  const signInWithGoogle = useCallback(async (intent: 'citizen' | 'professional') => {
    try {
      const registration = intent === 'professional' ? await prepareProfessionalRegistration() : null;
      if (registration?.error || (intent === 'professional' && !registration?.registrationIntent)) {
        return { error: registration?.error || 'Professional registration could not be started.' };
      }
      const callback = new URL('/auth/callback', window.location.origin);
      if (registration?.registrationIntent) callback.searchParams.set('registration_intent', registration.registrationIntent);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callback.toString() },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Google sign-in could not be started.' };
    }
  }, [prepareProfessionalRegistration]);

  const completeOAuthSignIn = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) return { error: error.message, role: null };
      if (!data.session) return { error: 'Google sign-in did not create an active session. Please try again.', role: null };
      const restored = await restoreSession(data.session);
      return restored.error
        ? { error: `Signed in, but account access could not be validated: ${restored.error}`, role: null }
        : { error: null, role: restored.profile?.role ?? null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Google sign-in could not be completed.', role: null };
    }
  }, [restoreSession]);

  const completeProfessionalRegistration = useCallback(async (registrationIntent: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('law-nanban-professional-registration', {
        body: { action: 'finalize', registrationIntent },
      });
      if (error) {
        return { error: await registrationFunctionError(error, 'Professional registration could not be completed.'), role: null };
      }
      if (data?.role === 'citizen') {
        return {
          error: 'This Professional registration link is invalid or has expired. Please restart Professional registration.',
          role: null,
          registrationIntentInvalid: true,
        };
      }
      if (data?.role !== 'professional' && data?.role !== 'admin') {
        return { error: 'Professional registration returned an invalid account role.', role: null };
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const restored = await restoreSession(sessionData.session);
      if (restored.error || restored.profile?.role !== data.role) {
        return { error: 'The updated account role could not be verified. Refresh your session and try again.', role: null };
      }
      return { error: null, role: restored.profile?.role ?? null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Professional registration could not be completed.', role: null };
    }
  }, [restoreSession]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { error: `Sign out failed: ${error.message}` };
    } catch (error) {
      return { error: error instanceof Error ? `Sign out failed: ${error.message}` : 'Sign out failed.' };
    }
    await restoreSession(null);
    return { error: null };
  }, [restoreSession]);

  const refreshProfile = useCallback(async () => {
    await restoreSession(session);
  }, [restoreSession, session]);

  return (
    <AuthContext.Provider value={{ session, user, profile, profileError, loading, signIn, signUp, signInWithGoogle, completeOAuthSignIn, prepareProfessionalRegistration, completeProfessionalRegistration, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
