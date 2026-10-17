import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, CheckCircle2,
  ChevronRight, CircleHelp, ClipboardList, FileText, Gift, HeartHandshake,
  Image, MapPin, MessageCircle, Phone, Shield, ShieldAlert, ShieldCheck, Sparkles, Star,
  Upload, UserRound, Wallet,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ProfileMediaImage } from '@/ProfileMediaImage';
import { supabase } from '@/lib/supabase';
import type { Booking, Page, Provider, WalletTransaction } from '@/types';
import { formatDate, formatDateTime, formatUGXFull, getBookingStatusLabel } from '@/lib/utils';

function PageFrame({ title, eyebrow = 'HomiCare', children, backPage }: { title: string; eyebrow?: string; children: React.ReactNode; backPage?: Page }) {
  const { setCurrentPage } = useApp();
  return <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
    {backPage && <button onClick={() => setCurrentPage(backPage)} className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-800"><ArrowLeft className="h-3.5 w-3.5" />Back</button>}
    <header className="mb-5"><p className="text-xs font-bold uppercase tracking-wide text-orange-700">{eyebrow}</p><h1 className="mt-1 text-2xl font-bold text-slate-950">{title}</h1></header>
    {children}
  </main>;
}

function Notice({ children, kind = 'info' }: { children: React.ReactNode; kind?: 'info' | 'error' | 'success' }) {
  const colors = kind === 'error' ? 'border-red-200 bg-red-50 text-red-900' : kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900';
  return <p role={kind === 'error' ? 'alert' : 'status'} className={`rounded-md border p-3 text-sm ${colors}`}>{children}</p>;
}

export function FinanceCenterPage() {
  const { setCurrentPage, setActiveBookingCode } = useApp();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Invoices');
  const tabs = ['Invoices', 'Receipts', 'Payments', 'Refunds', 'Transaction History'];

  useEffect(() => {
    Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(100),
    ]).then(([bookingResult, transactionResult]) => {
      setBookings(bookingResult.data || []);
      setTransactions(transactionResult.data || []);
      if (bookingResult.error) setError('Sign in to view your booking finance records.');
      else if (transactionResult.error) setError('Some wallet transactions are unavailable for this account.');
      setLoading(false);
    }).catch(() => { setError('Finance records could not be loaded.'); setLoading(false); });
  }, []);

  const paid = (booking: Booking) => ['paid', 'completed'].includes(booking.payment_status.toLowerCase());
    const visibleBookings = ['Receipts', 'Payments'].includes(activeTab) ? bookings.filter(paid) : bookings;
  const totalPaid = bookings.filter(paid).reduce((sum, booking) => sum + (booking.final_price || booking.quoted_price || 0), 0);
  const openBooking = (booking: Booking, page: Page) => { setActiveBookingCode(booking.booking_code); setCurrentPage(page); };

  return <PageFrame title="Invoice & receipt center" eyebrow="Finance">
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[
      { label: 'Booking records', value: bookings.length },
      { label: 'Paid bookings', value: bookings.filter(paid).length },
      { label: 'Recorded paid total', value: formatUGXFull(totalPaid) },
      { label: 'Transactions', value: transactions.length },
    ].map((metric) => <div key={metric.label} className="rounded-md border border-slate-200 bg-white p-4"><p className="text-lg font-bold text-slate-950">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.label}</p></div>)}</div>
    {error && <div className="mb-4"><Notice>{error}</Notice></div>}
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">{tabs.map((tab) => <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'Refunds') setCurrentPage('refunds'); }} className={`shrink-0 border-b-2 px-3 py-2.5 text-xs font-semibold ${activeTab === tab ? 'border-orange-600 text-orange-800' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{tab}</button>)}</div>
    {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading finance records...</p> : activeTab === 'Transaction History' ? <div className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">{transactions.length ? transactions.map((transaction) => <div key={transaction.id} className="flex flex-wrap items-center gap-3 p-4"><span className="grid h-9 w-9 place-items-center rounded-md bg-orange-50 text-orange-700"><Wallet className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{transaction.description || transaction.transaction_type}</p><p className="text-xs text-slate-500">{formatDateTime(transaction.created_at)} · {transaction.payment_method || 'Payment method unavailable'}</p></div><span className="text-sm font-bold text-slate-900">{formatUGXFull(transaction.amount)}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] capitalize text-slate-600">{transaction.status}</span></div>) : <p className="p-5 text-sm text-slate-500">No transaction history is available.</p>}</div> : <div className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">{visibleBookings.length ? visibleBookings.map((booking) => <div key={booking.id} className="flex flex-wrap items-center gap-3 p-4"><span className="grid h-9 w-9 place-items-center rounded-md bg-orange-50 text-orange-700"><FileText className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{booking.service_name}</p><p className="text-xs text-slate-500">{booking.booking_code} · {formatDate(booking.created_at)}</p></div><span className="text-sm font-semibold text-slate-800">{booking.final_price || booking.quoted_price ? formatUGXFull(booking.final_price || booking.quoted_price || 0) : 'Awaiting quote'}</span><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${paid(booking) ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{paid(booking) ? 'Paid' : 'Not paid'}</span><div className="flex gap-1"><button onClick={() => openBooking(booking, 'invoice')} className="rounded border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700">{paid(booking) ? 'Receipt' : 'Invoice'}</button>{paid(booking) && <button onClick={() => openBooking(booking, 'refunds')} className="rounded border border-orange-200 px-2.5 py-2 text-xs font-semibold text-orange-800">Request refund</button>}</div></div>) : <p className="p-5 text-sm text-slate-500">{activeTab === 'Receipts' ? 'No paid booking receipts found.' : activeTab === 'Payments' ? 'No completed payments found.' : 'No invoices found.'}</p>}</div>}
    <p className="mt-4 text-xs text-slate-500">Payments and refunds are not initiated from this center. Payment processing and provider-issued tax receipts depend on connected finance services.</p>
  </PageFrame>;
}

