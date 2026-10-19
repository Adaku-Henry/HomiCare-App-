import { useEffect, useState, type FormEvent } from 'react';
import {
  Award, BarChart3, Bell, BookOpen, Building2, CheckCircle2,
  ChevronRight, FileText, GraduationCap, LockKeyhole, MapPin, MessageSquareText,
  Plus, Search, ShieldCheck, Sparkles, Star, Target, TrendingUp, UserCheck, Users, Wallet, X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import type { Page } from '@/types';

export type WorkspaceExperiencePageName = 'notifications' | 'safety' | 'trust' | 'learn' | 'events' | 'business-copilot';

const pageMeta: Record<WorkspaceExperiencePageName, { title: string; description: string; badge: string }> = {
  notifications: {
    title: 'Notifications & Alerts',
    description: 'Manage push notifications, reminder frequency, and urgent household dispatch alerts.',
    badge: 'Preferences',
  },
  safety: {
    title: 'Safety Center',
    description: 'Verified provider standards, emergency response protocols, and home service safety guidelines.',
    badge: 'Trust & Safety',
  },
  trust: {
    title: 'Trust & Verification',
    description: 'Review provider identity verification, police background checks, skill certifications, and insurance coverage.',
    badge: 'Verified',
  },
  learn: {
    title: 'Homeowner & Provider Academy',
    description: 'Educational courses, maintenance tutorials, safety guides, and professional trade training.',
    badge: 'Academy',
  },
  events: {
    title: 'Community Events & Workshops',
    description: 'Participate in local maintenance workshops, neighbourhood cleanups, and trade networking sessions.',
    badge: 'Community',
  },
  'business-copilot': {
    title: 'Business Copilot',
    description: 'Review your work, organize follow-ups, draft customer replies, and plan your service operations.',
    badge: 'Business Ops',
  },
};

function WorkspaceFrame({ page, children }: { page: WorkspaceExperiencePageName; children: React.ReactNode }) {
  const { setCurrentPage } = useApp();
  const meta = pageMeta[page];

  return (
    <main className="min-h-screen bg-slate-50 py-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
        <header className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-orange-700">{meta.badge}</span>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{meta.title}</h1>
              <p className="text-xs text-slate-600 sm:text-sm">{meta.description}</p>
            </div>
            <button
              onClick={() => setCurrentPage('home')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Back to Home
            </button>
          </div>

          <nav aria-label="Workspace sections" className="mt-5 flex gap-1.5 overflow-x-auto rounded-xl border border-slate-100 bg-slate-50 p-1.5 text-xs font-bold">
            {(Object.keys(pageMeta) as WorkspaceExperiencePageName[]).map((name) => (
              <button
                key={name}
                onClick={() => setCurrentPage(name as unknown as Page)}
                className={`whitespace-nowrap rounded-lg px-3.5 py-2 transition ${page === name ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {pageMeta[name].title}
              </button>
            ))}
          </nav>
        </header>

        {children}
      </div>
    </main>
  );
}

function NotificationsExperience() {
  const [channels, setChannels] = useState({ push: true, sms: true, email: false, emergency: true });
  const [toast, setToast] = useState('');
  const notify = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(''), 2500); };
  return (
    <WorkspaceFrame page="notifications">
      {toast && <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl">{toast}</div>}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-2xl space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900">Notification Channels</h2>
        <div className="divide-y divide-slate-100">
          {Object.entries(channels).map(([key, enabled]) => (
            <label key={key} className="flex items-center justify-between py-3 text-xs font-semibold capitalize text-slate-700">
              {key === 'push' ? 'Push notifications on mobile device' : key === 'sms' ? 'SMS updates for booking status' : key === 'email' ? 'Email newsletters and receipts' : 'Urgent emergency dispatch alerts'}
              <input type="checkbox" checked={enabled} onChange={(e) => setChannels({ ...channels, [key]: e.target.checked })} className="h-4 w-4 accent-orange-600" />
            </label>
          ))}
        </div>
        <button onClick={() => notify('Notification preferences saved')} className="rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-700">Save Preferences</button>
      </div>
    </WorkspaceFrame>
  );
}

function SafetyExperience() {
  return (
    <WorkspaceFrame page="safety">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div>
          <h2 className="text-sm font-extrabold text-slate-900">ID & Background Checks</h2>
          <p className="text-xs text-slate-600 leading-relaxed">All active HomiCare professionals undergo national ID verification and local security vetting before joining the platform.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700"><LockKeyhole className="h-5 w-5" /></div>
          <h2 className="text-sm font-extrabold text-slate-900">Secure Payments</h2>
          <p className="text-xs text-slate-600 leading-relaxed">Payments are held securely in escrow and released only upon satisfactory completion of service.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-orange-700"><Award className="h-5 w-5" /></div>
          <h2 className="text-sm font-extrabold text-slate-900">Guarantee & Support</h2>
          <p className="text-xs text-slate-600 leading-relaxed">HomiCare support is available around the clock to assist with quality disputes or emergency dispatch assistance.</p>
        </div>
      </div>
    </WorkspaceFrame>
  );
}

function TrustExperience() {
  return (
    <WorkspaceFrame page="trust">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-3xl space-y-4">
        <h2 className="text-base font-extrabold text-slate-900">Provider Verification Standards</h2>
        <p className="text-xs text-slate-600 leading-relaxed">HomiCare enforces strict compliance benchmarks across all listed service providers to protect homeowners and commercial clients.</p>
        <ul className="space-y-3 text-xs text-slate-700">
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Government-issued national identification verified</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Professional trade certification and license inspection</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Reference checks from previous completed household jobs</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Ongoing customer rating and performance monitoring</li>
        </ul>
      </div>
    </WorkspaceFrame>
  );
}

function LearnExperience() {
  const { setCurrentPage } = useApp();
  return (
    <WorkspaceFrame page="learn">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">Course</span>
          <h3 className="text-sm font-extrabold text-slate-900">Household Maintenance Masterclass</h3>
          <p className="text-xs text-slate-600">Learn how to inspect plumbing, test electrical safety, and prevent common home repairs.</p>
          <button onClick={() => setCurrentPage('home')} className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700">Start Learning</button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold text-orange-700">Professional Guide</span>
          <h3 className="text-sm font-extrabold text-slate-900">Growing Your Service Business in Uganda</h3>
          <p className="text-xs text-slate-600">Essential strategies for pricing, customer communication, and earning 5-star reviews.</p>
          <button onClick={() => setCurrentPage('provider-dashboard')} className="rounded-xl bg-orange-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-orange-700">View Guide</button>
        </div>
      </div>
    </WorkspaceFrame>
  );
}

function EventsExperience() {
  return (
    <WorkspaceFrame page="events">
      <div className="space-y-3 max-w-3xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">Upcoming Workshop</span>
            <h3 className="mt-1 text-sm font-extrabold text-slate-900">Arua City Neighbourhood Cleanup & Safety Drive</h3>
            <p className="mt-0.5 text-xs text-slate-500">October 25, 2026 · Arua Stadium Grounds</p>
          </div>
          <button onClick={() => alert('You are registered for this event!')} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">RSVP</button>
        </div>
      </div>
    </WorkspaceFrame>
  );
}

type CopilotDraft = { id: string; draft_type: string; content: string; created_at: string };
type BookingSummary = { id: string; service_name: string; status: string; scheduled_date: string | null };

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
      if (authError || !auth.user) {
        setLoading(false);
        return;
      }
      setUserId(auth.user.id);
      try {
        const [providerResult, draftResult] = await Promise.all([
          supabase.from('providers').select('id').eq('user_id', auth.user.id).maybeSingle(),
          supabase.from('business_copilot_drafts').select('id,draft_type,content,created_at').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(20),
        ]);
        if (!active) return;
        if (draftResult.error) {
          const local = JSON.parse(localStorage.getItem(`homicare-copilot-drafts-${auth.user.id}`) || '[]');
          setDrafts(local);
        } else {
          setDrafts((draftResult.data || []) as CopilotDraft[]);
        }
        if (providerResult.data?.id) {
          const { data } = await supabase.from('bookings').select('id,service_name,status,scheduled_date').eq('provider_id', providerResult.data.id).order('created_at', { ascending: false }).limit(50);
          if (active && data) setBookings(data as BookingSummary[]);
        }
      } catch {
        const local = JSON.parse(localStorage.getItem(`homicare-copilot-drafts-${auth.user.id}`) || '[]');
        setDrafts(local);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const openJobs = bookings.filter((b) => !['completed', 'cancelled', 'declined'].includes(b.status.toLowerCase()));
  const pending = bookings.filter((b) => ['requested', 'pending', 'payment_pending'].includes(b.status.toLowerCase()));

  const saveDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || !draftText.trim() || saving) return;
    setSaving(true);
    setError('');
    const newDraft: CopilotDraft = {
      id: `draft-${Date.now()}`,
      draft_type: draftType,
      content: draftText.trim(),
      created_at: new Date().toISOString(),
    };
    try {
      const { data, error: insertError } = await supabase.from('business_copilot_drafts').insert({ user_id: userId, draft_type: draftType, content: draftText.trim() }).select('id,draft_type,content,created_at').single();
      if (!insertError && data) {
        setDrafts((current) => [data as CopilotDraft, ...current]);
      } else {
        setDrafts((current) => [newDraft, ...current]);
        const local = JSON.parse(localStorage.getItem(`homicare-copilot-drafts-${userId}`) || '[]');
        localStorage.setItem(`homicare-copilot-drafts-${userId}`, JSON.stringify([newDraft, ...local]));
      }
    } catch {
      setDrafts((current) => [newDraft, ...current]);
    }
    setDraftText('');
    setSaving(false);
  };

  const deleteDraft = async (id: string) => {
    setDrafts((current) => current.filter((d) => d.id !== id));
    try {
      await supabase.from('business_copilot_drafts').delete().eq('id', id).eq('user_id', userId);
    } catch {
      // Fallback
    }
  };

  const tabs = ['Overview', 'Customers & Leads', 'Quotes', 'Bookings & Jobs', 'Team', 'Finance', 'Marketing', 'Analytics', 'AI Assistant', 'Settings'];
  const filteredJobs = activeTab === 'Bookings & Jobs' ? bookings : activeTab === 'Customers & Leads' ? pending : openJobs;

  return (
    <WorkspaceFrame page="business-copilot">
      {error && <div className="rounded-xl bg-amber-50 p-4 text-xs font-semibold text-amber-800">{error}</div>}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 text-xs font-bold">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 transition ${activeTab === tab ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{tab}</button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500">Active Bookings</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{openJobs.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500">Pending Leads</p>
              <p className="mt-1 text-2xl font-black text-orange-600">{pending.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500">Saved Drafts</p>
              <p className="mt-1 text-2xl font-black text-blue-600">{drafts.length}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-extrabold text-slate-900">{activeTab} Management</h2>
            {loading ? (
              <p className="text-xs text-slate-500">Loading records...</p>
            ) : filteredJobs.length > 0 ? (
              <div className="space-y-2">
                {filteredJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                    <div>
                      <p className="font-extrabold text-slate-900">{job.service_name}</p>
                      <p className="text-[10px] text-slate-500">Scheduled: {job.scheduled_date || 'Flexible'}</p>
                    </div>
                    <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-800 capitalize">{job.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No records found for {activeTab}.</p>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-extrabold text-orange-900"><Sparkles className="h-4 w-4 text-orange-600" /> Business Copilot Assistant</h3>
            <form onSubmit={saveDraft} className="space-y-2.5">
              <select value={draftType} onChange={(e) => setDraftType(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium outline-none">
                <option value="reply">Customer Reply Draft</option>
                <option value="quote">Service Quote Memo</option>
                <option value="followup">Follow-up Reminder</option>
              </select>
              <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} placeholder="Type a note or draft..." rows={3} className="w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none bg-white" />
              <button type="submit" disabled={!draftText.trim() || saving} className="w-full rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50">Save Draft</button>
            </form>
            {drafts.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-orange-200/60 pt-3">
                <p className="text-[11px] font-bold text-slate-700">Recent Drafts</p>
                {drafts.slice(0, 3).map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg bg-white p-2 text-[11px]">
                    <span className="truncate flex-1 text-slate-700">{d.content}</span>
                    <button type="button" onClick={() => deleteDraft(d.id)} className="ml-2 text-slate-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </WorkspaceFrame>
  );
}

export function WorkspaceExperiencePages({ page }: { page: WorkspaceExperiencePageName }) {
  if (page === 'notifications') return <NotificationsExperience />;
  if (page === 'safety') return <SafetyExperience />;
  if (page === 'trust') return <TrustExperience />;
  if (page === 'learn') return <LearnExperience />;
  if (page === 'events') return <EventsExperience />;
  if (page === 'business-copilot') return <BusinessCopilotExperience />;
  return null;
}