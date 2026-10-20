import { useEffect, useState, type FormEvent } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Clock3, Eye, EyeOff, Home, ImagePlus, MapPin, ShieldCheck, UserRound, X, Github, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import type { ProviderAvailability, Service, ServiceCategory } from '@/types';

export function AuthPage({ mode }: { mode: 'signup' | 'login' }) {
  const { setCurrentPage, setUserRole } = useApp();
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [discoverableByMembers, setDiscoverableByMembers] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleSocialSignIn = async (provider: 'google' | 'github' | 'facebook') => {
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const isNative = Capacitor.isNativePlatform();
      const redirectTo = `${window.location.origin}/`;

      const { data, error: socialError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: isNative,
        },
      });

      if (socialError) throw socialError;

      if (isNative && data?.url) {
        await Browser.open({ url: data.url });
        setNotice(`Complete the ${provider} sign-in in your browser popup.`);
      } else {
        setNotice(`${provider} sign-in started. Complete the popup to continue.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${provider} sign in failed.`);
    } finally {
      setBusy(false);
    }
  };

  const handleSsoSignIn = async () => {
    const domain = prompt('Enter your organization SSO domain (e.g. homicare.org):');
    if (!domain) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { data, error: ssoError } = await supabase.auth.signInWithSSO({ domain: domain.trim() });
      if (ssoError) throw ssoError;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setNotice('SSO redirection initiated.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'SSO sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  const sendPasswordReset = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter your account email address first.');
      return;
    }
    setBusy(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setNotice('If an account uses that email, a password reset link has been sent.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Password reset could not be requested. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const emailAddress = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
      setError('Enter the email address used for your account. Phone or username sign-in is not enabled.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');

    try {
      let nextPage: 'home' | 'provider-onboarding' | 'provider-dashboard' | 'admin' = 'home';
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: emailAddress,
          password,
          options: { data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role,
            profile_visibility: discoverableByMembers ? 'members' : 'private',
          } },
        });
        if (signUpError) throw signUpError;
        setUserRole(role);
        if (role === 'provider') nextPage = 'provider-onboarding';

        const { error: signInError } = await supabase.auth.signInWithPassword({ email: emailAddress, password });
        if (signInError) {
          setNotice('Account created successfully! Please sign in with your email and password.');
          setCurrentPage('login');
          return;
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: emailAddress, password });
        if (signInError) throw signInError;
        const accountRole = data.user.app_metadata?.role === 'admin' ? 'admin' : data.user.user_metadata?.role;
        if (accountRole === 'admin') {
          setUserRole('admin');
          nextPage = 'admin';
        } else if (accountRole === 'provider') {
          setUserRole('provider');
          const { data: profile } = await supabase.from('providers').select('id').eq('user_id', data.user.id).maybeSingle();
          nextPage = profile ? 'provider-dashboard' : 'provider-onboarding';
        } else {
          setUserRole('customer');
        }
      }
      setCurrentPage(nextPage);
    } catch (cause) {
      setError(cause instanceof TypeError && cause.message === 'Failed to fetch'
        ? 'Could not reach Supabase Auth. Check your internet connection and Supabase project URL.'
        : cause instanceof Error ? cause.message : 'Account request failed. Check your details and try again.');
    } finally {
      setBusy(false);
    }
  };

  const signingUp = mode === 'signup';

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[#f3f5f9] px-4 py-8 sm:grid sm:place-items-center sm:py-10">
      <div className="mx-auto w-full max-w-[440px] overflow-hidden rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(31,41,55,0.12)] sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <button onClick={() => setCurrentPage('home')} className="inline-flex items-center gap-2 text-base font-semibold text-slate-500 hover:text-orange-600">
            <ArrowLeft className="h-4 w-4" />
            <span>{signingUp ? 'Create Account' : 'Login'}</span>
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/20">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-[-0.06em] text-slate-900">
              Homi<span className="text-orange-500">Care</span><span className="align-top text-lg text-orange-500">+</span>
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Your Home. Our Priority.</div>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          {(['customer', 'provider'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRole(option)}
              className={`rounded-lg py-2.5 text-sm font-semibold capitalize transition ${role === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              {option === 'customer' ? 'Homeowner' : 'Service Provider'}
            </button>
          ))}
        </div>

        {/* Supabase-style Auth Action Buttons */}
        <div className="space-y-3 mb-5">
          <button
            type="button"
            onClick={() => void handleSocialSignIn('google')}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-100 text-xs font-black text-red-600">G</span>
            Sign in with Google
          </button>

          <button
            type="button"
            onClick={() => void handleSocialSignIn('github')}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-slate-900 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
          >
            <Github className="h-4 w-4" />
            Sign in with GitHub
          </button>

          <button
            type="button"
            onClick={() => void handleSsoSignIn()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <Globe className="h-4 w-4 text-slate-500" />
            Sign in with SSO
          </button>
        </div>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">or email</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={(event) => void submit(event)}>
        {signingUp ? (
          <h2 className="mb-4 text-xl font-bold text-slate-900">Create Account with Email</h2>
        ) : (
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Sign in with email and password</h2>
          </div>
        )}

        {signingUp ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Full Name
              <input required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="Full Name" />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Phone Number
              <input required type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="+256 772 123 456" />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Email Address
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="example@gmail.com" />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <span className="relative mt-1.5 block">
                <input required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="********" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 hover:text-orange-700">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Email Address
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="example@gmail.com" />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <span className="relative mt-1.5 block">
                <input required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="********" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 hover:text-orange-700">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            {!signingUp && (
              <div className="flex items-center justify-end">
                <button type="button" disabled={busy} onClick={() => void sendPasswordReset()} className="text-xs font-semibold text-slate-500 hover:text-orange-600 disabled:opacity-50">Forgot password?</button>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <input type="checkbox" className="h-4 w-4 accent-orange-500" />
          <span className="text-xs text-slate-500">I agree to the Terms &amp; Conditions</span>
        </div>
        {signingUp && <label className="mt-3 flex items-start gap-2 rounded-lg border border-violet-100 bg-violet-50 p-3 text-xs text-slate-700">
          <input type="checkbox" checked={discoverableByMembers} onChange={(event) => setDiscoverableByMembers(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-violet-800" />
          <span><strong>Let signed-in HomiCare users discover my profile.</strong> They can see the profile details I choose to share and send me connection requests. My phone and neighborhood stay hidden unless I enable sharing in Privacy Settings.</span>
        </label>}

        {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

        <button type="submit" disabled={busy} className="mt-5 flex w-full items-center justify-center rounded-lg bg-orange-500 px-4 py-3 text-base font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-60">
          {busy ? 'Please wait...' : signingUp ? 'Create Account' : 'Sign in with email and password'}
        </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {signingUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={() => { setError(''); setNotice(''); setCurrentPage(signingUp ? 'login' : 'signup'); }} className="font-semibold text-orange-600 hover:text-orange-700">
            {signingUp ? 'Login' : 'Sign up'}
          </button>
        </p>
      </div>
    </main>
  );
}

export function ProviderOnboardingPage() {
  const { setCurrentPage } = useApp();
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-sm space-y-4 text-center">
        <h2 className="text-xl font-bold text-slate-900">Provider Onboarding</h2>
        <p className="text-xs text-slate-600">Complete your profile setup to start receiving service requests in your area.</p>
        <button onClick={() => setCurrentPage('provider-dashboard')} className="rounded-xl bg-orange-600 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-orange-700">Continue to Dashboard</button>
      </div>
    </main>
  );
}