interface RefundRecord {
  id: string;
  booking_id: string;
  reason: string;
  details: string;
  evidence_paths: string[];
  status: string;
  created_at: string;
}

export function RefundRequestPage() {
  const { activeBookingCode, setActiveBookingCode } = useApp();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<RefundRecord[]>([]);
  const [bookingId, setBookingId] = useState('');
  const [reason, setReason] = useState('service_not_provided');
  const [details, setDetails] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data: authResult } = await supabase.auth.getUser();
    if (!authResult.user) { setError('Sign in to request a refund.'); setLoading(false); return; }
    const [bookingResult, refundResult] = await Promise.all([
      supabase.from('bookings').select('*').eq('customer_id', authResult.user.id).order('created_at', { ascending: false }),
      supabase.from('refund_requests').select('*').eq('owner_id', authResult.user.id).order('created_at', { ascending: false }),
    ]);
    setBookings(bookingResult.data || []);
    setRequests(refundResult.data || []);
    const initialBooking = bookingResult.data?.find((booking) => booking.booking_code === activeBookingCode);
    setBookingId(initialBooking?.id || '');
    if (refundResult.error) setError('Refund requests need the latest refunds-and-complaints migration.');
    else if (bookingResult.error) setError('Bookings could not be loaded for this refund request.');
    setLoading(false);
  }, [activeBookingCode]);

  useEffect(() => { load(); }, [load]);

  const eligibleBookings = bookings.filter((booking) => ['paid', 'completed'].includes(booking.payment_status.toLowerCase()));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(''); setNotice('');
    const selectedBooking = eligibleBookings.find((booking) => booking.id === bookingId);
    if (!selectedBooking) { setError('Choose a booking with a completed payment.'); return; }
    const { data: authResult, error: authError } = await supabase.auth.getUser();
    if (authError || !authResult.user) { setError('Sign in to submit a refund request.'); return; }
    if (files.some((file) => file.size > 10 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type))) {
      setError('Evidence must be JPG, PNG, WebP, or PDF files up to 10 MB each.'); return;
    }
    setSubmitting(true);
    const paths: string[] = [];
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${authResult.user.id}/${selectedBooking.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('refund-evidence').upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) { setError(`Evidence could not be uploaded. Apply the refunds-and-complaints migration and check storage access. ${uploadError.message}`); setSubmitting(false); return; }
      paths.push(path);
    }
    const { data, error: insertError } = await supabase.from('refund_requests').insert({ owner_id: authResult.user.id, booking_id: selectedBooking.id, reason, details: details.trim(), evidence_paths: paths }).select('*').single();
    setSubmitting(false);
    if (insertError || !data) {
      if (paths.length) await supabase.storage.from('refund-evidence').remove(paths);
      setError(insertError?.message || 'Refund request was not submitted.');
      return;
    }
    setRequests((current) => [data, ...current]);
    setActiveBookingCode(selectedBooking.booking_code);
    setDetails(''); setFiles([]);
    setNotice(`Refund request submitted for ${selectedBooking.booking_code}. No refund has been issued yet.`);
  };

  return <PageFrame title="Request a refund" eyebrow="Finance · Refunds" backPage="finance">
    <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">{['Payment', 'Choose reason', 'Evidence', 'Submit', 'Refund status'].map((step, index) => <span key={step} className="inline-flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-orange-100 font-bold text-orange-800">{index + 1}</span><span className="font-medium text-slate-700">{step}</span>{index < 4 && <ArrowRight className="h-3 w-3 text-slate-400" />}</span>)}</div>
    {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}{notice && <div className="mb-4"><Notice kind="success">{notice}</Notice></div>}
    {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading eligible payments...</p> : <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form onSubmit={submit} className="space-y-4 rounded-md border border-slate-200 bg-white p-4 sm:p-5">
        <label className="block text-sm font-semibold text-slate-800">Paid booking<select required value={bookingId} onChange={(event) => setBookingId(event.target.value)} className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="">Select a paid booking</option>{eligibleBookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.booking_code} · {booking.service_name} · {booking.final_price ? formatUGXFull(booking.final_price) : 'Paid'}</option>)}</select></label>
        <fieldset><legend className="text-sm font-semibold text-slate-800">Reason</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{[{ id: 'service_not_provided', label: 'Service not provided' }, { id: 'poor_service', label: 'Poor service' }, { id: 'incorrect_charge', label: 'Incorrect charge' }, { id: 'duplicate_payment', label: 'Duplicate payment' }, { id: 'other', label: 'Other' }].map((item) => <label key={item.id} className="flex items-center gap-2 rounded border border-slate-200 p-3 text-sm"><input type="radio" name="refund-reason" value={item.id} checked={reason === item.id} onChange={() => setReason(item.id)} className="accent-orange-600" />{item.label}</label>)}</div></fieldset>
        <label className="block text-sm font-semibold text-slate-800">What happened?<textarea required minLength={10} maxLength={3000} value={details} onChange={(event) => setDetails(event.target.value)} rows={4} className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-normal" placeholder="Include dates, amounts, and what outcome you are requesting." /></label>
        <label className="block text-sm font-semibold text-slate-800">Evidence <span className="font-normal text-slate-500">(optional)</span><span className="mt-1.5 flex items-center gap-2 rounded-md border border-dashed border-slate-300 p-3 text-xs font-normal text-slate-600"><Upload className="h-4 w-4 text-orange-700" /><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} className="min-w-0 flex-1" /></span></label>
        {files.length > 0 && <p className="text-xs text-slate-600">Selected: {files.map((file) => file.name).join(', ')}</p>}
        <button disabled={submitting || eligibleBookings.length === 0} className="w-full rounded-md bg-orange-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{submitting ? 'Submitting securely...' : 'Submit refund request'}</button>
      </form>
      <aside className="space-y-3"><section className="rounded-md border border-slate-200 bg-white p-4"><h2 className="text-sm font-bold text-slate-900">Refund status</h2>{requests.length === 0 ? <p className="mt-2 text-xs text-slate-500">No refund requests yet.</p> : <div className="mt-3 space-y-2">{requests.map((request) => <div key={request.id} className="rounded-md bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-900">{bookings.find((booking) => booking.id === request.booking_id)?.booking_code || 'Booking request'}</p><p className="mt-1 text-xs capitalize text-slate-600">{request.status.replace('_', ' ')}</p><p className="mt-1 text-[10px] text-slate-500">{formatDate(request.created_at)}</p></div>)}</div>}</section><Notice>Submitting a request does not guarantee approval. Review and disbursement require HomiCare staff and a connected payment provider.</Notice></aside>
    </div>}
  </PageFrame>;
}

