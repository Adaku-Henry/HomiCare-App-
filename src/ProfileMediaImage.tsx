import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

async function resolveProfileMedia(source: string): Promise<string | null> {
  const trimmed = source.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const publicMarker = '/storage/v1/object/public/profile-media/';
    const signedMarker = '/storage/v1/object/sign/profile-media/';
    const markers = [publicMarker, signedMarker];
    const marker = markers.find((candidate) => trimmed.includes(candidate));
    if (!marker) return trimmed;

    const encodedPath = trimmed.slice(trimmed.indexOf(marker) + marker.length).split('?')[0];
    const path = decodeURIComponent(encodedPath);
    const { data, error } = await supabase.storage.from('profile-media').createSignedUrl(path, 3600);
    return error ? null : data.signedUrl;
  }

  const path = trimmed.replace(/^\/+/, '');
  const { data, error } = await supabase.storage.from('profile-media').createSignedUrl(path, 3600);
  return error ? null : data.signedUrl;
}

export function ProfileMediaImage({ source, alt, className }: { source: string | null | undefined; alt: string; className: string }) {
  const [resolvedSource, setResolvedSource] = useState('');
  useEffect(() => {
    let active = true;
    if (!source) { setResolvedSource(''); return; }
    resolveProfileMedia(source).then((url) => { if (active) setResolvedSource(url || ''); });
    return () => { active = false; };
  }, [source]);
  return resolvedSource ? <img src={resolvedSource} alt={alt} className={className} /> : null;
}

export function ProfileMediaVideo({ source, label, className }: { source: string | null | undefined; label: string; className: string }) {
  const [resolvedSource, setResolvedSource] = useState('');
  useEffect(() => {
    let active = true;
    if (!source) { setResolvedSource(''); return; }
    resolveProfileMedia(source).then((url) => { if (active) setResolvedSource(url || ''); });
    return () => { active = false; };
  }, [source]);
  return resolvedSource ? <video src={resolvedSource} aria-label={label} className={className} controls playsInline preload="metadata" /> : null;
}