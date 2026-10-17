import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle, ArrowRight, BadgeCheck, Bell, BookOpen, BriefcaseBusiness,
  CalendarDays, Check, CheckCheck, ChevronRight, CircleHelp, Clock3,
  FileText, GraduationCap, LockKeyhole, MapPin, MessageSquareText,
  Search, ShieldCheck, ShieldPlus, Sparkles, Users, Wallet, X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import type { Notification, Page } from '@/types';

export type WorkspaceExperiencePageName = 'notifications' | 'safety' | 'trust' | 'learn' | 'events' | 'business-copilot';

const pageDetails: Record<WorkspaceExperiencePageName, { title: string; description: string; icon: typeof Bell }> = {
  notifications: { title: 'Notifications', description: 'Important updates for your bookings, payments, learning and account.', icon: Bell },
  safety: { title: 'Safety Center', description: 'Keep your account and service visits safer, and report concerns privately.', icon: ShieldCheck },
  trust: { title: 'Trust & Verification', description: 'See what has been verified and manage professional evidence.', icon: BadgeCheck },
  learn: { title: 'Learning', description: 'Build practical skills with short, text-first lessons.', icon: GraduationCap },
  events: { title: 'Events', description: 'Discover workshops and keep track of events you are interested in.', icon: CalendarDays },
  'business-copilot': { title: 'Business Copilot', description: 'Review your work, organize follow-ups and prepare drafts for approval.', icon: BriefcaseBusiness },
};

function WorkspaceFrame({ page, children }: { page: WorkspaceExperiencePageName; children: ReactNode }) {
  const { title, description, icon: Icon } = pageDetails[page];
  return <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-700"><Icon className="h-4 w-4" /> HomiCare workspace</p>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600"><LockKeyhole className="h-3.5 w-3.5" /> Secure HomiCare account</span>
    </div>
    {children}
  </main>;
}

function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' | 'success' }) {
  const style = tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-sky-200 bg-sky-50 text-sky-900';
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-lg border px-3 py-2.5 text-sm ${style}`}>{children}</div>;
}

function NotificationsExperience() {
  const { setCurrentPage } = useApp();
  const categories = ['All', 'Bookings', 'Payments', 'Messages', 'Learning', 'Events', 'Safety', 'Business'];
  const [filter, setFilter] = useState('All');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !auth.user) {
        setError('Sign in to view your notifications.');
        setLoading(false);
        return;
      }
      setUserId(auth.user.id);
      const { data, error: queryError } = await supabase.from('notifications')
        .select('*').eq('recipient_id', auth.user.id).order('created_at', { ascending: false }).limit(100);
      if (!active) return;
      if (queryError) setError(`Notifications could not be loaded: ${queryError.message}`);
      else setNotifications((data || []) as Notification[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const visible = notifications.filter((item) => {
    if (filter === 'All') return true;
    const category = item.category.toLowerCase();
    return category.includes(filter.toLowerCase()) ||
      (filter === 'Safety' && ['security', 'trust', 'safety'].some((word) => category.includes(word)));
  });
  const unread = notifications.filter((item) => !item.is_read).length;

  const markRead = async (ids: string[]) => {
    if (!userId || !ids.length || busy) return;
    setBusy(true);
    setError('');
    const { error: updateError } = await supabase.from('notifications').update({ is_read: true })
      .eq('recipient_id', userId).in('id', ids);
    if (updateError) setError(`Read status was not saved: ${updateError.message}`);
    else setNotifications((current) => current.map((item) => ids.includes(item.id) ? { ...item, is_read: true } : item));
    setBusy(false);
  };

  const notificationDestination = (actionUrl: string | null): Page => {
    const path = (actionUrl || '').toLowerCase();
    if (path.includes('booking')) return 'customer-dashboard';
    if (path.includes('payment') || path.includes('wallet')) return 'wallet';
    if (path.includes('message')) return 'messages';
    if (path.includes('learn') || path.includes('course')) return 'learn';
    if (path.includes('event')) return 'events';
    if (path.includes('trust') || path.includes('verif')) return 'trust';
    if (path.includes('safety') || path.includes('security')) return 'safety';
    if (path.includes('business')) return 'business-copilot';
    return 'customer-dashboard';
  };

  return <WorkspaceFrame page="notifications">
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div><h2 className="font-semibold text-slate-900">All activity</h2><p className="mt-0.5 text-xs text-slate-500">{unread} unread</p></div>
          <button type="button" onClick={() => void markRead(notifications.filter((item) => !item.is_read).map((item) => item.id))} disabled={!unread || busy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><CheckCheck className="h-4 w-4" />Mark all as read</button>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2">
          {categories.map((category) => <button key={category} onClick={() => setFilter(category)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${filter === category ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{category}</button>)}
        </div>
        {error && <div className="p-4 pb-0"><Notice tone="error">{error}</Notice></div>}
        {loading ? <p className="p-6 text-sm text-slate-500">Loading notifications…</p> : visible.length ? <ul className="divide-y divide-slate-100">
          {visible.map((item) => <li key={item.id}>
            <button className={`flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-slate-50 ${item.is_read ? '' : 'bg-orange-50/50'}`} onClick={() => {
              if (!item.is_read) void markRead([item.id]);
              setCurrentPage(notificationDestination(item.action_url));
            }}>
              <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${item.is_read ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-orange-700'}`}><Bell className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-900">{item.title}</strong>{!item.is_read && <span className="h-2 w-2 rounded-full bg-orange-500" />}</span><span className="mt-1 block text-sm text-slate-600">{item.body}</span><span className="mt-2 block text-xs text-slate-400">{new Date(item.created_at).toLocaleString()} · {item.category}</span></span>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
            </button>
          </li>)}
        </ul> : <div className="px-5 py-12 text-center"><Bell className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-800">{notifications.length ? `No ${filter.toLowerCase()} notifications` : 'You’re all caught up'}</p><p className="mt-1 text-xs text-slate-500">New updates for your account will appear here.</p></div>}
      </section>
      <aside className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Notification settings</h2><p className="mt-1 text-sm text-slate-600">Choose how HomiCare keeps you up to date.</p><button onClick={() => setCurrentPage('notification-settings')} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-700">Manage preferences <ArrowRight className="h-4 w-4" /></button></section>
        <section className="rounded-xl border border-orange-100 bg-orange-50 p-4"><ShieldPlus className="h-5 w-5 text-orange-700" /><h2 className="mt-2 font-semibold text-slate-900">Security updates stay on</h2><p className="mt-1 text-sm text-slate-600">Important account and safety alerts cannot be muted.</p></section>
      </aside>
    </div>
  </WorkspaceFrame>;
}

