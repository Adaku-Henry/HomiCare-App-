import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertCircle, ArrowLeft, Bell, CalendarDays, Check, CheckCheck,
  CircleHelp, FileText, Image, MapPin, MessageCircle, MoreVertical, Paperclip,
  Phone, Search, Send, Share2, ShieldAlert, Smile, UserRound, Video, Wallet, X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ProfileMediaImage } from '@/ProfileMediaImage';
import { InAppCall } from '@/InAppCall';
import { supabase } from '@/lib/supabase';
import type { Booking, Message, Page, Provider } from '@/types';
import { formatDate, formatDateTime, formatUGXFull, getBookingStatusLabel } from '@/lib/utils';

type MessagingView = 'dashboard' | 'conversation' | 'center' | 'booking';

interface Conversation {
  provider: Provider;
  customerName: string;
  messages: Message[];
  latest: Message | null;
  booking: Booking | null;
}

interface CallPrompt {
  type: 'voice' | 'video';
  providerId: string;
  customerId: string;
  peerName: string;
}

const customerNameFromUser = (user: { user_metadata?: Record<string, unknown> } | null) => {
  const value = user?.user_metadata?.full_name;
  return typeof value === 'string' && value.trim() ? value.trim() : 'HomiCare customer';
};

function Avatar({ provider, name, size = 'md' }: { provider?: Provider | null; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-12 w-12' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return <span className={`${sizeClass} grid shrink-0 place-items-center overflow-hidden rounded-full bg-orange-100 text-sm font-bold text-orange-800`}>
    {provider?.avatar_url ? <ProfileMediaImage source={provider.avatar_url} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}
  </span>;
}

function MessageBubble({ message, customerSide }: { message: Message; customerSide: boolean }) {
  const [signedAttachmentUrl, setSignedAttachmentUrl] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  useEffect(() => {
    if (message.message_type !== 'file' || !message.attachment_url) return;
    let active = true;
    supabase.storage.from('conversation-media').createSignedUrl(message.attachment_url, 60 * 60)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data?.signedUrl) setAttachmentError(error?.message || 'This attachment is unavailable.');
        else setSignedAttachmentUrl(data.signedUrl);
        })
        .catch((cause: unknown) => {
          if (active) setAttachmentError(cause instanceof Error ? cause.message : 'This attachment is unavailable.');
        });
    return () => { active = false; };
  }, [message.attachment_url, message.message_type]);
  const mine = customerSide ? message.sender === 'customer' : message.sender === 'provider';
  const locationUrl = message.message_type === 'location' ? message.content.match(/https:\/\/maps\.google\.com\/\?[^\s]+/)?.[0] : null;
  return <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[82%] rounded-lg px-3 py-2.5 text-sm leading-relaxed sm:max-w-[72%] ${mine ? 'bg-sky-100 text-slate-900' : 'border border-slate-100 bg-white text-slate-800'}`}>
      {locationUrl ? <><p>Shared current location</p><a href={locationUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-orange-800 underline"><MapPin className="h-3.5 w-3.5" />View on Google Maps</a></> : message.content}
      {message.message_type === 'file' && <div className="mt-2">{signedAttachmentUrl ? <a href={signedAttachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-orange-800 underline"><FileText className="h-3.5 w-3.5" />Open attachment</a> : <p className="text-xs text-slate-500">{attachmentError || 'Preparing secure attachment…'}</p>}</div>}
      {message.attachment_url && message.message_type !== 'file' && <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-md bg-white/70 p-2 text-xs font-semibold text-orange-800"><FileText className="h-4 w-4" />Open attachment</a>}
      <p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-slate-500' : 'text-slate-400'}`}>
        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{mine && <CheckCheck className="h-3 w-3 text-sky-700" />}
      </p>
    </div>
  </div>;
}