interface ComplaintRecord { id: string; provider_id: string; booking_id: string | null; category: string; details: string; status: string; created_at: string }

export function ComplaintsPage() {
  const { selectedProviderId, activeBookingCode } = useApp();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [bookingId, setBookingId] = useState('');
  const [providerId, setProviderId] = useState(selectedProviderId || '');
  const [category, setCategory] = useState('poor_service');
  const [details, setDetails] = useState('');
  const [tab, setTab] = useState('All');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: authResult } = await supabase.auth.getUser();
    if (!authResult.user) { setError('Sign in to submit or view complaints.'); setLoading(false); return; }
    const [bookingResult, providerResult, complaintResult] = await Promise.all([
      supabase.from('bookings').select('*').eq('customer_id', authResult.user.id).order('created_at', { ascending: false }),
      supabase.from('public_provider_profiles').select('*').order('rating', { ascending: false }).limit(50),
      supabase.from('service_complaints').select('*').eq('owner_id', authResult.user.id).order('created_at', { ascending: false }),
    ]);
    setBookings(bookingResult.data || []); setProviders(providerResult.data || []); setComplaints(complaintResult.data || []);
    const selectedBooking = (bookingResult.data || []).find((booking) => booking.booking_code === activeBookingCode);
    if (selectedBooking) {
      setBookingId(selectedBooking.id);
      setProviderId(selectedBooking.provider_id);
    }
    if (complaintResult.error) setError('Complaints need the latest refunds-and-complaints migration.');
    else if (bookingResult.error) setError('Sign in to load booking details for a complaint.');
    setLoading(false);
  }, [activeBookingCode]);
  useEffect(() => { load(); }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setNotice(''); setSaving(true);
    const { data: authResult, error: authError } = await supabase.auth.getUser();
    const booking = bookings.find((item) => item.id === bookingId);
    const resolvedProviderId = booking?.provider_id || providerId;
    if (authError || !authResult.user) { setError('Sign in to submit a complaint.'); setSaving(false); return; }
    if (!resolvedProviderId) { setError('Choose a booking or provider to report.'); setSaving(false); return; }
    const { data, error: insertError } = await supabase.from('service_complaints').insert({ owner_id: authResult.user.id, booking_id: booking?.id || null, provider_id: resolvedProviderId, category, details: details.trim() }).select('*').single();
    setSaving(false);
    if (insertError || !data) { setError(insertError?.message || 'Complaint was not submitted.'); return; }
    setComplaints((current) => [data, ...current]); setDetails(''); setNotice('Your complaint was submitted and marked Open.');
  };

  const filtered = complaints.filter((complaint) => tab === 'All' || complaint.status.replace('_', ' ').toLowerCase() === tab.toLowerCase());
  const categories = [
    ['provider_behavior', 'Provider behavior'], ['poor_service', 'Poor service'], ['no_show', 'No-show'],
    ['wrong_price', 'Wrong price'], ['payment_issue', 'Payment issue'], ['safety_concern', 'Safety concern'], ['other', 'Other'],
  ];

  return <PageFrame title="Complaints & disputes" eyebrow="Trust & support" backPage="safety">
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form onSubmit={submit} className="space-y-4 rounded-md border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="font-semibold text-slate-900">Report a problem</h2>
        {error && <Notice kind="error">{error}</Notice>}{notice && <Notice kind="success">{notice}</Notice>}
        <label className="block text-sm font-semibold text-slate-700">Related booking (optional)<select value={bookingId} onChange={(event) => { setBookingId(event.target.value); const selected = bookings.find((booking) => booking.id === event.target.value); if (selected) setProviderId(selected.provider_id); }} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="">No booking</option>{bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.booking_code} · {booking.service_name}</option>)}</select></label>
        {!bookingId && <label className="block text-sm font-semibold text-slate-700">Provider<select required value={providerId} onChange={(event) => setProviderId(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="">Choose a provider</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.full_name}</option>)}</select></label>}
        <label className="block text-sm font-semibold text-slate-700">Problem type<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal">{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="block text-sm font-semibold text-slate-700">Describe what happened<textarea required minLength={10} maxLength={3000} rows={5} value={details} onChange={(event) => setDetails(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-normal" placeholder="Share dates, relevant messages, and the resolution you are seeking." /></label>
        <button disabled={saving || loading} className="rounded-md bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Submitting...' : 'Submit complaint'}</button>
      </form>
      <section className="rounded-md border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">My complaints</h2><div className="mt-3 flex flex-wrap gap-1">{['All', 'Open', 'Under review', 'Resolved', 'Escalated'].map((item) => <button key={item} onClick={() => setTab(item)} aria-pressed={tab === item} className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${tab === item ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{item}</button>)}</div>{loading ? <p className="mt-4 text-xs text-slate-500">Loading cases...</p> : filtered.length === 0 ? <p className="mt-4 text-xs text-slate-500">No {tab.toLowerCase()} complaints.</p> : <div className="mt-3 space-y-2">{filtered.map((complaint) => <article key={complaint.id} className="rounded-md bg-slate-50 p-3"><div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold capitalize text-slate-900">{complaint.category.replace(/_/g, ' ')}</p><span className="rounded-full bg-white px-2 py-1 text-[10px] capitalize text-slate-600">{complaint.status.replace(/_/g, ' ')}</span></div><p className="mt-1 line-clamp-3 text-xs text-slate-600">{complaint.details}</p><p className="mt-2 text-[10px] text-slate-500">{formatDate(complaint.created_at)}</p></article>)}</div>}</section>
    </div>
  </PageFrame>;
}

export function SafetyCenterPage() {
  const { setCurrentPage } = useApp();
  return <PageFrame title="Safety center" eyebrow="Your home and your people">
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="rounded-md border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Before, during, and after a visit</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{[
        ['Meet through HomiCare', 'Keep booking details and important messages in the app.'],
        ['Check the provider evidence', 'Review identity, service skills, credentials, and customer feedback separately.'],
        ['Protect your home details', 'Share the minimum location information needed to arrange a visit.'],
        ['Pause if something feels wrong', 'Contact local emergency services first if anyone is in immediate danger.'],
      ].map(([title, body]) => <article key={title} className="rounded-md bg-slate-50 p-4"><h3 className="text-sm font-semibold text-slate-900">{title}</h3><p className="mt-1 text-xs leading-relaxed text-slate-600">{body}</p></article>)}</div><p className="mt-4 text-xs text-slate-500">HomiCare badges describe specific checks and do not guarantee conduct, workmanship, licensing, or safety.</p></section>
      <aside className="space-y-2">{[
        { label: 'Find verified providers', icon: BadgeCheck, page: 'search' as Page },
        { label: 'View verification details', icon: ShieldCheck, page: 'verification-details' as Page },
        { label: 'Report a provider', icon: ShieldAlert, page: 'complaints' as Page },
        { label: 'Emergency help', icon: AlertCircle, page: 'emergency' as Page },
        { label: 'Account security', icon: Shield, page: 'privacy-settings' as Page },
        { label: 'Contact support', icon: CircleHelp, page: 'help' as Page },
      ].map((item) => <button key={item.label} onClick={() => setCurrentPage(item.page)} className="flex w-full items-center gap-3 rounded-md border border-slate-200 bg-white p-3 text-left text-sm font-semibold text-slate-800 hover:border-orange-300"><item.icon className="h-4 w-4 text-orange-700" />{item.label}<ChevronRight className="ml-auto h-4 w-4 text-slate-400" /></button>)}</aside>
    </div>
  </PageFrame>;
}

export function VerificationDetailsPage() {
  const { selectedProviderId, setCurrentPage } = useApp();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const load = async () => {
      let providerResult;
      if (selectedProviderId) {
        providerResult = await supabase.from('public_provider_profiles').select('*').eq('id', selectedProviderId).maybeSingle();
      } else {
        const { data: authResult } = await supabase.auth.getUser();
        providerResult = authResult.user
          ? await supabase.from('providers').select('*').eq('user_id', authResult.user.id).maybeSingle()
          : await supabase.from('public_provider_profiles').select('*').order('rating', { ascending: false }).limit(1).maybeSingle();
      }
      const { data, error: queryError } = providerResult;
      setProvider(data); if (queryError) setError(queryError.message); setLoading(false);
    };
    load();
  }, [selectedProviderId]);
  const checks = provider ? [
    ['Identity', provider.identity_verified, 'Identity review'],
    ['Phone', provider.phone_verified, 'Phone ownership'],
    ['Service skills', provider.skills_verified, 'Skills evidence'],
    ['License', provider.certification_verified, 'Credential records (license type and number are not stored here)'],
    ['Certifications', provider.certification_verified, 'Certification evidence'],
    ['Business', provider.business_verified, 'Business details'],
    ['Portfolio', provider.portfolio_verified, 'Project evidence'],
  ] as const : [];
  return <PageFrame title="Provider verification details" eyebrow="Trust & verification" backPage="safety">
    {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading verification details...</p> : !provider ? <Notice kind="error">{error || 'No provider profile is available to verify.'}</Notice> : <div className="mx-auto max-w-3xl rounded-md border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="grid h-12 w-12 place-items-center rounded-full bg-orange-100 text-lg font-bold text-orange-800">{provider.full_name.slice(0, 1)}</span><div className="min-w-0 flex-1"><h2 className="truncate font-semibold text-slate-950">{provider.full_name}</h2><p className="text-sm text-slate-500">{provider.professional_title} · {provider.location}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${provider.identity_verified ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{provider.identity_verified ? 'Identity verified' : 'Verification incomplete'}</span></div>
      <div className="mt-4 divide-y divide-slate-100">{checks.map(([label, verified, description]) => <div key={label} className="flex items-center gap-3 py-3"><span className={`grid h-8 w-8 place-items-center rounded-full ${verified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{verified ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{label}</p><p className="text-xs text-slate-500">{description}</p></div><span className={`text-xs font-semibold ${verified ? 'text-emerald-700' : 'text-slate-500'}`}>{verified ? 'Verified' : 'Not verified'}</span></div>)}</div>
      <div className="mt-4 rounded-md bg-slate-50 p-3 text-xs text-slate-600"><p><strong>Verification date:</strong> Not recorded in the current provider data.</p><p className="mt-1"><strong>HomiCare status:</strong> {provider.identity_verified && provider.skills_verified ? 'Identity and skills checks recorded; other checks are shown individually.' : 'One or more checks remain incomplete.'}</p></div>
      <button onClick={() => { setCurrentPage('provider'); }} className="mt-4 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">View provider profile</button>
    </div>}
  </PageFrame>;
}

interface PublicProfileRecord {
  public_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  city: string | null;
  district: string | null;
  country: string;
  phone: string | null;
}

export function PublicProfilePage() {
  const { selectedPublicProfileId, setCurrentPage } = useApp();
  const [profile, setProfile] = useState<PublicProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setProfile(null);
    if (!selectedPublicProfileId) {
      setError('This profile link is missing its public profile ID.');
      setLoading(false);
      return () => { active = false; };
    }
    const loadProfile = async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('public_profiles')
          .select('*')
          .eq('public_id', selectedPublicProfileId)
          .maybeSingle();
        if (!active) return;
        if (!queryError && data) {
          setProfile(data);
          setLoading(false);
          return;
        }
        if (queryError || !data) {
          const { data: authData } = await supabase.auth.getUser();
          if (authData.user) {
            const { data: ownProfile } = await supabase
              .from('profiles')
              .select('public_id, display_name, avatar_url, bio, city, district, country, phone_private, show_phone, show_location')
              .eq('user_id', authData.user.id)
              .maybeSingle();
            if (active && ownProfile?.public_id === selectedPublicProfileId) {
              setProfile({
                public_id: ownProfile.public_id,
                display_name: ownProfile.display_name,
                avatar_url: ownProfile.avatar_url,
                bio: ownProfile.bio,
                city: ownProfile.show_location ? ownProfile.city : null,
                district: ownProfile.show_location ? ownProfile.district : null,
                country: ownProfile.country,
                phone: ownProfile.show_phone ? ownProfile.phone_private : null,
              });
              setLoading(false);
              return;
            }
          }
          setError(queryError
            ? 'Public profile could not be loaded. Check your connection and confirm the public-profiles migration is applied.'
            : 'This profile is private, limited to HomiCare users, or no longer available.');
        }
      } catch {
        if (active) setError('Public profile could not be loaded. Check your connection and try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadProfile();
    return () => { active = false; };
  }, [selectedPublicProfileId]);

  return <PageFrame title="HomiCare member profile" eyebrow="Public profile">
    {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading public profile...</p> : error ? <Notice kind="error">{error}</Notice> : !profile ? <div className="rounded-md border border-slate-200 bg-white p-6"><h2 className="font-semibold text-slate-900">Profile unavailable</h2><p className="mt-1 text-sm text-slate-600">This profile is private, limited to HomiCare users, or no longer available.</p><button onClick={() => setCurrentPage('home')} className="mt-4 rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white">Go to HomiCare</button></div> : <article className="mx-auto max-w-2xl rounded-md border border-slate-200 bg-white p-6 text-center"><div className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-orange-100 text-3xl font-bold text-orange-800">{profile.avatar_url ? <ProfileMediaImage source={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile.display_name.slice(0, 1)}</div><h2 className="mt-4 text-xl font-bold text-slate-950">{profile.display_name}</h2><p className="mt-1 text-sm text-slate-500">HomiCare member</p>{(profile.city || profile.district) && <p className="mt-3 inline-flex items-center gap-1 text-sm text-slate-600"><MapPin className="h-4 w-4 text-orange-700" />{[profile.city, profile.district, profile.country].filter(Boolean).join(', ')}</p>}<p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{profile.bio || 'This member has not added a public introduction.'}</p>{profile.phone && <div className="mt-5 flex justify-center gap-2"><a href={`tel:${profile.phone}`} className="inline-flex rounded-md border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-800">Call</a><a href={`sms:${profile.phone}`} className="inline-flex rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">SMS</a></div>}<p className="mt-5 text-xs text-slate-500">Private address, household, booking, payment, and authentication information are not shown.</p></article>}
  </PageFrame>;
}

export function CallHistoryPage() {
  const [filter, setFilter] = useState('All');
  return <PageFrame title="Call history" eyebrow="Messages · Calls" backPage="communication-center">
    <div className="mb-4 flex flex-wrap gap-2">{['All', 'Incoming', 'Outgoing', 'Missed', 'Voice', 'Video'].map((item) => <button key={item} onClick={() => setFilter(item)} aria-pressed={filter === item} className={`rounded-full px-3 py-2 text-xs font-semibold ${filter === item ? 'bg-orange-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{item}</button>)}</div>
    <div className="rounded-md border border-slate-200 bg-white p-8 text-center"><Phone className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 font-semibold text-slate-900">No {filter === 'All' ? '' : `${filter.toLowerCase()} `}calls yet</h2><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Start an in-app voice or video call from a conversation. Call history is not stored yet.</p><button onClick={() => setFilter('All')} className="mt-4 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Show all calls</button></div>
  </PageFrame>;
}

export function SharedMediaPage() {
  const { selectedProviderId, setCurrentPage } = useApp();
  const [items, setItems] = useState<{ id: string; content: string; attachment_url: string | null; message_type: string; created_at: string }[]>([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!selectedProviderId) { setLoading(false); return; }
    supabase.from('messages').select('id, content, attachment_url, message_type, created_at').eq('provider_id', selectedProviderId).order('created_at', { ascending: false }).then(({ data }) => { setItems(data || []); setLoading(false); });
  }, [selectedProviderId]);
  const media = items.filter((item) => item.attachment_url || /location/i.test(item.message_type) || /invoice/i.test(item.content));
  const visible = media.filter((item) => filter === 'All' || (filter === 'Locations' ? /location/i.test(item.message_type) : filter === 'Invoices' ? /invoice/i.test(item.content) : item.attachment_url && (filter === 'Documents' ? /pdf|doc/i.test(item.attachment_url) : /image|video/i.test(item.message_type))));
  return <PageFrame title="Shared media" eyebrow="Messages" backPage="communication-center">
    <div className="mb-4 flex gap-2 overflow-x-auto">{['All', 'Photos & videos', 'Documents', 'Invoices', 'Locations'].map((item) => <button key={item} onClick={() => setFilter(item)} aria-pressed={filter === item} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${filter === item ? 'bg-orange-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{item}</button>)}</div>
    {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading shared items...</p> : !selectedProviderId ? <Notice>Open a provider conversation to see its shared items.</Notice> : visible.length === 0 ? <div className="rounded-md border border-slate-200 bg-white p-8 text-center"><Image className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-800">No shared {filter === 'All' ? 'items' : filter.toLowerCase()}</p><p className="mt-1 text-xs text-slate-500">Items appear here when secure attachments or shared-location records are available.</p></div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visible.map((item) => <article key={item.id} className="rounded-md border border-slate-200 bg-white p-4"><div className="flex items-start gap-2"><FileText className="h-4 w-4 text-orange-700" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{item.content || item.message_type}</p><p className="mt-1 text-xs text-slate-500">{formatDate(item.created_at)}</p></div></div>{item.attachment_url && <a href={item.attachment_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-orange-800">Open shared item</a>}</article>)}</div>}
    <button onClick={() => setCurrentPage('messages')} className="mt-4 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Back to messages</button>
  </PageFrame>;
}

export function ContactDetailsPage() {
  const { selectedProviderId, setSelectedProviderId, setCurrentPage, setActiveBookingCode } = useApp();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!selectedProviderId) { setLoading(false); return; }
    Promise.all([
      supabase.from('public_provider_profiles').select('*').eq('id', selectedProviderId).maybeSingle(),
      supabase.from('bookings').select('*').eq('provider_id', selectedProviderId).order('created_at', { ascending: false }).limit(20),
    ]).then(([providerResult, bookingResult]) => { setProvider(providerResult.data); setBookings(bookingResult.data || []); setLoading(false); });
  }, [selectedProviderId]);
  const openProfile = () => { if (provider) { setSelectedProviderId(provider.id); setCurrentPage('provider'); } };
  return <PageFrame title="Provider details" eyebrow="Conversation contact" backPage="communication-center">
    {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading provider details...</p> : !provider ? <div className="rounded-md border border-slate-200 bg-white p-5"><Notice>Choose a provider from a conversation first.</Notice><button onClick={() => setCurrentPage('messages')} className="mt-3 text-sm font-semibold text-orange-800">Open messages</button></div> : <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="rounded-md border border-slate-200 bg-white p-5"><div className="flex items-center gap-3"><span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-orange-100 text-xl font-bold text-orange-800">{provider.avatar_url ? <ProfileMediaImage source={provider.avatar_url} alt="" className="h-full w-full object-cover" /> : provider.full_name.slice(0, 1)}</span><div className="min-w-0"><h2 className="truncate text-lg font-bold text-slate-950">{provider.full_name}</h2><p className="text-sm text-slate-500">{provider.professional_title}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-600"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />{provider.rating.toFixed(1)} · {provider.review_count} reviews · {provider.location}</p></div></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{[
        { label: 'Profile', icon: UserRound, action: openProfile },
        { label: 'Services', icon: ClipboardList, action: openProfile },
        { label: 'Reviews', icon: Star, action: openProfile },
        { label: 'Portfolio', icon: Image, action: openProfile },
        { label: 'Verification details', icon: BadgeCheck, action: () => setCurrentPage('verification-details') },
        { label: 'Booking history', icon: CalendarDays, action: () => setCurrentPage('my-bookings') },
        { label: 'Message', icon: MessageCircle, action: () => setCurrentPage('messages') },
        { label: 'Call', icon: Phone, action: () => {
            const number = (provider.public_phone || '').replace(/\s+/g, '').replace(/[^+\d]/g, '');
            if (!number) { window.alert('This provider has not shared a phone number yet.'); return; }
            window.location.href = `tel:${number}`;
          } },
        { label: 'Report provider', icon: ShieldAlert, action: () => setCurrentPage('complaints') },
      ].map((item) => <button key={item.label} onClick={item.action} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:border-orange-300"><item.icon className="h-4 w-4 text-orange-700" />{item.label}</button>)}</div><button onClick={openProfile} className="mt-4 rounded-md bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white">Open full profile</button></section>
      <aside className="rounded-md border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Booking history</h2>{bookings.length === 0 ? <p className="mt-2 text-xs text-slate-500">No booking history is available for this provider.</p> : <div className="mt-3 space-y-2">{bookings.slice(0, 5).map((booking) => <button key={booking.id} onClick={() => { setActiveBookingCode(booking.booking_code); setCurrentPage('tracking'); }} className="flex w-full items-start justify-between gap-2 rounded bg-slate-50 p-2.5 text-left"><span><span className="block text-xs font-semibold text-slate-800">{booking.service_name}</span><span className="mt-1 block text-[10px] text-slate-500">{booking.booking_code} · {formatDate(booking.created_at)}</span></span><span className="text-[10px] text-slate-600">{getBookingStatusLabel(booking.status)}</span></button>)}</div>}</aside>
    </div>}
  </PageFrame>;
}

interface LocalInvite { contact: string; status: string; createdAt: string }
const readInvites = (): LocalInvite[] => {
  try { return JSON.parse(localStorage.getItem('homicare-referral-invites') || '[]') as LocalInvite[]; } catch { return []; }
};

export function ReferralCenterPage() {
  const [code] = useState(() => {
    const existing = localStorage.getItem('homicare-referral-code');
    if (existing) return existing;
    const generated = `HOME-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    localStorage.setItem('homicare-referral-code', generated);
    return generated;
  });
  const [invites, setInvites] = useState<LocalInvite[]>(readInvites);
  const [contact, setContact] = useState('');
  const [notice, setNotice] = useState('');
  const referralLink = `${window.location.origin}/?ref=${code}`;
  const addInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = [{ contact: contact.trim(), status: 'Pending · local reminder only', createdAt: new Date().toISOString() }, ...invites];
    setInvites(next); localStorage.setItem('homicare-referral-invites', JSON.stringify(next)); setContact('');
    setNotice('Invite reminder saved on this device; no message was sent.');
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(referralLink); setNotice('Referral link copied. Reward tracking is not connected.'); }
    catch { setNotice(`Copy this link: ${referralLink}`); }
  };
  return <PageFrame title="Refer a friend" eyebrow="Referrals">
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="rounded-md border border-slate-200 bg-white p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-md bg-orange-100 text-orange-700"><HeartHandshake className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-900">Share trusted household help</h2><p className="text-xs text-slate-500">Your referral link is ready to share.</p></div></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input readOnly value={referralLink} aria-label="Referral link" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2.5 text-sm" /><button onClick={copyLink} className="rounded-md bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white">Copy link</button></div><p className="mt-2 text-xs text-slate-500">Referral attribution and bonuses are not connected to a rewards ledger yet.</p><form onSubmit={addInvite} className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row"><label className="min-w-0 flex-1 text-xs font-semibold text-slate-600">Invite contact<input required value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Email address or phone" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-normal" /></label><button className="self-end rounded-md border border-orange-300 px-4 py-2.5 text-sm font-semibold text-orange-800">Save invite</button></form>{notice && <div className="mt-3"><Notice>{notice}</Notice></div>}</section>
      <aside className="space-y-3"><div className="rounded-md border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Referral summary</h2><div className="mt-3 grid grid-cols-2 gap-2 text-center">{[{ label: 'Pending', value: invites.length }, { label: 'Successful', value: 0 }, { label: 'Rewards earned', value: '0' }, { label: 'Referral code', value: code }].map((item) => <div key={item.label} className="rounded bg-slate-50 p-3"><p className="font-bold text-slate-900">{item.value}</p><p className="mt-1 text-[10px] text-slate-500">{item.label}</p></div>)}</div></div><div className="rounded-md border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Invite activity</h2>{invites.length === 0 ? <p className="mt-2 text-xs text-slate-500">No invites saved.</p> : <div className="mt-2 space-y-2">{invites.map((invite, index) => <p key={`${invite.contact}-${index}`} className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-slate-700">{invite.contact}</span><span className="shrink-0 text-slate-500">Pending</span></p>)}</div>}</div></aside>
    </div>
  </PageFrame>;
}

export function RewardsCenterPage() {
  return <PageFrame title="Rewards & loyalty" eyebrow="Growth">
    <div className="grid gap-4 sm:grid-cols-3"><section className="rounded-md border border-slate-200 bg-white p-5 sm:col-span-2"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase text-orange-700">Current balance</p><p className="mt-1 text-3xl font-bold text-slate-950">0 points</p></div><Gift className="h-8 w-8 text-orange-600" /></div><div className="mt-5"><div className="flex justify-between text-xs text-slate-500"><span>Starter level</span><span>250 pts to Neighbor</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-0 bg-orange-500" /></div></div><p className="mt-4 text-xs text-slate-500">Points, redemption, and reward bonuses need a connected loyalty ledger. No rewards are currently earned or redeemable.</p></section><section className="rounded-md border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Badges</h2><p className="mt-2 text-xs text-slate-500">Complete verified actions to earn badges when the loyalty program is active.</p><div className="mt-4 flex gap-2">{[Star, ShieldCheck, HeartHandshake].map((Icon, index) => <span key={index} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400"><Icon className="h-4 w-4" /></span>)}</div></section></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2"><section className="rounded-md border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Ways to earn</h2><ul className="mt-3 space-y-2 text-sm text-slate-700">{['Complete a service booking', 'Leave a verified service review', 'Refer a friend who books', 'Keep your home maintenance plan up to date'].map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-600" />{item}</li>)}</ul></section><section className="rounded-md border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Redemption history</h2><p className="mt-2 text-sm text-slate-500">No reward redemptions are available.</p></section></div>
  </PageFrame>;
}

export function HouseholdPlannerPage() {
  const { setCurrentPage, setSearchQuery } = useApp();
  const [reminders, setReminders] = useState<{ id: string; asset_name: string; service_category: string; next_due_date: string | null; status: string }[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      supabase.from('maintenance_reminders').select('id, asset_name, service_category, next_due_date, status').order('next_due_date', { ascending: true }).limit(25),
      supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(20),
    ]).then(([reminderResult, bookingResult]) => { setReminders(reminderResult.data || []); setBookings(bookingResult.data || []); setLoading(false); });
  }, []);
  const searchCategory = (category: string) => { setSearchQuery(category); setCurrentPage('search'); };
  const suggestions = useMemo(() => reminders.filter((reminder) => ['overdue', 'due', 'upcoming'].includes(reminder.status.toLowerCase())), [reminders]);
  return <PageFrame title="Household planner" eyebrow="Home care · Recommendations">
    <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-4"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 text-orange-700" /><div><h2 className="font-semibold text-slate-900">Household maintenance overview</h2><p className="mt-1 text-sm text-slate-700">Recommendations are based on recorded reminders and bookings. Automated AI planning is not connected.</p></div></div></div>
    <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-md border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Upcoming maintenance</h2>{loading ? <p className="mt-3 text-xs text-slate-500">Loading household schedule...</p> : suggestions.length === 0 ? <p className="mt-3 text-sm text-slate-500">No due reminders found. Add a home and maintenance reminders in Household Management.</p> : <div className="mt-3 divide-y divide-slate-100">{suggestions.map((reminder) => <div key={reminder.id} className="flex items-center gap-3 py-3"><CalendarDays className="h-4 w-4 text-orange-700" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{reminder.asset_name}</p><p className="text-xs text-slate-500">{reminder.service_category} · Due {formatDate(reminder.next_due_date)}</p></div><button onClick={() => searchCategory(reminder.service_category)} className="text-xs font-semibold text-orange-800">Find service</button></div>)}</div>}</section><section className="rounded-md border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Service history</h2>{bookings.length === 0 ? <p className="mt-3 text-sm text-slate-500">No services recorded yet.</p> : <div className="mt-3 space-y-2">{bookings.slice(0, 6).map((booking) => <div key={booking.id} className="flex items-center justify-between gap-3 rounded bg-slate-50 p-3"><div><p className="text-sm font-semibold text-slate-900">{booking.service_name}</p><p className="text-xs text-slate-500">{formatDate(booking.created_at)}</p></div><span className="text-xs text-slate-600">{getBookingStatusLabel(booking.status)}</span></div>)}</div>}<button onClick={() => setCurrentPage('calendar')} className="mt-3 text-xs font-semibold text-orange-800">Open service calendar</button></section></div>
    <section className="mt-4 rounded-md border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-2"><div><h2 className="font-semibold text-slate-900">Recurring care</h2><p className="mt-1 text-xs text-slate-500">Set up repeat services after a provider confirms scope, schedule, and payment terms.</p></div><button onClick={() => setCurrentPage('subscriptions')} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold">Manage plans</button></div></section>
  </PageFrame>;
}

const bundles = [
  { id: 'move-in', title: 'Moving into a new home', description: 'Prepare the essential systems before unpacking.', tasks: ['Cleaning', 'Plumbing inspection', 'Electrical inspection', 'Pest control'] },
  { id: 'seasonal', title: 'Rainy season readiness', description: 'Check the areas most affected by heavy rain.', tasks: ['Roof inspection', 'Gutter cleaning', 'Electrical safety check', 'Plumbing check'] },
  { id: 'annual', title: 'Annual home refresh', description: 'Plan routine care across common household systems.', tasks: ['Deep cleaning', 'Appliance maintenance', 'Water tank service', 'Garden care'] },
];

export function ServiceBundlesPage() {
  const { setCurrentPage, setSearchQuery } = useApp();
  const [selectedBundle, setSelectedBundle] = useState(bundles[0].id);
  const [completed, setCompleted] = useState<string[]>([]);
  const bundle = bundles.find((item) => item.id === selectedBundle) || bundles[0];
  const findTask = (task: string) => { setSearchQuery(task); setCurrentPage('search'); };
  return <PageFrame title="Home service bundles" eyebrow="Recommendations">
    <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-4"><div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 text-orange-700" /><p className="text-sm text-amber-950">Starter bundles are curated checklists, not AI-generated quotes. Each service is booked separately and requires provider confirmation.</p></div></div>
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]"><nav className="space-y-2">{bundles.map((item) => <button key={item.id} onClick={() => { setSelectedBundle(item.id); setCompleted([]); }} aria-pressed={selectedBundle === item.id} className={`w-full rounded-md border p-3 text-left ${selectedBundle === item.id ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white'}`}><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.tasks.length} services</p></button>)}</nav><section className="rounded-md border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">{bundle.title}</h2><p className="mt-1 text-sm text-slate-600">{bundle.description}</p><ol className="mt-4 divide-y divide-slate-100">{bundle.tasks.map((task, index) => <li key={task} className="flex items-center gap-3 py-3"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${completed.includes(task) ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>{completed.includes(task) ? <CheckCircle2 className="h-4 w-4" /> : index + 1}</span><span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{task}</span><button onClick={() => findTask(task)} className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white">Find provider</button><button onClick={() => setCompleted((items) => items.includes(task) ? items.filter((item) => item !== task) : [...items, task])} className="rounded-md border border-slate-300 px-2.5 py-2 text-xs font-semibold text-slate-700">{completed.includes(task) ? 'Undo' : 'Mark planned'}</button></li>)}</ol></section></div>
  </PageFrame>;
}