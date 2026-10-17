import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle, ArrowLeft, CalendarDays, CalendarOff, Check, CheckCircle2,
  ChevronLeft, ChevronRight, Clock3, CreditCard, FileText, Landmark, MapPin, MessageSquare,
  ShieldCheck, Smartphone, Star, Trash2, Wrench,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import type { Booking, BookingQuote, Page, Provider, ProviderAvailability, ProviderTimeOff } from '@/types';
import { formatDate, formatUGXFull, getBookingStatusColor, getBookingStatusLabel, normalizeUgandaMobileNumber } from '@/lib/utils';

function useActiveBooking() {
  const { activeBookingCode } = useApp();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(Boolean(activeBookingCode));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!activeBookingCode) {
      setBooking(null);
      setError('');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    let active = true;
    let requestPending = false;
    const loadBooking = async (showRefreshing: boolean) => {
      if (requestPending) return;
      requestPending = true;
      if (showRefreshing) setRefreshing(true);
      try {
        const { data, error: queryError } = await supabase
          .from('bookings')
          .select('*')
          .eq('booking_code', activeBookingCode)
          .maybeSingle();
        if (!active) return;
        if (queryError) setError(`Booking status could not be refreshed: ${queryError.message}`);
        else {
          setBooking(data);
          setError(data ? '' : 'This booking could not be found.');
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Booking status could not be refreshed.');
      } finally {
        requestPending = false;
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    void loadBooking(reloadCount > 0);
    const interval = window.setInterval(() => void loadBooking(false), 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [activeBookingCode, reloadCount]);

  return { booking, loading, error, refreshing, refreshBooking: () => setReloadCount((count) => count + 1) };
}

function BookingPageFrame({ title, children, backPage = 'my-bookings', backLabel = 'Back to bookings', tone = 'violet' }: { title: string; children: React.ReactNode; backPage?: Page; backLabel?: string; tone?: 'violet' | 'orange' }) {
  const { setCurrentPage } = useApp();
  const orange = tone === 'orange';
  return (
    <div className={orange ? 'min-h-[calc(100dvh-4rem)] bg-[#fffaf4]' : ''}>
    <section aria-label={title} className="mx-auto min-h-[calc(100dvh-4rem)] max-w-2xl px-4 py-6 sm:px-6">
      <button onClick={() => setCurrentPage(backPage)} className={`mb-5 inline-flex items-center gap-2 text-sm font-semibold ${orange ? 'text-orange-800 hover:text-orange-950' : 'text-violet-800 hover:text-violet-950'}`}><ArrowLeft className="h-4 w-4" />{backLabel}</button>
      <h1 className={`mb-5 text-2xl font-bold ${orange ? 'text-orange-950' : 'text-slate-950'}`}>{title}</h1>
      {children}
    </section>
    </div>
  );
}

function MissingBooking() {
  const { setCurrentPage } = useApp();
  return (
    <div className="rounded-xl border border-violet-100 bg-white p-6 text-center shadow-sm">
      <CalendarDays className="mx-auto h-8 w-8 text-violet-700" />
      <h2 className="mt-3 font-semibold text-slate-900">No booking selected</h2>
      <p className="mt-1 text-sm text-slate-500">Choose a booking from your bookings list to continue.</p>
      <button onClick={() => setCurrentPage('my-bookings')} className="mt-4 rounded-lg bg-violet-800 px-4 py-2.5 text-sm font-semibold text-white">View bookings</button>
    </div>
  );
}

export function TrackingPage() {
  const { booking, loading, error, refreshing, refreshBooking } = useActiveBooking();
  const { setCurrentPage, setSelectedProviderId, setActiveBookingCode } = useApp();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerError, setProviderError] = useState('');
  const [mapStatus, setMapStatus] = useState('');
  const steps = [
    { key: 'requested', label: 'Request sent' },
    { key: 'viewed', label: 'Provider viewed' },
    { key: 'accepted', label: 'Provider accepted' },
    { key: 'confirmed', label: 'Booking confirmed' },
    { key: 'on_the_way', label: 'Provider on the way' },
    { key: 'arrived', label: 'Provider arrived' },
    { key: 'in_progress', label: 'Service in progress' },
    { key: 'completed', label: 'Service completed' },
  ];
  const statusIndex: Record<string, number> = {
    requested: 0,
    viewed: 1,
    accepted: 2,
    payment_pending: 2,
    confirmed: 3,
    provider_en_route: 4,
    on_the_way: 4,
    arrived: 5,
    service_started: 6,
    in_progress: 6,
    completed: 7,
  };
  const normalizedStatus = booking?.status.toLowerCase().replace(/[\s-]+/g, '_') || '';
  const currentIndex = statusIndex[normalizedStatus] ?? 0;
  const isCancelled = ['cancelled', 'declined', 'rejected'].includes(normalizedStatus);

  useEffect(() => {
    if (!booking?.provider_id) { setProvider(null); setProviderError(''); return; }
    let active = true;
    setProviderError('');
    supabase.from('public_provider_profiles').select('*').eq('id', booking.provider_id).maybeSingle().then(({ data, error: queryError }) => {
      if (!active) return;
      setProvider(data);
      if (queryError) setProviderError('Provider details could not be loaded; booking status is still available.');
      else if (!data) setProviderError('Provider profile is unavailable or no longer published.');
    }, () => { if (active) setProviderError('Provider details could not be loaded; booking status is still available.'); });
    return () => { active = false; };
  }, [booking?.provider_id]);

  const openLiveMap = () => {
    if (!booking) return;

    const destinationQuery = encodeURIComponent(booking.location || provider?.location || 'HomiCare service location');
    const destinationUrl = `https://www.google.com/maps/search/?api=1&query=${destinationQuery}`;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      window.open(destinationUrl, '_blank', 'noopener,noreferrer');
      setMapStatus('Opened Google Maps to the service location.');
      return;
    }

    setMapStatus('Finding your live location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = `${position.coords.latitude},${position.coords.longitude}`;
        const routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${destinationQuery}&travelmode=driving`;
        window.open(routeUrl, '_blank', 'noopener,noreferrer');
        setMapStatus('Opened Google Maps with live route directions.');
      },
      () => {
        window.open(destinationUrl, '_blank', 'noopener,noreferrer');
        setMapStatus('Opened Google Maps to the service location because live location access was not granted.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <BookingPageFrame title="Track service">
      {loading ? <p className="text-sm text-slate-500">Loading booking...</p> : !booking ? <MissingBooking /> : (
        <div className="space-y-4">
          <section className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase text-violet-800">{booking.booking_code}</p><h2 className="mt-1 font-semibold text-slate-950">{booking.service_name}</h2><p className="mt-1 text-sm text-slate-500">{booking.provider_notes || 'Your provider will update this request here.'}</p></div>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">{getBookingStatusLabel(booking.status)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Status refreshes automatically every 15 seconds.</p>
              <button type="button" onClick={refreshBooking} disabled={refreshing} className="shrink-0 rounded-md border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-900 disabled:cursor-wait disabled:opacity-60">{refreshing ? 'Refreshing...' : 'Refresh status'}</button>
            </div>
            {isCancelled && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">This request is {getBookingStatusLabel(booking.status).toLowerCase()}. Contact HomiCare support or choose another provider.</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4"><h3 className="flex items-center gap-2 text-xs font-bold uppercase text-slate-700"><MapPin className="h-4 w-4 text-orange-700" />Locations</h3><p className="mt-3 text-xs text-slate-500">Provider service area</p><p className="text-sm font-semibold text-slate-900">{provider?.location || (providerError ? 'Provider area unavailable' : 'Loading provider area...')}</p>{providerError && <p role="status" className="mt-1 text-xs text-amber-800">{providerError}</p>}<p className="mt-2 text-xs text-slate-500">Service address</p><p className="text-sm font-semibold text-slate-900">{booking.location}</p></section>
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4"><h3 className="flex items-center gap-2 text-xs font-bold uppercase text-slate-700"><Clock3 className="h-4 w-4 text-orange-700" />Arrival update</h3><p className="mt-3 text-sm font-semibold text-slate-900">{booking.scheduled_date ? `${formatDate(booking.scheduled_date)} · ${booking.scheduled_time || 'Time pending'}` : 'Schedule pending'}</p><p className="mt-1 text-xs text-slate-600">{['provider_en_route', 'on_the_way'].includes(normalizedStatus) ? 'Live ETA has not been shared by the provider yet.' : 'A live arrival ETA will appear when the provider shares location updates.'}</p><p className="mt-2 text-xs text-slate-500">{provider?.response_time_min ? `Typical response time: ${provider.response_time_min} minutes` : 'Response time unavailable'}</p></section>
            </div>
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Google Maps tracking</p>
                  <p className="mt-1 text-sm text-emerald-900">Open the live route for this service.</p>
                </div>
                <button onClick={openLiveMap} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">Open live map</button>
              </div>
              {mapStatus && <p className="mt-2 text-xs text-emerald-700">{mapStatus}</p>}
            </div>
            <div className="mt-5 space-y-0">
              {steps.map((step, index) => {
                const done = !isCancelled && (index < currentIndex || (normalizedStatus === 'completed' && step.key === 'completed') || (index === 0 && currentIndex === 0));
                return <div key={step.key} className="flex gap-3"><div className="flex w-6 flex-col items-center"><span className={`grid h-6 w-6 place-items-center rounded-full ${done ? 'bg-emerald-600 text-white' : index === currentIndex ? 'bg-violet-800 text-white' : 'bg-slate-100 text-slate-400'}`}>{done ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span>{index < steps.length - 1 && <span className={`my-1 min-h-6 w-px ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />}</div><div className="pb-5"><p className={`text-sm font-medium ${done || index === currentIndex ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>{index === 0 && <p className="mt-0.5 text-xs text-slate-500">{formatDate(booking.created_at)}</p>}</div></div>;
              })}
            </div>
            {error && <p role="alert" className="text-xs text-amber-700">{error}</p>}
          </section>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setSelectedProviderId(booking.provider_id); setActiveBookingCode(booking.booking_code); setCurrentPage('booking-communication'); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-3 text-sm font-semibold text-violet-900"><MessageSquare className="h-4 w-4" />Contact provider</button>
            <button onClick={() => setCurrentPage('payment')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-800 px-3 py-3 text-sm font-semibold text-white"><CreditCard className="h-4 w-4" />Payment details</button>
          </div>
          <button onClick={() => setCurrentPage('invoice')} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-3 text-sm font-semibold text-violet-900"><FileText className="h-4 w-4" />View invoice</button>
          {booking.status === 'completed' && <button onClick={() => setCurrentPage('review')} className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">Rate this service</button>}
        </div>
      )}
    </BookingPageFrame>
  );
}

export function PaymentPage() {
  const { booking, loading } = useActiveBooking();
  const { activeBookingCode, setCurrentPage } = useApp();
  const [method, setMethod] = useState<'mtn_mobile_money' | 'airtel_money' | 'visa'>('mtn_mobile_money');
  const [mobileNumber, setMobileNumber] = useState('');
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'successful' | 'failed' | 'cancelled' | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [txRef, setTxRef] = useState('');

  useEffect(() => {
    if (booking?.customer_phone) setMobileNumber(booking.customer_phone);
  }, [booking?.customer_phone]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackTxRef = params.get('tx_ref') || '';
    const callbackTransactionId = params.get('transaction_id') || '';
    const callbackStatus = params.get('status')?.toLowerCase();
    if (callbackTxRef) setTxRef(callbackTxRef);
    if (callbackTransactionId) setTransactionId(callbackTransactionId);
    if (callbackStatus === 'cancelled' || callbackStatus === 'canceled') setPaymentStatus('cancelled');
    else if (callbackStatus === 'failed') setPaymentStatus('failed');
  }, []);

  const verifyPayment = async () => {
    if (!activeBookingCode || !txRef || !transactionId) {
      setPaymentError('Return to checkout and complete the provider approval first.');
      return;
    }
    setCheckingPayment(true);
    setPaymentError('');
    const { data, error: invokeError } = await supabase.functions.invoke('flutterwave-verify', {
      body: { booking_code: activeBookingCode, tx_ref: txRef, transaction_id: transactionId },
    });
    setCheckingPayment(false);
    if (invokeError) {
      setPaymentError('We could not confirm the payment yet. Wait a moment and check again.');
      return;
    }
    if (data?.status === 'successful') setPaymentStatus('successful');
    else if (data?.status === 'failed') setPaymentStatus('failed');
    else if (data?.status === 'cancelled') setPaymentStatus('cancelled');
    else setPaymentStatus('pending');
  };

  useEffect(() => {
    if (txRef && transactionId && !paymentStatus && !loading) void verifyPayment();
  }, [txRef, transactionId, paymentStatus, loading]);

  const startCheckout = async () => {
    if (!booking || !activeBookingCode) return;
    if (!booking.final_price || booking.final_price <= 0) {
      setPaymentError('Payment becomes available when your provider confirms the final price.');
      return;
    }
    const normalizedPhone = method === 'visa' ? null : normalizeUgandaMobileNumber(mobileNumber);
    if (method !== 'visa' && !normalizedPhone) {
      setPaymentError('Enter a valid Uganda mobile-money number, such as +256 7XX XXX XXX.');
      return;
    }
    setStartingCheckout(true);
    setPaymentError('');
    const { data, error: invokeError } = await supabase.functions.invoke('flutterwave-initialize', {
      body: { booking_code: booking.booking_code, payment_method: method, phone_number: normalizedPhone },
    });
    setStartingCheckout(false);
    if (invokeError || typeof data?.checkout_url !== 'string') {
      setPaymentError(invokeError?.message || data?.error || 'Secure checkout could not start. Try again.');
      return;
    }
    window.location.assign(data.checkout_url);
  };

  const paymentOptions = [
    { id: 'mtn_mobile_money' as const, title: 'MTN Mobile Money', subtitle: 'Approve the prompt on your MTN phone', mark: <img src="/payment-logos/mtn-mobile-money.svg" alt="MTN Mobile Money" className="h-10 w-28 rounded-md object-contain" /> },
    { id: 'airtel_money' as const, title: 'Airtel Money', subtitle: 'Approve the prompt on your Airtel phone', mark: <img src="/payment-logos/airtel-money.svg" alt="Airtel Money" className="h-10 w-28 rounded-md object-contain" /> },
    { id: 'visa' as const, title: 'Card payment', subtitle: 'Visa and Mastercard; bank verification may be requested', mark: <img src="/payment-logos/card-brands.svg" alt="Visa and Mastercard" className="h-10 w-32 rounded-md object-contain" /> },
  ];

  if (paymentStatus === 'successful' && booking) {
    return <BookingPageFrame title="Payment successful" tone="orange">
      <section className="rounded-xl border border-emerald-200 bg-white p-6 text-center shadow-sm"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><h2 className="mt-3 text-xl font-bold text-slate-950">Payment confirmed</h2><p className="mt-1 text-sm text-slate-600">Your payment for {booking.service_name} has been verified.</p><p className="mt-4 text-2xl font-bold text-emerald-700">{formatUGXFull(booking.final_price || 0)}</p><p className="mt-1 text-xs text-slate-500">Reference {booking.booking_code}</p><div className="mt-6 grid gap-2 sm:grid-cols-2"><button onClick={() => setCurrentPage('tracking')} className="rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white">View booking</button><button onClick={() => setCurrentPage('invoice')} className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800">View receipt</button></div></section>
    </BookingPageFrame>;
  }

  return (
    <BookingPageFrame title="Payment" tone="orange">
      {loading ? <p className="text-sm text-slate-500">Loading payment details...</p> : !booking ? <MissingBooking /> : (
        <div className="space-y-4">
          <section className="rounded-xl border border-orange-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">Payment summary</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{booking.service_name}</p>
            <p className="mt-1 text-xs text-slate-500">{booking.booking_code} · {booking.scheduled_date ? formatDate(booking.scheduled_date) : 'Date to be confirmed'}</p>
            <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4"><span className="text-sm text-slate-600">{booking.final_price ? 'Confirmed total' : 'Amount due'}</span><span className="text-2xl font-bold text-orange-700">{booking.final_price ? formatUGXFull(booking.final_price) : 'Awaiting quote'}</span></div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">Choose payment method</h2><span className="text-[10px] font-semibold text-slate-500">Powered by Flutterwave</span></div>
            <div className="mt-3 space-y-2">
              {paymentOptions.map((option) => <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${method === option.id ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-300'}`}>
                {option.mark}<span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{option.title}</span><span className="mt-0.5 block text-xs text-slate-500">{option.subtitle}</span></span><input type="radio" name="payment-method" value={option.id} checked={method === option.id} onChange={() => setMethod(option.id)} className="h-4 w-4 accent-orange-600" />
              </label>)}
              <div aria-disabled="true" className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 opacity-70"><img src="/payment-logos/google-pay.svg" alt="Google Pay" className="h-10 w-28 rounded-md object-contain" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-700">Google Pay</span><span className="mt-0.5 block text-xs text-slate-500">Not enabled for Uganda in the current gateway configuration</span></span><span className="text-[10px] font-semibold text-slate-500">Unavailable</span></div>
              <div aria-disabled="true" className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 opacity-70"><span className="grid h-10 w-10 place-items-center rounded-md bg-white text-slate-400"><Landmark className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-700">Bank transfer</span><span className="mt-0.5 block text-xs text-slate-500">Awaiting verified HomiCare account details</span></span><span className="text-[10px] font-semibold text-slate-500">Unavailable</span></div>
            </div>
            {method !== 'visa' && <label className="mt-4 block text-xs font-semibold text-slate-700">Mobile-money number to charge<input type="tel" inputMode="tel" autoComplete="tel" required value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} placeholder="+256 7XX XXX XXX" className="mt-1.5 w-full rounded-md border border-orange-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" /><span className="mt-1 block font-normal text-slate-500">Confirm the SIM registered to your selected network.</span></label>}
            {method === 'mtn_mobile_money' || method === 'airtel_money' ? <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><Smartphone className="mt-0.5 h-4 w-4 shrink-0" /><p>Continue to the secure mobile-money checkout. It will prompt your selected network for approval. Enter your PIN only in the operator’s prompt; HomiCare never asks for or stores it.</p></div> : <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><p>Card details and any bank verification happen in Flutterwave’s secure checkout. HomiCare does not collect or store card numbers or security codes.</p></div>}
          </section>
          {paymentStatus === 'pending' && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">Waiting for payment approval</p><p className="mt-1 text-xs leading-relaxed text-amber-800">Approve the prompt on your phone. We’ll confirm the booking only after Flutterwave verifies the transaction.</p><button onClick={() => void verifyPayment()} disabled={checkingPayment} className="mt-3 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 disabled:opacity-50">{checkingPayment ? 'Checking...' : 'Check payment status'}</button></div>}
          {(paymentStatus === 'failed' || paymentStatus === 'cancelled') && <div role="status" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">Payment {paymentStatus}. No booking payment was recorded. Choose a method and try again.</div>}
          {paymentError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{paymentError}</p>}
          <button onClick={() => void startCheckout()} disabled={startingCheckout || checkingPayment || !booking.final_price || paymentStatus === 'pending'} className="w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">{startingCheckout ? 'Opening secure checkout...' : `Continue to payment · ${booking.final_price ? formatUGXFull(booking.final_price) : 'Awaiting provider quote'}`}</button>
          <p className="text-center text-[11px] text-slate-500">Your booking is marked paid only after the gateway confirms the exact amount and currency.</p>
        </div>
      )}
    </BookingPageFrame>
  );
}

