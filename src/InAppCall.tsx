import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type CallType = 'voice' | 'video';
type CallSignal = {
  action: 'invite' | 'offer' | 'answer' | 'ice' | 'hangup' | 'decline';
  callId: string;
  senderId: string;
  callerName?: string;
  callType?: CallType;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};
type ActiveCall = {
  id: string;
  type: CallType;
  peerName: string;
  phase: 'incoming' | 'calling' | 'active';
};

export function InAppCall({
  providerId,
  customerId,
  currentUserId,
  callerName,
  peerName,
  request,
  onRequestHandled,
}: {
  providerId: string;
  customerId: string;
  currentUserId: string;
  callerName: string;
  peerName: string;
  request: { id: number; type: CallType } | null;
  onRequestHandled: () => void;
}) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const activeCallRef = useRef<ActiveCall | null>(null);
  const queuedOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const queuedCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const [channelReady, setChannelReady] = useState(false);
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState('');
  const handledRequestRef = useRef<number | null>(null);
  const pendingRequestRef = useRef<CallType | null>(null);

  const updateCall = (next: ActiveCall | null) => {
    activeCallRef.current = next;
    setCall(next);
  };

  const sendSignal = async (signal: Omit<CallSignal, 'senderId'>) => {
    const channel = channelRef.current;
    if (!channel) throw new Error('The secure call channel is not connected.');
    const result = await channel.send({
      type: 'broadcast',
      event: 'call-signal',
      payload: { ...signal, senderId: currentUserId },
    });
    if (result !== 'ok') throw new Error(`Call signal could not be sent (${result}).`);
  };

  const closeMedia = () => {
    peerRef.current?.close();
    peerRef.current = null;
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    queuedOfferRef.current = null;
    queuedCandidatesRef.current = [];
    updateCall(null);
    setMuted(false);
    setCameraOff(false);
  };

  const createPeer = (stream: MediaStream, callId: string) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peerRef.current = peer;
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    peer.ontrack = (event) => {
      const [incoming] = event.streams;
      if (incoming) setRemoteStream(incoming);
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        void sendSignal({ action: 'ice', callId, candidate: event.candidate.toJSON() })
          .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Call network details could not be sent.'));
      }
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        const current = activeCallRef.current;
        if (current) updateCall({ ...current, phase: 'active' });
      } else if (peer.connectionState === 'failed') {
        setError('The call could not connect. Your network may require a TURN relay.');
      }
    };
    return peer;
  };

  const limitCallData = async (peer: RTCPeerConnection) => {
    for (const sender of peer.getSenders()) {
      if (!sender.track || !sender.getParameters || !sender.setParameters) continue;
      const parameters = sender.getParameters();
      const encoding = parameters.encodings[0];
      if (!encoding) continue;
      if (sender.track.kind === 'audio') {
        encoding.maxBitrate = 24_000;
      } else {
        encoding.maxBitrate = 180_000;
        encoding.maxFramerate = 15;
        encoding.scaleResolutionDownBy = Math.max(encoding.scaleResolutionDownBy || 1, 1.5);
      }
      try {
        await sender.setParameters(parameters);
      } catch {
        setError('Your browser could not apply all low-data call settings. Voice calls use less data than video.');
      }
    }
  };

  const applyQueuedCandidates = async (peer: RTCPeerConnection) => {
    const candidates = queuedCandidatesRef.current.splice(0);
    for (const candidate of candidates) await peer.addIceCandidate(candidate);
  };

  const handleSignal = async (signal: CallSignal) => {
    if (!signal || signal.senderId === currentUserId || !signal.callId) return;
    const active = activeCallRef.current;
    if (signal.action === 'invite') {
      if (active) return;
      updateCall({
        id: signal.callId,
        type: signal.callType || 'voice',
        peerName: signal.callerName || peerName,
        phase: 'incoming',
      });
      setError('');
      return;
    }
    if (!active || active.id !== signal.callId) return;

    if (signal.action === 'offer' && signal.description) {
      queuedOfferRef.current = signal.description;
      const peer = peerRef.current;
      if (peer && peer.signalingState === 'stable') {
        await peer.setRemoteDescription(signal.description);
        await applyQueuedCandidates(peer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await sendSignal({ action: 'answer', callId: signal.callId, description: answer });
      }
    } else if (signal.action === 'answer' && signal.description && peerRef.current) {
      await peerRef.current.setRemoteDescription(signal.description);
      await applyQueuedCandidates(peerRef.current);
    } else if (signal.action === 'ice' && signal.candidate) {
      const peer = peerRef.current;
      if (peer?.remoteDescription) await peer.addIceCandidate(signal.candidate);
      else queuedCandidatesRef.current.push(signal.candidate);
    } else if (signal.action === 'hangup' || signal.action === 'decline') {
      closeMedia();
      setError(signal.action === 'decline' ? 'The other participant declined the call.' : 'The other participant ended the call.');
    }
  };
  const handleSignalRef = useRef(handleSignal);
  handleSignalRef.current = handleSignal;
  const closeMediaRef = useRef(closeMedia);
  closeMediaRef.current = closeMedia;

  useEffect(() => {
    if (!providerId || !customerId || !currentUserId) return;
    let active = true;
    const channel = supabase.channel(`homicare-call:${providerId}:${customerId}`, {
      config: { private: true },
    });
    channelRef.current = channel;
    channel
      .on('broadcast', { event: 'call-signal' }, ({ payload }) => {
        void handleSignalRef.current(payload as CallSignal).catch((cause: unknown) => {
          if (active) setError(cause instanceof Error ? cause.message : 'An incoming call signal could not be processed.');
        });
      })
      .subscribe((status) => {
        if (!active) return;
        setChannelReady(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('The secure call channel is unavailable. Apply the HomiCare call-signaling migration and verify Supabase Realtime is enabled.');
        }
      });
    return () => {
      active = false;
      channelRef.current = null;
      void supabase.removeChannel(channel);
      closeMediaRef.current();
    };
  }, [providerId, customerId, currentUserId]);

  const startCall = async (type: CallType) => {
    if (!channelReady) {
      setError('The secure call channel is still connecting. Try again in a moment.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot access a microphone or camera. Use HTTPS or a supported browser.');
      return;
    }
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: type === 'video'
          ? { width: { ideal: 480, max: 480 }, height: { ideal: 270, max: 270 }, frameRate: { ideal: 15, max: 15 } }
          : false,
      });
      localRef.current = stream;
      setLocalStream(stream);
      const callId = crypto.randomUUID();
      updateCall({ id: callId, type, peerName, phase: 'calling' });
      const peer = createPeer(stream, callId);
      await limitCallData(peer);
      await sendSignal({ action: 'invite', callId, callerName, callType: type });
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendSignal({ action: 'offer', callId, description: offer });
    } catch (cause) {
      closeMedia();
      setError(cause instanceof Error ? cause.message : 'Could not start the call. Check microphone and camera permissions.');
    }
  };

  const acceptCall = async () => {
    const incoming = activeCallRef.current;
    if (!incoming || incoming.phase !== 'incoming') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot access a microphone or camera. Use HTTPS or a supported browser.');
      return;
    }
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: incoming.type === 'video'
          ? { width: { ideal: 480, max: 480 }, height: { ideal: 270, max: 270 }, frameRate: { ideal: 15, max: 15 } }
          : false,
      });
      localRef.current = stream;
      setLocalStream(stream);
      const peer = createPeer(stream, incoming.id);
      await limitCallData(peer);
      const offer = queuedOfferRef.current;
      if (offer) {
        await peer.setRemoteDescription(offer);
        await applyQueuedCandidates(peer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await sendSignal({ action: 'answer', callId: incoming.id, description: answer });
      }
      updateCall({ ...incoming, phase: 'calling' });
    } catch (cause) {
      closeMedia();
      setError(cause instanceof Error ? cause.message : 'Could not answer the call. Check microphone and camera permissions.');
    }
  };

  const endCall = async (action: 'hangup' | 'decline' = 'hangup') => {
    const active = activeCallRef.current;
    if (active) {
      try {
        await sendSignal({ action, callId: active.id });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'The call ended, but the other participant could not be notified.');
      }
    }
    closeMedia();
  };

  useEffect(() => {
    if (!request || handledRequestRef.current === request.id) return;
    handledRequestRef.current = request.id;
    onRequestHandled();
    if (channelReady) void startCall(request.type);
    else pendingRequestRef.current = request.type;
  }, [request, onRequestHandled, channelReady]);

  useEffect(() => {
    if (!channelReady || !pendingRequestRef.current) return;
    const type = pendingRequestRef.current;
    pendingRequestRef.current = null;
    void startCall(type);
  }, [channelReady]);

  if (!call && !error) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-label="In-app call">
      <section className="w-full max-w-xl overflow-hidden rounded-2xl bg-slate-900 text-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div><p className="text-sm font-bold">{call ? `${call.type === 'video' ? 'Video' : 'Voice'} call` : 'Call unavailable'}</p><p className="text-xs text-slate-300">{call?.peerName || 'HomiCare call'}</p></div>
          <button onClick={() => void endCall()} aria-label="Close call" className="rounded-lg p-2 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </header>
        {call?.type === 'video' && <div className="relative grid min-h-64 place-items-center bg-black">
          {remoteStream ? <video autoPlay playsInline ref={(element) => { if (element && element.srcObject !== remoteStream) element.srcObject = remoteStream; }} className="max-h-[55vh] w-full object-contain" /> : <p className="p-8 text-sm text-slate-300">{call.phase === 'incoming' ? 'Incoming video call' : 'Waiting for the other participant...'}</p>}
          {localStream && <video autoPlay muted playsInline ref={(element) => { if (element && element.srcObject !== localStream) element.srcObject = localStream; }} className="absolute bottom-3 right-3 aspect-video w-28 rounded-lg border border-white/30 bg-slate-800 object-cover" />}
        </div>}
        {call?.type === 'voice' && remoteStream && <audio autoPlay playsInline ref={(element) => { if (element && element.srcObject !== remoteStream) element.srcObject = remoteStream; }} />}
        {call && <p className="px-4 py-3 text-center text-sm text-slate-200">{call.phase === 'incoming' ? 'Incoming call' : call.phase === 'active' ? 'Connected' : 'Calling…'}</p>}
        {error && <p role="alert" className="mx-4 my-3 rounded-lg bg-red-950/70 p-3 text-xs text-red-100">{error}</p>}
        <footer className="flex items-center justify-center gap-3 border-t border-white/10 p-4">
          {call?.phase === 'incoming' ? <>
            <button onClick={() => void acceptCall()} className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold hover:bg-emerald-500">Answer</button>
            <button onClick={() => void endCall('decline')} className="grid h-12 w-12 place-items-center rounded-full bg-red-600 hover:bg-red-500" aria-label="Decline call"><PhoneOff className="h-5 w-5" /></button>
          </> : call ? <>
            <button onClick={() => { const next = !muted; localRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; }); setMuted(next); }} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}>{muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</button>
            {call.type === 'video' && <button onClick={() => { const next = !cameraOff; localRef.current?.getVideoTracks().forEach((track) => { track.enabled = !next; }); setCameraOff(next); }} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}>{cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}</button>}
            <button onClick={() => void endCall()} className="grid h-12 w-12 place-items-center rounded-full bg-red-600 hover:bg-red-500" aria-label="End call"><PhoneOff className="h-5 w-5" /></button>
          </> : <button onClick={() => setError('')} className="rounded-lg border border-white/20 px-4 py-2 text-sm">Dismiss</button>}
        </footer>
      </section>
    </div>
  );
}
