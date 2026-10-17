import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowLeft, Bell, CalendarDays, Camera, ChevronDown, Eye, Globe2, Heart,
  Home, ImagePlus, LockKeyhole, MapPin, MessageSquare, Phone, Save,
  ShieldCheck, UserRound, Wallet,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ProfileMediaImage } from '@/ProfileMediaImage';
import { useApp } from '@/context/AppContext';
import type { Page } from '@/types';

type SettingsPage = Extract<Page, 'profile-edit' | 'profile-password' | 'privacy-settings' | 'notification-settings'>;

interface ProfileForm {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  bio: string;
  alternatePhone: string;
  whatsappNumber: string;
  preferredContact: string;
  country: string;
  city: string;
  district: string;
  address: string;
  photoUrl: string;
  coverUrl: string;
  website: string;
  linkedin: string;
  facebook: string;
  occupation: string;
  interests: string;
}

const emptyProfile: ProfileForm = {
  fullName: '', phone: '', dateOfBirth: '', gender: '', maritalStatus: '', bio: '',
  alternatePhone: '', whatsappNumber: '', preferredContact: 'Phone call', country: 'Uganda',
  city: '', district: '', address: '', photoUrl: '', coverUrl: '', website: '',
  linkedin: '', facebook: '', occupation: '', interests: '',
};

const sections = [
  { id: 'basic-information', label: 'General Information', icon: UserRound },
  { id: 'contact-information', label: 'Contact Details', icon: Phone },
  { id: 'location-information', label: 'Location & Address', icon: MapPin },
  { id: 'household-information', label: 'Household Information', icon: Home },
  { id: 'preferences-information', label: 'Preferences & Interests', icon: Heart },
  { id: 'social-information', label: 'Social Links', icon: Globe2 },
  { id: 'visibility-information', label: 'Profile Visibility', icon: Eye },
];

const settingsLinks: { page: SettingsPage; label: string; icon: typeof UserRound }[] = [
  { page: 'profile-edit', label: 'Edit Profile', icon: UserRound },
  { page: 'profile-password', label: 'Change Password', icon: LockKeyhole },
  { page: 'privacy-settings', label: 'Privacy Settings', icon: ShieldCheck },
  { page: 'notification-settings', label: 'Notification Settings', icon: Bell },
];

function readProfile(metadata: Record<string, unknown>): ProfileForm {
  return Object.fromEntries(Object.keys(emptyProfile).map((key) => [key, String(metadata[key] ?? emptyProfile[key as keyof ProfileForm])])) as unknown as ProfileForm;
}

const profileColumns: Record<keyof ProfileForm, string> = {
  fullName: 'display_name', phone: 'phone_private', dateOfBirth: 'date_of_birth', gender: 'gender',
  maritalStatus: 'marital_status', bio: 'bio', alternatePhone: 'alternate_phone_private',
  whatsappNumber: 'whatsapp_private', preferredContact: 'preferred_contact', country: 'country',
  city: 'city', district: 'district', address: 'address_private', photoUrl: 'avatar_url',
  coverUrl: 'cover_url', website: 'website', linkedin: 'linkedin', facebook: 'facebook',
  occupation: 'occupation', interests: 'household_interests',
};

function readPrivateProfile(row: Record<string, unknown>): ProfileForm {
  return Object.fromEntries(Object.entries(profileColumns).map(([field, column]) => [field, String(row[column] ?? emptyProfile[field as keyof ProfileForm])])) as unknown as ProfileForm;
}

async function ensureProfileRecordForUser(userId: string) {
  const { data, error } = await supabase.from('profiles').select('public_id').eq('user_id', userId).maybeSingle();
  if (data) return data;
  if (error && !String(error.message || '').includes('does not exist') && !String(error.message || '').includes('schema cache') && !String(error.message || '').includes('public.profiles')) {
    throw error;
  }

  const { data: inserted, error: insertError } = await supabase.from('profiles').insert({
    user_id: userId,
    display_name: '',
    phone_private: '',
    country: 'Uganda',
    profile_visibility: 'private',
    show_phone: false,
    show_location: false,
  }).select('public_id').single();

  if (insertError) {
    throw insertError;
  }

  return inserted;
}