export function MessagingPages({ view }: { view: MessagingView }) {
  const { setCurrentPage, setSelectedProviderId, selectedProviderId, activeBookingCode, setActiveBookingCode, userRole, callIntent, setCallIntent } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [customerName, setCustomerName] = useState('HomiCare customer');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => new URLSearchParams(window.location.search).get('customerId') || '');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [messageDraft, setMessageDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [status, setStatus] = useState('');
  const [callPrompt, setCallPrompt] = useState<CallPrompt | null>(null);
  const [centerFeatures, setCenterFeatures] = useState({ text: true, voice: true, images: true, documents: true, location: true });
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const callMessageRequestRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError('');
      const [messageResult, providerResult, bookingResult, authResult, selectedProviderResult] = await Promise.all([
        supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(500),
        supabase.from('public_provider_profiles').select('*').order('rating', { ascending: false }).limit(30),
        supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.auth.getUser(),
        selectedProviderId
          ? supabase.from('public_provider_profiles').select('*').eq('id', selectedProviderId).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (!active) return;
      setMessages(messageResult.data || []);
      const visibleProviders = providerResult.data || [];
      if (selectedProviderResult.data && !visibleProviders.some((provider) => provider.id === selectedProviderResult.data?.id)) {
        visibleProviders.push(selectedProviderResult.data);
      }
      setProviders(visibleProviders);
      setBookings(bookingResult.data || []);
      setCurrentUserId(authResult.data.user?.id || '');
      setCustomerName(customerNameFromUser(authResult.data.user));
      const failures = [
        (messageResult.error || providerResult.error || bookingResult.error || selectedProviderResult.error) && 'Conversation data could not be fully loaded. Check your connection and Supabase access policies.',
        (authResult.error || !authResult.data.user) && 'Sign in to access account conversations.',
      ].filter(Boolean);
      if (failures.length) setLoadError(failures.join(' '));
      setLoading(false);
    };
    load().catch(() => {
      if (!active) return;
      setLoadError('Messages could not be loaded. Check your connection and try again.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [reloadCount, selectedProviderId]);

  const conversations = useMemo<Conversation[]>(() => {
    return providers.flatMap<Conversation>((provider): Conversation[] => {
      const providerMessages = messages.filter((message) => message.provider_id === provider.id);
      if (userRole === 'provider') {
        const names = [...new Set(providerMessages.map((message) => message.customer_name))];
        return names.map((name) => {
          const threadMessages = providerMessages.filter((message) => message.customer_name === name);
          const latest = threadMessages[threadMessages.length - 1] || null;
          const booking = bookings.find((item) => item.provider_id === provider.id && item.customer_name === name) || null;
          return { provider, customerName: name, messages: threadMessages, latest, booking };
        });
      }
      if (providerMessages.length === 0) {
        if (provider.id !== selectedProviderId) return [];
        const booking = bookings.find((item) => item.provider_id === provider.id && item.customer_name === customerName) || null;
        return [{ provider, customerName, messages: [], latest: null, booking }];
      }
      const latest = providerMessages[providerMessages.length - 1] || null;
      const booking = bookings.find((item) => item.provider_id === provider.id && item.customer_name === customerName) || null;
      return [{ provider, customerName: latest?.customer_name || customerName, messages: providerMessages, latest, booking }];
    });
  }, [bookings, customerName, messages, providers, selectedProviderId, userRole]);

  const selectedConversation = conversations.find((conversation) => conversation.provider.id === selectedProviderId && conversation.messages.length > 0 && (!selectedCustomer || conversation.customerName === selectedCustomer) && (!selectedCustomerId || conversation.messages.some((message) => message.customer_id === selectedCustomerId)))
    || conversations.find((conversation) => conversation.messages.length > 0)
    || conversations.find((conversation) => conversation.provider.id === selectedProviderId)
    || conversations[0]
    || null;
  const callCustomerId = userRole === 'provider'
    ? selectedConversation?.messages.find((message) => message.customer_id)?.customer_id || selectedCustomerId
    : currentUserId;
  const callRelationshipExists = Boolean(selectedConversation && callCustomerId && (
    selectedConversation.messages.some((message) => message.customer_id === callCustomerId)
    || bookings.some((booking) => booking.provider_id === selectedConversation.provider.id && booking.customer_id === callCustomerId)
  ));

  useEffect(() => {
    if (!callIntent || loading || !currentUserId || userRole === 'provider' || !selectedConversation || !callCustomerId || callRelationshipExists) return;
    if (callMessageRequestRef.current === callIntent.id) return;
    callMessageRequestRef.current = callIntent.id;
    const callLabel = callIntent.type === 'video' ? 'video' : 'voice';
    void (async () => {
      try {
        const { data, error } = await supabase.from('messages').insert({
          provider_id: selectedConversation.provider.id,
          customer_id: currentUserId,
          customer_name: customerName,
          sender: 'customer',
          content: `Started an in-app ${callLabel} call.`,
          message_type: 'call',
          attachment_url: null,
        }).select('*').single();
        if (error || !data) {
          setStatus(error?.message || 'The call could not be started because the conversation could not be created.');
          setCallIntent(null);
          return;
        }
        setMessages((current) => [...current, data]);
      } catch (cause: unknown) {
        setStatus(cause instanceof Error ? cause.message : 'The conversation could not be created for this call.');
        setCallIntent(null);
      }
    })();
  }, [callIntent, loading, currentUserId, userRole, selectedConversation, callCustomerId, callRelationshipExists, customerName, setCallIntent]);

  useEffect(() => {
    if (!callIntent || loading) return;
    if (!currentUserId) {
      setStatus('Sign in before starting an in-app call.');
      setCallIntent(null);
    } else if (!selectedConversation || !callCustomerId) {
      setStatus('This conversation is not linked to a customer account, so a secure in-app call cannot be started.');
      setCallIntent(null);
    }
  }, [callIntent, loading, currentUserId, selectedConversation, callCustomerId, setCallIntent]);

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`messages:user:${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const incoming = payload.new as Message;
        setMessages((current) => current.some((message) => message.id === incoming.id)
          ? current
          : [...current, incoming].sort((left, right) => left.created_at.localeCompare(right.created_at)));
      })
      .subscribe((channelStatus) => {
        if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
          setStatus('Live updates are unavailable. Messages will appear after reconnecting.');
        }
      });
    return () => { void supabase.removeChannel(channel); };
    }, [currentUserId]);

  const visibleConversations = conversations.filter((conversation) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = `${conversation.provider.full_name} ${conversation.customerName} ${conversation.latest?.content || ''} ${conversation.booking?.booking_code || ''}`.toLowerCase().includes(query);
    const active = conversation.booking && !['completed', 'cancelled', 'declined'].includes(conversation.booking.status);
    const matchesFilter = filter === 'All'
      || (filter === 'Active Bookings' && active)
      || (filter === 'Previous' && !active)
      || (filter === 'Customers' && userRole === 'provider')
      || (filter === 'Providers' && userRole !== 'provider');
    return matchesSearch && matchesFilter;
  }).sort((left, right) => (right.latest?.created_at || '').localeCompare(left.latest?.created_at || ''));

  const linkedBooking = activeBookingCode
    ? bookings.find((booking) => booking.booking_code === activeBookingCode) || null
    : selectedConversation?.booking || null;
  const bookingSteps = ['Requested', 'Accepted', 'On the way', 'Arrived', 'Working', 'Completed'];
  const normalizedBookingStatus = (linkedBooking?.status || '').toLowerCase().replace(/[\s-]+/g, '_');
  const bookingStepIndex = ({
    requested: 0,
    viewed: 0,
    accepted: 1,
    payment_pending: 1,
    confirmed: 1,
    provider_en_route: 2,
    on_the_way: 2,
    arrived: 3,
    service_started: 4,
    in_progress: 4,
    completed: 5,
  } as Record<string, number>)[normalizedBookingStatus] ?? 0;

  const chooseConversation = (conversation: Conversation, nextPage: Page = 'message-conversation') => {
    setSelectedProviderId(conversation.provider.id);
    setSelectedCustomer(conversation.customerName);
    const customerId = conversation.messages.find((message) => message.customer_id)?.customer_id || '';
    setSelectedCustomerId(customerId);
    if (userRole === 'provider' && customerId) {
      const path = `/messages/${encodeURIComponent(conversation.provider.id)}?customerId=${encodeURIComponent(customerId)}`;
      window.history.replaceState({}, '', path);
    }
    if (conversation.booking) setActiveBookingCode(conversation.booking.booking_code);
    setCurrentPage(nextPage);
  };

  const goToBookingPage = (page: Page) => {
    if (linkedBooking) setActiveBookingCode(linkedBooking.booking_code);
    setCurrentPage(page);
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedConversation || !messageDraft.trim() || sending) return;
    setStatus('');
    const { data: authResult } = await supabase.auth.getUser();
    if (!authResult.user) {
      setStatus('Sign in to send this message. Your draft is still here.');
      return;
    }
    const customerId = userRole === 'provider' ? selectedConversation.messages[0]?.customer_id : authResult.user.id;
    if (!customerId) {
      setStatus('This older conversation is not linked to a customer account yet, so it cannot be sent securely.');
      return;
    }
    setSending(true);
    const newMessage = {
      provider_id: selectedConversation.provider.id,
      customer_id: customerId,
      customer_name: userRole === 'provider' ? selectedConversation.customerName : customerName,
      sender: userRole === 'provider' ? 'provider' : 'customer',
      content: messageDraft.trim(),
      message_type: 'text',
      attachment_url: null,
    };
    const { data, error } = await supabase.from('messages').insert(newMessage).select('*').single();
    setSending(false);
    if (error || !data) {
      setStatus(error?.message || 'Message was not sent. Please try again.');
      return;
    }
    setMessages((current) => [...current, data]);
    setMessageDraft('');
  };

  const uploadConversationFile = async (file: File) => {
    if (!selectedConversation) {
      setStatus('Choose a conversation before sending a file.');
      return;
    }
    if (!currentUserId) {
      setStatus('Sign in before sending a file.');
      return;
    }
    const supportedTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    if (!supportedTypes.includes(file.type) || file.size > 15 * 1024 * 1024) {
      setStatus('Choose a PDF, text file, JPG, PNG, WebP, or MP4 up to 15 MB.');
      return;
    }
    const customerId = userRole === 'provider'
      ? selectedConversation.messages.find((message) => message.customer_id)?.customer_id || selectedCustomerId
      : currentUserId;
    if (!customerId) {
      setStatus('This conversation is not linked to a customer account, so files cannot be shared securely.');
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'attachment';
    const storagePath = `${selectedConversation.provider.id}/${customerId}/${crypto.randomUUID()}-${safeName}`;
    setUploadingFile(true);
    setStatus('Uploading secure attachment...');
    try {
      const { error: uploadError } = await supabase.storage.from('conversation-media').upload(storagePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase.from('messages').insert({
        provider_id: selectedConversation.provider.id,
        customer_id: customerId,
        customer_name: userRole === 'provider' ? selectedConversation.customerName : customerName,
        sender: userRole === 'provider' ? 'provider' : 'customer',
        content: file.name,
        message_type: 'file',
        attachment_url: storagePath,
      }).select('*').single();
      if (insertError || !data) {
        const { error: cleanupError } = await supabase.storage.from('conversation-media').remove([storagePath]);
        throw new Error([insertError?.message || 'Attachment message could not be saved.', cleanupError?.message].filter(Boolean).join(' '));
      }
      setMessages((current) => [...current, data]);
      setStatus('File sent securely.');
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'File could not be sent.');
    } finally {
      setUploadingFile(false);
    }
  };

  const openFilePicker = () => attachmentInputRef.current?.click();
  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    if (file) void uploadConversationFile(file);
  };

  const requestCall = (type: 'voice' | 'video') => {
    if (!selectedConversation) {
      setStatus('Choose a conversation before starting a call.');
      return;
    }
    if (!callCustomerId) {
      setStatus('This conversation is not linked to a customer account, so a secure in-app call cannot be started.');
      return;
    }
    setStatus('');
    setCallPrompt({
      type,
      providerId: selectedConversation.provider.id,
      customerId: callCustomerId,
      peerName: userRole === 'provider' ? selectedConversation.customerName : selectedConversation.provider.full_name,
    });
  };
  const confirmCall = () => {
    if (!callPrompt) return;
    if (selectedConversation?.provider.id !== callPrompt.providerId || callCustomerId !== callPrompt.customerId) {
      setStatus('The selected conversation changed. Choose the person again before calling.');
      setCallPrompt(null);
      return;
    }
    setCallIntent({ id: Date.now(), type: callPrompt.type });
    setCallPrompt(null);
  };
  const callPeer = () => requestCall('voice');
  const openVideoCall = () => requestCall('video');
  const shareCurrentLocation = () => {
    if (!selectedConversation) {
      setStatus('Choose a conversation before sharing your location.');
      return;
    }
    if (!navigator.geolocation) {
      setStatus('Location is unavailable in this browser. Enter the service address in your booking instead.');
      return;
    }
    setStatus('Requesting permission to share your current location...');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const customerId = userRole === 'provider'
        ? selectedConversation.messages.find((message) => message.customer_id)?.customer_id || callCustomerId
        : currentUserId;
      if (!customerId) {
        setStatus('This conversation is not linked to a customer account, so location cannot be shared securely.');
        return;
      }
      const latitude = coords.latitude.toFixed(6);
      const longitude = coords.longitude.toFixed(6);
      const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
      try {
        const { data, error } = await supabase.from('messages').insert({
          provider_id: selectedConversation.provider.id,
          customer_id: customerId,
          customer_name: userRole === 'provider' ? selectedConversation.customerName : customerName,
          sender: userRole === 'provider' ? 'provider' : 'customer',
          content: mapsUrl,
          message_type: 'location',
          attachment_url: null,
        }).select('*').single();
        if (error || !data) {
          setStatus(error?.message || 'Your location was not shared. Please try again.');
          return;
        }
        setMessages((current) => [...current, data]);
        setStatus('Your current location was shared in this conversation.');
      } catch (cause) {
        setStatus(cause instanceof Error ? cause.message : 'Your location was not shared. Please try again.');
      }
    }, () => setStatus('Could not access your location. Allow location permission or share the service address in a message.'), {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  };
  const copyConversationLink = async () => {
    if (!selectedConversation) return;
    const customerId = selectedConversation.messages.find((message) => message.customer_id)?.customer_id || '';
    const url = new URL(`/messages/${encodeURIComponent(selectedConversation.provider.id)}`, window.location.origin);
    if (userRole === 'provider' && customerId) url.searchParams.set('customerId', customerId);
    const link = url.toString();
    try {
      await navigator.clipboard.writeText(link);
      setStatus('Conversation link copied. The recipient must sign in to the matching HomiCare account.');
    } catch {
      setStatus(`Share this conversation link: ${link}`);
    }
  };
  const pageTitle = view === 'center' ? 'Communication Center' : view === 'booking' ? 'Booking communication' : view === 'conversation' ? 'Conversation' : 'Messages';
  const loadErrorNotice = loadError && <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><span>{loadError}</span><button onClick={() => setReloadCount((count) => count + 1)} className="shrink-0 font-semibold underline">Retry</button></div>;
  const conversationList = <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white" aria-label="Conversations">
    <div className="border-b border-slate-100 p-3"><div className="flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">Conversations</h2><span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-800">{visibleConversations.length}</span></div>
      <label className="relative mt-3 block"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search people or messages" aria-label="Search conversations" className="h-9 w-full rounded-md border border-slate-200 pl-8 pr-2 text-xs outline-none focus:border-orange-400" /></label>
      <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">Filter by:<select value={filter} onChange={(event) => setFilter(event.target.value)} className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"><option>All</option><option>Customers</option><option>Providers</option><option>Active Bookings</option><option>Previous</option></select></label>
    </div>
    <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
      {visibleConversations.map((conversation) => {
        const person = userRole === 'provider' ? conversation.customerName : conversation.provider.full_name;
        return <button key={`${conversation.provider.id}-${conversation.customerName}`} onClick={() => chooseConversation(conversation, view === 'center' ? 'communication-center' : view === 'booking' ? 'booking-communication' : 'message-conversation')} className={`flex w-full items-center gap-2.5 p-3 text-left hover:bg-orange-50 ${selectedConversation?.provider.id === conversation.provider.id ? 'bg-orange-50' : ''}`}>
          <Avatar provider={userRole === 'provider' ? null : conversation.provider} name={person} />
          <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold text-slate-900">{person}</span><span className="shrink-0 text-[10px] text-slate-400">{conversation.latest ? formatDateTime(conversation.latest.created_at) : 'New'}</span></span><span className="mt-1 block truncate text-[11px] text-slate-500">{conversation.latest?.content || 'Start a conversation'}</span><span className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{conversation.provider.availability_status === 'available' ? 'Online' : 'Provider'}</span></span>
        </button>;
      })}
      {!loading && visibleConversations.length === 0 && <div className="p-4 text-xs text-slate-500"><p>No conversations match this filter.</p>{userRole !== 'provider' && <button onClick={() => setCurrentPage('search')} className="mt-2 font-semibold text-orange-800">Find a provider</button>}</div>}
    </div>
  </section>;

  const chatPanel = <section className="flex min-h-[26rem] min-w-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white" aria-label="Conversation messages">
    {selectedConversation ? <>
      <header className="flex items-center gap-2.5 border-b border-slate-100 p-3">
        {view !== 'center' && <button onClick={() => setCurrentPage('messages')} aria-label="Back to messages" className="rounded p-1 text-slate-500 hover:bg-slate-100"><ArrowLeft className="h-4 w-4" /></button>}
        <Avatar provider={userRole === 'provider' ? null : selectedConversation.provider} name={userRole === 'provider' ? selectedConversation.customerName : selectedConversation.provider.full_name} />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{userRole === 'provider' ? selectedConversation.customerName : selectedConversation.provider.full_name}</p><p className="text-[11px] text-emerald-700">● Online · {selectedConversation.provider.professional_title}</p></div>
        <button onClick={callPeer} title="Start in-app voice call" aria-label="Voice call" className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"><Phone className="h-4 w-4" /><span className="hidden sm:inline">Voice</span></button>
        <button onClick={openVideoCall} title="Start in-app video call" aria-label="Video call" className="inline-flex items-center gap-1.5 rounded-md border border-orange-200 px-2.5 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-50"><Video className="h-4 w-4" /><span className="hidden sm:inline">Video</span></button>
        <button onClick={() => setStatus('Conversation options are managed through your account settings.')} aria-label="More conversation options" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><MoreVertical className="h-4 w-4" /></button>
        <button onClick={copyConversationLink} title="Copy conversation link" aria-label="Copy conversation link" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><Share2 className="h-4 w-4" /></button>
        <button onClick={() => setCurrentPage('contact-details')} aria-label="Provider contact details" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><UserRound className="h-4 w-4" /></button>
        <button onClick={() => setCurrentPage('shared-media')} aria-label="View shared media" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><Image className="h-4 w-4" /></button>
        <button onClick={() => setCurrentPage('call-history')} aria-label="View call history" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><Phone className="h-4 w-4" /></button>
      </header>
      {selectedConversation.booking && <button onClick={() => { setActiveBookingCode(selectedConversation.booking?.booking_code || null); setCurrentPage('booking-communication'); }} className="flex items-center justify-between gap-3 border-b border-orange-100 bg-orange-50 px-3 py-2 text-left"><span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-900">{selectedConversation.booking.booking_code} · {selectedConversation.booking.service_name}</span><span className="text-[10px] text-slate-600">{formatDate(selectedConversation.booking.scheduled_date)} · {getBookingStatusLabel(selectedConversation.booking.status)}</span></span><span className="shrink-0 text-xs font-semibold text-orange-800">View booking</span></button>}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-slate-50/70 p-3 sm:p-4">
        {selectedConversation.messages.map((message) => <MessageBubble key={message.id} message={message} customerSide={userRole !== 'provider'} />)}
        {selectedConversation.messages.length === 0 && <div className="m-auto max-w-xs text-center"><MessageCircle className="mx-auto h-8 w-8 text-orange-500" /><p className="mt-2 text-sm font-semibold text-slate-800">Start the conversation</p><p className="mt-1 text-xs text-slate-500">Ask a question about the service, timing, or booking details.</p></div>}
      </div>
      {status && <div role="status" className="mx-3 mt-2 flex items-start justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><span>{status}</span><button onClick={() => setStatus('')} aria-label="Dismiss message" className="shrink-0"><X className="h-3.5 w-3.5" /></button></div>}
      <form onSubmit={sendMessage} className="flex items-center gap-1.5 border-t border-slate-100 p-2.5 sm:p-3">
        <button type="button" onClick={openFilePicker} disabled={uploadingFile} aria-label="Attach file" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><Paperclip className="h-4 w-4" /></button>
        <button type="button" onClick={openFilePicker} disabled={uploadingFile} aria-label="Attach image or video" className="hidden rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 sm:inline-flex"><Image className="h-4 w-4" /></button>
        <input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Type a message..." aria-label="Type a message" className="min-w-0 flex-1 rounded-md bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200" />
        <button type="button" aria-label="Emoji unavailable" onClick={() => setStatus('Emoji picker is not connected yet.')} className="hidden rounded-md p-2 text-slate-500 hover:bg-slate-100 sm:inline-flex"><Smile className="h-4 w-4" /></button>
        <button disabled={sending || !messageDraft.trim()} aria-label="Send message" className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40">{sending ? <span className="text-xs">...</span> : <Send className="h-4 w-4" />}</button>
      </form>
    </> : <div className="grid flex-1 place-items-center p-6 text-center"><div><MessageCircle className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700">Choose a conversation</p><p className="mt-1 text-xs text-slate-500">Select a provider or customer to view messages.</p></div></div>}
  </section>;

  const identityPanel = selectedConversation ? <aside className="hidden min-h-0 flex-col overflow-y-auto rounded-md border border-slate-200 bg-white p-3 xl:flex" aria-label="Conversation details">
    <div className="flex flex-col items-center border-b border-slate-100 pb-3 text-center"><Avatar provider={userRole === 'provider' ? null : selectedConversation.provider} name={userRole === 'provider' ? selectedConversation.customerName : selectedConversation.provider.full_name} size="lg" /><p className="mt-2 text-sm font-bold text-slate-900">{userRole === 'provider' ? selectedConversation.customerName : selectedConversation.provider.full_name}</p><p className="mt-0.5 text-[11px] text-slate-500">{userRole === 'provider' ? 'Customer' : selectedConversation.provider.professional_title}</p><p className="mt-1 text-[11px] text-emerald-700">● Online</p></div>
    <div className="space-y-1 py-2 text-xs"><button onClick={() => setCurrentPage('provider')} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-slate-700 hover:bg-slate-50"><MapPin className="h-3.5 w-3.5" />View profile</button>{selectedConversation.booking && <><button onClick={() => goToBookingPage('booking-communication')} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-slate-700 hover:bg-slate-50"><CalendarDays className="h-3.5 w-3.5" />View booking details</button><button onClick={shareCurrentLocation} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-slate-700 hover:bg-slate-50"><MapPin className="h-3.5 w-3.5" />Share current location</button></>}<button onClick={callPeer} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-slate-700 hover:bg-slate-50"><Phone className="h-3.5 w-3.5" />Voice call</button><button onClick={copyConversationLink} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-slate-700 hover:bg-slate-50"><Share2 className="h-3.5 w-3.5" />Copy conversation link</button><button onClick={() => setCurrentPage('safety')} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-red-700 hover:bg-red-50"><ShieldAlert className="h-3.5 w-3.5" />Report user</button><button onClick={() => setCurrentPage('safety')} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-red-700 hover:bg-red-50"><X className="h-3.5 w-3.5" />Manage blocked accounts</button></div>
  </aside> : null;

  const sidebar = <nav className="hidden w-40 shrink-0 flex-col gap-1 rounded-md border border-slate-200 bg-white p-2 md:flex" aria-label="Messaging navigation">{[
    { label: 'Dashboard', icon: CalendarDays, page: userRole === 'provider' ? 'provider-dashboard' as Page : 'customer-dashboard' as Page },
    { label: 'Find Services', icon: Search, page: 'search' as Page },
    { label: 'My Bookings', icon: CalendarDays, page: 'my-bookings' as Page },
    { label: 'Messages', icon: MessageCircle, page: 'messages' as Page },
    { label: 'My Wallet', icon: Wallet, page: 'wallet' as Page },
    { label: 'Help & Support', icon: CircleHelp, page: 'help' as Page },
  ].map((item) => <button key={item.label} onClick={() => setCurrentPage(item.page)} className={`flex items-center gap-2 rounded px-2 py-2 text-left text-xs font-semibold ${item.page === 'messages' ? 'bg-orange-100 text-orange-800' : 'text-slate-600 hover:bg-slate-50'}`}><item.icon className="h-4 w-4" />{item.label}</button>)}</nav>;

  const inAppCall = selectedConversation && callCustomerId && callRelationshipExists ? <InAppCall
    providerId={selectedConversation.provider.id}
    customerId={callCustomerId}
    currentUserId={currentUserId}
    callerName={userRole === 'provider' ? selectedConversation.provider.full_name : customerName}
    peerName={userRole === 'provider' ? selectedConversation.customerName : selectedConversation.provider.full_name}
    request={callIntent}
    onRequestHandled={() => setCallIntent(null)}
  /> : null;
  const callConfirmation = callPrompt ? <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="call-confirm-title">
    <section className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
      <div className={`grid h-12 w-12 place-items-center rounded-full ${callPrompt.type === 'voice' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{callPrompt.type === 'voice' ? <Phone className="h-5 w-5" /> : <Video className="h-5 w-5" />}</div>
      <h2 id="call-confirm-title" className="mt-4 text-lg font-bold text-slate-950">{callPrompt.type === 'voice' ? 'Start a voice call?' : 'Start a video call?'}</h2>
      <p className="mt-1 text-sm text-slate-600">You are about to call <strong className="text-slate-900">{callPrompt.peerName}</strong>.</p>
      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">{callPrompt.type === 'voice' ? 'Voice uses less data. Your microphone will be requested only after you continue.' : 'Video uses more data. HomiCare limits video quality to reduce mobile data use; your camera will be requested only after you continue.'}</p>
      <div className="mt-5 flex justify-end gap-2"><button onClick={() => setCallPrompt(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button onClick={confirmCall} className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white ${callPrompt.type === 'voice' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'}`}>Call {callPrompt.peerName.split(' ')[0]}</button></div>
    </section>
  </div> : null;
  const filePicker = <input ref={attachmentInputRef} type="file" accept="application/pdf,text/plain,image/jpeg,image/png,image/webp,video/mp4" onChange={onFileSelected} className="sr-only" aria-label="Choose file to send" />;

  if (loading) return <>
    {filePicker}
    {callConfirmation}
    {inAppCall}
    <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm text-slate-500">Loading conversations...</div>
  </>;

  if (view === 'booking') return <>
    {filePicker}
    {callConfirmation}
    {inAppCall}
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6">
      <div className="mb-3 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-orange-600" /><h1 className="text-lg font-bold text-slate-950">Booking-linked communication</h1></div><button onClick={() => setCurrentPage('messages')} className="text-xs font-semibold text-orange-800">Back to messages</button></div>
      {loadErrorNotice}
      <section className="mb-3 rounded-md border border-slate-200 bg-white p-3 sm:p-4">
        {linkedBooking ? <><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-md bg-orange-100 text-orange-800"><CalendarDays className="h-5 w-5" /></span><div><p className="font-mono text-xs font-bold text-slate-900">{linkedBooking.booking_code}</p><p className="mt-0.5 text-sm font-semibold text-slate-900">{linkedBooking.service_name}</p><p className="text-xs text-slate-500">{formatDate(linkedBooking.scheduled_date)} · {linkedBooking.scheduled_time || 'Time pending'}</p></div></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{getBookingStatusLabel(linkedBooking.status)}</span></div><div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 text-xs sm:grid-cols-3"><div><span className="text-slate-500">Provider</span><p className="mt-0.5 font-semibold text-slate-800">{selectedConversation?.provider.full_name || providers.find((provider) => provider.id === linkedBooking.provider_id)?.full_name || 'Provider'}</p></div><div><span className="text-slate-500">Location</span><p className="mt-0.5 font-semibold text-slate-800">{linkedBooking.location}</p></div><div><span className="text-slate-500">Amount</span><p className="mt-0.5 font-semibold text-slate-800">{linkedBooking.final_price ? formatUGXFull(linkedBooking.final_price) : 'Awaiting confirmed quote'}</p></div></div></> : <div className="flex items-center gap-2 text-sm text-slate-600"><AlertCircle className="h-4 w-4 text-amber-600" />Choose a conversation with a linked booking, or open this page from a booking.</div>}
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">{[{ label: 'Details', page: 'tracking' as Page }, { label: 'Messages', page: 'booking-communication' as Page }, { label: 'Tracking', page: 'tracking' as Page }, { label: 'Payments', page: 'payment' as Page }, { label: 'Invoice', page: 'invoice' as Page }].map((tab) => <button key={tab.label} onClick={() => goToBookingPage(tab.page)} className={`rounded-md border px-3 py-2 text-xs font-semibold ${tab.label === 'Messages' ? 'border-orange-500 bg-orange-600 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{tab.label}</button>)}</div>
      </section>
      {linkedBooking && <section className="mb-3 rounded-md border border-slate-200 bg-white p-3"><h2 className="text-xs font-bold text-slate-800">Booking status</h2><ol className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">{bookingSteps.map((step, index) => <li key={step} aria-current={index === bookingStepIndex ? 'step' : undefined} className="flex items-center gap-1.5"><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${index < bookingStepIndex ? 'bg-emerald-600 text-white' : index === bookingStepIndex ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{index < bookingStepIndex ? <Check className="h-3 w-3" /> : index + 1}</span><span className={`text-[10px] leading-tight ${index <= bookingStepIndex ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>{step}</span></li>)}</ol></section>}
      {loadErrorNotice}
      <div className="grid min-h-[34rem] gap-3 xl:grid-cols-[13rem_minmax(0,1fr)_15rem]">{conversationList}{chatPanel}{identityPanel}</div>
    </main>
  </>;

  if (view === 'center') return <>
    {filePicker}
    <main className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5 sm:py-6">
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wide text-orange-700">Messages</p><h1 className="text-xl font-bold text-slate-950">Communication Center</h1><p className="mt-1 text-xs text-slate-500">Manage chats and booking-linked updates in one place.</p></div><button onClick={() => setCurrentPage('messages')} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">All conversations</button></div>
    {callConfirmation}
    {inAppCall}
    <div className="grid min-h-[38rem] gap-3 lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[13rem_minmax(0,1fr)_15rem]">{conversationList}{chatPanel}<aside className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-col"><section className="rounded-md border border-slate-200 bg-white p-3"><h2 className="text-sm font-bold text-slate-900">Quick actions</h2><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => requestCall('voice')} className="rounded-md bg-emerald-600 px-2 py-2.5 text-xs font-semibold text-white"><Phone className="mx-auto mb-1 h-4 w-4" />Voice call</button><button onClick={openVideoCall} className="rounded-md bg-orange-600 px-2 py-2.5 text-xs font-semibold text-white"><Video className="mx-auto mb-1 h-4 w-4" />Video call</button><button onClick={shareCurrentLocation} className="rounded-md bg-sky-100 px-2 py-2.5 text-xs font-semibold text-sky-900"><MapPin className="mx-auto mb-1 h-4 w-4" />Share location</button><button onClick={openFilePicker} disabled={uploadingFile} className="rounded-md bg-violet-100 px-2 py-2.5 text-xs font-semibold text-violet-900 disabled:opacity-50"><Paperclip className="mx-auto mb-1 h-4 w-4" />{uploadingFile ? 'Uploading…' : 'Send file'}</button></div></section><section className="rounded-md border border-slate-200 bg-white p-3"><h2 className="text-sm font-bold text-slate-900">Message features</h2><div className="mt-2 divide-y divide-slate-100">{Object.entries(centerFeatures).map(([key, enabled]) => <label key={key} className="flex items-center justify-between py-2 text-xs capitalize text-slate-700">{key === 'images' ? 'Images & videos' : key === 'location' ? 'Location sharing' : key === 'documents' ? 'Documents' : key === 'voice' ? 'Voice notes' : 'Text messages'}<input type="checkbox" checked={enabled} onChange={(event) => setCenterFeatures((current) => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 accent-orange-600" /></label>)}</div><p className="mt-2 text-[10px] text-slate-500">Feature switches save for this view only. Calls require mic/camera permission; location is shared only when you choose it.</p></section><section className="rounded-md border border-slate-200 bg-white p-3"><h2 className="text-sm font-bold text-slate-900">Recent booking updates</h2><div className="mt-2 space-y-2">{bookings.slice(0, 3).map((booking) => <button key={booking.id} onClick={() => { setActiveBookingCode(booking.booking_code); setSelectedProviderId(booking.provider_id); setCurrentPage('booking-communication'); }} className="flex w-full items-start gap-2 rounded-md bg-slate-50 p-2 text-left"><Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /><span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-slate-800">{booking.service_name}</span><span className="block truncate text-[10px] text-slate-500">{getBookingStatusLabel(booking.status)} · {booking.booking_code}</span></span></button>)}{bookings.length === 0 && <p className="text-xs text-slate-500">No booking updates.</p>}</div></section></aside></div>
  </main>
  </>;

  return <>
    {filePicker}
    {callConfirmation}
    {inAppCall}
    <main className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5 sm:py-6">
    <div className="mb-3 flex items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wide text-orange-700">HomiCare messages</p><h1 className="text-xl font-bold text-slate-950">{pageTitle}</h1><p className="mt-1 text-xs text-slate-500">Stay connected with your providers and customers.</p></div><button onClick={() => setCurrentPage('communication-center')} className="rounded-md border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-50">Communication Center</button></div>
    {loadErrorNotice}
    <div className="grid min-h-[36rem] gap-3 md:grid-cols-[12rem_minmax(0,1fr)] xl:grid-cols-[12rem_17rem_minmax(0,1fr)_14rem]">{sidebar}{conversationList}{chatPanel}{identityPanel}</div>
  </main>
  </>;
}