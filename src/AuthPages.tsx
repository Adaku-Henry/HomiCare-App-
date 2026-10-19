import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Clock3, Eye, EyeOff, Home, ImagePlus, MapPin, ShieldCheck, UserRound, X } from 'lucide-react';
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

  const handleSocialSignIn = async (provider: 'google' | 'facebook') => {
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const { error: socialError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${window.location.pathname}`,
          skipBrowserRedirect: false,
        },
      });

      if (socialError) throw socialError;
      setNotice(`${provider === 'google' ? 'Google' : 'Facebook'} sign-in started. Complete the browser popup to continue.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${provider === 'google' ? 'Google' : 'Facebook'} sign in failed.`);
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
        if (!data.session) {
          setNotice('Check your email to confirm your account, then sign in to continue.');
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
          const { data: profile, error: profileError } = await supabase.from('providers').select('id').eq('user_id', data.user.id).maybeSingle();
          if (profileError) throw profileError;
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

        <form onSubmit={(event) => void submit(event)}>
        {signingUp ? (
          <h2 className="mb-4 text-2xl font-bold text-slate-900">Create Account</h2>
        ) : (
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-900">Welcome Back!</h2>
            <p className="mt-1 text-sm text-slate-500">Login to your account</p>
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
          {busy ? 'Please wait...' : signingUp ? 'Create Account' : 'Login'}
        </button>
        </form>

        <div className="mt-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">or continue with</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void handleSocialSignIn('google')}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-red-600">G</span>
            {busy ? 'Please wait...' : 'Google'}
          </button>
          <button
            type="button"
            onClick={() => void handleSocialSignIn('facebook')}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">f</span>
            {busy ? 'Please wait...' : 'Facebook'}
          </button>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          {signingUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={() => { setError(''); setNotice(''); setCurrentPage(signingUp ? 'login' : 'signup'); }} className="font-semibold text-orange-600 hover:text-orange-700">
            {signingUp ? 'Login' : 'Sign Up'}
          </button>
        </p>
      </div>
    </main>
  );
}

export function ProviderOnboardingPage() {
  const { setCurrentPage } = useApp();
  const steps = [
    { title: 'Profile', icon: UserRound },
    { title: 'Services', icon: BriefcaseBusiness },
    { title: 'Location & hours', icon: MapPin },
    { title: 'Pricing & publish', icon: ShieldCheck },
  ];
  const flowCards = [
    { title: 'Registration', icon: UserRound, accent: 'bg-[#fce9d8] text-[#c76d24]', tag: 'Complete' },
    { title: 'Personal Information', icon: UserRound, accent: 'bg-[#fef1df] text-[#c76d24]', tag: 'Complete' },
    { title: 'Professional Details', icon: BriefcaseBusiness, accent: 'bg-[#fde6d2] text-[#c76d24]', tag: 'Complete' },
    { title: 'Skills & Services', icon: BriefcaseBusiness, accent: 'bg-[#fdf0e8] text-[#c76d24]', tag: 'Complete' },
    { title: 'Photos & Portfolio', icon: ImagePlus, accent: 'bg-[#fbe7d0] text-[#c76d24]', tag: 'Next Step' },
    { title: 'Location & Coverage', icon: MapPin, accent: 'bg-[#fef0df] text-[#c76d24]', tag: 'Next Step' },
    { title: 'Availability & Pricing', icon: Clock3, accent: 'bg-[#fcefd8] text-[#c76d24]', tag: 'Next Step' },
    { title: 'Verification & Complete', icon: ShieldCheck, accent: 'bg-[#fce8d6] text-[#c76d24]', tag: 'Next Step' },
  ];
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [bio, setBio] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isBusiness, setIsBusiness] = useState(false);
  const [yearsExperience, setYearsExperience] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState('');
  const [location, setLocation] = useState('');
  const [serviceRadius, setServiceRadius] = useState('25');
  const [availabilityStatus, setAvailabilityStatus] = useState('available');
  const [availableDays, setAvailableDays] = useState([false, true, true, true, true, true, false]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [startingPrice, setStartingPrice] = useState('');
  const [pricingModel, setPricingModel] = useState('starting');
  const [publicListing, setPublicListing] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from('service_categories').select('*').order('sort_order'),
      supabase.from('services').select('*').order('sort_order'),
      supabase.auth.getUser(),
    ]).then(([categoryResult, serviceResult, authResult]) => {
      if (!active) return;
      const catalogIssues: string[] = [];
      if (categoryResult.error) {
        catalogIssues.push(categoryResult.error.code === '42P01' || categoryResult.error.code === 'PGRST205'
          ? 'The service category table is missing. Run supabase/migrations/20260930200000_bootstrap_service_catalog.sql in Supabase SQL Editor. Other core HomiCare tables must also be migrated before you can save a provider profile.'
          : `Could not load service categories from Supabase (${categoryResult.error.code || 'request failed'}). Check the project connection and table read policy.`);
      } else if (!categoryResult.data?.length) {
        catalogIssues.push('No service categories are seeded. Run supabase/migrations/20260930200000_bootstrap_service_catalog.sql in Supabase SQL Editor.');
      }
      if (serviceResult.error) {
        catalogIssues.push(serviceResult.error.code === '42P01' || serviceResult.error.code === 'PGRST205'
          ? 'The services table is missing. Run supabase/migrations/20260930200000_bootstrap_service_catalog.sql in Supabase SQL Editor. Other core HomiCare tables must also be migrated before you can save a provider profile.'
          : `Service options could not be loaded (${serviceResult.error.code || 'request failed'}). Check the service catalog read policy and Supabase connection.`);
      } else if (categoryResult.data?.length && !serviceResult.data?.length) {
        catalogIssues.push('Categories loaded, but no offerings are seeded. Run supabase/migrations/20260930200000_bootstrap_service_catalog.sql in Supabase SQL Editor.');
      }
      setCatalogError(catalogIssues.join(' '));
      setCategories(categoryResult.data || []);
      setServices(serviceResult.data || []);
      const user = authResult.data.user;
      if (user?.user_metadata?.full_name) setFullName(String(user.user_metadata.full_name));
      if (user?.user_metadata?.phone) setPhone(String(user.user_metadata.phone));
    }).catch(() => {
      if (active) setCatalogError('HomiCare could not reach Supabase. Check the project URL/key and connection, then reload onboarding.');
    }).finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [catalogRetry]);

  const categoryServices = services.filter((service) => categoryIds.includes(service.category_id));

  const addSkills = () => {
    const additions = skillDraft.split(',').map((skill) => skill.trim()).filter(Boolean);
    setSkills((current) => [...new Set([...current, ...additions])]);
    setSkillDraft('');
  };

  const validateStep = () => {
    if (step === 0 && (!fullName.trim() || !phone.trim() || !profilePhoto)) {
      setError('Enter your name and phone number, and add a profile photo.');
      return false;
    }
    if (step === 1 && (!professionalTitle.trim() || categoryIds.length === 0 || serviceIds.length === 0)) {
      setError('Add a professional title and select at least one category and service.');
      return false;
    }
    if (step === 2 && (!location.trim() || !availableDays.some(Boolean) || startTime >= endTime)) {
      setError('Enter your service area, choose at least one working day, and set valid hours.');
      return false;
    }
    setError('');
    return true;
  };

  const uploadProfileImage = async (publicProfileId: string, file: File, kind: 'avatar' | 'cover') => {
    try {
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${publicProfileId}/${kind}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('profile-media').upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });
      if (!uploadError) return path;
    } catch {
      // Fallback
    }
    return `local-${kind}-${file.name}`;
  };

  const createProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step < steps.length - 1) {
      if (validateStep()) setStep((current) => current + 1);
      return;
    }
    if (!validateStep()) return;
    if (pricingModel !== 'quote' && (!startingPrice || Number(startingPrice) <= 0)) {
      setError('Enter a starting price above zero or choose Request quote.');
      return;
    }
    setBusy(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError || new Error('Sign in to finish setting up your provider profile.');
      const { data: savedProfile, error: profileError } = await supabase.from('profiles').upsert({
        user_id: authData.user.id,
        display_name: fullName.trim() || 'HomiCare Provider',
        phone_private: phone.trim() || '+256000000000',
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        bio: bio.trim() || null,
        city: location.trim() || 'Arua City',
        profile_visibility: publicListing ? 'public' : 'private',
        show_location: publicListing,
        show_phone: false,
      }, { onConflict: 'user_id' }).select('public_id').single();
      if (profileError || !savedProfile) throw profileError || new Error('Your private profile could not be saved.');

      const avatarPath = profilePhoto ? await uploadProfileImage(savedProfile.public_id, profilePhoto, 'avatar') : null;
      const coverPath = coverPhoto ? await uploadProfileImage(savedProfile.public_id, coverPhoto, 'cover') : null;
      if (avatarPath || coverPath) {
        const mediaUpdate: Record<string, string> = {};
        if (avatarPath) mediaUpdate.avatar_url = avatarPath;
        if (coverPath) mediaUpdate.cover_url = coverPath;
        const { error: mediaError } = await supabase.from('profiles').update(mediaUpdate).eq('user_id', authData.user.id);
        if (mediaError) throw mediaError;
      }

      const providerFields = {
        full_name: fullName.trim() || 'HomiCare Provider',
        professional_title: professionalTitle.trim() || 'Household Service Professional',
        location: location.trim() || 'Arua City',
        bio: bio.trim() || null,
        primary_service_category_id: categoryIds[0] || categories[0]?.id || null,
        starting_price: pricingModel === 'quote' ? 0 : (Number(startingPrice) || 0),
        service_radius_km: Number(serviceRadius) || 20,
        availability_status: availabilityStatus || 'available',
        provider_status: 'active',
        years_experience: Number(yearsExperience) || 0,
        is_business: Boolean(isBusiness),
        business_name: isBusiness ? (businessName.trim() || fullName.trim() || null) : null,
        skills: skills.length > 0 ? skills : ['Household Services'],
        avatar_url: avatarPath,
        cover_url: coverPath,
      };
      const providerResult = await supabase.from('providers')
        .upsert({ user_id: authData.user.id, ...providerFields }, { onConflict: 'user_id' })
        .select('id')
        .single();
      if (providerResult.error || !providerResult.data) throw providerResult.error || new Error('Provider profile could not be created.');

      const providerId = providerResult.data.id;
      const { error: removeServicesError } = await supabase.from('provider_services').delete().eq('provider_id', providerId);
      if (removeServicesError) throw removeServicesError;
      const offerings = services.filter((service) => serviceIds.includes(service.id)).map((service) => ({
        provider_id: providerId,
        service_id: service.id,
        description: service.description,
        price_from: pricingModel === 'quote' ? 0 : Number(startingPrice),
        pricing_model: pricingModel,
        is_active: true,
      }));
      const { error: offeringsError } = await supabase.from('provider_services').insert(offerings);
      if (offeringsError) throw offeringsError;

      const availabilityRows: ProviderAvailability[] = weekdays.map((_, day) => ({
        provider_id: providerId,
        day_of_week: day,
        is_available: availableDays[day],
        start_time: availableDays[day] ? `${startTime}:00` : null,
        end_time: availableDays[day] ? `${endTime}:00` : null,
        emergency_only: false,
      }));
      const { error: availabilityError } = await supabase.from('provider_availability').upsert(availabilityRows, { onConflict: 'provider_id,day_of_week' });
      if (availabilityError) throw availabilityError;

      localStorage.setItem('homicare-provider-id', providerId);
      setCurrentPage('provider-dashboard');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Provider setup could not be completed. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[#f9f3ee] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-700">HomiCare Provider Profile</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-900">Set up your service business</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Complete each step to publish an accurate profile, set your service area, and let customers request your services.</p>
        </div>

        <section className="mb-8 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-6" aria-label="Provider profile setup">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {steps.map(({ title, icon: Icon }, index) => (
              <div key={title} aria-current={step === index ? 'step' : undefined} className={`flex flex-1 basis-[calc(50%-0.5rem)] items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold sm:basis-auto ${step === index ? 'bg-orange-100 text-orange-900' : step > index ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span>{index + 1}. {title}</span>
              </div>
            ))}
          </div>

          {catalogError && (
            <div role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p>{catalogError}</p>
              <button type="button" onClick={() => { setCatalogError(''); setCatalogLoading(true); setCatalogRetry((count) => count + 1); }} className="mt-2 font-semibold underline">Retry loading services</button>
            </div>
          )}
          {catalogLoading && <p role="status" className="mb-4 text-sm text-slate-500">Loading service categories and offerings...</p>}

          <form onSubmit={(event) => void createProfile(event)} className="space-y-5">
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Full name
                  <input required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </label>
                <label className="text-sm font-medium text-slate-700">Phone number
                  <input required type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="+256 7XX XXX XXX" />
                </label>
                <label className="text-sm font-medium text-slate-700">Date of birth
                  <input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </label>
                <label className="text-sm font-medium text-slate-700">Gender (optional)
                  <select value={gender} onChange={(event) => setGender(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
                    <option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="non_binary">Non-binary</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Profile photo
                  <input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProfilePhoto(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                  <span className="mt-1 block text-xs font-normal text-slate-500">{profilePhoto?.name || 'Add a clear photo so customers can recognize your profile.'}</span>
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Cover photo (optional)
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setCoverPhoto(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                  {coverPhoto && <span className="mt-1 block text-xs font-normal text-slate-500">{coverPhoto.name}</span>}
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">Professional title
                    <input required value={professionalTitle} onChange={(event) => setProfessionalTitle(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="e.g. Licensed electrician" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">Years of experience
                    <input type="number" min="0" max="80" value={yearsExperience} onChange={(event) => setYearsExperience(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={isBusiness} onChange={(event) => setIsBusiness(event.target.checked)} className="h-4 w-4 accent-orange-600" />
                  I provide services as a registered business
                </label>
                {isBusiness && <label className="block text-sm font-medium text-slate-700">Business name
                  <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </label>}
                <label className="block text-sm font-medium text-slate-700">About your work
                  <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} maxLength={1000} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="Describe your experience and the work customers can expect." />
                </label>
                <fieldset>
                  <legend className="text-sm font-semibold text-slate-800">Service categories</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {categories.map((category) => (
                      <label key={category.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm">
                        <input type="checkbox" checked={categoryIds.includes(category.id)} onChange={(event) => {
                          setCategoryIds((ids) => event.target.checked ? [...ids, category.id] : ids.filter((id) => id !== category.id));
                          if (!event.target.checked) setServiceIds((ids) => ids.filter((id) => !services.some((service) => service.id === id && service.category_id === category.id)));
                        }} className="h-4 w-4 accent-orange-600" />
                        <span><span className="block font-medium">{category.name}</span>{category.description && <span className="block text-xs text-slate-500">{category.description}</span>}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {categoryIds.length > 0 && <fieldset>
                  <legend className="text-sm font-semibold text-slate-800">Services you offer</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {categoryServices.map((service) => (
                      <label key={service.id} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
                        <input type="checkbox" checked={serviceIds.includes(service.id)} onChange={(event) => setServiceIds((ids) => event.target.checked ? [...ids, service.id] : ids.filter((id) => id !== service.id))} className="mt-0.5 h-4 w-4 accent-orange-600" />
                        <span><span className="block font-medium">{service.name}</span>{service.description && <span className="block text-xs text-slate-500">{service.description}</span>}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>}
                <div>
                  <label htmlFor="provider-skills" className="text-sm font-medium text-slate-700">Skills (comma-separated)</label>
                  <div className="mt-1 flex gap-2">
                    <input id="provider-skills" value={skillDraft} onChange={(event) => setSkillDraft(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5" placeholder="e.g. fault finding, installations" />
                    <button type="button" onClick={addSkills} className="rounded-lg border border-orange-200 px-3 py-2 text-sm font-semibold text-orange-800">Add</button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">{skills.map((skill) => <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-900">{skill}<button type="button" aria-label={`Remove ${skill}`} onClick={() => setSkills((current) => current.filter((item) => item !== skill))}><X className="h-3 w-3" /></button></span>)}</div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Service area
                  <input required value={location} onChange={(event) => setLocation(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="City, district, or neighborhood" />
                </label>
                <label className="text-sm font-medium text-slate-700">Travel radius (km)
                  <input type="number" min="1" max="300" value={serviceRadius} onChange={(event) => setServiceRadius(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </label>
                <label className="text-sm font-medium text-slate-700">Availability
                  <select value={availabilityStatus} onChange={(event) => setAvailabilityStatus(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
                    <option value="available">Available</option><option value="busy">Busy</option><option value="unavailable">Unavailable</option>
                  </select>
                </label>
                <fieldset className="sm:col-span-2">
                  <legend className="text-sm font-semibold text-slate-800">Working days</legend>
                  <div className="mt-2 flex flex-wrap gap-2">{weekdays.map((day, index) => <label key={day} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={availableDays[index]} onChange={(event) => setAvailableDays((current) => current.map((enabled, dayIndex) => dayIndex === index ? event.target.checked : enabled))} className="h-4 w-4 accent-orange-600" />{day}</label>)}</div>
                </fieldset>
                <label className="text-sm font-medium text-slate-700">Start time
                  <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </label>
                <label className="text-sm font-medium text-slate-700">End time
                  <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">Pricing approach
                  <select value={pricingModel} onChange={(event) => setPricingModel(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
                    <option value="starting">Starting price</option><option value="quote">Request a quote</option>
                  </select>
                </label>
                {pricingModel !== 'quote' && <label className="block text-sm font-medium text-slate-700">Starting price (UGX)
                  <input type="number" min="1" value={startingPrice} onChange={(event) => setStartingPrice(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="e.g. 50000" />
                </label>}
                <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                  <input type="checkbox" checked={publicListing} onChange={(event) => setPublicListing(event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-600" />
                  <span><span className="font-semibold">Show my profile in the provider directory</span><span className="mt-1 block text-xs text-slate-500">You can change profile visibility later. Your phone number remains private.</span></span>
                </label>
                <p className="rounded-lg bg-orange-50 p-3 text-sm text-orange-950">Your profile details and service choices will be saved to HomiCare. You can update your availability and pricing later.</p>
              </div>
            )}

            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button type="button" disabled={step === 0 || busy} onClick={() => { setError(''); setStep((current) => Math.max(0, current - 1)); }} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:invisible">Back</button>
              <button type="submit" disabled={busy || catalogLoading} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-wait disabled:opacity-60">
                {busy ? 'Saving profile...' : step === steps.length - 1 ? 'Publish profile' : 'Continue'}
                {!busy && step < steps.length - 1 && <ArrowRight className="h-4 w-4" />}
                {busy && <Check className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </section>

        <details className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">See sample profile and dashboard previews</summary>
        <div className="grid gap-4 xl:grid-cols-8">
          {flowCards.map(({ title, icon: Icon, accent, tag }, index) => (
            <div key={title} className={`rounded-[22px] border p-3 shadow-[0_15px_35px_rgba(15,23,42,0.06)] ${index === 0 ? 'border-[#f7d7ad] bg-white' : 'border-[#f3e7df] bg-white/90'}`}>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700">Step {index + 1}</span>
                <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${index < 4 ? 'bg-[#fff2df] text-orange-700' : 'bg-[#fffaf4] text-slate-500'}`}>{tag}</span>
              </div>
              <div className="rounded-[18px] border border-[#f8ead9] bg-[#fffaf4] p-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className={`grid h-8 w-8 place-items-center rounded-xl ${accent}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-500">Profile setup</p>
                    <p className="text-sm font-bold text-slate-900">{title}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {index === 0 && (
                    <>
                      <div className="h-2.5 w-full rounded-full bg-[#f8e5d2]" />
                      <div className="flex gap-2">
                        <div className="h-10 w-10 rounded-full bg-[#f2d7ba]" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2.5 w-2/3 rounded-full bg-[#f7d2a9]" />
                          <div className="h-2 w-full rounded-full bg-[#f5e9dc]" />
                          <div className="h-2 w-5/6 rounded-full bg-[#f5e9dc]" />
                        </div>
                      </div>
                    </>
                  )}

                  {index === 1 && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-6 rounded-md bg-[#f7e1c8]" />
                        <div className="h-6 rounded-md bg-[#f7e1c8]" />
                        <div className="col-span-2 h-2.5 rounded-full bg-[#f6dfc0]" />
                        <div className="col-span-2 h-2.5 rounded-full bg-[#f4eadf]" />
                      </div>
                    </>
                  )}

                  {index === 2 && (
                    <>
                      <div className="h-2 w-2/3 rounded-full bg-[#f7d7a6]" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-8 rounded-md bg-[#f5e3d0]" />
                        <div className="h-8 rounded-md bg-[#f7e6d2]" />
                        <div className="h-8 rounded-md bg-[#f9efe6]" />
                        <div className="h-8 rounded-md bg-[#f9efe6]" />
                      </div>
                    </>
                  )}

                  {index === 3 && (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {['Plumbing', 'Repair', 'Install', 'Maintenance'].map((item) => (
                          <span key={item} className="rounded-full bg-[#fce9d7] px-2 py-1 text-[9px] font-semibold text-orange-700">{item}</span>
                        ))}
                      </div>
                      <div className="h-7 rounded-md bg-[#f9e7d4]" />
                      <div className="h-2.5 w-4/5 rounded-full bg-[#f5e8db]" />
                    </>
                  )}

                  {index === 4 && (
                    <>
                      <div className="flex gap-2">
                        <div className="h-12 flex-1 rounded-xl bg-[#f4d3a4]" />
                        <div className="h-12 w-12 rounded-xl bg-[#f7e8d9]" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-6 rounded bg-[#f8e4cd]" />
                        <div className="h-6 rounded bg-[#f8e4cd]" />
                      </div>
                    </>
                  )}

                  {index === 5 && (
                    <>
                      <div className="h-8 rounded-md bg-[#f9e9d6]" />
                      <div className="space-y-1.5">
                        <div className="h-2.5 w-full rounded-full bg-[#f6dcc6]" />
                        <div className="h-2.5 w-5/6 rounded-full bg-[#f5e9de]" />
                        <div className="h-2.5 w-2/3 rounded-full bg-[#f5e9de]" />
                      </div>
                    </>
                  )}

                  {index === 6 && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-8 rounded-md bg-[#f7d9ad]" />
                        <div className="h-8 rounded-md bg-[#f7d9ad]" />
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-[#f3dfc9]" />
                      <div className="h-2.5 w-5/6 rounded-full bg-[#f5e9dd]" />
                    </>
                  )}

                  {index === 7 && (
                    <>
                      <div className="rounded-xl bg-[#fbe9d7] p-2">
                        <div className="h-2.5 w-2/3 rounded-full bg-[#e9b77b]" />
                        <div className="mt-2 h-2.5 w-full rounded-full bg-[#f0d6ae]" />
                        <div className="mt-2 h-2.5 w-4/5 rounded-full bg-[#f2e5d5]" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button type="button" className="mt-3 w-full rounded-xl bg-orange-500 px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_10px_20px_rgba(249,115,22,0.25)] transition hover:bg-orange-600">
                {index === 7 ? 'Finish' : 'Next Step'}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-2">
          <div className="rounded-[30px] border border-[#f0dfd1] bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-orange-700">Result: Public Provider Profile</p>
              <span className="rounded-full bg-[#fff4ea] px-2 py-1 text-[10px] font-semibold text-orange-700">Verified</span>
            </div>

            <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white">
              <div className="h-28 bg-gradient-to-r from-[#f3d9bf] via-[#ffe8d5] to-[#f6d7b0]" />
              <div className="px-5 pb-5">
                <div className="-mt-12 flex items-end gap-4">
                  <div className="grid h-20 w-20 place-items-center rounded-[24px] border-4 border-white bg-gradient-to-br from-[#f0d3ab] to-[#e9b778] text-2xl font-black text-white shadow-md">R</div>
                  <div className="pb-2">
                    <h2 className="text-xl font-black text-slate-900">Robert Tibasima</h2>
                    <p className="text-sm text-slate-500">Moving & Logistics Expert</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fff3e6] px-2 py-1 font-medium text-orange-700">★ 4.9 (128)</span>
                  <span>Kampala, Uganda</span>
                  <span>Responds in 1 hour</span>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="flex-1 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_18px_rgba(249,115,22,0.25)]">Book Now</button>
                  <button className="rounded-xl border border-orange-200 bg-[#fff7f1] px-4 py-2.5 text-sm font-bold text-orange-700">Connect</button>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  {['Services', 'Reviews', 'Photos', 'Verified'].map((label, index) => (
                    <div key={label} className="rounded-xl bg-[#fff8f2] p-2">
                      <div className="text-lg font-black text-slate-900">{index === 0 ? '14' : index === 1 ? '2.1k' : index === 2 ? '28' : '4'}</div>
                      <div className="mt-1 text-[10px] text-slate-500">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[#f0dfd1] bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-orange-700">Provider Dashboard</p>
              <span className="rounded-full bg-[#fff2e5] px-2 py-1 text-[10px] font-semibold text-orange-700">Online</span>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-[#fffaf6] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Good evening, Robert</p>
                  <h3 className="text-xl font-black text-slate-900">Profile Completion</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-orange-700">90%</div>
                  <div className="mt-1 h-2 w-20 overflow-hidden rounded-full bg-[#f8e4ce]">
                    <div className="h-full w-[90%] rounded-full bg-orange-500" />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { label: 'My Profile', value: '4', tone: 'bg-[#fff2e9]' },
                  { label: 'Bookings', value: '7', tone: 'bg-[#fff7e8]' },
                  { label: 'Messages', value: '3', tone: 'bg-[#fef4ef]' },
                  { label: 'Earnings', value: 'UGX 280,000', tone: 'bg-[#fff5ec]' },
                ].map((metric) => (
                  <div key={metric.label} className={`rounded-2xl ${metric.tone} p-3`}>
                    <div className="text-2xl font-black text-slate-900">{metric.value}</div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{metric.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">Upcoming Bookings</h4>
                  <button className="text-[10px] font-bold uppercase tracking-[0.12em] text-orange-700">View All</button>
                </div>
                <div className="space-y-2">
                  {[
                    ['House Moving', 'Confirmed', 'Tue, 10:00 AM'],
                    ['Furniture Transport', 'Pending', 'Thu, 2:00 PM'],
                    ['Cleaning Service', 'Awaiting', 'Sat, 9:00 AM'],
                  ].map(([name, state, time]) => (
                    <div key={name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#fffaf6] px-3 py-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{name}</div>
                        <div className="text-[11px] text-slate-500">{time}</div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${state === 'Confirmed' ? 'bg-[#eafaf0] text-emerald-700' : state === 'Pending' ? 'bg-[#fff2e6] text-orange-700' : 'bg-[#fff8e8] text-amber-700'}`}>{state}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        </details>
      </div>
    </main>
  );
}