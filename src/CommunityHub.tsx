import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight, Award, BarChart3, BadgeCheck, Bookmark, BookOpen, CalendarDays,
  Camera, ChevronRight, CircleHelp, Compass, Flag, Flame, GraduationCap,
  Heart, Home, MapPin, MessageCircle, MoreHorizontal, Plus, Search, Send,
  Share2, ShieldAlert, ShieldCheck, ShoppingCart, ThumbsUp, Users, Wrench,
  X, Zap,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

type CommunityCategory = 'Home & Household' | 'Services & Trades' | 'Families & Lifestyle' | 'Local Communities' | 'Provider Groups' | 'Learning & Training' | 'Marketplace' | 'Emergency Help';
type FeedTab = 'Discover' | 'My Communities' | 'Following' | 'Nearby' | 'Trending';
type PostKind = 'Discussion' | 'Ask the Community' | 'Service Recommendation' | 'Home Tip' | 'Announcement' | 'Poll';
type DetailTab = 'About' | 'Discussions' | 'Members' | 'Events' | 'Resources' | 'Chat';

interface Community {
  id: string;
  name: string;
  category: CommunityCategory;
  description: string;
  members: number;
  location: string;
  image: string;
  label: string;
  color: string;
  verified?: boolean;
}

interface FeedPost {
  id: string;
  author: string;
  role: string;
  community: string;
  time: string;
  location: string;
  kind: PostKind;
  text: string;
  image?: string;
  likes: number;
  replies: number;
  verified?: boolean;
  event?: boolean;
  pollOptions?: string[];
}

interface ImageAttachment {
  name: string;
  dataUrl: string;
}

const communities: Community[] = [
  { id: 'homeowners-arua', name: 'Homeowners in Arua', category: 'Home & Household', description: 'A friendly place to share home maintenance advice, trusted recommendations and renovation ideas around Arua.', members: 2400, location: 'Arua City', image: '/doc1-images/image14.jpeg', label: 'Popular', color: 'orange', verified: true },
  { id: 'electricians-hub', name: 'Electricians Hub', category: 'Services & Trades', description: 'A professional network for electricians to exchange skills, safety advice and local job opportunities.', members: 1800, location: 'Uganda', image: '/doc1-images/image4.jpeg', label: 'Service Providers', color: 'blue', verified: true },
  { id: 'arua-city', name: 'Arua City Community', category: 'Local Communities', description: 'Neighbours helping neighbours with local household services, events and useful community updates.', members: 3100, location: 'Arua City', image: '/doc1-images/image9.jpeg', label: 'Local', color: 'green' },
  { id: 'parents-families', name: 'Parents & Families', category: 'Families & Lifestyle', description: 'Support, ideas and trusted household help for parents and families at every stage.', members: 1200, location: 'Uganda', image: '/doc1-images/image10.jpeg', label: 'Families', color: 'purple' },
  { id: 'plumbers-uganda', name: 'Plumbers of Uganda', category: 'Provider Groups', description: 'Connect with plumbing professionals, share practical tips and grow your service business.', members: 960, location: 'Uganda', image: '/doc1-images/image3.jpeg', label: 'Verified providers', color: 'blue' },
  { id: 'home-learning', name: 'Home Skills & Learning', category: 'Learning & Training', description: 'Learn safe, practical home-care skills and find training opportunities near you.', members: 820, location: 'Uganda', image: '/doc1-images/image7.jpeg', label: 'Learn together', color: 'teal' },
  { id: 'home-market', name: 'Home & Garden Market', category: 'Marketplace', description: 'Discover useful household tools, home improvement materials and garden supplies from the community.', members: 640, location: 'Arua City', image: '/doc1-images/image11.jpeg', label: 'Marketplace', color: 'amber' },
  { id: 'urgent-help', name: 'Arua Emergency Home Help', category: 'Emergency Help', description: 'Find community guidance and nearby help for urgent household issues.', members: 510, location: 'Arua City', image: '/doc1-images/image2.jpeg', label: 'Local help', color: 'red' },
];

const categories: { label: CommunityCategory; count: number; icon: typeof Home; color: string }[] = [
  { label: 'Home & Household', count: 12, icon: Home, color: 'orange' },
  { label: 'Services & Trades', count: 18, icon: Wrench, color: 'blue' },
  { label: 'Families & Lifestyle', count: 10, icon: Users, color: 'green' },
  { label: 'Local Communities', count: 15, icon: MapPin, color: 'purple' },
  { label: 'Provider Groups', count: 14, icon: Heart, color: 'pink' },
  { label: 'Learning & Training', count: 8, icon: GraduationCap, color: 'teal' },
  { label: 'Marketplace', count: 6, icon: ShoppingCart, color: 'amber' },
  { label: 'Emergency Help', count: 5, icon: ShieldAlert, color: 'red' },
];

const initialPosts: FeedPost[] = [
  { id: 'post-1', author: 'Sarah N.', role: 'Homeowner', community: 'Homeowners in Arua', time: '2 hours ago', location: 'Arua City', kind: 'Ask the Community', text: 'What is the best way to prevent water tank algae? I have noticed some green stuff in my tank. Any recommendations?', image: '/doc1-images/image12.jpeg', likes: 24, replies: 8 },
  { id: 'post-2', author: 'Robert Tibasima', role: 'Service Provider', community: 'Electricians Hub', time: '4 hours ago', location: 'Arua', kind: 'Service Recommendation', text: 'Reliable plumber in Arua. I recently used this plumber and the work was excellent. Highly recommended!', image: '/doc1-images/image3.jpeg', likes: 32, replies: 12, verified: true },
  { id: 'post-3', author: 'Admin HomiCare', role: 'Community Admin', community: 'Homeowners in Arua', time: '1 day ago', location: 'Arua City', kind: 'Announcement', text: 'Join us for our Home Maintenance Workshop this Saturday. Learn simple checks that help keep your home safe.', likes: 18, replies: 6, event: true, verified: true },
  { id: 'post-4', author: 'George D.', role: 'Local Guide', community: 'Arua City Community', time: '1 day ago', location: 'Arua City', kind: 'Home Tip', text: 'A quick reminder: test your outdoor security lights before the rainy season. Small checks can prevent bigger problems later.', likes: 15, replies: 4 },
  { id: 'post-5', author: 'Home Skills & Learning', role: 'Community Admin', community: 'Home Skills & Learning', time: '2 days ago', location: 'Uganda', kind: 'Poll', text: 'Which practical home-care workshop would you like us to host next?', likes: 9, replies: 11, pollOptions: ['Basic plumbing', 'Electrical safety', 'Home cleaning', 'Solar basics'] },
];