export function InvoicePage() {
  const { booking, loading } = useActiveBooking();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerError, setProviderError] = useState('');
  const paid = booking?.payment_status === 'paid' || booking?.payment_status === 'completed';

  useEffect(() => {
    if (!booking?.provider_id) {
      setProvider(null);
      setProviderError('');
      return;
    }
    let active = true;
    setProviderError('');
    supabase.from('public_provider_profiles').select('*').eq('id', booking.provider_id).maybeSingle()
      .then(({ data, error: queryError }) => {
        if (!active) return;
        setProvider(data);
        if (queryError) setProviderError('Provider details could not be loaded. The invoice is still available.');
        else if (!data) setProviderError('Provider profile is unavailable; the booking invoice details are still shown.');
      }, () => { if (active) setProviderError('Provider details could not be loaded. The invoice is still available.'); });
    return () => { active = false; };
  }, [booking?.provider_id]);

  return (
    <BookingPageFrame title="Invoice">
      {loading ? <p className="text-sm text-slate-500">Loading invoice...</p> : !booking ? <MissingBooking /> : (
        <article className="rounded-xl border border-violet-100 bg-white p-6 shadow-sm print:shadow-none">
          <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-violet-800">HomiCare</p><h2 className="mt-2 text-xl font-bold">Service invoice</h2></div><FileText className="h-7 w-7 text-violet-700" /></div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-100 py-4 text-sm"><div><p className="text-slate-500">Reference</p><p className="mt-1 font-medium">{booking.booking_code}</p></div><div><p className="text-slate-500">Date</p><p className="mt-1 font-medium">{formatDate(booking.created_at)}</p></div><div><p className="text-slate-500">Service</p><p className="mt-1 font-medium">{booking.service_name}</p></div><div><p className="text-slate-500">Provider</p><p className="mt-1 font-medium">{provider?.full_name || (providerError ? 'Provider unavailable' : 'Loading provider...')}</p></div></div>
          {providerError && <p role="status" className="mt-3 text-xs text-amber-800">{providerError}</p>}
          <div className="my-5 flex justify-between text-sm"><span>Provider-confirmed price</span><span className="font-semibold">{booking.final_price ? formatUGXFull(booking.final_price) : 'Not quoted yet'}</span></div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4"><span className="font-semibold">Payment status</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${paid ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{paid ? 'Paid' : 'Not paid'}</span></div>
          <button onClick={() => window.print()} className="mt-6 w-full rounded-lg border border-violet-200 py-3 text-sm font-semibold text-violet-900">Print / Save invoice</button>
        </article>
      )}
    </BookingPageFrame>
  );
}