type SafetyReport = { id: string; target_type: string; reason: string; status: string; created_at: string };
type UserBlock = { blocked_user_id: string; created_at: string };

function SafetyExperience() {
  const { setCurrentPage } = useApp();
  const [userId, setUserId] = useState('');
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [blocks, setBlocks] = useState<UserBlock[]>([]);
  const [targetType, setTargetType] = useState('account');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('safety');
  const [details, setDetails] = useState('');
  const [blockId, setBlockId] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const loadSafety = async () => {
    setError('');
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) { setError('Sign in to access private safety tools.'); return; }
    setUserId(auth.user.id);
    const [reportResult, blockResult] = await Promise.all([
      supabase.from('safety_reports').select('id,target_type,reason,status,created_at').eq('reporter_id', auth.user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('user_blocks').select('blocked_user_id,created_at').eq('blocker_id', auth.user.id).order('created_at', { ascending: false }),
    ]);
    if (reportResult.error || blockResult.error) setError(`Safety records could not be loaded: ${reportResult.error?.message || blockResult.error?.message}`);
    else { setReports((reportResult.data || []) as SafetyReport[]); setBlocks((blockResult.data || []) as UserBlock[]); }
  };
  useEffect(() => { void loadSafety(); }, []);

  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || busy) return;
    setBusy(true); setError(''); setStatus('');
    const { data, error: insertError } = await supabase.from('safety_reports').insert({
      reporter_id: userId, target_type: targetType, target_reference: reference.trim(), reason, details: details.trim(),
    }).select('id,target_type,reason,status,created_at').single();
    if (insertError || !data) setError(`Your report was not submitted: ${insertError?.message || 'No case was created.'}`);
    else {
      setReports((current) => [data as SafetyReport, ...current]);
      setReference(''); setDetails('');
      setStatus(`Report received. Private case reference: ${data.id.slice(0, 8).toUpperCase()}.`);
    }
    setBusy(false);
  };

  const blockAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || busy) return;
    setBusy(true); setError(''); setStatus('');
    const { error: insertError } = await supabase.from('user_blocks').insert({ blocker_id: userId, blocked_user_id: blockId.trim() });
    if (insertError) setError(`Account was not blocked: ${insertError.message}`);
    else { setBlocks((current) => [{ blocked_user_id: blockId.trim(), created_at: new Date().toISOString() }, ...current]); setBlockId(''); setStatus('This account is now on your block list.'); }
    setBusy(false);
  };

  const unblock = async (blockedUserId: string) => {
    const { error: deleteError } = await supabase.from('user_blocks').delete().eq('blocker_id', userId).eq('blocked_user_id', blockedUserId);
    if (deleteError) setError(`Account could not be unblocked: ${deleteError.message}`);
    else setBlocks((current) => current.filter((block) => block.blocked_user_id !== blockedUserId));
  };

  return <WorkspaceFrame page="safety">
    <div className="mb-5 grid gap-4 sm:grid-cols-3">
      {[
        { title: 'Account security', text: 'Review your sign-in and privacy settings', page: 'profile-password' as Page, icon: LockKeyhole },
        { title: 'Safe service visits', text: 'Keep communication linked to the booking', page: 'messages' as Page, icon: ShieldCheck },
        { title: 'Report an issue', text: 'Create a private case for the HomiCare team', page: 'safety' as Page, icon: AlertTriangle },
      ].map(({ title, text, page, icon: Icon }) => <button key={title} onClick={() => page !== 'safety' && setCurrentPage(page)} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-orange-300"><Icon className="h-5 w-5 text-orange-600" /><strong className="mt-3 block text-sm text-slate-900">{title}</strong><span className="mt-1 block text-xs text-slate-500">{text}</span></button>)}
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4"><h2 className="font-semibold text-slate-900">Report a concern</h2><p className="mt-1 text-xs text-slate-500">Reports are visible to you and authorized safety staff, not the reported person.</p></div>
        {error && <Notice tone="error">{error}</Notice>}{status && <Notice tone="success">{status}</Notice>}
        <form onSubmit={(event) => void submitReport(event)} className="space-y-3">
          <label className="block text-xs font-medium text-slate-700">What are you reporting?
            <select value={targetType} onChange={(event) => setTargetType(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="account">Account</option><option value="business">Business</option><option value="message">Message</option><option value="booking">Booking</option><option value="payment">Payment</option><option value="listing">Listing</option><option value="review">Review</option></select>
          </label>
          <label className="block text-xs font-medium text-slate-700">Reason
            <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="safety">Safety concern</option><option value="fraud">Fraud or scam</option><option value="harassment">Harassment</option><option value="impersonation">Impersonation</option><option value="payment">Payment issue</option><option value="other">Something else</option></select>
          </label>
          <label className="block text-xs font-medium text-slate-700">Reference (optional)<input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={200} placeholder="Booking code or account ID" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
          <label className="block text-xs font-medium text-slate-700">What happened?<textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={3000} rows={4} placeholder="Share only details relevant to your report." className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><strong>If anyone is in immediate danger, contact local emergency services.</strong> HomiCare does not provide emergency response.</div>
          <button disabled={busy || !userId} className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">{busy ? 'Submitting…' : 'Submit private report'}</button>
        </form>
        <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold text-slate-800">Your recent reports</h3>{reports.length ? <ul className="mt-2 space-y-2">{reports.map((report) => <li key={report.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-xs"><span><strong className="capitalize text-slate-800">{report.target_type} · {report.reason}</strong><span className="mt-1 block text-slate-500">Case {report.id.slice(0, 8).toUpperCase()} · {new Date(report.created_at).toLocaleDateString()}</span></span><span className="rounded-full bg-sky-100 px-2 py-1 capitalize text-sky-800">{report.status}</span></li>)}</ul> : <p className="mt-2 text-xs text-slate-500">No reports yet.</p>}</div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Blocked accounts</h2><p className="mt-1 text-xs text-slate-500">Blocked accounts cannot contact you through HomiCare.</p>
        <form onSubmit={(event) => void blockAccount(event)} className="mt-4 flex gap-2"><input required value={blockId} onChange={(event) => setBlockId(event.target.value)} placeholder="Account ID" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" /><button disabled={busy || !userId} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">Block</button></form>
        {blocks.length ? <ul className="mt-4 divide-y divide-slate-100">{blocks.map((block) => <li key={block.blocked_user_id} className="flex items-center justify-between gap-2 py-3 text-xs"><span className="truncate text-slate-700">{block.blocked_user_id}</span><button onClick={() => void unblock(block.blocked_user_id)} className="shrink-0 font-semibold text-orange-700">Unblock</button></li>)}</ul> : <p className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">You have not blocked any accounts.</p>}
        <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><strong>Account controls</strong><p className="mt-1">Manage passwords, profile visibility and notification preferences in your account settings.</p><button onClick={() => setCurrentPage('privacy-settings')} className="mt-2 font-semibold text-orange-700">Open privacy settings <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button></div>
      </section>
    </div>
  </WorkspaceFrame>;
}

type VerificationRecord = { id: string; verification_type: string; status: string; submitted_at: string; review_notes: string | null };

function TrustExperience() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [providerId, setProviderId] = useState('');
  const [submissions, setSubmissions] = useState<VerificationRecord[]>([]);
  const [verificationType, setVerificationType] = useState('identity');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) { if (active) { setError('Sign in to view verification records.'); setLoading(false); } return; }
      const { data: provider, error: providerError } = await supabase.from('providers').select('id').eq('user_id', auth.user.id).maybeSingle();
      if (!active) return;
      if (providerError) setError(`Your provider record could not be loaded: ${providerError.message}`);
      else if (!provider) setError('No provider profile is linked to this account. Provider verification is available after provider onboarding.');
      else {
        setProviderId(provider.id);
        const { data, error: submissionsError } = await supabase.from('provider_verification_submissions')
          .select('id,verification_type,status,submitted_at,review_notes').eq('provider_id', provider.id).order('submitted_at', { ascending: false });
        if (!active) return;
        if (submissionsError) setError(`Verification records could not be loaded: ${submissionsError.message}`);
        else setSubmissions((data || []) as VerificationRecord[]);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const submitEvidence = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!providerId || !file || busy) return;
    if (file.size > 10 * 1024 * 1024) { setError('Choose a file smaller than 10 MB.'); return; }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { setError('Use a PDF, JPEG, PNG or WebP file.'); return; }
    setBusy(true); setError(''); setMessage('');
    const path = `${providerId}/${verificationType}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: uploadError } = await supabase.storage.from('verification-evidence').upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) { setError(`Evidence could not be uploaded securely: ${uploadError.message}`); setBusy(false); return; }
    const { data, error: insertError } = await supabase.from('provider_verification_submissions').insert({
      provider_id: providerId, verification_type: verificationType, storage_path: path, notes: '',
    }).select('id,verification_type,status,submitted_at,review_notes').single();
    if (insertError || !data) {
      const { error: cleanupError } = await supabase.storage.from('verification-evidence').remove([path]);
      setError(`Verification request was not saved: ${insertError?.message || 'No request was created.'}${cleanupError ? ` Evidence cleanup also failed: ${cleanupError.message}` : ''}`);
    } else {
      setSubmissions((current) => [data as VerificationRecord, ...current]);
      setFile(null);
      setMessage('Evidence submitted securely for review. A public badge will not be issued until it is approved.');
    }
    setBusy(false);
  };

  const labels: Record<string, string> = { identity: 'Identity', phone: 'Phone', skills: 'Skills', certification: 'Trade license / certificate', business: 'Business', portfolio: 'Portfolio' };
  const latestByType = new Map<string, VerificationRecord>();
  submissions.forEach((item) => { if (!latestByType.has(item.verification_type)) latestByType.set(item.verification_type, item); });
  const cards = ['identity', 'phone', 'skills', 'certification', 'business', 'portfolio'].map((type) => ({ type, record: latestByType.get(type) }));
  const verifiedCount = cards.filter(({ record }) => record?.status === 'approved').length;

  return <WorkspaceFrame page="trust">
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Verification progress</h2><p className="mt-1 text-xs text-slate-500">Each item is reviewed separately; this is not a service-quality score.</p></div><span className="rounded-full bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-800">{verifiedCount} of {cards.length} verified</span></div>
          {loading ? <p className="mt-5 text-sm text-slate-500">Loading your verification status…</p> : error ? <div className="mt-4"><Notice tone="error">{error}</Notice></div> : <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(({ type, record }) => <div key={type} className="rounded-lg border border-slate-100 p-4"><div className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-800">{labels[type]}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${record?.status === 'approved' ? 'bg-emerald-50 text-emerald-800' : record?.status === 'rejected' ? 'bg-red-50 text-red-700' : record?.status === 'pending' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{record?.status || 'Not verified'}</span></div><p className="mt-2 text-xs text-slate-500">{record ? `Submitted ${new Date(record.submitted_at).toLocaleDateString()}` : 'No evidence submitted'}</p>{record?.review_notes && <p className="mt-2 text-xs text-slate-700">{record.review_notes}</p>}</div>)}</div>}
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Submit evidence</h2><p className="mt-1 text-xs text-slate-500">Documents are stored privately and visible only to you and authorized reviewers.</p>
          {message && <div className="mt-3"><Notice tone="success">{message}</Notice></div>}
          <form onSubmit={(event) => void submitEvidence(event)} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-xs font-medium text-slate-700">Verification type<select value={verificationType} onChange={(event) => setVerificationType(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs font-medium text-slate-700">Evidence file<input type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-1.5 block w-full text-xs text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs" /></label>
            <button disabled={!providerId || !file || busy} className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Uploading…' : 'Submit for review'}</button>
          </form>
          {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
          <p className="mt-3 text-[11px] text-slate-500">PDF, JPEG, PNG or WebP · Maximum 10 MB. An identity check does not guarantee service quality or safety.</p>
        </section>
      </div>
      <aside className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Verification means</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">The evidence for this specific item passed its defined review. It does not guarantee a person's work, safety or suitability.</p></section>
        <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><ShieldCheck className="h-5 w-5 text-emerald-700" /><h2 className="mt-2 font-semibold text-slate-900">Your evidence is private</h2><p className="mt-1 text-sm text-slate-600">Identity files are not shown on public profiles.</p></section>
      </aside>
    </div>
  </WorkspaceFrame>;
}

const courses = [
  { id: 'plumbing-basics-v1', title: 'Professional Plumbing Fundamentals', category: 'Plumbing', level: 'Beginner', duration: '45 min', summary: 'Learn leak diagnosis, tool safety and basic pipe maintenance.', lessons: ['Prepare a safe work area', 'Identify common leak sources', 'Choose a suitable repair approach'] },
  { id: 'electrical-safety-v1', title: 'Electrical Safety at Home', category: 'Electrical', level: 'Beginner', duration: '35 min', summary: 'Recognize common electrical hazards and know when to call a licensed professional.', lessons: ['Spot household warning signs', 'Isolate an unsafe area', 'Choose qualified help'] },
  { id: 'cleaning-standards-v1', title: 'Professional Home Cleaning', category: 'Cleaning', level: 'Beginner', duration: '30 min', summary: 'Plan a room-by-room clean and handle household products responsibly.', lessons: ['Plan the work', 'Use products safely', 'Check the finished space'] },
];
type Enrollment = { id: string; course_id: string; progress: number };

function LearningExperience() {
  const [userId, setUserId] = useState('');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [tab, setTab] = useState('For You');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(courses[0].id);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !auth.user) { setError('Sign in to save learning progress.'); setLoading(false); return; }
      setUserId(auth.user.id);
      const { data, error: queryError } = await supabase.from('learning_enrollments').select('id,course_id,progress').eq('user_id', auth.user.id);
      if (!active) return;
      if (queryError) setError(`Learning progress could not be loaded: ${queryError.message}`);
      else setEnrollments((data || []) as Enrollment[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const selectedCourse = courses.find((course) => course.id === selected) || courses[0];
  const filteredCourses = courses.filter((course) => {
    const matches = `${course.title} ${course.category} ${course.summary}`.toLowerCase().includes(query.toLowerCase());
    const enrollment = enrollments.find((item) => item.course_id === course.id);
    return matches && (tab !== 'My Learning' || Boolean(enrollment)) && (tab !== 'Certificates' || enrollment?.progress === 100);
  });

  const updateProgress = async (courseId: string, nextProgress: number) => {
    if (!userId || saving) return;
    setSaving(true); setError(''); setNotice('');
    const { data, error: saveError } = await supabase.from('learning_enrollments')
      .upsert({ user_id: userId, course_id: courseId, progress: nextProgress, updated_at: new Date().toISOString() }, { onConflict: 'user_id,course_id' })
      .select('id,course_id,progress').single();
    if (saveError || !data) setError(`Learning progress was not saved: ${saveError?.message || 'No progress record was returned.'}`);
    else { setEnrollments((current) => [...current.filter((item) => item.course_id !== courseId), data as Enrollment]); setNotice('Your learning progress was saved to your account.'); }
    setSaving(false);
  };

  const currentProgress = enrollments.find((item) => item.course_id === selectedCourse.id)?.progress || 0;

  return <WorkspaceFrame page="learn">
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="bg-gradient-to-r from-orange-50 via-white to-amber-50 p-5 sm:p-7"><div className="max-w-xl"><p className="text-xs font-semibold uppercase tracking-wide text-orange-700">HomiCare Skills Academy</p><h2 className="mt-2 text-xl font-bold text-slate-950">Level up your skills</h2><p className="mt-1 text-sm text-slate-600">Short, text-first courses designed to use less mobile data.</p><label className="relative mt-4 block max-w-lg"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What skill would you like to learn?" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm" /></label></div></div>
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2">{['For You', 'Explore', 'My Learning', 'Learning Paths', 'Assessments', 'Certificates'].map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${tab === item ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{item}</button>)}</div>
          {error && <div className="p-4 pb-0"><Notice tone="error">{error}</Notice></div>}{notice && <div className="p-4 pb-0"><Notice tone="success">{notice}</Notice></div>}
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{filteredCourses.map((course) => {
            const progress = enrollments.find((item) => item.course_id === course.id)?.progress || 0;
            return <button key={course.id} onClick={() => setSelected(course.id)} className={`rounded-xl border p-4 text-left transition hover:border-orange-300 ${selected === course.id ? 'border-orange-300 bg-orange-50/40' : 'border-slate-200 bg-white'}`}>
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-orange-100 text-orange-700"><BookOpen className="h-5 w-5" /></span><span className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-orange-700">{course.category} · {course.level}</span><strong className="mt-1 block text-sm text-slate-900">{course.title}</strong><span className="mt-1 block text-xs leading-relaxed text-slate-500">{course.summary}</span><span className="mt-3 flex items-center justify-between text-[11px] text-slate-500"><span><Clock3 className="mr-1 inline h-3.5 w-3.5" />{course.duration}</span>{progress > 0 ? `${progress}% complete` : 'Start course'}</span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-orange-500" style={{ width: `${progress}%` }} /></span>
            </button>;
          })}{!loading && filteredCourses.length === 0 && <p className="col-span-full rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">{tab === 'My Learning' ? 'You have not enrolled in a course yet.' : tab === 'Certificates' ? 'Completed learning records will appear here. Course completion is not a trade license.' : 'No courses match your search.'}</p>}{loading && <p className="col-span-full p-6 text-sm text-slate-500">Loading your learning record…</p>}</div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-orange-700">{selectedCourse.category} · {selectedCourse.level}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{selectedCourse.title}</h2><p className="mt-1 text-sm text-slate-600">{selectedCourse.summary}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{selectedCourse.duration}</span></div>
          <h3 className="mt-5 text-sm font-semibold text-slate-800">Course lessons</h3>
          <ol className="mt-2 divide-y divide-slate-100">{selectedCourse.lessons.map((lesson, index) => <li key={lesson} className="flex items-center gap-3 py-3 text-sm"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${currentProgress >= Math.round(((index + 1) / selectedCourse.lessons.length) * 100) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{currentProgress >= Math.round(((index + 1) / selectedCourse.lessons.length) * 100) ? <Check className="h-4 w-4" /> : index + 1}</span><span className="flex-1 text-slate-700">{lesson}</span><button onClick={() => void updateProgress(selectedCourse.id, Math.max(currentProgress, Math.round(((index + 1) / selectedCourse.lessons.length) * 100)))} disabled={saving || !userId} className="text-xs font-semibold text-orange-700 disabled:opacity-50">{currentProgress >= Math.round(((index + 1) / selectedCourse.lessons.length) * 100) ? 'Completed' : 'Mark complete'}</button></li>)}</ol>
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Learning progress is self-paced. It records course activity only and is not an independently assessed credential.</p>
        </section>
      </div>
      <aside className="space-y-4"><section className="rounded-xl border border-orange-100 bg-orange-50 p-4"><Sparkles className="h-5 w-5 text-orange-700" /><h2 className="mt-2 font-semibold text-slate-900">Recommended next step</h2><p className="mt-1 text-sm text-slate-600">Complete one short lesson at a time. Your progress is saved across sessions.</p></section><section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Learning record</h2><p className="mt-1 text-sm text-slate-600">{enrollments.length} course{enrollments.length === 1 ? '' : 's'} started</p><button onClick={() => setTab('My Learning')} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orange-700">View my learning <ArrowRight className="h-4 w-4" /></button></section></aside>
    </div>
  </WorkspaceFrame>;
}

const previewDateAfter = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const events = [
  { id: 'preview-plumbing-workshop', title: 'Plumbing Workshop', category: 'Training', date: previewDateAfter(21), time: '10:00 AM', location: 'Kampala · Venue to be confirmed', format: 'In person', price: 'Free preview', summary: 'A practical introduction to leak diagnosis and safe tool use.' },
  { id: 'preview-home-renovation-expo', title: 'Home Renovation Expo', category: 'Industry', date: previewDateAfter(28), time: '2:00 PM', location: 'Online event', format: 'Online', price: 'Free preview', summary: 'Explore maintenance, energy efficiency and home improvement.' },
  { id: 'preview-business-webinar', title: 'Online Business Growth Webinar', category: 'Business', date: previewDateAfter(35), time: '9:00 AM', location: 'Online event', format: 'Online', price: 'Free preview', summary: 'Practical guidance for running a household services business.' },
];
type EventRegistration = { id: string; event_id: string; cancelled_at: string | null };

function EventsExperience() {
  const { setCurrentPage } = useApp();
  const [userId, setUserId] = useState('');
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [tab, setTab] = useState('Discover');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyEvent, setBusyEvent] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !auth.user) { setError('Sign in to save event registrations.'); setLoading(false); return; }
      setUserId(auth.user.id);
      const { data, error: queryError } = await supabase.from('event_registrations').select('id,event_id,cancelled_at').eq('user_id', auth.user.id);
      if (!active) return;
      if (queryError) setError(`Your events could not be loaded: ${queryError.message}`);
      else setRegistrations((data || []) as EventRegistration[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const visibleEvents = events.filter((event) =>
    tab === 'My Events' ? registrations.some((registration) => registration.event_id === event.id && !registration.cancelled_at)
      : tab === 'Online Events' ? event.format === 'Online'
        : tab === 'In-person Events' ? event.format === 'In person'
          : tab === 'Past Events' ? new Date(`${event.date}T23:59:59`) < new Date()
            : new Date(`${event.date}T23:59:59`) >= new Date(),
  );
  const saveRegistration = async (eventId: string) => {
    if (!userId || busyEvent) return;
    setBusyEvent(eventId); setError('');
    const current = registrations.find((item) => item.event_id === eventId);
    const { data, error: saveError } = current
      ? await supabase.from('event_registrations').update({ cancelled_at: current.cancelled_at ? null : new Date().toISOString() }).eq('id', current.id).eq('user_id', userId).select('id,event_id,cancelled_at').single()
      : await supabase.from('event_registrations').insert({ user_id: userId, event_id: eventId }).select('id,event_id,cancelled_at').single();
    if (saveError || !data) setError(`Your event update was not saved: ${saveError?.message || 'No registration record was returned.'}`);
    else setRegistrations((items) => [...items.filter((item) => item.event_id !== eventId), data as EventRegistration]);
    setBusyEvent('');
  };

  return <WorkspaceFrame page="events">
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div><h2 className="font-semibold text-slate-900">Discover events</h2><p className="mt-1 text-xs text-slate-500">Workshops, practical training and business sessions</p></div><button onClick={() => setCurrentPage('calendar')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"><CalendarDays className="h-4 w-4" />Open calendar</button></div>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2">{['Discover', 'My Events', 'Online Events', 'In-person Events', 'Past Events'].map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${tab === item ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{item}</button>)}</div>
        {error && <div className="p-4 pb-0"><Notice tone="error">{error}</Notice></div>}
        <div className="space-y-3 p-4">{visibleEvents.map((event) => {
          const registration = registrations.find((item) => item.event_id === event.id);
          const saved = Boolean(registration && !registration.cancelled_at);
          return <article key={event.id} className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-[5rem_1fr_auto]">
            <div className="grid min-h-16 place-items-center rounded-lg bg-orange-50 p-2 text-center"><CalendarDays className="h-5 w-5 text-orange-700" /><span className="text-[10px] font-semibold uppercase text-orange-800">{new Date(`${event.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">{event.category}</span><span className="text-[10px] text-slate-500">{event.format}</span></div><h3 className="mt-2 font-semibold text-slate-900">{event.title}</h3><p className="mt-1 text-xs text-slate-600">{event.summary}</p><p className="mt-2 text-xs text-slate-500"><Clock3 className="mr-1 inline h-3.5 w-3.5" />{event.date} · {event.time} · <MapPin className="inline h-3.5 w-3.5" /> {event.location}</p><p className="mt-1 text-[10px] font-medium text-orange-700">{event.price} · Illustrative listing</p></div>
            <button onClick={() => void saveRegistration(event.id)} disabled={!userId || busyEvent === event.id || loading} className={`self-center rounded-lg px-4 py-2 text-xs font-semibold ${saved ? 'border border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-orange-600 text-white hover:bg-orange-700'} disabled:opacity-50`}>{busyEvent === event.id ? 'Saving…' : saved ? 'Cancel save' : 'Save event'}</button>
          </article>;
        })}{!visibleEvents.length && <p className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">{tab === 'My Events' ? 'No saved events yet.' : tab === 'Past Events' ? 'No past events are listed.' : 'No events match this view.'}</p>}{loading && <p className="text-xs text-slate-500">Loading saved events…</p>}</div>
        <p className="border-t border-slate-100 bg-amber-50 px-4 py-3 text-xs text-amber-900">Preview events are examples, not confirmed public events. Saving adds them to your personal list only; it does not issue a ticket or confirm attendance.</p>
      </section>
      <aside className="space-y-4"><section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Your event activity</h2><p className="mt-1 text-sm text-slate-600">{registrations.filter((item) => !item.cancelled_at).length} saved event{registrations.filter((item) => !item.cancelled_at).length === 1 ? '' : 's'}</p></section><section className="rounded-xl border border-orange-100 bg-orange-50 p-4"><Users className="h-5 w-5 text-orange-700" /><h2 className="mt-2 font-semibold text-slate-900">Organize an event</h2><p className="mt-1 text-sm text-slate-600">Organizer publishing and ticketing are not connected yet. No paid event checkout is enabled.</p></section><section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Keep learning</h2><p className="mt-1 text-sm text-slate-600">Continue a short course between workshops.</p><button onClick={() => setCurrentPage('learn')} className="mt-3 text-sm font-semibold text-orange-700">Explore Learning <ArrowRight className="ml-1 inline h-4 w-4" /></button></section></aside>
    </div>
  </WorkspaceFrame>;
}

