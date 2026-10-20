import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Clock3, Globe2, Linkedin, MapPin, MessageCircle, Phone, Search, Send, UserPlus, Users, Video, X } from 'lucide-react';
import { InAppCall } from '@/InAppCall';
import { ProfileMediaImage } from '@/ProfileMediaImage';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

interface MemberProfile {
  user_id: string;
  public_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  district: string | null;
  country: string;
  phone: string | null;
  occupation: string | null;
  household_interests: string | null;
  website: string | null;
  linkedin: string | null;
  facebook: string | null;
  provider_id: string | null;
  professional_title: string | null;
}

interface MemberConnection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
}

interface MemberMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
}

type DirectoryTab = 'discover' | 'requests' | 'connections';

function MemberAvatar({ profile, size = 'md' }: { profile: MemberProfile; size?: 'md' | 'lg' }) {
  return <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-violet-100 font-bold text-violet-900 ${size === 'lg' ? 'h-16 w-16 text-xl' : 'h-11 w-11 text-sm'}`}>
    {profile.avatar_url
      ? <ProfileMediaImage source={profile.avatar_url} alt="" className="h-full w-full object-cover" />
      : profile.display_name.slice(0, 1).toUpperCase()}
  </span>;
}

function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function PeoplePage({ conversation = false }: { conversation?: boolean }) {
  const {
    setCurrentPage, setSelectedProviderId, selectedPublicProfileId, setSelectedPublicProfileId, setCallIntent,
  } = useApp();
  const [userId, setUserId] = useState('');
  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [connections, setConnections] = useState<MemberConnection[]>([]);
  const [messages, setMessages] = useState<MemberMessage[]>([]);
  const [hasMoreProfiles, setHasMoreProfiles] = useState(false);
  const [loadingMoreProfiles, setLoadingMoreProfiles] = useState(false);
  const [activeTab, setActiveTab] = useState<DirectoryTab>('discover');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [memberCallRequest, setMemberCallRequest] = useState<{ id: number; type: 'voice' | 'video' } | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setUserId('');
        setProfiles([]);
        setConnections([]);
        setMessages([]);
        setError('Sign in to discover HomiCare members and manage connections.');
        return;
      }
      setUserId(authData.user.id);
      const [profileResult, connectionResult, messageResult] = await Promise.all([
        supabase.from('member_directory_profiles')
          .select('user_id, public_id, display_name, avatar_url, bio, city, district, country, phone, occupation, household_interests, website, linkedin, facebook, provider_id, professional_title')
          .order('display_name')
          .range(0, 199),
        supabase.from('member_connections')
          .select('id, requester_id, addressee_id, status, created_at, updated_at')
          .order('updated_at', { ascending: false })
          .limit(500),
        supabase.from('member_messages')
          .select('id, sender_id, recipient_id, content, created_at')
          .order('created_at')
          .limit(500),
      ]);
      const issue = profileResult.error || connectionResult.error || messageResult.error;
      if (issue) throw issue;
      setProfiles((profileResult.data || []) as MemberProfile[]);
      setHasMoreProfiles((profileResult.data || []).length === 200);
      setConnections((connectionResult.data || []) as MemberConnection[]);
      setMessages((messageResult.data || []) as MemberMessage[]);
    } catch (cause) {
      setError(cause instanceof Error
        ? cause.message
        : 'Member profiles could not be loaded. Check the HomiCare member-discovery migration and your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const loadMoreProfiles = async () => {
    setLoadingMoreProfiles(true);
    setError('');
    const { data, error: pageError } = await supabase.from('member_directory_profiles')
      .select('user_id, public_id, display_name, avatar_url, bio, city, district, country, phone, occupation, household_interests, website, linkedin, facebook, provider_id, professional_title')
      .order('display_name')
      .range(profiles.length, profiles.length + 199);
    setLoadingMoreProfiles(false);
    if (pageError) {
      setError(pageError.message);
      return;
    }
    const nextProfiles = (data || []) as MemberProfile[];
    setProfiles((current) => [...current, ...nextProfiles]);
    setHasMoreProfiles(nextProfiles.length === 200);
  };

  const profileByUserId = useMemo(
    () => new Map(profiles.map((profile) => [profile.user_id, profile])),
    [profiles],
  );
  const selectedProfile = profiles.find((profile) => profile.public_id === selectedPublicProfileId) || null;
  const currentConnection = selectedProfile
    ? connections.find((connection) => (
      (connection.requester_id === userId && connection.addressee_id === selectedProfile.user_id)
      || (connection.addressee_id === userId && connection.requester_id === selectedProfile.user_id)
    )) || null
    : null;
  const threadMessages = selectedProfile
    ? messages.filter((message) => (
      (message.sender_id === userId && message.recipient_id === selectedProfile.user_id)
      || (message.sender_id === selectedProfile.user_id && message.recipient_id === userId)
    ))
    : [];
  const incomingRequests = connections.filter((connection) => connection.status === 'pending' && connection.addressee_id === userId);
  const acceptedConnections = connections.filter((connection) => connection.status === 'accepted');
  const outgoingRequests = connections.filter((connection) => connection.status === 'pending' && connection.requester_id === userId);

  const discoverableProfiles = profiles.filter((profile) => profile.user_id !== userId);
  const visibleProfiles = discoverableProfiles.filter((profile) => (
    `${profile.display_name} ${profile.occupation || ''} ${profile.professional_title || ''} ${profile.city || ''} ${profile.district || ''} ${profile.bio || ''} ${profile.household_interests || ''}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase())
  ));

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`member-messages:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'member_messages', filter: `recipient_id=eq.${userId}`,
      }, (payload) => {
        const incoming = payload.new as MemberMessage;
        setMessages((current) => current.some((message) => message.id === incoming.id) ? current : [...current, incoming]);
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'member_messages', filter: `sender_id=eq.${userId}`,
      }, (payload) => {
        const incoming = payload.new as MemberMessage;
        setMessages((current) => current.some((message) => message.id === incoming.id) ? current : [...current, incoming]);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setNotice('Live message updates are unavailable. Reload to check for new messages.');
        }
      });
    return () => { void supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [threadMessages.length]);

  const openMessage = (profile: MemberProfile) => {
    setError('');
    setNotice('');
    setSelectedPublicProfileId(profile.public_id);
    setCurrentPage('member-messages');
  };

  const requestConnection = async (profile: MemberProfile) => {
    setSaving(true);
    setError('');
    setNotice('');
    const { error: requestError } = await supabase.rpc('request_member_connection', {
      p_profile_public_id: profile.public_id,
    });
    setSaving(false);
    if (requestError) {
      setError(requestError.message);
      return;
    }
    setNotice(`Connection request sent to ${profile.display_name}.`);
    await loadData();
  };

  const respondToRequest = async (connection: MemberConnection, accept: boolean) => {
    setSaving(true);
    setError('');
    setNotice('');
    const { error: responseError } = await supabase.rpc('respond_member_connection', {
      p_connection_id: connection.id,
      p_accept: accept,
    });
    setSaving(false);
    if (responseError) {
      setError(responseError.message);
      return;
    }
    setNotice(accept ? 'Connection accepted. You can now message each other.' : 'Connection request declined.');
    await loadData();
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!selectedProfile || !content || sending) return;
    if (!currentConnection || currentConnection.status !== 'accepted') {
      setError('Accept the connection before sending a message.');
      return;
    }
    if (content.length > 4000) {
      setError('Messages can be up to 4,000 characters.');
      return;
    }
    setSending(true);
    setError('');
    const { data, error: sendError } = await supabase.from('member_messages')
      .insert({ sender_id: userId, recipient_id: selectedProfile.user_id, content })
      .select('id, sender_id, recipient_id, content, created_at')
      .single();
    setSending(false);
    if (sendError || !data) {
      setError(sendError?.message || 'Message was not sent. Check your connection and try again.');
      return;
    }
    setMessages((current) => current.some((message) => message.id === data.id) ? current : [...current, data as MemberMessage]);
    setDraft('');
  };

  const startMemberCall = (type: 'voice' | 'video') => {
    if (!selectedProfile) return;
    setCallIntent({
      mode: type,
      providerId: selectedProfile.provider_id || selectedProfile.user_id,
      customerId: userId,
      peerName: selectedProfile.display_name,
    });
  };

  const connectionFor = (profile: MemberProfile) => connections.find((connection) => (
    (connection.requester_id === userId && connection.addressee_id === profile.user_id)
    || (connection.addressee_id === userId && connection.requester_id === profile.user_id)
  ));

  const connectionButton = (profile: MemberProfile) => {
    const connection = connectionFor(profile);
    if (connection?.status === 'accepted') {
      return <button onClick={() => openMessage(profile)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-800 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-900"><MessageCircle className="h-3.5 w-3.5" />Message</button>;
    }
    if (connection?.status === 'pending' && connection.requester_id === userId) {
      return <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"><Clock3 className="h-3.5 w-3.5" />Request sent</span>;
    }
    if (connection?.status === 'pending') {
      return <button onClick={() => setActiveTab('requests')} className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 px-3 py-2 text-xs font-semibold text-orange-800">Respond</button>;
    }
    return <button disabled={saving} onClick={() => void requestConnection(profile)} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50"><UserPlus className="h-3.5 w-3.5" />Connect</button>;
  };

  const activeCall = selectedProfile && currentConnection?.status === 'accepted' ? <InAppCall
    providerId={userId < selectedProfile.user_id ? userId : selectedProfile.user_id}
    customerId={userId < selectedProfile.user_id ? selectedProfile.user_id : userId}
    currentUserId={userId}
    callerName="HomiCare member"
    peerName={selectedProfile.display_name}
    request={memberCallRequest}
    onRequestHandled={() => setMemberCallRequest(null)}
  /> : null;

  const feedback = (error || notice) && <div className={`mb-4 rounded-lg border p-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`} role={error ? 'alert' : 'status'}>{error || notice}</div>;

  if (!userId && !loading) return <main className="mx-auto max-w-3xl px-4 py-10"><div className="rounded-xl border border-slate-200 bg-white p-6 text-center"><Users className="mx-auto h-8 w-8 text-violet-700" /><h1 className="mt-3 text-xl font-bold text-slate-950">HomiCare members</h1>{feedback}<p className="text-sm text-slate-600">Sign in to discover profiles, accept connections, and message HomiCare members.</p><button onClick={() => setCurrentPage('login')} className="mt-4 rounded-lg bg-violet-800 px-4 py-2.5 text-sm font-semibold text-white">Sign in</button></div></main>;

  if (loading) return <main className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-slate-500">Loading HomiCare member directory…</main>;

  if (conversation) {
    const callPeerId = selectedProfile?.user_id || '';
    return <main className="mx-auto max-w-5xl px-3 py-4 sm:px-5">
      {activeCall}
      <button onClick={() => { setSelectedPublicProfileId(null); setCurrentPage('people'); }} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-violet-900"><ArrowLeft className="h-4 w-4" />Back to members</button>
      {feedback}
      {!selectedProfile ? <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">This profile is no longer discoverable to you. Ask the member to change their privacy setting before starting a new conversation.</section>
        : currentConnection?.status !== 'accepted' ? <article className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-4"><MemberAvatar profile={selectedProfile} size="lg" /><div className="min-w-0 flex-1"><h1 className="text-xl font-bold text-slate-950">{selectedProfile.display_name}</h1><p className="mt-1 text-sm text-violet-800">{selectedProfile.professional_title || selectedProfile.occupation || 'HomiCare member'}</p>{[selectedProfile.city, selectedProfile.district, selectedProfile.country].filter(Boolean).length > 0 && <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{[selectedProfile.city, selectedProfile.district, selectedProfile.country].filter(Boolean).join(', ')}</p>}</div></div>
          {selectedProfile.bio && <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{selectedProfile.bio}</p>}
          {selectedProfile.household_interests && <p className="mt-4 text-sm text-slate-600"><strong>Interests:</strong> {selectedProfile.household_interests}</p>}
          {selectedProfile.phone && <p className="mt-4 text-sm text-slate-600"><strong>Phone:</strong> {selectedProfile.phone}</p>}
          <div className="mt-4 flex flex-wrap gap-3 text-sm">{safeExternalUrl(selectedProfile.website) && <a href={safeExternalUrl(selectedProfile.website) || undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-800 underline"><Globe2 className="h-4 w-4" />Website</a>}{safeExternalUrl(selectedProfile.linkedin) && <a href={safeExternalUrl(selectedProfile.linkedin) || undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-800 underline"><Linkedin className="h-4 w-4" />LinkedIn</a>}{safeExternalUrl(selectedProfile.facebook) && <a href={safeExternalUrl(selectedProfile.facebook) || undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-800 underline">Facebook</a>}</div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">{connectionButton(selectedProfile)}{selectedProfile.provider_id && <button onClick={() => { setSelectedProviderId(selectedProfile.provider_id); setCurrentPage('provider'); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Provider services</button>}</div>
        </article>
          : <section className="mx-auto flex h-[min(78dvh,760px)] max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center gap-3 border-b border-slate-100 p-4">
              <MemberAvatar profile={selectedProfile} />
              <div className="min-w-0 flex-1"><h1 className="truncate text-base font-bold text-slate-950">{selectedProfile.display_name}</h1><p className="truncate text-xs text-slate-500">{selectedProfile.occupation || 'HomiCare member'}</p></div>
              <button onClick={() => startMemberCall('voice')} aria-label="Start voice call" title="Voice call" className="rounded-lg border border-emerald-200 p-2 text-emerald-800 hover:bg-emerald-50"><Phone className="h-4 w-4" /></button>
              <button onClick={() => startMemberCall('video')} aria-label="Start video call" title="Video call" className="rounded-lg border border-violet-200 p-2 text-violet-800 hover:bg-violet-50"><Video className="h-4 w-4" /></button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
              {threadMessages.map((message) => {
                const mine = message.sender_id === userId;
                return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-violet-800 text-white' : 'border border-slate-200 bg-white text-slate-900'}`}><p className="whitespace-pre-wrap break-words">{message.content}</p><time className={`mt-1 block text-right text-[10px] ${mine ? 'text-violet-200' : 'text-slate-400'}`}>{new Date(message.created_at).toLocaleString()}</time></div></div>;
              })}
              {threadMessages.length === 0 && <p className="m-auto max-w-sm text-center text-sm text-slate-500">You are connected. Send a message to start a conversation with {selectedProfile.display_name}.</p>}
              <div ref={endOfMessagesRef} />
            </div>
            <form onSubmit={(event) => void sendMessage(event)} className="flex gap-2 border-t border-slate-100 p-3">
              <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} aria-label="Write a message" placeholder="Write a message…" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400" />
              <button disabled={sending || !draft.trim()} aria-label="Send message" className="inline-flex items-center gap-2 rounded-lg bg-violet-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" /><span className="hidden sm:inline">{sending ? 'Sending…' : 'Send'}</span></button>
            </form>
            {!callPeerId && <p className="px-3 pb-2 text-xs text-red-700">The member account could not be resolved for this conversation.</p>}
          </section>}
    </main>;
  }

  return <main className="mx-auto max-w-6xl px-3 py-5 sm:px-5">
    <header className="mb-4 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 to-orange-50 p-5 sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-violet-800">HomiCare community</p>
      <h1 className="mt-1 text-2xl font-black text-slate-950">Discover and connect with members</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">Only profiles set to Public or HomiCare Users appear here. Phone numbers and neighborhood details stay hidden unless the member explicitly shares them.</p>
    </header>
    {feedback}
    <div className="mb-4 flex gap-2 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Member directory">
      {([
        { id: 'discover' as const, label: 'Discover' },
        { id: 'requests' as const, label: `Requests${incomingRequests.length ? ` (${incomingRequests.length})` : ''}` },
        { id: 'connections' as const, label: `Connections (${acceptedConnections.length})` },
      ]).map((tab) => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold ${activeTab === tab.id ? 'border-violet-800 text-violet-900' : 'border-transparent text-slate-500'}`}>{tab.label}</button>)}
    </div>

    {activeTab === 'discover' && <>
      <label className="relative mb-4 block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, work, or location" aria-label="Search HomiCare members" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-violet-400" /></label>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleProfiles.map((profile) => <article key={profile.public_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3"><MemberAvatar profile={profile} /><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold text-slate-950">{profile.display_name}</h2><p className="mt-0.5 truncate text-xs text-violet-800">{profile.professional_title || profile.occupation || 'HomiCare member'}</p>{profile.provider_id && <span className="mt-1 inline-block rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-800">Service provider</span>}{(profile.city || profile.district || profile.country) && <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-slate-500"><MapPin className="h-3 w-3 shrink-0" />{[profile.city, profile.district, profile.country].filter(Boolean).join(', ')}</p>}</div></div>
        {profile.bio && <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-slate-600">{profile.bio}</p>}
        {profile.household_interests && <p className="mt-2 line-clamp-2 text-[11px] text-slate-500">Interests: {profile.household_interests}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">{connectionButton(profile)}<button onClick={() => openMessage(profile)} className="text-xs font-semibold text-violet-800 underline underline-offset-2">View details</button></div>
      </article>)}</div>
      {visibleProfiles.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><Users className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 text-sm font-bold text-slate-900">{discoverableProfiles.length ? 'No members match your search' : 'No profiles are discoverable yet'}</h2><p className="mt-1 text-xs text-slate-500">{discoverableProfiles.length ? 'Try another name, occupation, or area.' : 'Members need to set Profile Visibility to “HomiCare Users” or “Public” in Profile Settings.'}</p><button onClick={() => setCurrentPage('privacy-settings')} className="mt-3 text-xs font-semibold text-violet-800 underline">Manage my profile visibility</button></div>}
      {hasMoreProfiles && <div className="mt-4 text-center"><button disabled={loadingMoreProfiles} onClick={() => void loadMoreProfiles()} className="rounded-lg border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-900 disabled:opacity-50">{loadingMoreProfiles ? 'Loading…' : 'Load more members'}</button></div>}
    </>}

    {activeTab === 'requests' && <section className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {incomingRequests.map((connection) => {
        const profile = profileByUserId.get(connection.requester_id);
        if (!profile) return null;
        return <div key={connection.id} className="flex flex-wrap items-center gap-3 p-4"><MemberAvatar profile={profile} /><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-950">{profile.display_name}</p><p className="text-xs text-slate-500">{profile.occupation || 'HomiCare member'} · sent {new Date(connection.created_at).toLocaleDateString()}</p></div><button disabled={saving} onClick={() => void respondToRequest(connection, true)} className="inline-flex items-center gap-1 rounded-lg bg-violet-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />Accept</button><button disabled={saving} onClick={() => void respondToRequest(connection, false)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><X className="h-3.5 w-3.5" />Decline</button></div>;
      })}
      {outgoingRequests.map((connection) => {
        const profile = profileByUserId.get(connection.addressee_id);
        return profile ? <div key={connection.id} className="flex items-center gap-3 p-4"><MemberAvatar profile={profile} /><div><p className="text-sm font-bold text-slate-950">{profile.display_name}</p><p className="text-xs text-slate-500">Connection request sent · awaiting response</p></div></div> : null;
      })}
      {!incomingRequests.length && !outgoingRequests.length && <p className="p-6 text-center text-sm text-slate-500">You have no pending connection requests.</p>}
    </section>}

    {activeTab === 'connections' && <section className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {acceptedConnections.map((connection) => {
        const peerId = connection.requester_id === userId ? connection.addressee_id : connection.requester_id;
        const profile = profileByUserId.get(peerId);
        if (!profile) return null;
        const peerMessages = messages.filter((message) => (
          (message.sender_id === userId && message.recipient_id === peerId)
          || (message.sender_id === peerId && message.recipient_id === userId)
        ));
        const latest = peerMessages[peerMessages.length - 1];
        return <div key={connection.id} className="flex flex-wrap items-center gap-3 p-4"><MemberAvatar profile={profile} /><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-950">{profile.display_name}</p><p className="truncate text-xs text-slate-500">{latest?.content || profile.occupation || 'You are connected'}</p></div><button onClick={() => openMessage(profile)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-800 px-3 py-2 text-xs font-semibold text-white"><MessageCircle className="h-3.5 w-3.5" />Message</button></div>;
      })}
      {!acceptedConnections.length && <p className="p-6 text-center text-sm text-slate-500">You are not connected to other members yet. Find people in Discover and send a request.</p>}
    </section>}
    <p className="mt-5 text-center text-[11px] text-slate-500">Member messages are visible only to the two connected accounts. Never share passwords, verification codes, or payment PINs.</p>
  </main>;
}