async function savePrivateProfile(userId: string, fields: Record<string, string | boolean | null>) {
  const { data, error } = await supabase.from('profiles')
    .upsert({ user_id: userId, ...fields }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export function ProfileSettingsPage({ page }: { page: SettingsPage }) {
  const { setCurrentPage, userRole } = useApp();
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [confirmedEmail, setConfirmedEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'members' | 'private'>('private');
  const [showPhone, setShowPhone] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<'photo' | 'cover' | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState({ bookings: true, payments: true, safety: true, learning: false, marketing: false });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) {
        setError('Sign in to edit your profile and account settings.');
        setLoading(false);
        return;
      }
      setUserId(data.user.id);
      setEmail(data.user.email || '');
      setConfirmedEmail(Boolean(data.user.email_confirmed_at));

      const fallbackMetadata = readProfile(data.user.user_metadata || {});
      try {
        const { data: storedProfile, error: profileError } = await supabase.from('profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        let profileData: Record<string, unknown> | null = storedProfile;
        if (!profileData) {
          const created = await ensureProfileRecordForUser(data.user.id);
          if (created) {
            const { data: refreshedProfile, error: refreshedProfileError } = await supabase.from('profiles')
              .select('*')
              .eq('user_id', data.user.id)
              .maybeSingle();
            if (refreshedProfileError) throw refreshedProfileError;
            profileData = refreshedProfile;
            setProfile(profileData ? readPrivateProfile(profileData) : fallbackMetadata);
          } else {
            setProfile(fallbackMetadata);
          }
        } else {
          setProfile(readPrivateProfile(profileData));
        }
        const metadataPrivacy = data.user.user_metadata?.privacy;
        const privacy = metadataPrivacy && typeof metadataPrivacy === 'object'
          ? metadataPrivacy as Record<string, unknown>
          : {};
        const storedVisibility = profileData?.profile_visibility;
        const visibility: 'public' | 'members' | 'private' = storedVisibility === 'public' || storedVisibility === 'members' || storedVisibility === 'private'
          ? storedVisibility
          : privacy.publicProfile === true || privacy.publicProfile === 'true' ? 'public' : 'private';
        setProfileVisibility(visibility);
        setShowPhone(Boolean(profileData?.show_phone ?? privacy.showPhone));
        setShowLocation(Boolean(profileData?.show_location ?? privacy.showLocation));
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Unknown profile load error';
        setProfile(fallbackMetadata);
        setError(`Profile data could not be loaded from the backend. ${message}`);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
    const savedPreferences = localStorage.getItem('homicare-notification-preferences');
    if (savedPreferences) {
      try {
        setNotificationPrefs((current) => ({ ...current, ...JSON.parse(savedPreferences) }));
      } catch {
        localStorage.removeItem('homicare-notification-preferences');
      }
    }
  }, []);

  const completion = useMemo(() => {
    const required = [profile.fullName, email, profile.phone, profile.bio, profile.city, profile.district, profile.address];
    return Math.round((required.filter((value) => value.trim()).length / required.length) * 100);
  }, [profile, email]);

  const updateProfileField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const uploadProfileImage = async (event: ChangeEvent<HTMLInputElement>, kind: 'photo' | 'cover') => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setNotice('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    const maxSizeMb = kind === 'photo' ? 5 : 10;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Choose an image smaller than ${maxSizeMb} MB.`);
      return;
    }
    if (!userId) {
      setError('Sign in again before uploading profile images.');
      return;
    }

    setUploadingImage(kind);
    const field = kind === 'photo' ? 'photoUrl' : 'coverUrl';
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    try {
      let privateProfile: { public_id: string } | null = null;
      try {
        privateProfile = await ensureProfileRecordForUser(userId);
        if (!privateProfile?.public_id) {
          throw new Error('The profile record does not contain a public image ID yet.');
        }
      } catch (cause) {
        const message = cause && typeof cause === 'object' && 'message' in cause
          ? String((cause as { message: unknown }).message)
          : cause instanceof Error ? cause.message : 'Unknown profile lookup error';
        setError(`Could not save the image. The public.profiles table is missing or the migration has not been applied. ${message}`);
        return;
      }

      const previousPath = profile[field];
      const path = `${privateProfile.public_id}/${kind}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('profile-media').upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) {
        const uploadMessage = String(uploadError.message || 'Unknown storage error');
        if (uploadMessage.includes('not found') || uploadMessage.includes('policy') || uploadMessage.includes('permission')) {
          throw new Error('Storage policy rejected the upload. Check the profile-media bucket policy and migration for the profile folder path.');
        }
        throw uploadError;
      }

      const imageUrl = path;
      const column = kind === 'photo' ? 'avatar_url' : 'cover_url';
      try {
        await savePrivateProfile(userId, { [column]: imageUrl });
      } catch (profileUpdateError) {
        await supabase.storage.from('profile-media').remove([path]);
        throw profileUpdateError;
      }

      updateProfileField(field, imageUrl);
      if (previousPath.startsWith(`${privateProfile.public_id}/`) && previousPath !== path) {
        await supabase.storage.from('profile-media').remove([previousPath]);
      }
      if (userRole === 'provider') {
        const { error: providerError } = await supabase.from('providers').update({
          [column]: imageUrl,
        }).eq('user_id', userId);
        if (providerError) setError(`Image saved to your account, but your public provider profile could not be updated: ${providerError.message}`);
      }
      setNotice(`${kind === 'photo' ? 'Profile photo' : 'Cover photo'} uploaded and saved.`);
    } catch (cause) {
      const message = cause && typeof cause === 'object' && 'message' in cause && typeof (cause as { message?: string }).message === 'string'
        ? (cause as { message: string }).message
        : cause instanceof Error
          ? cause.message
          : 'Unknown storage error';
      setError(`Could not save the image. Check that the profile-media Supabase migration is applied and the storage bucket policy allows your profile folder path. ${message}`);
    } finally {
      setUploadingImage(null);
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    let saveNotice = 'Profile changes saved.';
    try {
      if (!userId) throw new Error('Sign in again before saving your profile.');
      await savePrivateProfile(userId, {
        display_name: profile.fullName.trim(),
        phone_private: profile.phone.trim(),
        date_of_birth: profile.dateOfBirth,
        gender: profile.gender,
        marital_status: profile.maritalStatus,
        bio: profile.bio.trim(),
        alternate_phone_private: profile.alternatePhone.trim(),
        whatsapp_private: profile.whatsappNumber.trim(),
        preferred_contact: profile.preferredContact,
        country: profile.country,
        city: profile.city.trim(),
        district: profile.district.trim(),
        address_private: profile.address.trim(),
        avatar_url: profile.photoUrl || null,
        cover_url: profile.coverUrl || null,
        website: profile.website.trim(),
        linkedin: profile.linkedin.trim(),
        facebook: profile.facebook.trim(),
        occupation: profile.occupation.trim(),
        household_interests: profile.interests.trim(),
        profile_visibility: profileVisibility,
        show_phone: showPhone,
        show_location: showLocation,
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unknown backend error';
      setError(`Profile save failed: ${message}`);
      setSaving(false);
      return;
    }

    const { data: currentUser } = await supabase.auth.getUser();
    if (email.trim() && email.trim() !== currentUser.user?.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
      if (emailError) {
        setError(`Profile details saved, but email was not changed: ${emailError.message}`);
        setSaving(false);
        return;
      }
      saveNotice = 'Profile saved. Confirm the new email address using the message sent to you.';
    }

    if (userRole === 'provider' && userId) {
      const { error: providerError } = await supabase.from('providers').update({
        full_name: profile.fullName.trim(),
        professional_title: profile.occupation.trim() || 'Household service provider',
        location: [profile.city, profile.district].filter(Boolean).join(', ') || profile.country,
        bio: profile.bio.trim() || null,
        avatar_url: profile.photoUrl.trim() || null,
        cover_url: profile.coverUrl.trim() || null,
      }).eq('user_id', userId);
      if (providerError) setError(`Account profile saved, but public provider details need attention: ${providerError.message}`);
    }

    setSaving(false);
    if (!error) setNotice(saveNotice);
  };

  const savePrivacy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (!userId) throw new Error('Sign in again before saving privacy settings.');
      await savePrivateProfile(userId, { profile_visibility: profileVisibility, show_phone: showPhone, show_location: showLocation });
      setSaving(false);
      setNotice('Privacy preferences saved.');
    } catch (cause) {
      setSaving(false);
      const message = cause instanceof Error ? cause.message : 'Unknown backend error';
      setError(`Privacy settings could not be saved: ${message}`);
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (newPassword.length < 8) {
      setError('Use at least 8 characters for your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setSaving(true);
    const { error: changeError } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (changeError) setError(changeError.message);
    else {
      setNotice('Password updated.');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const saveNotifications = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    localStorage.setItem('homicare-notification-preferences', JSON.stringify(notificationPrefs));
    setNotice('Notification preferences saved on this device.');
  };

  const setPreference = (key: keyof typeof notificationPrefs, value: boolean) => {
    setNotificationPrefs((current) => ({ ...current, [key]: value }));
  };

  const pageTitle = page === 'profile-password' ? 'Change Password' : page === 'privacy-settings' ? 'Privacy Settings' : page === 'notification-settings' ? 'Notification Settings' : 'Edit Profile';

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#f7f8fb] text-slate-900">
      <div className="mx-auto max-w-[1500px] lg:flex">
        <aside className="hidden min-h-[calc(100dvh-4rem)] w-60 shrink-0 border-r border-slate-200 bg-white px-4 py-6 lg:block">
          <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Main</p>
          <div className="space-y-1">
            {[
              { label: 'Dashboard', page: 'customer-dashboard' as const, icon: Home },
              { label: 'Find Services', page: 'search' as const, icon: Globe2 },
              { label: 'My Bookings', page: 'my-bookings' as const, icon: CalendarDays },
              { label: 'My Wallet', page: 'wallet' as const, icon: Wallet },
              { label: 'Messages', page: 'messages' as const, icon: MessageSquare },
            ].map((item) => <button key={item.page} onClick={() => setCurrentPage(item.page)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-700"><item.icon className="h-4 w-4" />{item.label}</button>)}
          </div>
          <p className="mb-3 mt-7 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Profile & settings</p>
          <div className="space-y-1">
            {settingsLinks.map((item) => <button key={item.page} onClick={() => { setNotice(''); setError(''); setCurrentPage(item.page); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${page === item.page ? 'bg-orange-50 text-orange-700' : 'text-slate-700 hover:bg-orange-50 hover:text-orange-700'}`}><item.icon className="h-4 w-4" />{item.label}</button>)}
          </div>
          <button onClick={() => setCurrentPage('household')} className="mt-6 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-700"><Home className="h-4 w-4" />My Household</button>
          <div className="mt-10 rounded-xl border border-orange-100 bg-orange-50 p-4">
            <p className="text-sm font-bold text-slate-900">Profile completion</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${completion}%` }} /></div>
            <p className="mt-2 text-right text-xs font-bold text-orange-700">{completion}%</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">Keep your service details current so customers can reach you.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-widest text-orange-700">Profile & settings</p><h1 className="mt-1 text-2xl font-bold text-slate-950">{pageTitle}</h1><p className="mt-1 text-sm text-slate-500">Manage your personal information and HomiCare preferences.</p></div>
            <button onClick={() => setCurrentPage('profile')} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-3.5 w-3.5" /><span className="hidden sm:inline">Back to profile</span></button>
          </div>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">{settingsLinks.map((item) => <button key={item.page} onClick={() => setCurrentPage(item.page)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${page === item.page ? 'bg-orange-500 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{item.label}</button>)}</div>

          {loading ? <div className="h-72 animate-pulse rounded-xl bg-white" /> : error === 'Sign in to edit your profile and account settings.' ? <div className="rounded-xl border border-orange-100 bg-white p-6"><p role="alert" className="text-sm text-slate-700">{error}</p><button onClick={() => setCurrentPage('login')} className="mt-4 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white">Log in</button></div> : (
            <div className="grid items-start gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
              <aside className="hidden rounded-xl border border-slate-200 bg-white p-4 xl:block">
                <div className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2 border-orange-500 bg-orange-50 text-3xl font-bold text-orange-800">{profile.photoUrl ? <ProfileMediaImage source={profile.photoUrl} alt="Profile" className="h-full w-full object-cover" /> : profile.fullName.slice(0, 1) || <UserRound className="h-10 w-10" />}</div>
                {profile.coverUrl && <ProfileMediaImage source={profile.coverUrl} alt="Profile cover" className="mt-4 aspect-[3/1] w-full rounded-md object-cover" />}
                <h2 className="mt-3 text-center font-bold">{profile.fullName || 'Your profile'}</h2>
                <div className="mt-1 flex items-center justify-center gap-1 text-sm text-amber-600"><span>★</span>{confirmedEmail ? 'Email confirmed' : 'Email confirmation pending'}</div>
                <div className="mt-4 rounded-lg bg-orange-50 p-3"><div className="flex justify-between text-xs"><span>Profile completion</span><strong className="text-orange-700">{completion}%</strong></div><div className="mt-2 h-2 rounded-full bg-orange-100"><div className="h-2 rounded-full bg-orange-500" style={{ width: `${completion}%` }} /></div></div>
                <nav className="mt-4 space-y-1">{sections.map((item) => <button key={item.id} onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-medium text-slate-600 hover:bg-orange-50 hover:text-orange-800"><item.icon className="h-4 w-4" />{item.label}</button>)}</nav>
              </aside>

              {page === 'profile-password' ? <form onSubmit={changePassword} className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-bold">Change password</h2><p className="mt-1 text-sm text-slate-500">Choose a unique password with at least eight characters.</p><label className="mt-5 block text-sm font-medium">New password<input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" /></label><label className="mt-4 block text-sm font-medium">Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" /></label><SettingsFeedback error={error} notice={notice} /><button disabled={saving} className="mt-5 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Updating...' : 'Update password'}</button></form>
              : page === 'privacy-settings' ? <form onSubmit={savePrivacy} className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-bold">Privacy and visibility</h2><p className="mt-1 text-sm text-slate-500">Choose who can discover your profile. Provider services are listed separately.</p><label className="mt-4 block text-sm font-semibold text-slate-800">Profile visibility<select value={profileVisibility} onChange={(event) => setProfileVisibility(event.target.value as typeof profileVisibility)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5"><option value="members">HomiCare Users (recommended)</option><option value="public">Anyone (public)</option><option value="private">Only me (private)</option></select></label><p className="mt-2 text-xs text-slate-500">Only Public and HomiCare Users profiles appear in the People directory. Exact address and date of birth are never listed. Your phone and neighborhood are hidden unless you turn on sharing.</p><SettingToggle title="Show phone number" description="Share your phone with the audience selected above." checked={showPhone} onChange={setShowPhone} /><SettingToggle title="Show neighborhood" description="Share city or district only; your exact address stays private." checked={showLocation} onChange={setShowLocation} /><SettingsFeedback error={error} notice={notice} /><button disabled={saving} className="mt-5 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save privacy settings'}</button></form>
              : page === 'notification-settings' ? <form onSubmit={saveNotifications} className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-bold">Notification preferences</h2><p className="mt-1 text-sm text-slate-500">These settings are saved in this browser. Delivery channels depend on configured HomiCare services.</p><SettingToggle title="Bookings and service updates" description="Provider responses, schedule changes, and service status." checked={notificationPrefs.bookings} onChange={(value) => setPreference('bookings', value)} /><SettingToggle title="Payment updates" description="Payment method, quote, and invoice status changes." checked={notificationPrefs.payments} onChange={(value) => setPreference('payments', value)} /><SettingToggle title="Safety and account security" description="Important account and safety messages." checked={notificationPrefs.safety} onChange={(value) => setPreference('safety', value)} /><SettingToggle title="Learning and events" description="Courses, workshops, and community sessions." checked={notificationPrefs.learning} onChange={(value) => setPreference('learning', value)} /><SettingToggle title="Marketing and offers" description="Promotions and product news." checked={notificationPrefs.marketing} onChange={(value) => setPreference('marketing', value)} /><SettingsFeedback error={error} notice={notice} /><button className="mt-5 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-bold text-white">Save preferences</button></form>
              : <form onSubmit={saveProfile} className="min-w-0 space-y-4">
                <section id="basic-information" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                  <SectionHeading number="1" title="Basic Information" subtitle="Update your personal details" />
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><ProfileInput label="Full name" required value={profile.fullName} onChange={(value) => updateProfileField('fullName', value)} /><ProfileInput label="Email address" type="email" required value={email} onChange={setEmail} /><ProfileInput label="Phone number" required value={profile.phone} onChange={(value) => updateProfileField('phone', value)} /><ProfileInput label="Date of birth" type="date" value={profile.dateOfBirth} onChange={(value) => updateProfileField('dateOfBirth', value)} /><ProfileSelect label="Gender" value={profile.gender} onChange={(value) => updateProfileField('gender', value)} options={['Prefer not to say', 'Female', 'Male', 'Other']} /><ProfileSelect label="Marital status" value={profile.maritalStatus} onChange={(value) => updateProfileField('maritalStatus', value)} options={['Prefer not to say', 'Single', 'Married', 'Other']} /></div>
                  <label className="mt-4 block text-sm font-semibold">Bio / About me<textarea required maxLength={500} value={profile.bio} onChange={(event) => updateProfileField('bio', event.target.value)} rows={4} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="Tell customers or neighbors a little about yourself." /><span className="mt-1 block text-right text-xs font-normal text-slate-400">{profile.bio.length}/500</span></label>
                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Profile Photo</p>
                      <div className="mt-2 flex items-center gap-4">
                        <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-500">
                          {profile.photoUrl ? <ProfileMediaImage source={profile.photoUrl} alt="Profile photo preview" className="h-full w-full object-cover" /> : profile.fullName.slice(0, 1) || <UserRound className="h-8 w-8" />}
                          <span className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full bg-orange-600 text-white"><Camera className="h-3.5 w-3.5" /></span>
                        </div>
                        <div className="min-w-0">
                          <label className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-800">Change Photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingImage !== null} onChange={(event) => uploadProfileImage(event, 'photo')} className="sr-only" /></label>
                          <p className="mt-1 text-xs text-slate-500">Upload a clear photo (JPG, PNG, max 5MB)</p>
                          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border border-orange-400 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50"><ImagePlus className="h-3.5 w-3.5" />{uploadingImage === 'photo' ? 'Uploading...' : 'Choose File'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingImage !== null} onChange={(event) => uploadProfileImage(event, 'photo')} className="sr-only" /></label>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Cover Image</p>
                      <div className="mt-2 flex items-center gap-4">
                        <div className="h-16 w-32 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-orange-50">
                          {profile.coverUrl ? <ProfileMediaImage source={profile.coverUrl} alt="Cover image preview" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-orange-400"><ImagePlus className="h-5 w-5" /></div>}
                        </div>
                        <div className="min-w-0">
                          <label className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-800">Change Cover<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingImage !== null} onChange={(event) => uploadProfileImage(event, 'cover')} className="sr-only" /></label>
                          <p className="mt-1 text-xs text-slate-500">Upload a cover image (JPG, PNG, max 10MB)</p>
                          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border border-orange-400 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50"><ImagePlus className="h-3.5 w-3.5" />{uploadingImage === 'cover' ? 'Uploading...' : 'Choose File'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingImage !== null} onChange={(event) => uploadProfileImage(event, 'cover')} className="sr-only" /></label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Images save to your profile after upload. Storage must be configured for uploads to persist.</p><SettingsFeedback error={error} notice={notice} />
                </section>

                <section id="contact-information" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><SectionHeading number="2" title="Contact & Communication" subtitle="How people can reach you" /><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><ProfileInput label="Alternative phone" value={profile.alternatePhone} onChange={(value) => updateProfileField('alternatePhone', value)} /><ProfileInput label="WhatsApp number" value={profile.whatsappNumber} onChange={(value) => updateProfileField('whatsappNumber', value)} /><ProfileSelect label="Preferred contact method" value={profile.preferredContact} onChange={(value) => updateProfileField('preferredContact', value)} options={['Phone call', 'SMS', 'WhatsApp', 'Email']} /></div></section>

                <section id="location-information" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><SectionHeading number="3" title="Location & Address" subtitle="Set your service area. Exact addresses stay private." /><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><ProfileSelect label="Country" value={profile.country} onChange={(value) => updateProfileField('country', value)} options={['Uganda', 'Kenya', 'Tanzania', 'Rwanda', 'Other']} /><ProfileInput label="City / Town" value={profile.city} onChange={(value) => updateProfileField('city', value)} /><ProfileInput label="District" value={profile.district} onChange={(value) => updateProfileField('district', value)} /><ProfileInput label="Address" value={profile.address} onChange={(value) => updateProfileField('address', value)} /></div></section>

                <section id="household-information" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><SectionHeading number="4" title="Household Information" subtitle="This section is optional and private to your account." /><div className="mt-5 grid gap-4 md:grid-cols-2"><ProfileInput label="Occupation" value={profile.occupation} onChange={(value) => updateProfileField('occupation', value)} /><ProfileInput label="Household interests" value={profile.interests} onChange={(value) => updateProfileField('interests', value)} placeholder="Maintenance, solar, gardening" /></div></section>

                <section id="preferences-information" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><SectionHeading number="5" title="Preferences & Interests" subtitle="Personalize recommendations without changing your verification status." /><div className="mt-4 rounded-lg bg-orange-50 p-4 text-sm leading-relaxed text-slate-700">Service recommendations use your chosen location and interests. Recommendations do not confirm availability, pricing, or provider qualifications.</div></section>

                <section id="social-information" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><SectionHeading number="6" title="Social Links" subtitle="Optional links shown only when your public profile is enabled." /><div className="mt-5 grid gap-4 md:grid-cols-3"><ProfileInput label="Website / Portfolio" type="url" value={profile.website} onChange={(value) => updateProfileField('website', value)} /><ProfileInput label="LinkedIn profile" type="url" value={profile.linkedin} onChange={(value) => updateProfileField('linkedin', value)} /><ProfileInput label="Facebook profile" type="url" value={profile.facebook} onChange={(value) => updateProfileField('facebook', value)} /></div></section>

                <section id="visibility-information" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><SectionHeading number="7" title="Profile Visibility" subtitle="Choose who can discover you. Exact addresses, date of birth, and private contact fields are never listed." /><label className="mt-4 block max-w-md text-sm font-semibold text-slate-800">Who can discover your profile?<select value={profileVisibility} onChange={(event) => setProfileVisibility(event.target.value as typeof profileVisibility)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5"><option value="members">HomiCare Users (recommended)</option><option value="public">Anyone (public)</option><option value="private">Only me (private)</option></select></label><SettingToggle title="Show phone" description="Share your phone with the audience selected above." checked={showPhone} onChange={setShowPhone} /><SettingToggle title="Show location" description="Share city/district only; your exact address remains private." checked={showLocation} onChange={setShowLocation} /></section>

                <div className="sticky bottom-20 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur md:bottom-3"><button type="button" onClick={() => setCurrentPage('profile')} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button disabled={saving || loading || uploadingImage !== null} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Changes'}</button></div><SettingsFeedback error={error} notice={notice} />
              </form>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function MyProfilePage() {
  const { setCurrentPage, userRole } = useApp();
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [email, setEmail] = useState('');
  const [publicProfileId, setPublicProfileId] = useState('');
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'members' | 'private'>('private');
  const [confirmedEmail, setConfirmedEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) {
        setError('Sign in to view your profile.');
        setLoading(false);
        return;
      }
      const { data: privateProfile } = await supabase.from('profiles').select('*').eq('user_id', data.user.id).maybeSingle();
      setProfile(privateProfile ? readPrivateProfile(privateProfile) : readProfile(data.user.user_metadata || {}));
      setPublicProfileId(privateProfile?.public_id || '');
      setProfileVisibility(privateProfile?.profile_visibility || 'private');
      setEmail(data.user.email || '');
      setConfirmedEmail(Boolean(data.user.email_confirmed_at));
      setLoading(false);
    };
    loadProfile();
  }, []);

  const completion = useMemo(() => {
    const required = [profile.fullName, email, profile.phone, profile.bio, profile.city, profile.district, profile.address];
    return Math.round((required.filter((value) => value.trim()).length / required.length) * 100);
  }, [profile, email]);

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-12"><div className="h-64 animate-pulse rounded-xl bg-white" /></div>;
  if (error) return <div className="mx-auto max-w-xl px-4 py-16 text-center"><p className="text-sm text-slate-600">{error}</p><button onClick={() => setCurrentPage('login')} className="mt-4 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white">Log in</button></div>;

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-orange-700">Account</p><h1 className="mt-1 text-2xl font-bold text-slate-950">My Profile</h1></div><div className="flex flex-wrap gap-2">{profileVisibility !== 'private' && publicProfileId && <a href={`/?profile=${encodeURIComponent(publicProfileId)}`} target="_blank" rel="noreferrer" className="rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-sm font-semibold text-orange-800">View public profile</a>}<button onClick={() => setCurrentPage('profile-edit')} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"><UserRound className="h-4 w-4" />Edit Profile</button></div></div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="relative h-36 bg-orange-100 sm:h-52">{profile.coverUrl ? <ProfileMediaImage source={profile.coverUrl} alt="Profile cover" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-orange-700"><ImagePlus className="h-8 w-8" /><span className="ml-2 text-sm font-semibold">Add a cover photo from Edit Profile</span></div>}</div>
          <div className="flex flex-wrap items-end gap-4 px-5 pb-5 sm:px-7">
            <div className="-mt-12 grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-orange-50 text-3xl font-bold text-orange-800 shadow-sm sm:-mt-14 sm:h-28 sm:w-28">{profile.photoUrl ? <ProfileMediaImage source={profile.photoUrl} alt={`${profile.fullName || 'Your'} profile photo`} className="h-full w-full object-cover" /> : profile.fullName.slice(0, 1) || <UserRound className="h-10 w-10" />}</div>
            <div className="min-w-0 flex-1 pb-1"><h2 className="truncate text-xl font-bold text-slate-950">{profile.fullName || 'Your name'}</h2><p className="mt-0.5 text-sm text-slate-600">{profile.occupation || (userRole === 'provider' ? 'Household service provider' : 'HomiCare member')}</p><p className="mt-1 text-xs text-slate-500">{[profile.city, profile.district, profile.country].filter(Boolean).join(', ') || 'Add your location'}</p></div>
            <span className={`mb-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${confirmedEmail ? 'bg-emerald-50 text-emerald-800' : 'bg-orange-50 text-orange-800'}`}><ShieldCheck className="h-3.5 w-3.5" />{confirmedEmail ? 'Email confirmed' : 'Email not confirmed'}</span>
          </div>
        </section>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-bold text-slate-900">About</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{profile.bio || 'Add a short introduction to tell people about yourself.'}</p></section>
            <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-bold text-slate-900">Personal information</h2><dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">{[
              { label: 'Email', value: email },
              { label: 'Phone', value: profile.phone },
              { label: 'Date of birth', value: profile.dateOfBirth },
              { label: 'Gender', value: profile.gender },
              { label: 'Marital status', value: profile.maritalStatus },
              { label: 'Preferred contact', value: profile.preferredContact },
              { label: 'WhatsApp', value: profile.whatsappNumber },
              { label: 'Alternative phone', value: profile.alternatePhone },
              { label: 'Address', value: profile.address },
            ].map((item) => <div key={item.label}><dt className="text-xs font-medium text-slate-500">{item.label}</dt><dd className="mt-1 break-words text-sm text-slate-800">{item.value || 'Not provided'}</dd></div>)}</dl></section>
            <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-bold text-slate-900">Household & interests</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs font-medium text-slate-500">Occupation</dt><dd className="mt-1 text-sm text-slate-800">{profile.occupation || 'Not provided'}</dd></div><div><dt className="text-xs font-medium text-slate-500">Interests</dt><dd className="mt-1 text-sm text-slate-800">{profile.interests || 'Not provided'}</dd></div></dl></section>
            <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-bold text-slate-900">Social links</h2><dl className="mt-4 grid gap-4 sm:grid-cols-3">{[{ label: 'Website', value: profile.website }, { label: 'LinkedIn', value: profile.linkedin }, { label: 'Facebook', value: profile.facebook }].map((item) => <div key={item.label}><dt className="text-xs font-medium text-slate-500">{item.label}</dt><dd className="mt-1 break-all text-sm text-orange-700">{item.value || 'Not provided'}</dd></div>)}</dl></section>
          </div>

          <aside className="rounded-xl border border-orange-200 bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">Profile completion</h2><span className="text-sm font-bold text-orange-700">{completion}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${completion}%` }} /></div><p className="mt-3 text-xs leading-relaxed text-slate-600">Complete your details and add profile photos to keep your account up to date.</p><button onClick={() => setCurrentPage('profile-edit')} className="mt-4 w-full rounded-lg border border-orange-300 px-3 py-2 text-sm font-semibold text-orange-800 hover:bg-orange-50">Update my details</button></aside>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-100 text-sm font-bold text-orange-700">{number}</span><div><h2 className="font-bold text-slate-950">{title}</h2><p className="text-xs text-slate-500">{subtitle}</p></div></div>;
}

function ProfileInput({ label, value, onChange, type = 'text', required = false, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return <label className="block text-sm font-semibold">{label}{required && <span className="ml-1 text-orange-700">*</span>}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" /></label>;
}

function ProfileSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="block text-sm font-semibold">{label}<span className="relative mt-1.5 block"><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm font-normal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"><option value="">Choose an option</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500" /></span></label>;
}

function SettingToggle({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-start justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0"><span><span className="block text-sm font-semibold text-slate-900">{title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{description}</span></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-orange-600" /></label>;
}

function SettingsFeedback({ error, notice }: { error: string; notice: string }) {
  return <>{error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{notice && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}</>;
}
