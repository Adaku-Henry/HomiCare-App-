import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle, ArrowRight, BadgeCheck, CalendarDays, Check, ChevronRight,
  Compass, FileText, Heart, Home, MapPin, MessageCircle, Paperclip, Plus,
  Search, Send, ShieldCheck, Share2, Sparkles, Star, Truck, User, UserRoundPlus, Users,
  UsersRound, Wrench, X, Zap, Hammer, Sprout,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { backendRequest } from '@/lib/backend';
import { supabase } from '@/lib/supabase';
import type { HouseholdProperty, Provider, ServiceCategory } from '@/types';
import { formatUGX } from '@/lib/utils';
import { ProfileMediaImage } from '@/ProfileMediaImage';
import cleaningImage from '../images/cleaning.jfif';

interface AssistantMessage {
  role: 'assistant' | 'user';
  text: string;
  action?: { label: string; page: 'search' | 'emergency'; query?: string };
}

const serviceTerms: { terms: string[]; category: string; searchQuery: string }[] = [
  { terms: ['plumb', 'pipe', 'leak', 'drain', 'water tank', 'pump'], category: 'Plumbing', searchQuery: 'plumber' },
  { terms: ['electric', 'wiring', 'power', 'socket', 'solar', 'inverter'], category: 'Electrical', searchQuery: 'electrician' },
  { terms: ['clean', 'laundry'], category: 'Cleaning', searchQuery: 'cleaner' },
  { terms: ['move', 'transport', 'delivery'], category: 'Moving', searchQuery: 'moving' },
  { terms: ['paint'], category: 'Painting', searchQuery: 'painter' },
  { terms: ['carpenter', 'furniture', 'wood'], category: 'Carpentry', searchQuery: 'carpenter' },
];

export function ServiceAssistantPage() {
  const { setCurrentPage, setSearchQuery } = useApp();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { role: 'assistant', text: 'Hello. Tell me what you need help with at home. I can help you find a service category and search HomiCare providers.' },
  ]);

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const request = input.trim();
    if (!request) return;
    const normalized = request.toLowerCase();
    const urgent = /emergency|urgent|danger|fire|gas leak|electric shock|sparking/.test(normalized);
    const match = serviceTerms.find((item) => item.terms.some((term) => normalized.includes(term)));
    let response: AssistantMessage;

    if (urgent) {
      response = {
        role: 'assistant',
        text: 'If someone is in immediate danger, contact local emergency services first. For household work, I can take you to HomiCare emergency guidance. Do not attempt electrical, gas, or structural repairs yourself.',
        action: { label: 'Open emergency guidance', page: 'emergency' },
      };
    } else if (match) {
      response = {
        role: 'assistant',
        text: `This sounds like a ${match.category.toLowerCase()} request. I can search the HomiCare provider directory for matching services. I cannot diagnose the issue or guarantee availability.`,
        action: { label: `Search ${match.category}`, page: 'search', query: match.searchQuery },
      };
    } else {
      response = {
        role: 'assistant',
        text: 'I could not confidently identify a service category from that message. Try describing the household task, or browse all services directly.',
        action: { label: 'Browse services', page: 'search', query: '' },
      };
    }

    setMessages((current) => [...current, { role: 'user', text: request }, response]);
    setInput('');
  };

  const runAction = (message: AssistantMessage) => {
    if (!message.action) return;
    setSearchQuery(message.action.query || '');
    setCurrentPage(message.action.page);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-4 rounded-xl bg-gradient-to-br from-violet-900 to-indigo-950 p-5 text-white shadow-homicare">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-200"><Search className="h-4 w-4" /> HomiCare service assistant</p>
        <h1 className="mt-2 text-xl font-bold">What do you need help with?</h1>
        <p className="mt-1 text-sm text-violet-100">Uses service categories and provider search. It is not a diagnostic or emergency service.</p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {['Find a plumber', 'Electrical repair', 'Moving service'].map((prompt) => (
          <button key={prompt} onClick={() => setInput(prompt)} className="rounded-full border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-50">{prompt}</button>
        ))}
      </div>

      <section className="flex-1 space-y-3 rounded-xl border border-violet-100 bg-white p-4" aria-label="Assistant conversation" aria-live="polite">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-br-sm bg-violet-800 text-white' : 'rounded-bl-sm bg-violet-50 text-slate-800'}`}>
              <p>{message.text}</p>
              {message.action && <button onClick={() => runAction(message)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-violet-900 shadow-sm">{message.action.label}<ArrowRight className="h-3.5 w-3.5" /></button>}
            </div>
          </div>
        ))}
      </section>

      <form onSubmit={sendMessage} className="mt-3 flex gap-2 rounded-xl border border-violet-200 bg-white p-2 shadow-sm">
        <input value={input} onChange={(event) => setInput(event.target.value)} className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" placeholder="Describe a service you need..." aria-label="Message the service assistant" />
        <button type="submit" disabled={!input.trim()} aria-label="Send message" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-800 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </form>
      <p className="mt-2 text-center text-[11px] text-slate-500">Your message is processed in this browser and is not sent to an AI service.</p>
    </div>
  );
}