const upcomingEvents = [
  { day: '10', month: 'OCT', title: 'Home Maintenance Workshop', place: 'Arua City Hall', attending: 84, color: 'orange' },
  { day: '18', month: 'OCT', title: 'Electrical Safety Training', place: 'Arua', attending: 56, color: 'blue' },
  { day: '25', month: 'OCT', title: 'Community Cleanup', place: 'Arua Stadium', attending: 32, color: 'purple' },
];

const topicItems = [
  { title: 'Plumbing problems', count: 324, color: 'blue' },
  { title: 'Affordable electricians', count: 278, color: 'green' },
  { title: 'Home security tips', count: 196, color: 'orange' },
  { title: 'Best cleaning services', count: 142, color: 'purple' },
  { title: 'Solar installation', count: 120, color: 'pink' },
];

const formatMembers = (count: number) => count >= 1000 ? `${(count / 1000).toFixed(1).replace('.0', '')}K` : String(count);

export function CommunityHub() {
  const { setCurrentPage, setSearchQuery } = useApp();
  const [communityList, setCommunityList] = useState(communities);
  const [tab, setTab] = useState<FeedTab>('Discover');
  const [category, setCategory] = useState<CommunityCategory | null>(null);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('Arua City');
  const [joined, setJoined] = useState<string[]>(['homeowners-arua', 'arua-city']);
  const [following, setFollowing] = useState<string[]>(['homeowners-arua']);
  const [saved, setSaved] = useState<string[]>([]);
  const [posts, setPosts] = useState(initialPosts);
  const [liked, setLiked] = useState<string[]>([]);
  const [voted, setVoted] = useState<string[]>([]);
  const [commentsOpen, setCommentsOpen] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [hiddenPosts, setHiddenPosts] = useState<string[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Community | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('About');
  const [postKind, setPostKind] = useState<PostKind>('Discussion');
  const [draft, setDraft] = useState('');
  const [imageAttachment, setImageAttachment] = useState<ImageAttachment | null>(null);
  const [askService, setAskService] = useState('Plumbing');
  const [askUrgency, setAskUrgency] = useState('When available');
  const [askBudget, setAskBudget] = useState('');
  const [toast, setToast] = useState('');
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');
  const [newCommunityCategory, setNewCommunityCategory] = useState<CommunityCategory>('Local Communities');
  const [eventJoins, setEventJoins] = useState<string[]>([]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const visibleCommunities = useMemo(() => communityList.filter((community) => {
    const matchesCategory = !category || community.category === category;
    const search = query.trim().toLowerCase();
    const matchesSearch = !search || `${community.name} ${community.description} ${community.category} ${community.location}`.toLowerCase().includes(search);
    const matchesTab = tab === 'My Communities' ? joined.includes(community.id)
      : tab === 'Following' ? following.includes(community.id)
        : tab === 'Nearby' ? community.location.toLowerCase().includes(location.toLowerCase()) || community.location === 'Uganda'
          : true;
    return matchesCategory && matchesSearch && matchesTab;
  }).sort((first, second) => tab === 'Trending' ? second.members - first.members : 0), [category, communityList, joined, location, query, tab, following]);

  const visiblePosts = useMemo(() => posts.filter((post) => {
    if (hiddenPosts.includes(post.id)) return false;
    if (tab === 'My Communities' && !joined.some((id) => communityList.find((community) => community.id === id)?.name === post.community)) return false;
    if (tab === 'Following' && !following.some((id) => communityList.find((community) => community.id === id)?.name === post.community)) return false;
    if (tab === 'Nearby' && post.location !== location && !post.location.includes(location.split(' ')[0])) return false;
    if (category && !communityList.some((community) => community.name === post.community && community.category === category)) return false;
    const search = query.trim().toLowerCase();
    return !search || `${post.text} ${post.author} ${post.community} ${post.kind}`.toLowerCase().includes(search);
  }).sort((first, second) => tab === 'Trending' ? second.likes - first.likes : 0), [category, communityList, hiddenPosts, joined, location, posts, query, tab, following]);

  const toggleJoin = (community: Community) => {
    const isJoined = joined.includes(community.id);
    setJoined((current) => isJoined ? current.filter((id) => id !== community.id) : [...current, community.id]);
    notify(isJoined ? `You left ${community.name}` : `Welcome to ${community.name}!`);
  };

  const toggleFollow = (community: Community) => {
    const isFollowing = following.includes(community.id);
    setFollowing((current) => isFollowing ? current.filter((id) => id !== community.id) : [...current, community.id]);
    notify(isFollowing ? 'Community removed from Following' : 'Community added to Following');
  };

  const submitPost = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    const selectedCommunity = communityList.find((item) => joined.includes(item.id)) || communityList[0];
    setPosts((current) => [{
      id: `post-${Date.now()}`,
      author: 'You',
      role: 'Community Member',
      community: selectedCommunity.name,
      time: 'Just now',
      location: location,
      kind: postKind,
      text: postKind === 'Ask the Community'
        ? `${askService} · ${askUrgency}${askBudget.trim() ? ` · Budget ${askBudget.trim()}` : ''}\n${draft.trim()}`
        : draft.trim(),
      ...(imageAttachment ? { image: imageAttachment.dataUrl } : {}),
      likes: 0,
      replies: 0,
      ...(postKind === 'Poll' ? { pollOptions: ['Option 1', 'Option 2'] } : {}),
    }, ...current]);
    setDraft('');
    setImageAttachment(null);
    setAskBudget('');
    setComposerOpen(false);
    setTab('Discover');
    setCategory(null);
    notify('Your post was shared with the community');
  };

  const submitCommunity = (event: FormEvent) => {
    event.preventDefault();
    const name = newCommunityName.trim();
    if (!name) return;
    const community: Community = {
      id: `community-${Date.now()}`,
      name,
      category: newCommunityCategory,
      description: newCommunityDescription.trim() || 'A new HomiCare community.',
      members: 1,
      location,
      image: '/doc1-images/image14.jpeg',
      label: 'New',
      color: 'orange',
    };
    setCommunityList((current) => [community, ...current]);
    setJoined((current) => [...current, community.id]);
    setNewCommunityName('');
    setNewCommunityDescription('');
    setTab('My Communities');
    setCategory(null);
    setCreateOpen(false);
    notify(`“${name}” was added to My Communities on this device`);
  };

  const submitComment = (postId: string) => {
    if (!commentDraft.trim()) return;
    setCommentCounts((current) => ({ ...current, [postId]: (current[postId] || 0) + 1 }));
    setCommentDraft('');
    notify('Reply added');
  };

  const toggleWorkshopAttendance = () => {
    const attending = eventJoins.includes('Home Maintenance Workshop');
    setEventJoins((current) => attending ? current.filter((title) => title !== 'Home Maintenance Workshop') : [...current, 'Home Maintenance Workshop']);
    notify(attending ? 'You left the Home Maintenance Workshop attendee list' : 'You are on the Home Maintenance Workshop attendee list');
  };

  const askForHelp = () => {
    setSearchQuery('plumbing');
    setCurrentPage('emergency');
  };

  const attachPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Choose an image file to attach');
      event.currentTarget.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('Choose an image smaller than 5 MB');
      event.currentTarget.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setImageAttachment({ name: file.name, dataUrl: reader.result });
      else notify('The selected image could not be read');
    };
    reader.onerror = () => notify('The selected image could not be read');
    reader.readAsDataURL(file);
  };

  const sharePost = async (text: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable');
      await navigator.clipboard.writeText(text);
      notify('Post text copied');
    } catch {
      notify('Unable to copy this post on your device');
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#f7f8fa] text-slate-900">
      <div className="mx-auto grid max-w-[1600px] gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_282px] lg:gap-5 lg:px-6">
        <main className="min-w-0 space-y-3">
          <header className="relative flex min-h-[148px] items-center overflow-hidden rounded-xl bg-slate-800 px-5 py-5 text-white shadow-sm sm:min-h-[174px] sm:px-8">
            <img src="/doc1-images/image14.jpeg" alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/70 to-slate-900/10" />
            <div className="relative z-10 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-orange-300">HomiCare Connect</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">HomiCare Communities</h1>
              <p className="mt-1 text-sm font-semibold text-white/90">Connect <span className="px-1 text-orange-300">•</span> Learn <span className="px-1 text-orange-300">•</span> Help <span className="px-1 text-orange-300">•</span> Share <span className="px-1 text-orange-300">•</span> Grow</p>
              <p className="mt-2 max-w-lg text-xs leading-relaxed text-white/80 sm:text-sm">Find trusted people, get advice, share experiences and discover reliable household service providers in your area.</p>
            </div>
            <button onClick={() => setCreateOpen(true)} className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-orange-600 sm:right-6 sm:top-6">
              <Plus className="h-4 w-4" /> Create Community
            </button>
          </header>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search communities, discussions, posts or members..." aria-label="Search communities, discussions, posts or members" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
            {query && <button onClick={() => setQuery('')} aria-label="Clear search" className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
            <button onClick={() => notify('Showing the most relevant community results')} aria-label="Search filters" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><SlidersIcon /></button>
          </label>

          <nav aria-label="Community sections" className="flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            {(['Discover', 'My Communities', 'Following', 'Nearby', 'Trending'] as FeedTab[]).map((item) => {
              const Icon = item === 'Discover' ? Compass : item === 'My Communities' ? Users : item === 'Following' ? Heart : item === 'Nearby' ? MapPin : Flame;
              return <button key={item} onClick={() => { setTab(item); setCategory(null); }} aria-current={tab === item ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition ${tab === item ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}><Icon className="h-3.5 w-3.5" />{item}</button>;
            })}
          </nav>

          {tab === 'Nearby' && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/70 p-3 text-sm">
            <MapPin className="h-4 w-4 text-orange-600" />
            <span className="font-semibold">Find communities near you</span>
            <select aria-label="Choose your city" value={location} onChange={(event) => setLocation(event.target.value)} className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs outline-none"><option>Arua City</option><option>Kampala</option><option>Gulu</option><option>Lira</option><option>Mbarara</option><option>Entebbe</option></select>
          </div>}

          <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <div><h2 className="text-sm font-extrabold">Browse by Category</h2><p className="mt-0.5 text-[11px] text-slate-500">Find your people and the help you need</p></div>
              <button onClick={() => { setCategory(null); setTab('Discover'); }} className="text-xs font-semibold text-blue-600 hover:text-blue-800">View all <ArrowRight className="ml-1 inline h-3 w-3" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {categories.map(({ label, count, icon: Icon, color }) => <button key={label} onClick={() => { setCategory(category === label ? null : label); setTab('Discover'); }} className={`flex min-h-[54px] items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${category === label ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-100' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'}`}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone(color)}`}><Icon className="h-4 w-4" /></span>
                <span className="min-w-0"><span className="block truncate text-[10px] font-bold leading-tight sm:text-[11px]">{label}</span><span className="mt-0.5 block text-[10px] text-slate-500">{count} Communities</span></span>
              </button>)}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div><h2 className="text-base font-extrabold">{tab === 'My Communities' ? 'Your Communities' : tab === 'Following' ? 'Following' : tab === 'Nearby' ? `Communities near ${location}` : tab === 'Trending' ? 'Trending Communities' : 'Featured Communities'}</h2><p className="mt-0.5 text-xs text-slate-500">{visibleCommunities.length} communities to explore</p></div>
              {category && <button onClick={() => setCategory(null)} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Clear {category}<X className="h-3 w-3" /></button>}
            </div>
            {visibleCommunities.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {visibleCommunities.slice(0, 8).map((community) => <CommunityCard key={community.id} community={community} joined={joined.includes(community.id)} following={following.includes(community.id)} saved={saved.includes(community.id)} onJoin={() => toggleJoin(community)} onFollow={() => toggleFollow(community)} onSave={() => setSaved((current) => current.includes(community.id) ? current.filter((id) => id !== community.id) : [...current, community.id])} onOpen={() => { setDetail(community); setDetailTab('About'); }} />)}
            </div> : <EmptyState title="No communities found" message={tab === 'Following' ? 'Follow a community to see it here.' : tab === 'My Communities' ? 'Join a community to get started.' : 'Try another search, location or category.'} action={tab !== 'Discover' ? 'Explore communities' : undefined} onAction={() => { setTab('Discover'); setCategory(null); setQuery(''); }} />}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-200 to-blue-100 text-sm font-extrabold text-slate-700">H</div>
              <button onClick={() => setComposerOpen(true)} className="flex h-10 flex-1 items-center rounded-full border border-slate-200 bg-slate-50 px-4 text-left text-xs text-slate-500 hover:bg-slate-100">Share something with the community...</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-2">
              <QuickComposerButton icon={MessageCircle} label="Discussion" color="orange" onClick={() => { setPostKind('Discussion'); setComposerOpen(true); }} />
              <QuickComposerButton icon={CircleHelp} label="Ask the Community" color="blue" onClick={() => { setPostKind('Ask the Community'); setComposerOpen(true); }} />
              <QuickComposerButton icon={Wrench} label="Service Recommendation" color="green" onClick={() => { setPostKind('Service Recommendation'); setComposerOpen(true); }} />
              <QuickComposerButton icon={BarChart3} label="Post a Poll" color="purple" onClick={() => { setPostKind('Poll'); setComposerOpen(true); }} />
              <QuickComposerButton icon={Camera} label="Add Photo" color="slate" onClick={() => { setPostKind('Discussion'); setComposerOpen(true); }} />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-end justify-between"><div><h2 className="text-base font-extrabold">Community Feed</h2><p className="mt-0.5 text-xs text-slate-500">Helpful conversations from across HomiCare</p></div><button onClick={() => setTab('Trending')} className="text-xs font-semibold text-blue-600">See trending</button></div>
            {visiblePosts.length ? visiblePosts.map((post) => <FeedPostCard key={post.id} post={post} liked={liked.includes(post.id)} saved={saved.includes(post.id)} voted={voted.includes(post.id)} eventJoined={eventJoins.includes('Home Maintenance Workshop')} commentOpen={commentsOpen === post.id} commentDraft={commentDraft} commentCount={commentCounts[post.id] || 0} onLike={() => { setLiked((current) => current.includes(post.id) ? current.filter((id) => id !== post.id) : [...current, post.id]); }} onComment={() => setCommentsOpen(commentsOpen === post.id ? null : post.id)} onCommentDraft={setCommentDraft} onSubmitComment={() => submitComment(post.id)} onSave={() => setSaved((current) => current.includes(post.id) ? current.filter((id) => id !== post.id) : [...current, post.id])} onShare={() => { void sharePost(post.text); }} onReport={() => { setHiddenPosts((current) => [...current, post.id]); notify('Post hidden from your feed'); }} onVote={() => { setVoted((current) => current.includes(post.id) ? current : [...current, post.id]); notify('Your vote was recorded'); }} onEvent={toggleWorkshopAttendance} />) : <EmptyState title="Your feed is waiting" message="Join a community or change your filters to see more conversations." action="Discover communities" onAction={() => { setTab('Discover'); setCategory(null); }} />}
          </section>
        </main>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="mb-2.5 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-extrabold"><Flame className="h-4 w-4 text-orange-500" />Trending Topics</h2><button onClick={() => setTab('Trending')} className="text-[10px] font-semibold text-blue-600">View all</button></div>
            <div className="space-y-0.5">{topicItems.map((topic) => <button key={topic.title} onClick={() => { setQuery(topic.title.split(' ')[0]); setTab('Trending'); }} className="flex w-full items-center gap-2 border-t border-slate-100 py-2 text-left text-[11px] hover:bg-slate-50"><span className={`h-2 w-2 rounded-full ${tone(topic.color)}`} /><span className="flex-1 font-medium text-slate-700">{topic.title}</span><span className={`rounded-full px-2 py-0.5 font-bold ${topic.color === 'blue' ? 'bg-blue-50 text-blue-600' : topic.color === 'green' ? 'bg-green-50 text-green-600' : topic.color === 'orange' ? 'bg-orange-50 text-orange-600' : topic.color === 'purple' ? 'bg-purple-50 text-purple-600' : 'bg-pink-50 text-pink-600'}`}>{topic.count}</span><ChevronRight className="h-3 w-3 text-slate-400" /></button>)}</div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="mb-2.5 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-extrabold"><CalendarDays className="h-4 w-4 text-orange-500" />Upcoming Events</h2><button onClick={() => notify('Showing upcoming HomiCare events')} className="text-[10px] font-semibold text-blue-600">View all</button></div>
            <div className="space-y-2">{upcomingEvents.map((event) => <div key={event.title} className="flex gap-2.5 rounded-lg border border-slate-100 p-2">
              <div className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg ${tone(event.color)}`}><span className="text-[8px] font-bold">{event.month}</span><span className="text-sm font-extrabold leading-none">{event.day}</span></div>
              <div className="min-w-0 flex-1"><p className="text-[11px] font-bold leading-tight">{event.title}</p><p className="mt-1 truncate text-[9px] text-slate-500"><MapPin className="mr-0.5 inline h-2.5 w-2.5" />{event.place}</p><p className="mt-1 text-[9px] text-green-600"><Users className="mr-0.5 inline h-2.5 w-2.5" />{event.attending + (eventJoins.includes(event.title) ? 1 : 0)} attending</p></div>
              <button onClick={() => setEventJoins((current) => current.includes(event.title) ? current.filter((title) => title !== event.title) : [...current, event.title])} aria-label={`${eventJoins.includes(event.title) ? 'Leave' : 'Join'} ${event.title}`} className="self-center rounded-md p-1 text-slate-400 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
            </div>)}</div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <h2 className="mb-2 text-sm font-extrabold">Quick Actions</h2>
            <div className="space-y-0.5">
              <QuickAction icon={Plus} label="Create a Community" onClick={() => setCreateOpen(true)} color="orange" />
              <QuickAction icon={CircleHelp} label="Ask the Community" onClick={() => { setPostKind('Ask the Community'); setComposerOpen(true); }} color="blue" />
              <QuickAction icon={Users} label="Find Local Members" onClick={() => { setTab('Nearby'); setCategory(null); }} color="green" />
              <QuickAction icon={CalendarDays} label="Browse Events" onClick={() => notify('Browse the upcoming events list')} color="purple" />
            </div>
          </section>

          <section className="rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-3.5 shadow-sm">
            <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-red-100 text-red-600"><ShieldAlert className="h-5 w-5" /></span><div><h2 className="text-xs font-extrabold text-red-700">Need urgent help?</h2><p className="text-[10px] text-slate-600">Connect with verified providers.</p></div></div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-600">Post a household emergency and get quick responses from nearby service professionals.</p>
            <button onClick={askForHelp} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-red-700">Get Emergency Help <ArrowRight className="h-3.5 w-3.5" /></button>
          </section>

          <section className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5">
            <h2 className="flex items-center gap-2 text-xs font-extrabold"><Award className="h-4 w-4 text-blue-600" />Build your reputation</h2>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-600">Share useful advice, support your neighbours and earn community recognition.</p>
            <button onClick={() => notify('Keep contributing to earn helpful-member badges')} className="mt-2 text-[10px] font-bold text-blue-700">See community badges <ArrowRight className="ml-1 inline h-3 w-3" /></button>
          </section>
        </aside>
      </div>

      {composerOpen && <Modal title="Share with your community" onClose={() => setComposerOpen(false)}>
        <form onSubmit={submitPost} className="space-y-4">
          <label className="block text-xs font-bold text-slate-700">Post type
            <select value={postKind} onChange={(event) => setPostKind(event.target.value as PostKind)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal outline-none focus:border-orange-400">
              {(['Discussion', 'Ask the Community', 'Service Recommendation', 'Home Tip', 'Announcement', 'Poll'] as PostKind[]).map((kind) => <option key={kind}>{kind}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-700">Your post
            <textarea autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={postKind === 'Ask the Community' ? 'What would you like help with? Include your area and any important details.' : 'Share something helpful with your community...'} rows={5} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 p-3 text-sm font-normal outline-none focus:border-orange-400" />
          </label>
          {postKind === 'Ask the Community' && <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700">Household service<select value={askService} onChange={(event) => setAskService(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal"><option>Plumbing</option><option>Electrical</option><option>Cleaning</option><option>Appliance repair</option><option>Home security</option><option>Other household help</option></select></label>
            <label className="text-xs font-bold text-slate-700">Urgency<select value={askUrgency} onChange={(event) => setAskUrgency(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal"><option>When available</option><option>Soon</option><option>Emergency</option></select></label>
            <label className="text-xs font-bold text-slate-700 sm:col-span-2">Approximate budget (optional)<input value={askBudget} onChange={(event) => setAskBudget(event.target.value)} inputMode="numeric" placeholder="e.g. UGX 50,000" className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal outline-none focus:border-orange-400" /></label>
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800 sm:col-span-2"><MapPin className="mr-1 inline h-3.5 w-3.5" />Your post will include your selected area ({location}), not your exact address.</div>
          </div>}
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600"><Camera className="h-4 w-4 text-blue-600" />Add a photo<input type="file" accept="image/*" onChange={attachPhoto} className="sr-only" /></label>
          {imageAttachment && <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-2"><img src={imageAttachment.dataUrl} alt="Selected post attachment" className="h-14 w-14 rounded-md object-cover" /><span className="min-w-0 flex-1 truncate text-xs text-slate-600">{imageAttachment.name}</span><button type="button" onClick={() => setImageAttachment(null)} className="rounded p-1 text-slate-500 hover:bg-slate-200" aria-label="Remove attached photo"><X className="h-4 w-4" /></button></div>}
          {postKind === 'Poll' && <p className="rounded-lg bg-purple-50 p-3 text-xs text-purple-700">Poll options are included in this demo. Community poll responses are not saved to a server.</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setComposerOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={!draft.trim()} className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Share post</button></div>
        </form>
      </Modal>}

      {createOpen && <Modal title="Create a Community" onClose={() => setCreateOpen(false)}>
        <form onSubmit={submitCommunity} className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">Bring neighbours and household-service professionals together around a shared interest or location.</p>
          <label className="block text-xs font-bold text-slate-700">Community name<input autoFocus required value={newCommunityName} onChange={(event) => setNewCommunityName(event.target.value)} placeholder="e.g. Oli Division Neighbours" className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal outline-none focus:border-orange-400" /></label>
          <label className="block text-xs font-bold text-slate-700">Category<select value={newCommunityCategory} onChange={(event) => setNewCommunityCategory(event.target.value as CommunityCategory)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal">{categories.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}</select></label>
          <label className="block text-xs font-bold text-slate-700">Description<textarea value={newCommunityDescription} onChange={(event) => setNewCommunityDescription(event.target.value)} rows={3} placeholder="What brings this community together?" className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal outline-none focus:border-orange-400" /></label>
          <div className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Communities are currently kept in this page session only; persistent community storage is not connected yet.</div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={!newCommunityName.trim()} className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Create community</button></div>
        </form>
      </Modal>}

      {detail && <Modal title={detail.name} onClose={() => setDetail(null)} wide>
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <div className="relative h-36 bg-slate-200 sm:h-48"><img src={detail.image} alt="" className="h-full w-full object-cover" /><span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold text-slate-700">{detail.category}</span></div>
          <div className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-1.5"><h3 className="text-lg font-extrabold">{detail.name}</h3>{detail.verified && <BadgeCheck className="h-4 w-4 text-blue-600" />}</div><p className="mt-1 text-xs text-slate-500"><Users className="mr-1 inline h-3.5 w-3.5" />{formatMembers(detail.members)} members <span className="px-1">•</span><MapPin className="mr-0.5 inline h-3 w-3" />{detail.location}</p></div>
              <div className="flex gap-2"><button onClick={() => toggleFollow(detail)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">{following.includes(detail.id) ? 'Following' : 'Follow'}</button><button onClick={() => toggleJoin(detail)} className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white">{joined.includes(detail.id) ? 'Joined' : 'Join Community'}</button></div>
            </div>
            <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-100">{(['About', 'Discussions', 'Members', 'Events', 'Resources', 'Chat'] as DetailTab[]).map((item) => <button key={item} onClick={() => setDetailTab(item)} className={`shrink-0 border-b-2 px-3 py-2 text-xs font-semibold ${detailTab === item ? 'border-orange-500 text-orange-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{item}</button>)}</nav>
            <div className="min-h-32 py-4">
              {detailTab === 'About' && <div><h4 className="text-sm font-bold">About this community</h4><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{detail.description}</p><div className="mt-4 flex flex-wrap gap-2 text-[10px] text-slate-600"><span className="rounded-full bg-slate-100 px-3 py-1.5"><ShieldCheck className="mr-1 inline h-3 w-3 text-green-600" />Be kind and respectful</span><span className="rounded-full bg-slate-100 px-3 py-1.5"><BadgeCheck className="mr-1 inline h-3 w-3 text-blue-600" />Recommend verified providers</span><span className="rounded-full bg-slate-100 px-3 py-1.5"><MapPin className="mr-1 inline h-3 w-3" />{detail.location}</span></div></div>}
              {detailTab === 'Discussions' && <div className="space-y-2">{posts.filter((post) => post.community === detail.name).map((post) => <div key={post.id} className="rounded-lg border border-slate-100 p-3"><p className="text-xs font-bold">{post.author} <span className="font-normal text-slate-400">· {post.time}</span></p><p className="mt-1 text-sm text-slate-600">{post.text}</p></div>)}<button onClick={() => { setDetail(null); setComposerOpen(true); }} className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">Start a discussion</button></div>}
              {detailTab === 'Members' && <div className="space-y-2">{[['Sarah N.', 'Homeowner', 'Local Guide'], ['Robert Tibasima', 'Verified Plumber', 'Helpful Member'], ['George D.', 'Homeowner', 'Trusted Contributor']].map(([name, role, badge]) => <div key={name} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-orange-100 text-xs font-bold text-orange-800">{name.slice(0, 1)}</div><div className="flex-1"><p className="text-xs font-bold">{name}</p><p className="text-[10px] text-slate-500">{role}</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-700"><Award className="mr-1 inline h-3 w-3" />{badge}</span></div>)}</div>}
              {detailTab === 'Events' && <div className="space-y-2">{upcomingEvents.map((event) => <div key={event.title} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3"><CalendarDays className="h-5 w-5 text-orange-500" /><div className="flex-1"><p className="text-xs font-bold">{event.title}</p><p className="mt-1 text-[10px] text-slate-500">{event.day} {event.month} · {event.place} · {event.attending} attending</p></div><button onClick={() => setEventJoins((current) => current.includes(event.title) ? current : [...current, event.title])} className="rounded-lg border border-orange-200 px-3 py-2 text-[10px] font-bold text-orange-700">Join</button></div>)}</div>}
              {detailTab === 'Resources' && <div className="grid gap-2 sm:grid-cols-2">{[['Home maintenance checklist', 'Practical guide · 5 min read', BookOpen], ['Electrical safety basics', 'Learning · 12 min', Zap], ['Choosing a trusted provider', 'Community guide · 4 min read', ShieldCheck]].map(([title, subtitle, Icon]) => <button key={String(title)} onClick={() => notify(`${String(title)} opened`)} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 text-left hover:bg-slate-50"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><Icon className="h-4 w-4" /></span><span><span className="block text-xs font-bold">{String(title)}</span><span className="mt-1 block text-[10px] text-slate-500">{String(subtitle)}</span></span><ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-400" /></button>)}</div>}
              {detailTab === 'Chat' && <CommunityChat community={detail.name} joined={joined.includes(detail.id)} onJoin={() => toggleJoin(detail)} />}
            </div>
          </div>
        </div>
      </Modal>}

      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl">{toast}</div>}
    </div>
  );
}

function SlidersIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h9m4 0h3M4 17h3m4 0h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></svg>;
}

function tone(color: string) {
  const tones: Record<string, string> = {
    orange: 'bg-orange-100 text-orange-600', blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600', purple: 'bg-purple-100 text-purple-600',
    pink: 'bg-pink-100 text-pink-600', teal: 'bg-teal-100 text-teal-600',
    amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return tones[color] || tones.slate;
}

function CommunityCard({ community, joined, following, saved, onJoin, onFollow, onSave, onOpen }: {
  community: Community;
  joined: boolean;
  following: boolean;
  saved: boolean;
  onJoin: () => void;
  onFollow: () => void;
  onSave: () => void;
  onOpen: () => void;
}) {
  return <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="group relative h-[98px] overflow-hidden bg-slate-200">
      <img src={community.image} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
      <button onClick={onOpen} aria-label={`Open ${community.name}`} className="absolute inset-0 z-0" />
      <span className={`pointer-events-none absolute left-2 top-2 rounded-md px-2 py-1 text-[9px] font-extrabold text-white ${community.color === 'orange' ? 'bg-orange-500' : community.color === 'blue' ? 'bg-blue-500' : community.color === 'green' ? 'bg-green-500' : 'bg-purple-500'}`}>{community.label}</span>
      <span className="absolute right-2 top-2 flex gap-1">
        <button onClick={onFollow} aria-label={following ? 'Unfollow community' : 'Follow community'} className={`relative z-10 grid h-7 w-7 place-items-center rounded-full shadow-sm ${following ? 'bg-orange-100 text-orange-600' : 'bg-white/95 text-slate-600 hover:bg-white'}`}><Heart className="h-3.5 w-3.5" fill={following ? 'currentColor' : 'none'} /></button>
        <button onClick={onSave} aria-label={saved ? 'Remove bookmark' : 'Bookmark community'} className={`relative z-10 grid h-7 w-7 place-items-center rounded-full shadow-sm ${saved ? 'bg-blue-100 text-blue-600' : 'bg-white/95 text-slate-600 hover:bg-white'}`}><Bookmark className="h-3.5 w-3.5" fill={saved ? 'currentColor' : 'none'} /></button>
      </span>
    </div>
    <div className="p-2.5">
      <button onClick={onOpen} className="flex items-center gap-1 text-left text-xs font-extrabold hover:text-orange-700">{community.name}{community.verified && <BadgeCheck className="h-3.5 w-3.5 text-blue-500" />}</button>
      <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500"><Users className="h-3 w-3" />{formatMembers(community.members)} members <span className="px-0.5">·</span>{community.location}</p>
      <p className="mt-1.5 line-clamp-2 min-h-[28px] text-[10px] leading-relaxed text-slate-600">{community.description}</p>
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
        <div className="flex -space-x-1.5" aria-label="Community members"><span className="grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-orange-200 text-[8px] font-bold">S</span><span className="grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-blue-200 text-[8px] font-bold">R</span><span className="grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-green-200 text-[8px] font-bold">J</span><span className="grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-slate-100 text-[7px] font-bold">+{Math.max(12, Math.round(community.members / 80))}</span></div>
        <button onClick={onJoin} className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold transition ${joined ? 'border-slate-200 bg-slate-50 text-slate-600 hover:border-red-200 hover:text-red-600' : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'}`}>{joined ? 'Joined' : 'Join Community'}</button>
      </div>
    </div>
  </article>;
}

function QuickComposerButton({ icon: Icon, label, color, onClick }: { icon: typeof MessageCircle; label: string; color: string; onClick: () => void }) {
  const style = color === 'orange' ? 'border-orange-100 bg-orange-50 text-orange-700' : color === 'blue' ? 'border-blue-100 bg-blue-50 text-blue-700' : color === 'green' ? 'border-green-100 bg-green-50 text-green-700' : color === 'purple' ? 'border-purple-100 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-slate-700';
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold hover:brightness-95 ${style}`}><Icon className="h-3.5 w-3.5" />{label}</button>;
}

function QuickAction({ icon: Icon, label, color, onClick }: { icon: typeof Plus; label: string; color: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex w-full items-center gap-2 border-t border-slate-100 py-2 text-left text-[11px] font-semibold text-slate-700 hover:text-orange-700"><span className={`grid h-6 w-6 place-items-center rounded-full ${tone(color)}`}><Icon className="h-3.5 w-3.5" /></span>{label}<ChevronRight className="ml-auto h-3 w-3 text-slate-400" /></button>;
}

function FeedPostCard({ post, liked, saved, voted, eventJoined, commentOpen, commentDraft, commentCount, onLike, onComment, onCommentDraft, onSubmitComment, onSave, onShare, onReport, onVote, onEvent }: {
  post: FeedPost;
  liked: boolean;
  saved: boolean;
  voted: boolean;
  eventJoined: boolean;
  commentOpen: boolean;
  commentDraft: string;
  commentCount: number;
  onLike: () => void;
  onComment: () => void;
  onCommentDraft: (value: string) => void;
  onSubmitComment: () => void;
  onSave: () => void;
  onShare: () => void;
  onReport: () => void;
  onVote: () => void;
  onEvent: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-start gap-2.5 p-3.5 pb-2">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-extrabold ${post.verified ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{post.author.split(' ').map((word) => word[0]).slice(0, 2).join('')}</div>
      <div className="min-w-0 flex-1"><p className="flex flex-wrap items-center gap-1 text-xs font-extrabold">{post.author}{post.verified && <BadgeCheck className="h-3.5 w-3.5 text-blue-500" />}<span className="font-normal text-slate-400">· {post.role}</span></p><p className="mt-0.5 text-[10px] text-slate-500">{post.time} <span className="px-0.5">·</span> {post.community} <span className="px-0.5">·</span> {post.location}</p></div>
      <div className="relative"><button onClick={() => setMenuOpen(!menuOpen)} aria-label="Post options" className="rounded p-1 text-slate-400 hover:bg-slate-100"><MoreHorizontal className="h-4 w-4" /></button>{menuOpen && <div className="absolute right-0 top-7 z-20 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"><button onClick={() => { onSave(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[11px] hover:bg-slate-50"><Bookmark className="h-3.5 w-3.5" />{saved ? 'Unsave post' : 'Save post'}</button><button onClick={() => { onShare(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[11px] hover:bg-slate-50"><Share2 className="h-3.5 w-3.5" />Share post</button><button onClick={() => { onReport(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[11px] text-red-600 hover:bg-red-50"><Flag className="h-3.5 w-3.5" />Hide / report</button></div>}</div>
    </div>
    <div className="px-3.5 pb-3"><span className={`inline-flex items-center rounded-full px-2 py-1 text-[9px] font-bold ${post.kind === 'Ask the Community' ? 'bg-blue-50 text-blue-700' : post.kind === 'Service Recommendation' ? 'bg-green-50 text-green-700' : post.kind === 'Announcement' ? 'bg-purple-50 text-purple-700' : post.kind === 'Poll' ? 'bg-pink-50 text-pink-700' : 'bg-orange-50 text-orange-700'}`}>{post.kind === 'Ask the Community' && <CircleHelp className="mr-1 h-3 w-3" />}{post.kind === 'Service Recommendation' && <Wrench className="mr-1 h-3 w-3" />}{post.kind}</span><p className="mt-2 text-xs leading-relaxed text-slate-800">{post.text}</p></div>
    {post.pollOptions && <div className="space-y-1.5 px-3.5 pb-3">{post.pollOptions.map((option, index) => <button key={option} onClick={onVote} disabled={voted} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-[11px] ${voted && index === 0 ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}><span>{option}</span>{voted && <span className="text-[10px] font-bold text-blue-700">{[38, 27, 21, 14][index] || 10}%</span>}</button>)}<p className="text-[9px] text-slate-400">{voted ? 'Your vote has been recorded' : 'Select an option to vote'}</p></div>}
    {post.image && <img src={post.image} alt="Shared by a community member" className="max-h-56 w-full object-cover" />}
    {post.event && <div className="mx-3.5 mb-3 rounded-lg border border-slate-100 bg-slate-50 p-2.5"><p className="text-xs font-bold">Home Maintenance Workshop <span className="ml-1 rounded bg-purple-100 px-2 py-0.5 text-[9px] text-purple-700">Event</span></p><p className="mt-1 text-[10px] text-slate-500"><CalendarDays className="mr-1 inline h-3 w-3" />Sat, 10 Oct 2026 <span className="px-1">·</span> 10:00 AM <span className="px-1">·</span><MapPin className="mr-0.5 inline h-3 w-3" />Arua Community Hall</p><button onClick={onEvent} className={`mt-2 w-full rounded-lg py-2 text-[10px] font-bold text-white ${eventJoined ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}>{eventJoined ? 'You are attending' : 'Join Event'} ({84 + (eventJoined ? 1 : 0)} attending)</button></div>}
    <div className="mx-3.5 flex items-center justify-between border-t border-slate-100 py-2 text-[10px] text-slate-500"><span><ThumbsUp className={`mr-1 inline h-3 w-3 ${liked ? 'fill-orange-500 text-orange-500' : ''}`} />{post.likes + (liked ? 1 : 0)}</span><span>{post.replies + commentCount} replies</span></div>
    <div className="mx-3.5 flex border-t border-slate-100 py-1">
      <button onClick={onLike} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[10px] font-semibold ${liked ? 'text-orange-600' : 'text-slate-600 hover:bg-slate-50'}`}><ThumbsUp className={`h-3.5 w-3.5 ${liked ? 'fill-orange-100' : ''}`} />Like</button>
      <button onClick={onComment} className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"><MessageCircle className="h-3.5 w-3.5" />Comment</button>
      <button onClick={onShare} className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"><Share2 className="h-3.5 w-3.5" />Share</button>
    </div>
    {commentOpen && <form onSubmit={(event) => { event.preventDefault(); onSubmitComment(); }} className="flex gap-2 border-t border-slate-100 p-3"><input value={commentDraft} onChange={(event) => onCommentDraft(event.target.value)} placeholder="Write a helpful reply..." className="min-w-0 flex-1 rounded-full border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-orange-300" /><button aria-label="Send reply" disabled={!commentDraft.trim()} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-500 text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" /></button></form>}
  </article>;
}

function EmptyState({ title, message, action, onAction }: { title: string; message: string; action?: string; onAction?: () => void }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center"><Users className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-3 text-sm font-bold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{message}</p>{action && onAction && <button onClick={onAction} className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white">{action}</button>}</div>;
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92dvh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3.5"><h2 className="text-sm font-extrabold">{title}</h2><button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></header>
      <div className="p-4">{children}</div>
    </section>
  </div>;
}

function CommunityChat({ community, joined, onJoin }: { community: string; joined: boolean; onJoin: () => void }) {
  const [messages, setMessages] = useState([{ author: 'Sarah N.', text: 'Welcome everyone! Share your home questions here.' }, { author: 'Robert T.', text: 'Happy to help with plumbing questions around Arua.' }]);
  const [draft, setDraft] = useState('');
  if (!joined) return <div className="rounded-xl bg-slate-50 p-6 text-center"><MessageCircle className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-2 text-sm font-bold">Join to take part in the chat</p><p className="mt-1 text-xs text-slate-500">Community chat is available to members of {community}.</p><button onClick={onJoin} className="mt-3 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white">Join Community</button></div>;
  return <div className="rounded-xl border border-slate-100"><div className="max-h-48 space-y-2 overflow-y-auto p-3">{messages.map((message, index) => <div key={`${message.author}-${index}`} className="max-w-[85%] rounded-xl bg-slate-100 p-2.5"><p className="text-[10px] font-bold text-slate-700">{message.author}</p><p className="mt-0.5 text-xs text-slate-600">{message.text}</p></div>)}</div><form onSubmit={(event) => { event.preventDefault(); if (draft.trim()) { setMessages([...messages, { author: 'You', text: draft.trim() }]); setDraft(''); } }} className="flex gap-2 border-t border-slate-100 p-2"><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Message this community..." className="min-w-0 flex-1 rounded-full bg-slate-50 px-3 py-2 text-xs outline-none" /><button aria-label="Send message" disabled={!draft.trim()} className="grid h-8 w-8 place-items-center rounded-full bg-orange-500 text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" /></button></form></div>;
}
