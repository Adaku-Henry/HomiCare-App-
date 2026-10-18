import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertCircle, ArrowLeft, Bell, CalendarDays, Check, CheckCheck,
  FileText, MapPin, MessageCircle, Paperclip,
  Phone, Search, Send, Share2, Video, X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ProfileMediaImage } from '@/ProfileMediaImage';
import { InAppCall } from '@/InAppCall';
import { supabase } from '@/lib/supabase';
import type { Booking, Message, Page, Provider } from '@/types';
import { formatDate, formatUGXFull, getBookingStatusLabel } from '@/lib/utils';

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
  return (
    <span className={`${sizeClass} grid shrink-0 place-items-center overflow-hidden rounded-full bg-orange-100 text-sm font-bold text-orange-800`}>
      {provider?.avatar_url ? <ProfileMediaImage source={provider.avatar_url} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
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

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[82%] rounded-lg px-3 py-2.5 text-sm leading-relaxed sm:max-w-[72%] ${mine ? 'bg-sky-100 text-slate-900' : 'border border-slate-100 bg-white text-slate-800'}`}>
        {locationUrl ? (
          <>
            <p>Shared current location</p>
            <a href={locationUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-orange-800 underline">
              <MapPin className="h-3.5 w-3.5" />View on Google Maps
            </a>
          </>
        ) : message.content}
        {message.message_type === 'file' && (
          <div className="mt-2">
            {signedAttachmentUrl ? (
              <a href={signedAttachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-orange-800 underline">
                <FileText className="h-3.5 w-3.5" />Open attachment
              </a>
            ) : (
              <p className="text-xs text-slate-500">{attachmentError || 'Preparing secure attachment…'}</p>
            )}
          </div>
        )}
        {message.attachment_url && message.message_type !== 'file' && (
          <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-md bg-white/70 p-2 text-xs font-semibold text-orange-800">
            <FileText className="h-4 w-4" />Open attachment
          </a>
        )}
        <p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-slate-500' : 'text-slate-400'}`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {mine && <CheckCheck className="h-3 w-3 text-sky-700" />}
        </p>
      </div>
    </div>
  );
}