export function ReviewPage() {
  const { booking, loading } = useActiveBooking();
  const { setCurrentPage } = useApp();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!booking || booking.status !== 'completed') return;
    const { error: insertError } = await supabase.from('reviews').insert({
      provider_id: booking.provider_id,
      booking_id: booking.id,
      customer_name: customerName.trim(),
      overall_rating: rating,
      rating_quality: rating,
      rating_professionalism: rating,
      rating_communication: rating,
      rating_timeliness: rating,
      rating_value: rating,
      rating_cleanliness: rating,
      comment: comment.trim() || null,
      would_hire_again: true,
    });
    if (insertError) setError(insertError.message);
    else setSubmitted(true);
  };

  return (
    <BookingPageFrame title="Rate your service">
      {loading ? <p className="text-sm text-slate-500">Loading service...</p> : !booking ? <MissingBooking /> : submitted ? <div className="rounded-xl border border-emerald-200 bg-white p-7 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" /><h2 className="mt-3 font-semibold">Thank you for your review</h2><button onClick={() => setCurrentPage('my-bookings')} className="mt-5 rounded-lg bg-violet-800 px-4 py-2.5 text-sm font-semibold text-white">Back to bookings</button></div> : (
        <form onSubmit={submitReview} className="space-y-4 rounded-xl border border-violet-100 bg-white p-5">
          {booking.status !== 'completed' && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Reviews are available after a service is marked complete.</div>}
          <div><p className="text-sm text-slate-600">{booking.service_name} · {booking.booking_code}</p><p className="mt-4 text-sm font-semibold">How was your experience?</p><div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating">{[1,2,3,4,5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} stars`} onClick={() => setRating(value)}><Star className={`h-8 w-8 ${value <= rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`} /></button>)}</div></div>
          <label className="block text-sm font-medium">Your name<input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
          <label className="block text-sm font-medium">Review<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="Share helpful feedback about the service." /></label>
          {error && <p role="alert" className="text-sm text-red-700">{error.includes('401') || error.includes('row-level security') ? 'Sign in to submit a review.' : error}</p>}
          <button disabled={booking.status !== 'completed'} className="w-full rounded-lg bg-violet-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Submit review</button>
        </form>
      )}
    </BookingPageFrame>
  );
}