const propertyTypes = ['House', 'Apartment', 'Rental', 'Commercial'];

export function HouseholdManagementPage() {
  const { setCurrentPage, setSearchQuery } = useApp();
  const [properties, setProperties] = useState<HouseholdProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('House');
  const [address, setAddress] = useState('');
  const [bedrooms, setBedrooms] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');
  const [assets, setAssets] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProperties = async () => {
    setLoading(true);
    setError('');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setError('Sign in to manage your home records.');
      setProperties([]);
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase.from('household_properties').select('*').eq('owner_id', authData.user.id).order('created_at', { ascending: false });
    setProperties(data || []);
    if (queryError) setError(queryError.message.includes('owner_id') ? 'Apply the latest HomiCare household migration to enable property records.' : queryError.message);
    setLoading(false);
  };

  useEffect(() => { loadProperties(); }, []);

  const saveProperty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setError('Sign in to save a property.');
      setSaving(false);
      return;
    }
    const { error: insertError } = await supabase.from('household_properties').insert({
      owner_id: authData.user.id,
      owner_name: String(authData.user.user_metadata?.full_name || 'HomiCare customer'),
      property_name: name.trim(),
      property_type: type.toLowerCase(),
      address: address.trim() || null,
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      has_kitchen: true,
      has_compound: false,
      has_garage: false,
      assets: assets.split(',').map((asset) => asset.trim()).filter(Boolean),
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message.includes('owner_id') ? 'Apply the latest HomiCare household migration before saving properties.' : insertError.message);
      return;
    }
    setName('');
    setAddress('');
    setAssets('');
    setFormOpen(false);
    await loadProperties();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-violet-800">My home</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Household management</h1><p className="mt-1 text-sm text-slate-500">Keep properties, household assets, and service history together.</p></div>
        <button onClick={() => setFormOpen(!formOpen)} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-violet-800 px-3 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add home</button>
      </header>

      {error && <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}

      {formOpen && <form onSubmit={saveProperty} className="mb-5 grid gap-3 rounded-xl border border-violet-100 bg-white p-4 sm:grid-cols-2 sm:p-5">
        <h2 className="font-semibold text-slate-900 sm:col-span-2">Add a property</h2>
        <label className="text-sm font-medium">Property name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Family home" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-medium">Property type<select value={type} onChange={(event) => setType(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">{propertyTypes.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="text-sm font-medium sm:col-span-2">Area or address<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="District, neighborhood, or landmark" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Bedrooms<input type="number" min="0" value={bedrooms} onChange={(event) => setBedrooms(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-medium">Bathrooms<input type="number" min="0" value={bathrooms} onChange={(event) => setBathrooms(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label></div>
        <label className="text-sm font-medium">Home assets<input value={assets} onChange={(event) => setAssets(event.target.value)} placeholder="Water tank, solar, generator" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-lg bg-violet-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save property'}</button></div>
      </form>}

      {loading ? <div className="space-y-3"><div className="h-28 animate-pulse rounded-xl bg-violet-100" /><div className="h-28 animate-pulse rounded-xl bg-violet-100" /></div> : properties.length === 0 ? <div className="rounded-xl border border-violet-100 bg-white p-7 text-center"><Home className="mx-auto h-8 w-8 text-violet-800" /><h2 className="mt-3 font-semibold text-slate-900">No homes added yet</h2><p className="mt-1 text-sm text-slate-500">Add a property to organize service history and household assets.</p><button onClick={() => setFormOpen(true)} className="mt-4 rounded-lg bg-violet-800 px-4 py-2.5 text-sm font-semibold text-white">Add your first home</button></div> : <div className="grid gap-4 md:grid-cols-2">
        {properties.map((property) => <article key={property.id} className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-lg bg-violet-100 text-violet-800"><Home className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold text-slate-950">{property.property_name}</h2><p className="text-sm capitalize text-slate-500">{property.property_type}</p>{property.address && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{property.address}</p>}</div></div><div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600"><span>{property.bedrooms} bedrooms</span><span>{property.bathrooms} bathrooms</span></div>{property.assets.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{property.assets.map((asset) => <span key={asset} className="rounded-full bg-violet-50 px-2.5 py-1 text-xs text-violet-900">{asset}</span>)}</div>}<div className="mt-4 flex gap-2 border-t border-slate-100 pt-4"><button onClick={() => { setSearchQuery('maintenance'); setCurrentPage('search'); }} className="flex-1 rounded-lg bg-violet-800 px-3 py-2.5 text-xs font-semibold text-white">Book maintenance</button><button onClick={() => setCurrentPage('calendar')} className="flex-1 rounded-lg border border-violet-200 px-3 py-2.5 text-xs font-semibold text-violet-900"><CalendarDays className="mr-1 inline h-3.5 w-3.5" />Service history</button></div></article>)}
      </div>}
      <p className="mt-5 flex items-start gap-2 text-xs text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />Property records are private to your signed-in account. Enter only location details needed to arrange service.</p>
    </div>
  );
}

interface CommunityPost {
  id: string;
  author: string;
  category: string;
  title: string;
  body: string;
  likes: number;
  liked?: boolean;
  image?: string;
  attachments?: CommunityAttachment[];
}

interface CommunityAttachment {
  name: string;
  url: string;
  contentType: string;
}

const communityStorageKey = 'homicare-community-posts';
const communityMediaTypes = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];
const maxCommunityFileSize = 25 * 1024 * 1024;
const communityTabs = ['All', 'Tips', 'Discussions', 'Reviews', 'Help'];
const samplePosts: CommunityPost[] = [
  { id: 'clean-home-tip', author: 'Mary Atim', category: 'Tips', title: 'Best tips for keeping your home clean and fresh!', body: 'A little daily reset goes a long way. What is your favourite way to keep your home feeling fresh?', likes: 24, image: '/doc1-images/image2.jpeg' },
  { id: 'rainy-season', author: 'Sarah N.', category: 'Discussions', title: 'Preparing a home for the rainy season', body: 'What maintenance do you schedule before the heavy rains? I’m checking gutters and the roof this weekend.', likes: 12 },
  { id: 'tank-checklist', author: 'John O.', category: 'Tips', title: 'Water tank maintenance checklist', body: 'Check the tank cover, overflow pipe, and visible connections during your regular inspection.', likes: 8 },
  { id: 'cleaning-safety', author: 'Mary A.', category: 'Help', title: 'Cleaning products and surface safety', body: 'Always read product labels and never mix household cleaning chemicals. What safety resources have helped you?', likes: 16 },
];

function CommunityFeed() {
  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    try {
      const savedPosts = window.localStorage.getItem(communityStorageKey);
      if (!savedPosts) return samplePosts;
      const saved = JSON.parse(savedPosts) as CommunityPost[];
      const savedById = new Map(saved.map((post) => [post.id, post]));
      return [...saved, ...samplePosts.filter((post) => !savedById.has(post.id))];
    } catch {
      return samplePosts;
    }
  });
  const [category, setCategory] = useState('All');
  const [postCategory, setPostCategory] = useState('Tips');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const visiblePosts = category === 'All' ? posts : posts.filter((post) => post.category === category);

  useEffect(() => {
    window.localStorage.setItem(communityStorageKey, JSON.stringify(posts));
  }, [posts]);

  const selectFiles = (selectedFiles: File[]) => {
    const invalidFile = selectedFiles.find((file) => !communityMediaTypes.includes(file.type) || file.size > maxCommunityFileSize);
    if (invalidFile) {
      setNotice(!communityMediaTypes.includes(invalidFile.type)
        ? `${invalidFile.name} has an unsupported file type.`
        : `${invalidFile.name} is larger than 25 MB.`);
      return;
    }
    setFiles((current) => [...current, ...selectedFiles].filter((file, index, allFiles) => allFiles.findIndex((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified) === index));
    setNotice('');
  };

  const publishPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setUploading(true);
    setNotice('');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (files.length && (authError || !authData.user)) {
      setNotice('Sign in before uploading attachments. Your post can still be shared without files.');
      setUploading(false);
      return;
    }

    const uploadedPaths: string[] = [];
    const attachments: CommunityAttachment[] = [];
    try {
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${authData.user!.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from('community-media').upload(path, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        const { data } = supabase.storage.from('community-media').getPublicUrl(path);
        attachments.push({ name: file.name, url: data.publicUrl, contentType: file.type });
      }

      setPosts((current) => [{ id: crypto.randomUUID(), author: 'You', category: postCategory, title: title.trim(), body: body.trim(), likes: 0, attachments }, ...current]);
      setTitle('');
      setBody('');
      setFiles([]);
      setCategory('All');
      setComposerOpen(false);
      setNotice('Your post is saved on this device and attachments are uploaded.');
    } catch (cause) {
      if (uploadedPaths.length) await supabase.storage.from('community-media').remove(uploadedPaths);
      const message = cause instanceof Error ? cause.message : 'Unknown upload error';
      setNotice(`Attachments could not be uploaded. Apply the community media migration and check storage access. ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const sharePost = async (post: CommunityPost) => {
    const shareText = `${post.title}\n${post.body}`;
    try {
      if (navigator.share) await navigator.share({ title: post.title, text: shareText });
      else {
        await navigator.clipboard.writeText(shareText);
        setNotice('Post copied to clipboard.');
      }
    } catch {
      setNotice('Sharing was cancelled.');
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-orange-700">HomiCare · Community</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Community</h1></div><button onClick={() => setComposerOpen((open) => !open)} className="inline-flex shrink-0 items-center gap-2 rounded-md bg-orange-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"><Plus className="h-4 w-4" />New post</button></header>
      <nav aria-label="Community categories" className="mb-4 flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">{communityTabs.map((item) => <button key={item} onClick={() => setCategory(item)} aria-pressed={category === item} className={`shrink-0 rounded-md px-3 py-2 text-xs font-semibold ${category === item ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-800'}`}>{item}</button>)}</nav>
      {notice && <p role="status" className={`mb-3 text-xs ${notice.includes('could not') || notice.includes('Sign in') || notice.includes('unsupported') || notice.includes('larger') ? 'text-red-700' : 'text-emerald-800'}`}>{notice}</p>}
      {composerOpen && <form onSubmit={publishPost} className="mb-4 space-y-3 border-b border-slate-200 bg-white p-4">
        <label className="block text-sm font-semibold text-slate-800">Category<select value={postCategory} onChange={(event) => setPostCategory(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal">{communityTabs.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="block text-sm font-semibold text-slate-800">Title<input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What would you like to share?" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold text-slate-800">Post<textarea required maxLength={1000} value={body} onChange={(event) => setBody(event.target.value)} rows={3} placeholder="Share a tip, question, or review" className="mt-1 block w-full resize-y rounded-md border border-slate-300 px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold text-slate-800">Attachments <span className="font-normal text-slate-500">Images, videos, or documents (25 MB max each)</span><span className="mt-1.5 flex items-center gap-2 rounded-md border border-dashed border-slate-300 p-3 text-sm font-medium text-slate-700 hover:border-orange-500"><Paperclip className="h-4 w-4 text-orange-700" />Choose files<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={(event) => { selectFiles(Array.from(event.target.files || [])); event.currentTarget.value = ''; }} className="sr-only" /></span></label>
        {files.length > 0 && <ul className="space-y-1">{files.map((file, index) => <li key={`${file.name}-${file.lastModified}`} className="flex items-center gap-2 text-xs text-slate-600"><FileText className="h-4 w-4 shrink-0 text-orange-700" /><span className="min-w-0 flex-1 truncate">{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></li>)}</ul>}
        <div className="flex justify-end gap-2"><button type="button" disabled={uploading} onClick={() => { setComposerOpen(false); setFiles([]); }} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Cancel</button><button disabled={uploading} className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />{uploading ? 'Uploading...' : 'Post'}</button></div>
      </form>}
      <section className="divide-y divide-slate-200 border-y border-slate-200 bg-white">{visiblePosts.map((post) => <article key={post.id} className="p-4 sm:p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-100 text-sm font-bold text-orange-800">{post.author.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{post.author}</p><p className="text-xs text-slate-500">{post.category} · 2 hours ago</p></div><span className="h-2 w-2 rounded-full bg-emerald-500" aria-label="Online" /></div><h2 className="mt-3 text-sm font-semibold text-slate-900">{post.title}</h2><p className="mt-1 text-sm leading-relaxed text-slate-600">{post.body}</p>{post.image && <img src={post.image} alt="A clean, comfortable living room" className="mt-3 max-h-80 w-full rounded-md object-cover" />}{post.attachments?.map((attachment) => <div key={attachment.url} className="mt-3">{attachment.contentType.startsWith('image/') ? <a href={attachment.url} target="_blank" rel="noreferrer"><img src={attachment.url} alt={attachment.name} className="max-h-96 w-full rounded-md object-contain" /></a> : attachment.contentType.startsWith('video/') ? <video controls preload="metadata" className="max-h-96 w-full rounded-md bg-black" src={attachment.url}>{attachment.name}</video> : <a href={attachment.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-orange-300"><FileText className="h-4 w-4 shrink-0 text-orange-700" /><span className="truncate">{attachment.name}</span></a>}</div>)}<div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3"><button aria-label={`${post.liked ? 'Unlike' : 'Like'} ${post.title}`} aria-pressed={post.liked || false} onClick={() => setPosts((current) => current.map((item) => item.id === post.id ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) } : item))} className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold ${post.liked ? 'text-orange-700' : 'text-slate-600 hover:bg-orange-50'}`}><Heart className="h-4 w-4" fill={post.liked ? 'currentColor' : 'none'} />{post.liked ? 'Liked' : 'Like'} <span>{post.likes}</span></button><button onClick={() => void sharePost(post)} className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"><Share2 className="h-4 w-4" />Share</button></div></article>)}{visiblePosts.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No posts in this category yet.</p>}</section>
      <p className="mt-4 flex items-start gap-2 text-xs text-slate-500"><AlertTriangle className="h-4 w-4 shrink-0 text-orange-700" />Posts and reactions are saved only on this device. Do not share private addresses or identity documents.</p>
    </main>
  );
}

const connectCategories = [
  { slug: 'cleaning', label: 'Cleaning', icon: Sparkles },
  { slug: 'plumbing', label: 'Plumbing', icon: Wrench },
  { slug: 'electrical', label: 'Electrical', icon: Zap },
  { slug: 'moving', label: 'Moving', icon: Truck },
  { slug: 'carpentry', label: 'Carpentry', icon: Hammer },
  { slug: 'gardening', label: 'Gardening', icon: Sprout },
];

const connectCategoryImages: Record<string, string> = {
  cleaning: '/doc1-images/image2.jpeg',
  plumbing: '/doc1-images/image3.jpeg',
  electrical: '/doc1-images/image4.jpeg',
  moving: '/doc1-images/image6.jpeg',
  carpentry: '/doc1-images/image7.jpeg',
  gardening: '/doc1-images/image9.jpeg',
};

function getConnectPortrait(provider: Provider) {
  const hash = [...(provider.id || provider.full_name)].reduce((value, character) => value + character.charCodeAt(0), 0);
  return `/doc1-images/image${hash % 2 === 0 ? '1' : '8'}.jpeg`;
}

const networkSections = [
  { label: 'My Network', icon: Compass },
  { label: 'Connections', icon: Users },
  { label: 'Following', icon: Heart },
  { label: 'Trusted Providers', icon: ShieldCheck },
  { label: 'Communities', icon: UsersRound },
];

const communitySuggestions = [
  { title: 'Home care & cleaning', slug: 'cleaning', icon: Sparkles },
  { title: 'Repairs & maintenance', slug: 'plumbing', icon: Wrench },
  { title: 'Moving & relocation', slug: 'moving', icon: Truck },
];

function ConnectProviderCard({
  provider,
  categoryName,
  coverFallback,
  connected,
  onConnect,
  onProfile,
  onMessage,
  onBook,
}: {
  provider: Provider;
  categoryName: string;
  coverFallback: string;
  connected: boolean;
  onConnect: () => void;
  onProfile: () => void;
  onMessage: () => void;
  onBook: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-md border border-slate-200 bg-white transition-shadow hover:border-blue-200 hover:shadow-lg">
      <button onClick={onProfile} className="relative block aspect-[16/9] w-full overflow-hidden bg-slate-100 text-left" aria-label={`View ${provider.full_name}'s profile`}>
        <img src={coverFallback} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {provider.cover_url && <span className="absolute inset-0"><ProfileMediaImage source={provider.cover_url} alt={`${provider.full_name}'s work`} className="h-full w-full object-cover" /></span>}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-sm bg-white px-2 py-1 text-[10px] font-bold text-slate-800 shadow-sm">{provider.identity_verified && <BadgeCheck className="h-3.5 w-3.5 text-blue-700" />}{provider.identity_verified ? 'Verified' : 'Provider'}</span>
        <span className="absolute right-3 top-3 rounded-sm bg-slate-950/70 px-2 py-1 text-[10px] font-semibold text-white">{provider.availability_status === 'available' ? 'Available' : 'HomiCare provider'}</span>
      </button>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-blue-50">{provider.avatar_url ? <ProfileMediaImage source={provider.avatar_url} alt={provider.full_name} className="h-full w-full object-cover" /> : <img src={getConnectPortrait(provider)} alt={provider.full_name} className="h-full w-full object-cover" />}</span>
          <div className="min-w-0 flex-1"><button onClick={onProfile} className="max-w-full truncate text-left text-sm font-bold text-slate-950 hover:text-blue-800">{provider.full_name}</button><p className="truncate text-xs text-slate-500">{provider.professional_title}</p></div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600"><span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /><strong className="text-slate-800">{provider.rating.toFixed(1)}</strong><span>({provider.review_count})</span></span><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{provider.location}</span></div>
        <div className="mt-3 flex flex-wrap gap-1.5"><span className="rounded-sm bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-900">{categoryName}</span><span className="rounded-sm bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">{provider.years_experience}+ years</span></div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-xs text-slate-500">Starting from</span><strong className="text-sm text-slate-900">{formatUGX(provider.starting_price)}</strong></div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <button onClick={onConnect} aria-pressed={connected} className={`inline-flex items-center justify-center gap-1 rounded-sm px-2 py-2 text-[10px] font-bold ${connected ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-800 text-white hover:bg-blue-900'}`}>{connected ? <Check className="h-3.5 w-3.5" /> : <UserRoundPlus className="h-3.5 w-3.5" />}{connected ? 'Connected' : 'Connect'}</button>
          <button onClick={onMessage} className="inline-flex items-center justify-center gap-1 rounded-sm border border-slate-300 px-2 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50"><MessageCircle className="h-3.5 w-3.5" />Message</button>
          <button onClick={onBook} className="inline-flex items-center justify-center gap-1 rounded-sm bg-orange-600 px-2 py-2 text-[10px] font-bold text-white hover:bg-orange-700">Book now</button>
        </div>
      </div>
    </article>
  );
}

export function CommunitiesPage() {
  const {
    setCurrentPage, setSelectedProviderId, setSearchQuery,
    setBookingProviderId, setBookingServiceName, setBookingRequestMode,
  } = useApp();
  const [currentUserId, setCurrentUserId] = useState('');
  const [section, setSection] = useState('My Network');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [query, setQuery] = useState('');
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [connectionError, setConnectionError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    backendRequest<ServiceCategory[]>('/services/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setCurrentUserId(data.user?.id || ''); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!currentUserId) { setConnectedIds([]); return; }
    supabase.from('provider_connections').select('provider_id').eq('customer_id', currentUserId)
      .then(({ data, error: connectionLoadError }) => {
        if (connectionLoadError) setConnectionError('Connections could not be loaded. Apply the provider-connections migration and try again.');
        else setConnectedIds((data || []).map((connection) => connection.provider_id));
      });
  }, [currentUserId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ limit: '12' });
    if (selectedCategory) params.set('categorySlug', selectedCategory);
    if (query.trim()) params.set('q', query.trim());
    backendRequest<Provider[]>(`/providers?${params.toString()}`)
      .then((result) => { if (active) setProviders(result); })
      .catch((cause) => { if (active) { setProviders([]); setError(cause instanceof Error ? cause.message : 'Provider directory request failed.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedCategory, query]);

  const categoryName = (slug: string | null) => categories.find((category) => category.id === slug)?.name || categories.find((category) => category.slug === selectedCategory)?.name || 'Home services';
  const matchingProviders = providers.filter((provider) => {
    const providerCategory = categories.find((category) => category.id === provider.primary_service_category_id)?.slug || provider.primary_service_category_id || '';
    const matchesCategory = !selectedCategory || providerCategory === selectedCategory;
    const searchText = `${provider.full_name} ${provider.professional_title} ${provider.location} ${provider.bio || ''}`.toLowerCase();
    return matchesCategory && (!query.trim() || searchText.includes(query.trim().toLowerCase()));
  });
  const shownProviders = section === 'Connections' || section === 'Following'
    ? matchingProviders.filter((provider) => connectedIds.includes(provider.id))
    : section === 'Trusted Providers'
      ? matchingProviders.filter((provider) => connectedIds.includes(provider.id))
      : matchingProviders;
  const openProfile = (provider: Provider) => { setSelectedProviderId(provider.id); setCurrentPage('provider'); };
  const openMessages = (provider: Provider) => { setSelectedProviderId(provider.id); setCurrentPage('message-conversation'); };
  const bookProvider = (provider: Provider) => {
    setSelectedProviderId(provider.id);
    setBookingProviderId(provider.id);
    setBookingRequestMode('booking');
    setBookingServiceName(categoryName(provider.primary_service_category_id));
    setCurrentPage('booking');
  };
  const toggleConnection = async (providerId: string) => {
    if (!currentUserId) { setCurrentPage('login'); return; }
    setConnectionError('');
    const connected = connectedIds.includes(providerId);
    const result = connected
      ? await supabase.from('provider_connections').delete().eq('customer_id', currentUserId).eq('provider_id', providerId)
      : await supabase.from('provider_connections').insert({ customer_id: currentUserId, provider_id: providerId });
    if (result.error) {
      setConnectionError(result.error.message.includes('provider_connections')
        ? 'Apply the provider-connections migration before connecting with providers.'
        : result.error.message);
      return;
    }
    setConnectedIds((current) => connected ? current.filter((id) => id !== providerId) : [...current, providerId]);
  };
  const browseCategory = (slug: string) => { setSection('My Network'); setSelectedCategory(slug); };
  const activeCategoryLabel = connectCategories.find((category) => category.slug === selectedCategory)?.label;
  const suggestions = providers.filter((provider) => !connectedIds.includes(provider.id)).slice(0, 3);

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50">
      <div className="mx-auto grid max-w-[1600px] gap-4 px-3 py-5 sm:px-5 lg:grid-cols-[210px_minmax(0,1fr)_270px] lg:gap-5 lg:px-6">
        <aside className="hidden lg:block" aria-label="Connect navigation">
          <div className="sticky top-20 space-y-4">
            <section className="rounded-md border border-slate-200 bg-white p-3">
              <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Your network</p>
              <nav className="space-y-1">{networkSections.map(({ label, icon: Icon }) => <button key={label} onClick={() => setSection(label)} aria-current={section === label ? 'page' : undefined} className={`flex w-full items-center gap-2 rounded-sm px-2.5 py-2.5 text-left text-xs font-semibold ${section === label ? 'bg-blue-50 text-blue-900' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-4 w-4" />{label}{label === 'Connections' && connectedIds.length > 0 && <span className="ml-auto text-[10px] text-slate-500">{connectedIds.length}</span>}</button>)}</nav>
            </section>
            <p className="px-2 text-[10px] leading-relaxed text-slate-500">Connections are saved to your HomiCare account and sync when you sign in on another device.</p>
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          <header className="rounded-md border border-blue-100 bg-white p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-700">HomiCare Connect</p>
            <h1 className="mt-2 max-w-2xl text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">Connect with trusted home-service professionals</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">Meet skilled local providers, explore your community, and get the right help for your home.</p>
            <label className="mt-5 flex items-center gap-3 rounded-sm border border-slate-300 bg-slate-50 px-3.5 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"><Search className="h-4 w-4 shrink-0 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search providers, services, homeowners..." aria-label="Search providers, services, homeowners" className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />{query && <button onClick={() => setQuery('')} aria-label="Clear search" className="rounded p-1 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>}</label>
          </header>

          <nav aria-label="Connect sections" className="flex gap-1 overflow-x-auto rounded-md border border-slate-200 bg-white p-1.5 lg:hidden">
            {networkSections.map(({ label, icon: Icon }) => <button key={label} onClick={() => setSection(label)} aria-current={section === label ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-semibold ${section === label ? 'bg-blue-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
          </nav>

          <section aria-label="Browse service categories" className="rounded-md border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">Browse by service</h2><button onClick={() => { setSelectedCategory(''); setSection('My Network'); }} className="text-xs font-semibold text-blue-800 hover:text-blue-950">All services</button></div>
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">{connectCategories.map(({ slug, label, icon: Icon }) => <button key={slug} onClick={() => browseCategory(slug)} aria-pressed={selectedCategory === slug} className={`flex min-w-28 snap-start items-center gap-2 rounded-sm border px-3 py-2.5 text-xs font-semibold transition-colors ${selectedCategory === slug ? 'border-blue-800 bg-blue-800 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-400 hover:bg-orange-50'}`}><Icon className="h-4 w-4 shrink-0" />{label}</button>)}</div>
          </section>

          {section === 'Communities' ? <CommunityFeed /> : <>
            <section className="rounded-md border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-orange-700">{section === 'My Network' ? 'Discover' : 'Your network'}</p><h2 className="mt-1 text-lg font-bold text-slate-950 sm:text-xl">{section === 'My Network' ? activeCategoryLabel ? `${activeCategoryLabel} providers` : 'People and providers to know' : section}</h2><p className="mt-1 text-xs text-slate-500">{section === 'Connections' || section === 'Following' ? 'Profiles you have connected with on this device.' : 'Compare local professionals by experience, reviews, and starting price.'}</p></div><button onClick={() => { setCurrentPage('search'); if (activeCategoryLabel) setSearchQuery(activeCategoryLabel); }} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-blue-800 hover:text-blue-950">Full directory <ChevronRight className="h-4 w-4" /></button></div>
              {(error || connectionError) && <p role="alert" className="mb-4 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{error || connectionError}</p>}
              {loading ? <div role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-80 animate-pulse rounded-md bg-slate-100" />)}</div> : shownProviders.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shownProviders.slice(0, 6).map((provider) => { const slug = categories.find((category) => category.id === provider.primary_service_category_id)?.slug || selectedCategory; return <ConnectProviderCard key={provider.id} provider={provider} categoryName={categoryName(provider.primary_service_category_id)} coverFallback={connectCategoryImages[slug] || cleaningImage} connected={connectedIds.includes(provider.id)} onConnect={() => toggleConnection(provider.id)} onProfile={() => openProfile(provider)} onMessage={() => openMessages(provider)} onBook={() => bookProvider(provider)} />; })}</div> : <div className="rounded-sm border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center"><UsersRound className="mx-auto h-8 w-8 text-blue-700" /><h3 className="mt-3 text-sm font-bold text-slate-900">{section === 'Connections' || section === 'Following' ? 'Your network is just getting started' : section === 'Trusted Providers' ? 'No verified providers match this view' : 'No providers found'}</h3><p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">{section === 'Connections' || section === 'Following' ? 'Connect with a provider from My Network to keep their profile here.' : 'Try another category or search term, or browse the full HomiCare directory.'}</p><button onClick={() => { setSection('My Network'); setSelectedCategory(''); setQuery(''); }} className="mt-4 inline-flex items-center gap-2 rounded-sm bg-blue-800 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-blue-900">Explore providers <ArrowRight className="h-4 w-4" /></button></div>}
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-sm bg-orange-100 text-orange-800"><Home className="h-4 w-4" /></span><div><h2 className="text-sm font-bold text-slate-950">Service Requests</h2><p className="text-[10px] text-slate-500">Homeowners looking for help</p></div></div><div className="mt-4 border-t border-slate-100 pt-4"><p className="text-xs font-semibold text-slate-800">No public requests are available yet</p><p className="mt-1 text-xs leading-relaxed text-slate-500">New homeowner requests will appear here when the service-request feed is connected.</p><button onClick={() => setCurrentPage('search')} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-800 hover:text-blue-950">Find a provider <ArrowRight className="h-3.5 w-3.5" /></button></div></div>
              <div className="rounded-md border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-sm bg-blue-50 text-blue-800"><Users className="h-4 w-4" /></span><div><h2 className="text-sm font-bold text-slate-950">Featured Providers</h2><p className="text-[10px] text-slate-500">Recommended from HomiCare</p></div></div><button onClick={() => setSection('Trusted Providers')} aria-label="View trusted providers" className="rounded-sm p-1.5 text-slate-500 hover:bg-slate-100"><ArrowRight className="h-4 w-4" /></button></div><div className="mt-3 divide-y divide-slate-100">{suggestions.length ? suggestions.map((provider) => <button key={provider.id} onClick={() => openProfile(provider)} className="flex w-full items-center gap-3 py-3 text-left"><span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-50">{provider.avatar_url ? <ProfileMediaImage source={provider.avatar_url} alt="" className="h-full w-full object-cover" /> : <User className="h-4 w-4 text-blue-800" />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-900">{provider.full_name}</strong><span className="block truncate text-[10px] text-slate-500">{provider.professional_title}</span></span><span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600"><Star className="h-3 w-3 fill-amber-400 text-amber-500" />{provider.rating.toFixed(1)}</span></button>) : <p className="py-4 text-xs text-slate-500">Provider recommendations will appear when the directory is available.</p>}</div></div>
            </section>
          </>}
        </main>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-label="Connect recommendations">
          <section className="rounded-md border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-950">People you may know</h2><UsersRound className="h-4 w-4 text-blue-700" /></div>{suggestions.length ? <div className="divide-y divide-slate-100">{suggestions.map((provider) => <div key={provider.id} className="flex items-center gap-2.5 py-3 first:pt-0 last:pb-0"><span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-blue-50">{provider.avatar_url ? <ProfileMediaImage source={provider.avatar_url} alt="" className="h-full w-full object-cover" /> : <img src={getConnectPortrait(provider)} alt="" className="h-full w-full object-cover" />}</span><button onClick={() => openProfile(provider)} className="min-w-0 flex-1 text-left"><strong className="block truncate text-xs text-slate-900">{provider.full_name}</strong><span className="block truncate text-[10px] text-slate-500">{provider.location}</span></button><button onClick={() => toggleConnection(provider.id)} aria-label={`Connect with ${provider.full_name}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-blue-200 text-blue-800 hover:bg-blue-50"><UserRoundPlus className="h-4 w-4" /></button></div>)}</div> : <p className="text-xs leading-relaxed text-slate-500">People suggestions will appear as providers become available.</p>}</section>
          <section className="rounded-md border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-950">Trending Communities</h2><p className="mt-0.5 text-[10px] text-slate-500">Explore by household interest</p></div><Compass className="h-4 w-4 text-orange-700" /></div><div className="space-y-1.5">{communitySuggestions.map(({ title, slug, icon: Icon }) => <button key={slug} onClick={() => setSection('Communities')} className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left hover:bg-slate-50"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-orange-50 text-orange-800"><Icon className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{title}</span><ChevronRight className="h-3.5 w-3.5 text-slate-400" /></button>)}</div><button onClick={() => setSection('Communities')} className="mt-2 w-full border-t border-slate-100 pt-3 text-left text-[10px] font-bold text-blue-800 hover:text-blue-950">Open community discussions <ArrowRight className="ml-1 inline h-3 w-3" /></button></section>
          <section className="rounded-md bg-gradient-to-br from-blue-900 to-blue-800 p-4 text-white"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-orange-200">HomiCare Connect</p><h2 className="mt-1 text-sm font-bold">A more trusted way to care for home.</h2><p className="mt-1 text-xs leading-relaxed text-blue-100">Meet local professionals, compare their work, and book when you are ready.</p><button onClick={() => setCurrentPage('search')} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white hover:text-orange-200">Browse all services <ArrowRight className="h-3.5 w-3.5" /></button></section>
        </aside>
      </div>
    </div>
  );
}