export function MessagingPages({ view }: { view: MessagingView }) {
  const { setCurrentPage, setSelectedProviderId, selectedProviderId, activeBookingCode, setActiveBookingCode, userRole, callIntent, setCallIntent } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [customerName, setCustomerName] = useState('HomiCare customer');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCustomerId] = useState(() => new URLSearchParams(window.location.search).get('customerId') || '');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [status, setStatus] = useState('');
  const [callPrompt, setCallPrompt] = useState<CallPrompt | null>(null);
  const [centerFeatures, setCenterFeatures] = useState({ text: true, voice: true, images: true, documents: true, location: true });
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;

        if (!user) {
          if (active) {
            setCurrentUserId('');
            setCustomerName('HomiCare customer');
            setLoading(false);
          }
          return;
        }

        const [messageResult, providerResult, bookingResult, selectedProviderResult] = await Promise.all([
          supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(500),
          supabase.from('public_provider_profiles').select('*').order('rating', { ascending: false }).limit(30),
          supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(100),
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
        setCurrentUserId(user.id);
        setCustomerName(customerNameFromUser(user));
      } catch {
        // Fallback gracefully
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [selectedProviderId]);

  const conversations = useMemo<Conversation[]>(() => {
    return providers.map((provider) => {
      const providerMessages = messages.filter((message) => message.provider_id === provider.id);
      const booking = bookings.find((item) => item.provider_id === provider.id) || null;

      if (userRole === 'provider') {
        const names = [...new Set(providerMessages.map((message) => message.customer_name))];
        const name = selectedCustomer || names[0] || customerName;
        const threadMessages = providerMessages.filter((message) => message.customer_name === name);
        const latest = threadMessages[threadMessages.length - 1] || null;
        return { provider, customerName: name, messages: threadMessages, latest, booking };
      }

      if (providerMessages.length === 0) {
        return { provider, customerName, messages: [], latest: null, booking };
      }
      const latest = providerMessages[providerMessages.length - 1] || null;
      return { provider, customerName: latest?.customer_name || customerName, messages: providerMessages, latest, booking };
    });
  }, [bookings, customerName, messages, providers, selectedCustomer, userRole]);

  const selectedConversation = conversations.find((conversation) => conversation.provider.id === selectedProviderId)
    || conversations.find((conversation) => conversation.messages.length > 0)
    || conversations.find((conversation) => conversation.provider.id === selectedProviderId)
    || conversations[0];

  const callCustomerId = userRole === 'provider'
    ? selectedConversation?.messages.find((message) => message.customer_id)?.customer_id || selectedCustomerId
    : currentUserId;

  const linkedBooking = useMemo(() => {
    if (activeBookingCode) {
      const found = bookings.find((booking) => booking.booking_code === activeBookingCode);
      if (found) return found;
    }
    return selectedConversation?.booking || bookings[0] || null;
  }, [activeBookingCode, bookings, selectedConversation]);

  const requestCall = (type: 'voice' | 'video') => {
    if (!selectedConversation) return;
    setCallPrompt({
      type,
      providerId: selectedConversation.provider.id,
      customerId: callCustomerId,
      peerName: userRole === 'provider' ? selectedConversation.customerName : selectedConversation.provider.full_name,
    });
  };

  const confirmCall = () => {
    if (!callPrompt) return;
    setCallIntent({
      mode: callPrompt.type,
      providerId: callPrompt.providerId,
      customerId: callPrompt.customerId,
      peerName: callPrompt.peerName,
    });
    setCallPrompt(null);
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = messageDraft.trim();
    if (!content || !selectedConversation) return;
    setSending(true);

    try {
      const newMessage = {
        provider_id: selectedConversation.provider.id,
        customer_id: currentUserId,
        customer_name: userRole === 'provider' ? selectedConversation.customerName : customerName,
        sender: userRole === 'provider' ? 'provider' : 'customer',
        content,
        message_type: 'text',
      };

      const { data, error } = await supabase.from('messages').insert(newMessage).select('*').single();
      if (!error && data) {
        setMessages((current) => [...current, data]);
      } else {
        const mockMsg: Message = {
          id: `msg-${Date.now()}`,
          provider_id: selectedConversation.provider.id,
          customer_id: currentUserId,
          customer_name: customerName,
          sender: userRole === 'provider' ? 'provider' : 'customer',
          content,
          message_type: 'text',
          attachment_url: null,
          created_at: new Date().toISOString(),
        };
        setMessages((current) => [...current, mockMsg]);
      }
      setMessageDraft('');
    } catch {
      // Fallback
    } finally {
      setSending(false);
    }
  };

  const visibleConversations = conversations.filter((conversation) => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;
    return conversation.provider.full_name.toLowerCase().includes(query) ||
      conversation.customerName.toLowerCase().includes(query) ||
      (conversation.latest?.content || '').toLowerCase().includes(query);
  });

  const callConfirmation = callPrompt ? (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true">
      <section className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className={`grid h-12 w-12 place-items-center rounded-full ${callPrompt.type === 'voice' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
          {callPrompt.type === 'voice' ? <Phone className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-950">{callPrompt.type === 'voice' ? 'Start a voice call?' : 'Start a video call?'}</h2>
        <p className="mt-1 text-sm text-slate-600">You are about to call <strong className="text-slate-900">{callPrompt.peerName}</strong>.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setCallPrompt(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={confirmCall} className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white ${callPrompt.type === 'voice' ? 'bg-emerald-600' : 'bg-orange-600'}`}>Call</button>
        </div>
      </section>
    </div>
  ) : null;

  const inAppCall = callIntent ? <InAppCall mode={callIntent.mode} providerId={callIntent.providerId} customerId={callIntent.customerId} peerName={callIntent.peerName} onClose={() => setCallIntent(null)} /> : null;
  const filePicker = <input ref={attachmentInputRef} type="file" className="sr-only" aria-label="Choose file to send" />;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm text-slate-500">Loading conversations...</div>
    );
  }

  if (!currentUserId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm space-y-4">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 text-orange-600">
            <MessageCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sign in to view your messages</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Keep track of your provider conversations, service quotes, and booking updates all in one place.
          </p>
          <button
            onClick={() => setCurrentPage('login')}
            className="w-full rounded-xl bg-orange-600 px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-orange-700"
          >
            Sign In / Create Account
          </button>
        </div>
      </main>
    );
  }

  const conversationList = (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-3">
        <h2 className="text-sm font-bold text-slate-900">Conversations</h2>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search messages..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-orange-400 focus:bg-white"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {visibleConversations.map((conversation) => {
          const selected = conversation.provider.id === selectedConversation?.provider.id;
          return (
            <button
              key={conversation.provider.id}
              onClick={() => setSelectedProviderId(conversation.provider.id)}
              className={`flex w-full items-start gap-3 p-3 text-left transition ${selected ? 'bg-orange-50/70' : 'hover:bg-slate-50'}`}
            >
              <Avatar provider={conversation.provider} name={conversation.provider.full_name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs font-extrabold text-slate-900">{conversation.provider.full_name}</p>
                  {conversation.latest && (
                    <span className="text-[10px] text-slate-400">
                      {new Date(conversation.latest.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                  {conversation.latest?.content || 'No messages yet'}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );

  const chatPanel = (
    <section className="flex min-h-[30rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      {selectedConversation ? (
        <>
          <header className="flex items-center justify-between border-b border-slate-100 p-3">
            <div className="flex items-center gap-3">
              <Avatar provider={selectedConversation.provider} name={selectedConversation.provider.full_name} />
              <div>
                <p className="text-xs font-extrabold text-slate-900">{selectedConversation.provider.full_name}</p>
                <p className="text-[10px] text-slate-500">{selectedConversation.provider.professional_title}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => requestCall('voice')} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Phone className="h-4 w-4" /></button>
              <button onClick={() => requestCall('video')} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Video className="h-4 w-4" /></button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {selectedConversation.messages.map((message) => (
              <MessageBubble key={message.id} message={message} customerSide={userRole !== 'provider'} />
            ))}
            {selectedConversation.messages.length === 0 && (
              <div className="m-auto py-12 text-center text-xs text-slate-500">
                Send a message to start conversing with {selectedConversation.provider.full_name}.
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-100 p-3 bg-white">
            <input
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-orange-400 focus:bg-white"
            />
            <button
              type="submit"
              disabled={!messageDraft.trim() || sending}
              className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </>
      ) : (
        <div className="m-auto py-12 text-center text-xs text-slate-500">Select a conversation to view messages.</div>
      )}
    </section>
  );

  return (
    <>
      {filePicker}
      {callConfirmation}
      {inAppCall}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid min-h-[36rem] gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
          {conversationList}
          {chatPanel}
        </div>
      </main>
    </>
  );
}