type BookingSummary = { id: string; service_name: string; status: string; scheduled_date: string | null };
type CopilotDraft = { id: string; draft_type: string; content: string; created_at: string };

function BusinessCopilotExperience() {
  const [userId, setUserId] = useState('');
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [drafts, setDrafts] = useState<CopilotDraft[]>([]);
  const [draftType, setDraftType] = useState('reply');
  const [draftText, setDraftText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !auth.user) { setError('Sign in to view authorized business records.'); setLoading(false); return; }
      setUserId(auth.user.id);
      const [providerResult, draftResult] = await Promise.all([
        supabase.from('providers').select('id').eq('user_id', auth.user.id).maybeSingle(),
        supabase.from('business_copilot_drafts').select('id,draft_type,content,created_at').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(20),
      ]);
      if (!active) return;
      if (draftResult.error) setError(`Saved drafts could not be loaded: ${draftResult.error.message}`);
      else setDrafts((draftResult.data || []) as CopilotDraft[]);
      if (providerResult.error) setError((current) => current || `Business profile could not be loaded: ${providerResult.error.message}`);
      if (providerResult.data?.id) {
        const { data, error: bookingsError } = await supabase.from('bookings').select('id,service_name,status,scheduled_date').eq('provider_id', providerResult.data.id).order('created_at', { ascending: false }).limit(50);
        if (!active) return;
        if (bookingsError) setError((current) => current || `Business bookings could not be loaded: ${bookingsError.message}`);
        else setBookings((data || []) as BookingSummary[]);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const openJobs = bookings.filter((booking) => !['completed', 'cancelled', 'declined'].includes(booking.status.toLowerCase()));
  const pending = bookings.filter((booking) => ['requested', 'pending', 'payment_pending'].includes(booking.status.toLowerCase()));
  const saveDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || !draftText.trim() || saving) return;
    setSaving(true); setError('');
    const { data, error: insertError } = await supabase.from('business_copilot_drafts').insert({ user_id: userId, draft_type: draftType, content: draftText.trim() }).select('id,draft_type,content,created_at').single();
    if (insertError || !data) setError(`Draft was not saved: ${insertError?.message || 'No draft was returned.'}`);
    else { setDrafts((current) => [data as CopilotDraft, ...current]); setDraftText(''); }
    setSaving(false);
  };
  const deleteDraft = async (id: string) => {
    const { error: deleteError } = await supabase.from('business_copilot_drafts').delete().eq('id', id).eq('user_id', userId);
    if (deleteError) setError(`Draft could not be deleted: ${deleteError.message}`);
    else setDrafts((current) => current.filter((draft) => draft.id !== id));
  };

  const tabs = ['Overview', 'Customers & Leads', 'Quotes', 'Bookings & Jobs', 'Team', 'Finance', 'Marketing', 'Analytics', 'AI Assistant', 'Settings'];
  const filteredJobs = activeTab === 'Bookings & Jobs' ? bookings : activeTab === 'Customers & Leads' ? pending : openJobs;

  return <WorkspaceFrame page="business-copilot">
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="space-y-5">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2">{tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${activeTab === tab ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{tab}</button>)}</div>
        {error && <Notice tone="error">{error}</Notice>}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Business overview · live account data</p><h2 className="mt-1 text-xl font-bold text-slate-950">Good day</h2><p className="mt-1 text-sm text-slate-600">Your business activity, based on your authorized HomiCare bookings.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">No estimated revenue</span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[[MessageSquareText, 'New enquiries', String(pending.length), 'Unresolved booking requests'], [BriefcaseBusiness, 'Active jobs', String(openJobs.length), 'Current provider bookings'], [Wallet, 'Quotes awaiting reply', '—', 'Quote data is not connected'], [CheckCheck, 'Verified revenue', '—', 'Use confirmed payment records']].map(([Icon, title, value, note]) => <div key={String(title)} className="rounded-lg border border-slate-100 p-4"><Icon className="h-4 w-4 text-orange-600" /><p className="mt-3 text-xs text-slate-500">{String(title)}</p><p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '…' : String(value)}</p><p className="mt-1 text-[10px] text-slate-500">{String(note)}</p></div>)}</div>
        </section>
        {['Overview', 'Customers & Leads', 'Bookings & Jobs'].includes(activeTab) ? <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2"><div><h2 className="font-semibold text-slate-900">{activeTab === 'Customers & Leads' ? 'Pending enquiries' : activeTab === 'Bookings & Jobs' ? 'Bookings & jobs' : 'Current work'}</h2><p className="mt-1 text-xs text-slate-500">Actual booking records; actions require your review.</p></div><span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800">{filteredJobs.length}</span></div>
          {filteredJobs.length ? <ul className="mt-3 divide-y divide-slate-100">{filteredJobs.slice(0, 8).map((booking) => <li key={booking.id} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0"><strong className="block truncate text-sm text-slate-800">{booking.service_name}</strong><span className="mt-1 block text-xs capitalize text-slate-500">{booking.status.replace(/_/g, ' ')}{booking.scheduled_date ? ` · ${booking.scheduled_date}` : ''}</span></span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] capitalize text-slate-600">{booking.status}</span></li>)}</ul> : <p className="mt-4 rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">{loading ? 'Loading business bookings…' : 'No matching bookings are available to this account.'}</p>}
        </section> : <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">{activeTab}</h2>
          <p className="mt-1 text-sm text-slate-600">{activeTab === 'AI Assistant'
            ? 'AI recommendations are not connected. You can still prepare and save your own drafts below.'
            : `${activeTab} data is not connected for this account. No sample figures are presented as live business data.`}</p>
        </section>}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 text-orange-600" /><div><h2 className="font-semibold text-slate-900">Prepare a business draft</h2><p className="mt-1 text-xs text-slate-500">This workspace does not invent prices or send messages. You review and send drafts yourself.</p></div></div>
          <form onSubmit={(event) => void saveDraft(event)} className="space-y-3"><label className="block text-xs font-medium text-slate-700">Draft type<select value={draftType} onChange={(event) => setDraftType(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm sm:max-w-xs"><option value="reply">Customer reply</option><option value="quote">Quote notes</option><option value="marketing">Marketing copy</option><option value="note">Business note</option></select></label><label className="block text-xs font-medium text-slate-700">Draft content<textarea required value={draftText} onChange={(event) => setDraftText(event.target.value)} maxLength={10000} rows={4} placeholder="Write or paste a draft to save for review…" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label><button disabled={!userId || saving || !draftText.trim()} className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save draft for review'}</button></form>
          {drafts.length > 0 && <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold text-slate-800">Saved drafts</h3><ul className="mt-2 space-y-2">{drafts.map((draft) => <li key={draft.id} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><div className="min-w-0 flex-1"><span className="text-[10px] font-semibold uppercase text-orange-700">{draft.draft_type}</span><p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-700">{draft.content}</p><span className="mt-1 block text-[10px] text-slate-400">{new Date(draft.created_at).toLocaleString()}</span></div><button onClick={() => void deleteDraft(draft.id)} aria-label="Delete draft" className="rounded p-1 text-slate-400 hover:bg-white hover:text-red-600"><X className="h-4 w-4" /></button></li>)}</ul></div>}
        </section>
      </div>
      <aside className="space-y-4"><section className="rounded-xl border border-orange-100 bg-orange-50 p-4"><CircleHelp className="h-5 w-5 text-orange-700" /><h2 className="mt-2 font-semibold text-slate-900">Copilot recommendations</h2><ul className="mt-2 space-y-2 text-sm text-slate-600"><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-orange-700" />Review pending booking requests.</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-orange-700" />Keep drafts private until you approve them.</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-orange-700" />Verify payments in your transaction history.</li></ul></section><section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Human approval required</h2><p className="mt-1 text-sm text-slate-600">No quote, customer message, payment, refund, team assignment or marketing post is sent automatically.</p></section><section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Connected records</h2><div className="mt-3 space-y-2 text-xs text-slate-600"><p><Check className="mr-2 inline h-3.5 w-3.5 text-emerald-600" />Provider bookings</p><p><X className="mr-2 inline h-3.5 w-3.5 text-slate-400" />Verified revenue reports</p><p><X className="mr-2 inline h-3.5 w-3.5 text-slate-400" />Staff scheduling</p></div></section></aside>
    </div>
  </WorkspaceFrame>;
}

export function WorkspaceExperiencePage({ page }: { page: WorkspaceExperiencePageName }) {
  switch (page) {
    case 'notifications': return <NotificationsExperience />;
    case 'safety': return <SafetyExperience />;
    case 'trust': return <TrustExperience />;
    case 'learn': return <LearningExperience />;
    case 'events': return <EventsExperience />;
    case 'business-copilot': return <BusinessCopilotExperience />;
    default: return null;
  }
}