export function CalendarPage() {
  const { setCurrentPage, setActiveBookingCode } = useApp();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    supabase.from('bookings').select('*').order('scheduled_date', { ascending: true }).limit(50)
      .then(({ data, error: queryError }) => {
        if (!active) return;
        setBookings(data || []);
        if (queryError) setError('Scheduled services could not be loaded. Sign in and check your Supabase connection or booking access.');
        setLoading(false);
      }, () => {
        if (!active) return;
        setBookings([]);
        setError('Scheduled services could not be loaded. Check your connection and try again.');
        setLoading(false);
      });
    return () => { active = false; };
  }, [retryCount]);
  return <BookingPageFrame title="Service calendar">{loading ? <p role="status" className="text-sm text-slate-500">Loading scheduled services...</p> : error ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}<button onClick={() => setRetryCount((count) => count + 1)} className="ml-3 font-semibold underline">Retry</button></div> : <div className="space-y-3">{bookings.length === 0 ? <div className="rounded-xl border border-violet-100 bg-white p-6 text-center text-sm text-slate-500">No scheduled services yet.</div> : bookings.map((booking) => <button key={booking.id} onClick={() => { setActiveBookingCode(booking.booking_code); setCurrentPage('tracking'); }} className="flex w-full items-start gap-3 rounded-xl border border-violet-100 bg-white p-4 text-left"><span className="grid h-10 w-10 place-items-center rounded-lg bg-violet-50 text-violet-800"><CalendarDays className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-slate-900">{booking.service_name}</span><span className="mt-1 block text-xs text-slate-500">{formatDate(booking.scheduled_date)} · {booking.scheduled_time || 'Time pending'}</span><span className="mt-1 block text-xs text-violet-800">{booking.booking_code} · {getBookingStatusLabel(booking.status)}</span></span><Clock3 className="h-4 w-4 text-slate-400" /></button>)}</div>}</BookingPageFrame>;
}

export function ProviderCalendarPage() {
  const { setCurrentPage, setActiveBookingCode } = useApp();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [availability, setAvailability] = useState<ProviderAvailability[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [timeOff, setTimeOff] = useState<ProviderTimeOff[]>([]);
  const [viewMonth, setViewMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [timeOffStart, setTimeOffStart] = useState(selectedDate);
  const [timeOffEnd, setTimeOffEnd] = useState(selectedDate);
  const [loading, setLoading] = useState(true);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [savingTimeOff, setSavingTimeOff] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    let active = true;
    const loadProvider = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !authData.user) {
        setRequiresLogin(true);
        setError('Sign in to view your provider calendar.');
        setLoading(false);
        return;
      }
      const { data, error: providerError } = await supabase.from('providers').select('*').eq('user_id', authData.user.id).maybeSingle();
      if (!active) return;
      if (providerError || !data) {
        setError('No provider profile is linked to this account. Create a provider profile to manage a calendar.');
        setLoading(false);
        return;
      }
      setProvider(data);
    };
    loadProvider();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!provider) return;
    let active = true;
    const monthStart = dateKey(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1));
    const monthEnd = dateKey(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0));
    const loadMonth = async () => {
      setLoading(true);
      const [bookingResult, availabilityResult, timeOffResult] = await Promise.all([
        supabase.from('bookings').select('*').eq('provider_id', provider.id).gte('scheduled_date', monthStart).lte('scheduled_date', monthEnd).order('scheduled_date', { ascending: true }),
        supabase.from('provider_availability').select('*').eq('provider_id', provider.id),
        supabase.from('provider_time_off').select('*').eq('provider_id', provider.id).lte('starts_on', monthEnd).gte('ends_on', monthStart),
      ]);
      if (!active) return;
      setBookings(bookingResult.data || []);
      setAvailability(availabilityResult.data || []);
      setTimeOff(timeOffResult.data || []);
      const failed = [bookingResult.error, availabilityResult.error, timeOffResult.error].filter(Boolean);
      if (failed.length) setError('Calendar data could not be fully loaded. Apply the latest provider calendar migration and try again.');
      else setError('');
      setLoading(false);
    };
    loadMonth();
    return () => { active = false; };
  }, [provider, viewMonth]);

  const selectedDateBookings = bookings.filter((booking) => booking.scheduled_date === selectedDate);
  const selectedDayOfWeek = new Date(`${selectedDate}T12:00:00`).getDay();
  const selectedHours = availability.find((day) => day.day_of_week === selectedDayOfWeek);
  const selectedDateIsBlocked = timeOff.some((block) => block.starts_on <= selectedDate && block.ends_on >= selectedDate);
  const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const calendarDays = Array.from({ length: 42 }, (_, index) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), index - monthStart.getDay() + 1));
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const addTimeOff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!provider || timeOffEnd < timeOffStart) {
      setError('Choose a valid time-off date range.');
      return;
    }
    setSavingTimeOff(true);
    setError('');
    setNotice('');
    const { data, error: insertError } = await supabase.from('provider_time_off').insert({ provider_id: provider.id, starts_on: timeOffStart, ends_on: timeOffEnd }).select('*').single();
    setSavingTimeOff(false);
    if (insertError) {
      setError(insertError.message.includes('overlaps an existing') ? insertError.message : 'Could not block these dates. Apply the provider calendar migration and confirm no bookings conflict.');
      return;
    }
    setTimeOff((current) => [...current, data]);
    setNotice('Time off added. Customers can no longer request these dates.');
  };

  const removeTimeOff = async (block: ProviderTimeOff) => {
    const { error: deleteError } = await supabase.from('provider_time_off').delete().eq('id', block.id);
    if (deleteError) {
      setError('Could not remove this time-off block.');
      return;
    }
    setTimeOff((current) => current.filter((item) => item.id !== block.id));
    setNotice('Time-off block removed.');
  };

  if (loading && !provider) return <BookingPageFrame title="Provider calendar" backPage="provider-dashboard" backLabel="Back to provider dashboard"><p className="text-sm text-slate-500">Loading provider calendar...</p></BookingPageFrame>;
  if (error && !provider) return <BookingPageFrame title="Provider calendar" backPage="provider-dashboard" backLabel="Back to provider dashboard"><div role="alert" className="rounded-lg border border-orange-200 bg-white p-5 text-sm text-slate-700">{error}<button onClick={() => setCurrentPage(requiresLogin ? 'login' : 'provider-onboarding')} className="mt-4 block rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white">{requiresLogin ? 'Log in' : 'Set up provider profile'}</button></div></BookingPageFrame>;

  return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-orange-700">Provider workspace</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Calendar & Availability</h1><p className="mt-1 text-sm text-slate-500">{provider?.full_name} · Bookings, weekly hours, and time off</p></div><button onClick={() => setCurrentPage('provider-dashboard')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Provider dashboard</button></div>
    {error && <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="Monthly provider calendar">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-900">{viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2><div className="flex gap-1"><button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} aria-label="Previous month" className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button><button onClick={() => { const today = new Date(); setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(dateKey(today)); }} className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Today</button><button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} aria-label="Next month" className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button></div></div>
        <div className="grid grid-cols-7 border-b border-slate-100 pb-2 text-center text-[10px] font-semibold uppercase text-slate-400">{dayNames.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="grid grid-cols-7">{calendarDays.map((day) => {
          const key = dateKey(day);
          const inMonth = day.getMonth() === viewMonth.getMonth();
          const eventCount = bookings.filter((booking) => booking.scheduled_date === key).length;
          const blocked = timeOff.some((block) => block.starts_on <= key && block.ends_on >= key);
          return <button key={key} onClick={() => { setSelectedDate(key); setTimeOffStart(key); setTimeOffEnd(key); }} aria-label={`${day.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}${eventCount ? `, ${eventCount} bookings` : ''}${blocked ? ', unavailable' : ''}`} aria-pressed={selectedDate === key} className={`relative flex min-h-12 flex-col items-center justify-center border-b border-slate-100 text-sm ${!inMonth ? 'text-slate-300' : 'text-slate-700'} ${selectedDate === key ? 'bg-orange-50 font-bold text-orange-800' : 'hover:bg-slate-50'} ${blocked ? 'bg-slate-50' : ''}`}><span>{day.getDate()}</span><span className="mt-1 flex h-1.5 gap-1">{blocked && <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}{eventCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />}</span></button>;
        })}</div>
        <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-500" />Scheduled bookings</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-400" />Time off</span></div>
        <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold text-slate-900">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3><p className="mt-1 text-xs text-slate-500">{selectedHours?.is_available ? `${selectedHours.start_time?.slice(0, 5)}–${selectedHours.end_time?.slice(0, 5)}${selectedHours.emergency_only ? ' · Emergency only' : ''}` : 'No regular hours published for this day'}</p>{selectedDateIsBlocked && <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"><CalendarOff className="h-3.5 w-3.5" />Time off</p>}<div className="mt-3 space-y-2">{selectedDateBookings.length === 0 ? <p className="text-xs text-slate-500">No scheduled bookings on this date.</p> : selectedDateBookings.map((booking) => <button key={booking.id} onClick={() => { setActiveBookingCode(booking.booking_code); setCurrentPage('tracking'); }} className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-left hover:border-orange-300"><span><span className="block text-sm font-semibold text-slate-900">{booking.scheduled_time || 'Time pending'} · {booking.service_name}</span><span className="mt-1 block text-xs text-slate-500">{booking.customer_name} · {booking.location}</span></span><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${getBookingStatusColor(booking.status)}`}>{getBookingStatusLabel(booking.status)}</span></button>)}</div></div>
      </section>
      <aside className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CalendarOff className="h-4 w-4 text-orange-600" />Block time off</h2><form onSubmit={addTimeOff} className="mt-3 space-y-3"><label className="block text-xs font-medium text-slate-600">From<input required type="date" min={dateKey(new Date())} value={timeOffStart} onChange={(event) => { setTimeOffStart(event.target.value); if (event.target.value > timeOffEnd) setTimeOffEnd(event.target.value); }} className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" /></label><label className="block text-xs font-medium text-slate-600">Through<input required type="date" min={timeOffStart} value={timeOffEnd} onChange={(event) => setTimeOffEnd(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" /></label><button disabled={savingTimeOff} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"><CalendarOff className="h-3.5 w-3.5" />{savingTimeOff ? 'Blocking dates...' : 'Block selected dates'}</button></form></section>
        <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-sm font-semibold text-slate-900">Upcoming time off</h2><div className="mt-3 space-y-2">{timeOff.length === 0 ? <p className="text-xs text-slate-500">No time off in this month.</p> : timeOff.map((block) => <div key={block.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 p-2.5"><span className="text-xs text-slate-700">{formatDate(block.starts_on)}{block.ends_on !== block.starts_on ? ` – ${formatDate(block.ends_on)}` : ''}</span><button onClick={() => removeTimeOff(block)} aria-label={`Remove time off ${formatDate(block.starts_on)}`} className="rounded p-1 text-slate-500 hover:bg-white hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div></section>
        <section className="rounded-lg bg-orange-50 p-3 text-xs leading-relaxed text-slate-700"><Clock3 className="mr-1 inline h-3.5 w-3.5 text-orange-700" />Time off is blocked against new service requests. Existing bookings cannot be overlaid; contact the customer to reschedule first.</section>
      </aside>
    </div>
  </div>;
}

export function EmergencyPage() {
  const { setCurrentPage, setSearchQuery } = useApp();
  const services = ['Electrical danger', 'Water emergency', 'Locked out', 'Gas leak', 'Structural concern', 'Other urgent home issue'];
  return (
    <BookingPageFrame title="Emergency help">
      <div className="rounded-xl border border-red-200 bg-white p-5 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-100 text-red-700"><AlertCircle className="h-7 w-7" /></span><h2 className="mt-3 text-xl font-bold text-slate-950">Is anyone in immediate danger?</h2><p className="mt-2 text-sm text-slate-600">Contact local emergency services first. HomiCare providers are not emergency responders.</p></div>
      <div className="mt-4 space-y-2">{services.map((service) => <button key={service} onClick={() => { setSearchQuery(service); setCurrentPage('search'); }} className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left text-sm font-medium text-slate-800"><Wrench className="h-4 w-4 text-violet-800" />{service}</button>)}</div>
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-violet-50 p-3 text-xs text-violet-950"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Share your exact location only with the provider you choose and only when needed for the service.</div>
    </BookingPageFrame>
  );
}

export function SubscriptionsPage() {
  return <BookingPageFrame title="Home care plans"><div className="rounded-xl border border-violet-100 bg-white p-6"><p className="text-sm text-slate-600">Recurring service plans can be managed here once a provider and payment schedule are confirmed.</p><div className="mt-5 rounded-lg bg-violet-50 p-4"><p className="font-semibold text-slate-900">No active subscriptions</p><p className="mt-1 text-sm text-slate-600">Your recurring services will appear here after setup.</p></div><p className="mt-4 text-xs text-slate-500">Subscription billing is not connected, so this screen will not create a charge.</p></div></BookingPageFrame>;
}

export function MyBookingsPage() {
  const { setCurrentPage, setActiveBookingCode } = useApp();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [quotes, setQuotes] = useState<BookingQuote[]>([]);
  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quoteActionError, setQuoteActionError] = useState('');
  const [quoteActionId, setQuoteActionId] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    const loadBookings = async () => {
      setLoading(true);
      setError('');
      const { data, error: queryError } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(100);
      if (!active) return;
      const rows = data || [];
      setBookings(rows);
      if (queryError) {
        setError('Bookings could not be loaded. Sign in and check your connection or booking access.');
        setLoading(false);
        return;
      }
      if (rows.length > 0) {
        const { data: quoteData, error: quotesError } = await supabase.from('booking_quotes').select('*').in('booking_id', rows.map((booking) => booking.id));
        if (!active) return;
        setQuotes(quoteData || []);
        if (quotesError) setQuoteActionError('Apply the latest service-quotes migration to view and respond to quotes.');
      }
      setLoading(false);
    };
    loadBookings().catch(() => {
      if (!active) return;
      setError('Bookings could not be loaded. Check your connection and try again.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [reloadCount]);

  const respondToQuote = async (quote: BookingQuote, decision: 'accepted' | 'rejected' | 'revision_requested') => {
    setQuoteActionId(quote.id);
    setQuoteActionError('');
    const { error: responseError } = await supabase.rpc('respond_to_booking_quote', { p_quote_id: quote.id, p_decision: decision });
    setQuoteActionId(null);
    if (responseError) {
      setQuoteActionError(responseError.message);
      return;
    }
    setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, status: decision } : item));
    if (decision === 'accepted') {
      setBookings((current) => current.map((booking) => booking.id === quote.booking_id ? { ...booking, status: 'accepted', quoted_price: quote.total_amount, final_price: quote.total_amount } : booking));
    }
  };

    const normalizedStatus = (status: string) => status.toLowerCase().replace(/[\s-]+/g, '_');
    const cancelledStatuses = ['cancelled', 'declined', 'rejected'];
  const filteredBookings = bookings.filter((booking) => {
      const status = normalizedStatus(booking.status);
      if (activeFilter === 'cancelled') return cancelledStatuses.includes(status);
      if (activeFilter === 'past') return status === 'completed';
      return status !== 'completed' && !cancelledStatuses.includes(status);
  });
  const filterCounts = {
      upcoming: bookings.filter((booking) => normalizedStatus(booking.status) !== 'completed' && !cancelledStatuses.includes(normalizedStatus(booking.status))).length,
      past: bookings.filter((booking) => normalizedStatus(booking.status) === 'completed').length,
      cancelled: bookings.filter((booking) => cancelledStatuses.includes(normalizedStatus(booking.status))).length,
  };

  return (
    <BookingPageFrame title="My bookings">
      <div className="mb-5 grid grid-cols-3 rounded-xl bg-violet-100 p-1">
        {(['upcoming', 'past', 'cancelled'] as const).map((filter) => (
          <button key={filter} onClick={() => setActiveFilter(filter)} aria-pressed={activeFilter === filter} className={`rounded-lg px-2 py-2.5 text-xs font-semibold capitalize sm:text-sm ${activeFilter === filter ? 'bg-white text-violet-900 shadow-sm' : 'text-violet-800 hover:bg-violet-50'}`}>
            {filter} <span className="ml-1 opacity-70">{filterCounts[filter]}</span>
          </button>
        ))}
      </div>

      {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><span>{error.includes('401') || error.includes('row-level security') ? 'Sign in to view your bookings.' : error}</span><button onClick={() => setReloadCount((count) => count + 1)} className="font-semibold underline">Retry</button></div>}
      {loading ? <div className="space-y-3">{[1,2,3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-violet-100" />)}</div> : filteredBookings.length === 0 ? (
        <div className="rounded-xl border border-violet-100 bg-white p-7 text-center shadow-sm">
          <CalendarDays className="mx-auto h-8 w-8 text-violet-700" />
          <h2 className="mt-3 font-semibold text-slate-900">No {activeFilter} bookings</h2>
          <p className="mt-1 text-sm text-slate-500">Your service requests and booking updates will appear here.</p>
          <button onClick={() => setCurrentPage('search')} className="mt-4 rounded-lg bg-violet-800 px-4 py-2.5 text-sm font-semibold text-white">Find a service</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const quote = quotes.find((item) => item.booking_id === booking.id);
            return <article key={booking.id} className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
              <button onClick={() => { setActiveBookingCode(booking.booking_code); setCurrentPage('tracking'); }} className="w-full text-left">
                <span className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-700"><Wrench className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-start justify-between gap-2"><span className="font-semibold text-slate-950">{booking.service_name}</span><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getBookingStatusColor(booking.status)}`}>{getBookingStatusLabel(booking.status)}</span></span><span className="mt-1 block text-xs text-slate-500">{booking.booking_code} · {booking.location}</span><span className="mt-1 block text-xs text-slate-500">{booking.scheduled_date ? formatDate(booking.scheduled_date) : 'Flexible date'}{booking.scheduled_time ? ` · ${booking.scheduled_time}` : ''}</span>{booking.final_price && <span className="mt-2 block text-sm font-semibold text-orange-800">{formatUGXFull(booking.final_price)}</span>}</span></span>
              </button>
              {quote && <section className="mt-4 rounded-lg border border-orange-200 bg-orange-50/60 p-4" aria-label="Provider quote">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-semibold text-slate-900">Provider quote</h3><p className="mt-1 text-xs text-slate-500">{quote.revision_count ? `Revised ${quote.revision_count} time${quote.revision_count === 1 ? '' : 's'}` : 'Itemized estimate'}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-orange-800">{quote.status.replace('_', ' ')}</span></div>
                <dl className="mt-3 space-y-1.5 text-xs"><div className="flex justify-between gap-3"><dt className="text-slate-600">Labor</dt><dd className="font-medium text-slate-900">{formatUGXFull(quote.labor_amount)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-600">Materials</dt><dd className="font-medium text-slate-900">{formatUGXFull(quote.materials_amount)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-600">Transport</dt><dd className="font-medium text-slate-900">{formatUGXFull(quote.transport_amount)}</dd></div><div className="flex justify-between gap-3 border-t border-orange-200 pt-2 text-sm"><dt className="font-semibold text-slate-900">Total</dt><dd className="font-bold text-orange-800">{formatUGXFull(quote.total_amount)}</dd></div></dl>
                {quote.estimated_duration && <p className="mt-3 text-xs text-slate-700"><strong>Estimated duration:</strong> {quote.estimated_duration}</p>}{quote.warranty && <p className="mt-1 text-xs text-slate-700"><strong>Warranty:</strong> {quote.warranty}</p>}<p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{quote.message}</p>
                {quote.status === 'sent' && booking.status !== 'accepted' && <div className="mt-4 flex flex-wrap gap-2"><button disabled={quoteActionId === quote.id} onClick={() => respondToQuote(quote, 'accepted')} className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50">Accept quote</button><button disabled={quoteActionId === quote.id} onClick={() => respondToQuote(quote, 'revision_requested')} className="rounded-md border border-orange-300 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-50 disabled:opacity-50">Request revision</button><button disabled={quoteActionId === quote.id} onClick={() => respondToQuote(quote, 'rejected')} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Decline</button></div>}
              </section>}
            </article>;
          })}
        </div>
      )}
      {quoteActionError && <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{quoteActionError}</p>}
    </BookingPageFrame>
  );
}