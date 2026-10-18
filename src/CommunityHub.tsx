import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Bookmark,
  Camera,
  CheckCircle2,
  CircleHelp,
  Copy,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  X,
  Send,
  Calendar,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

type FeedTab = 'Discover' | 'My Communities' | 'Trending' | 'Following' | 'Nearby';
type DetailTab = 'About' | 'Discussions' | 'Events' | 'Resources' | 'Chat';
type CommunityCategory = 'Home & Household' | 'Services & Trades' | 'Families & Lifestyle' | 'Local Communities' | 'Emergency Help' | 'Marketplace';
type PostKind = 'Discussion' | 'Ask the Community' | 'Service Recommendation' | 'Home Tip' | 'Announcement' | 'Poll';

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
  file?: File;
}

const communities: Community[] = [
  { id: 'homeowners-arua', name: 'Homeowners in Arua', category: 'Home & Household', description: 'A friendly place to share home maintenance advice, trusted recommendations and renovation ideas around Arua.', members: 2400, location: 'Arua City', image: '/doc1-images/image14.jpeg', label: 'Popular', color: 'orange', verified: true },
  { id: 'electricians-hub', name: 'Electricians Hub', category: 'Services & Trades', description: 'A professional network for electricians to exchange skills, safety advice and local job opportunities.', members: 1800, location: 'Uganda', image: '/doc1-images/image4.jpeg', label: 'Service Providers', color: 'blue', verified: true },
  { id: 'arua-city', name: 'Arua City Community', category: 'Local Communities', description: 'Neighbours helping neighbours with local household services, events and useful community updates.', members: 3100, location: 'Arua City', image: '/doc1-images/image9.jpeg', label: 'Local', color: 'green' },
  { id: 'parents-families', name: 'Parents & Families', category: 'Families & Lifestyle', description: 'Support, ideas and trusted household help for parents and families at every stage.', members: 1200, location: 'Uganda', image: '/doc1-images/image10.jpeg', label: 'Families', color: 'purple' },
  { id: 'home-market', name: 'Home & Garden Market', category: 'Marketplace', description: 'Discover useful tools, plants, home care supplies and services recommended by local homeowners.', members: 950, location: 'Arua City', image: '/doc1-images/image2.jpeg', label: 'Market', color: 'amber' },
  { id: 'urgent-help', name: 'Arua Emergency Home Help', category: 'Emergency Help', description: 'Find fast assistance for plumbing leaks, power issues, storm repairs and urgent household needs.', members: 1500, location: 'Arua City', image: '/doc1-images/image8.jpeg', label: 'Emergency', color: 'red', verified: true },
];

const categories: { label: CommunityCategory; count: number; icon: typeof Home; color: string }[] = [
  { label: 'Home & Household', count: 12, icon: Home, color: 'text-orange-600 bg-orange-50' },
  { label: 'Services & Trades', count: 8, icon: Wrench, color: 'text-blue-600 bg-blue-50' },
  { label: 'Families & Lifestyle', count: 6, icon: Users, color: 'text-purple-600 bg-purple-50' },
  { label: 'Local Communities', count: 15, icon: MapPin, color: 'text-emerald-600 bg-emerald-50' },
  { label: 'Emergency Help', count: 4, icon: ShieldCheck, color: 'text-red-600 bg-red-50' },
  { label: 'Marketplace', count: 9, icon: Sparkles, color: 'text-amber-600 bg-amber-50' },
];

const initialPosts: FeedPost[] = [
  { id: 'post-1', author: 'Sarah N.', role: 'Homeowner', community: 'Homeowners in Arua', time: '2 hours ago', location: 'Arua City', kind: 'Home Tip', text: 'Clean water tanks every 6 months to ensure clean water flow throughout the rainy season. Check the overflow cover too!', image: '/doc1-images/image12.jpeg', likes: 24, replies: 6, verified: true },
  { id: 'post-2', author: 'Robert Tibasima', role: 'Service Provider', community: 'Electricians Hub', time: '5 hours ago', location: 'Arua City', kind: 'Service Recommendation', text: 'Installing surge protectors before heavy storms can save your household electronics from voltage spikes.', likes: 18, replies: 4, verified: true },
  { id: 'post-3', author: 'Admin HomiCare', role: 'Community Admin', community: 'Homeowners in Arua', time: '1 day ago', location: 'Arua City', kind: 'Announcement', text: 'Welcome to the updated HomiCare Community! Share tips, discover trusted local professionals, and stay connected with your neighbours.', image: '/doc1-images/image1.jpeg', likes: 42, replies: 12, verified: true },
  { id: 'post-4', author: 'George D.', role: 'Local Guide', community: 'Arua City Community', time: '1 day ago', location: 'Arua City', kind: 'Discussion', text: 'What is your most reliable tip for maintaining compound drainage during heavy downpours?', likes: 15, replies: 9 },
  { id: 'post-5', author: 'Home Skills & Learning', role: 'Community Admin', community: 'Home Skills & Learning', time: '2 days ago', location: 'Uganda', kind: 'Poll', text: 'Which household skill would you like to learn next?', likes: 31, replies: 8, pollOptions: ['Basic Plumbing Repairs', 'Solar Battery Maintenance', 'Furniture Restoration', 'Garden Pest Control'] },
];

const communityEvents = [
  { day: '25', month: 'OCT', title: 'Community Cleanup', place: 'Arua Stadium', attending: 32, color: 'bg-emerald-500' },
  { day: '02', month: 'NOV', title: 'Solar Maintenance Prep', place: 'Arua Community Hall', attending: 18, color: 'bg-amber-500' },
  { day: '12', month: 'NOV', title: 'Homeowner Plumbing Workshop', place: 'Online Session', attending: 45, color: 'bg-blue-500' },
];

const formatMembers = (count: number) => count >= 1000 ? `${(count / 1000).toFixed(1).replace('.0', '')}K` : String(count);

export function CommunityHub() {
  const { setCurrentPage, setSearchQuery } = useApp();
  const [communityList, setCommunityList] = useState(communities);
  const [tab, setTab] = useState<FeedTab>('Discover');
  const [category, setCategory] = useState<CommunityCategory | null>(null);
  const [query, setQuery] = useState('');
  const [location] = useState('Arua City');
  const [joined, setJoined] = useState<string[]>(['homeowners-arua', 'arua-city']);
  const [following, setFollowing] = useState<string[]>(['homeowners-arua']);
  const [saved, setSaved] = useState<string[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [liked, setLiked] = useState<string[]>([]);
  const [commentsOpen, setCommentsOpen] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [hiddenPosts] = useState<string[]>([]);
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

  useEffect(() => {
    let active = true;
    const fetchCommunityPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('community_posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data && data.length > 0) {
          const loadedPosts: FeedPost[] = data.map((post) => {
            let imageUrl = '';
            if (post.media_path) {
              imageUrl = supabase.storage.from('community-media').getPublicUrl(post.media_path).data.publicUrl;
            }
            return {
              id: post.id,
              author: post.author_name || 'Community Member',
              role: post.author_role || 'Member',
              community: post.title || 'Community',
              time: 'Recently',
              location: 'Arua City',
              kind: (post.category as PostKind) || 'Discussion',
              text: post.body,
              ...(imageUrl ? { image: imageUrl } : {}),
              likes: post.like_count || 0,
              replies: 0,
            };
          });

          const localCached: FeedPost[] = JSON.parse(localStorage.getItem('homicare-community-posts') || '[]');
          const allIds = new Set(loadedPosts.map((p) => p.id));
          const extraLocal = localCached.filter((p) => !allIds.has(p.id));
          const combined = [...extraLocal, ...loadedPosts];
          const loadedIds = new Set(combined.map((p) => p.id));

          if (active) {
            setPosts([...combined, ...initialPosts.filter((p) => !loadedIds.has(p.id))]);
          }
        }
      } catch {
        // Fallback
      }
    };

    void fetchCommunityPosts();
    return () => { active = false; };
  }, []);

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

  const submitPost = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    const selectedCommunity = communityList.find((item) => joined.includes(item.id)) || communityList[0];
    const postText = postKind === 'Ask the Community'
      ? `${askService} · ${askUrgency}${askBudget.trim() ? ` · Budget ${askBudget.trim()}` : ''}\n${draft.trim()}`
      : draft.trim();

    let imageUrl = imageAttachment?.dataUrl || '';
    let storagePath = '';

    if (imageAttachment?.file) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id || 'public';
        const file = imageAttachment.file;
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        storagePath = `${userId}/${crypto.randomUUID()}-${safeName}`;

        const { error: uploadError } = await supabase.storage.from('community-media').upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('community-media').getPublicUrl(storagePath);
          if (publicUrlData?.publicUrl) imageUrl = publicUrlData.publicUrl;
        }
      } catch {
        // Fallback
      }
    }

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      const authorName = String(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Community Member').slice(0, 80);
      const authorRole = user?.app_metadata?.role === 'admin'
        ? 'Community Admin'
        : user?.user_metadata?.role === 'provider' ? 'Service Provider' : 'Community Member';

      const { data: savedPost } = await supabase
        .from('community_posts')
        .insert({
          author_id: user?.id || null,
          author_name: authorName,
          author_role: authorRole,
          category: postKind,
          title: selectedCommunity.name,
          body: postText,
          media_path: storagePath || null,
          attachments: storagePath ? [{ name: imageAttachment?.name || 'attachment', path: storagePath, contentType: imageAttachment?.file?.type || 'image/jpeg' }] : [],
        })
        .select('*')
        .single();

      const newPost: FeedPost = {
        id: savedPost?.id || `post-${Date.now()}`,
        author: authorName,
        role: authorRole,
        community: selectedCommunity.name,
        time: 'Just now',
        location: location,
        kind: postKind,
        text: postText,
        ...(imageUrl ? { image: imageUrl } : {}),
        likes: 0,
        replies: 0,
        ...(postKind === 'Poll' ? { pollOptions: ['Option 1', 'Option 2'] } : {}),
      };

      setPosts((current) => [newPost, ...current]);
      const storedLocal = JSON.parse(localStorage.getItem('homicare-community-posts') || '[]');
      localStorage.setItem('homicare-community-posts', JSON.stringify([newPost, ...storedLocal]));
    } catch {
      const newPost: FeedPost = {
        id: `post-${Date.now()}`,
        author: 'You',
        role: 'Community Member',
        community: selectedCommunity.name,
        time: 'Just now',
        location: location,
        kind: postKind,
        text: postText,
        ...(imageUrl ? { image: imageUrl } : {}),
        likes: 0,
        replies: 0,
      };
      setPosts((current) => [newPost, ...current]);
    }

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
    setCreateOpen(false);
    notify(`Created ${community.name}`);
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
    if (file.size > 25 * 1024 * 1024) {
      notify('Choose an image smaller than 25 MB');
      event.currentTarget.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageAttachment({ name: file.name, dataUrl: reader.result, file });
      } else {
        notify('The selected image could not be read');
      }
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
    <main className="min-h-screen bg-slate-50 py-6 text-slate-900">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-3">
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
        <header className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-orange-700">HomiCare Network</span>
                <span className="text-xs font-semibold text-slate-500">{location}</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Community Hub</h1>
              <p className="text-xs text-slate-600 sm:text-sm">Connect with local homeowners, share trusted tips and find verified household professionals.</p>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" /> Create Community
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search communities, topics, recommendations or posts..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-xs font-medium outline-none focus:border-orange-400 focus:bg-white"
              />
            </div>
            <button
              onClick={() => notify('Showing the most relevant community results')}
              aria-label="Search filters"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Sparkles className="h-4 w-4 text-orange-500" /> Filter results
            </button>
          </div>

          <nav aria-label="Community sections" className="mt-4 flex gap-1.5 overflow-x-auto rounded-xl border border-slate-100 bg-slate-50 p-1.5 text-xs font-bold">
            {(['Discover', 'My Communities', 'Trending', 'Following', 'Nearby'] as FeedTab[]).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 transition ${tab === item ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {item}
              </button>
            ))}
          </nav>
        </header>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Explore by Category</h2>
            {category && <button onClick={() => setCategory(null)} className="text-xs font-bold text-orange-600 hover:underline">Show all categories</button>}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((item) => {
              const Icon = item.icon;
              const active = category === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => setCategory(active ? null : item.label)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${active ? 'border-orange-500 bg-orange-50/70 shadow-sm' : 'border-slate-200/80 bg-white hover:border-slate-300'}`}
                >
                  <div className={`rounded-lg p-2 ${item.color}`}><Icon className="h-4 w-4" /></div>
                  <p className="mt-2 text-xs font-bold text-slate-900 line-clamp-1">{item.label}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-500">{item.count} groups</p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6 min-w-0">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900">{category ? `${category} Groups` : 'Featured Communities'}</h2>
                <span className="text-xs font-semibold text-slate-500">{visibleCommunities.length} communities</span>
              </div>
              {visibleCommunities.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {visibleCommunities.map((item) => (
                    <CommunityCard
                      key={item.id}
                      community={item}
                      joined={joined.includes(item.id)}
                      following={following.includes(item.id)}
                      saved={saved.includes(item.id)}
                      onJoin={() => toggleJoin(item)}
                      onFollow={() => toggleFollow(item)}
                      onSave={() => setSaved((curr) => curr.includes(item.id) ? curr.filter((id) => id !== item.id) : [...curr, item.id])}
                      onOpen={() => { setDetail(item); setDetailTab('About'); }}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  No communities matched your search. Try adjusting filters or create a new community.
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-100 font-bold text-orange-700">Y</div>
                <button
                  onClick={() => setComposerOpen(true)}
                  className="flex h-10 flex-1 items-center rounded-full border border-slate-200 bg-slate-50 px-4 text-xs font-medium text-slate-500 hover:bg-slate-100"
                >
                  Share an idea, home tip, or question with your community...
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <QuickComposerButton icon={MessageCircle} label="Discussion" color="orange" onClick={() => { setPostKind('Discussion'); setComposerOpen(true); }} />
                <QuickComposerButton icon={CircleHelp} label="Ask Community" color="blue" onClick={() => { setPostKind('Ask the Community'); setComposerOpen(true); }} />
                <QuickComposerButton icon={Wrench} label="Recommendation" color="green" onClick={() => { setPostKind('Service Recommendation'); setComposerOpen(true); }} />
                <QuickComposerButton icon={BarChart3} label="Poll" color="purple" onClick={() => { setPostKind('Poll'); setComposerOpen(true); }} />
                <QuickComposerButton icon={Camera} label="Add Photo" color="slate" onClick={() => { setPostKind('Discussion'); setComposerOpen(true); }} />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900">Community Feed</h2>
                <span className="text-xs font-semibold text-slate-500">{visiblePosts.length} posts</span>
              </div>
              {visiblePosts.length ? (
                visiblePosts.map((post) => (
                  <FeedPostCard
                    key={post.id}
                    post={post}
                    liked={liked.includes(post.id)}
                    commentsOpen={commentsOpen === post.id}
                    commentCount={(commentCounts[post.id] || 0) + post.replies}
                    commentDraft={commentsOpen === post.id ? commentDraft : ''}
                    onLike={() => setLiked((curr) => curr.includes(post.id) ? curr.filter((id) => id !== post.id) : [...curr, post.id])}
                    onToggleComments={() => setCommentsOpen(commentsOpen === post.id ? null : post.id)}
                    onCommentDraftChange={setCommentDraft}
                    onSubmitComment={() => submitComment(post.id)}
                    onShare={() => sharePost(`${post.author} on ${post.community}: ${post.text}`)}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  No community posts found matching your current tab or filter.
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-extrabold text-slate-900"><Calendar className="h-4 w-4 text-orange-600" /> Upcoming Community Events</h2>
              <div className="space-y-2.5">
                {communityEvents.map((evt) => (
                  <div key={evt.title} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-center text-white ${evt.color}`}>
                      <span className="text-[9px] font-black uppercase leading-none">{evt.month}</span>
                      <span className="text-sm font-black leading-tight">{evt.day}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-slate-900 line-clamp-1">{evt.title}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{evt.place}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-red-200/80 bg-red-50/50 p-4 space-y-2">
              <h2 className="flex items-center gap-2 text-xs font-extrabold text-red-900"><ShieldCheck className="h-4 w-4 text-red-600" /> Need Emergency Home Assistance?</h2>
              <p className="text-[11px] leading-relaxed text-red-800">Request urgent plumbing, electrical, or security support in Arua City.</p>
              <button onClick={askForHelp} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700">
                Get Emergency Help <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </section>

            <section className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-4 space-y-2">
              <h2 className="flex items-center gap-2 text-xs font-extrabold text-blue-900"><Award className="h-4 w-4 text-blue-600" /> Build Your Reputation</h2>
              <p className="text-[11px] leading-relaxed text-blue-800">Share household maintenance advice and help your neighbours to earn verified community badges.</p>
            </section>
          </aside>
        </div>
      </div>

      {composerOpen && (
        <Modal title="Share with your community" onClose={() => setComposerOpen(false)}>
          <form onSubmit={submitPost} className="space-y-4">
            <label className="block text-xs font-bold text-slate-700">Post type
              <select value={postKind} onChange={(event) => setPostKind(event.target.value as PostKind)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal outline-none focus:border-orange-400">
                {(['Discussion', 'Ask the Community', 'Service Recommendation', 'Home Tip', 'Announcement', 'Poll'] as PostKind[]).map((kind) => <option key={kind}>{kind}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-slate-700">Your post
              <textarea autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={postKind === 'Ask the Community' ? 'What would you like help with? Include your area and any important details.' : 'Share something helpful with your community...'} rows={5} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 p-3 text-sm font-normal outline-none focus:border-orange-400" />
            </label>
            {postKind === 'Ask the Community' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700">Service<select value={askService} onChange={(event) => setAskService(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal"><option>Plumbing</option><option>Electrical</option><option>Cleaning</option><option>Appliance repair</option><option>Home security</option></select></label>
                <label className="text-xs font-bold text-slate-700">Urgency<select value={askUrgency} onChange={(event) => setAskUrgency(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal"><option>When available</option><option>Soon</option><option>Emergency</option></select></label>
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600"><Camera className="h-4 w-4 text-blue-600" />Add a photo<input type="file" accept="image/*" onChange={attachPhoto} className="sr-only" /></label>
            {imageAttachment && (
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-2">
                <img src={imageAttachment.dataUrl} alt="Attachment preview" className="h-14 w-14 rounded-md object-cover" />
                <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{imageAttachment.name}</span>
                <button type="button" onClick={() => setImageAttachment(null)} className="rounded p-1 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setComposerOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
              <button type="submit" disabled={!draft.trim()} className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Share post</button>
            </div>
          </form>
        </Modal>
      )}

      {createOpen && (
        <Modal title="Create a Community" onClose={() => setCreateOpen(false)}>
          <form onSubmit={submitCommunity} className="space-y-4">
            <label className="block text-xs font-bold text-slate-700">Community name<input autoFocus required value={newCommunityName} onChange={(e) => setNewCommunityName(e.target.value)} placeholder="e.g. Arua Solar Power Users" className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-orange-400" /></label>
            <label className="block text-xs font-bold text-slate-700">Category<select value={newCommunityCategory} onChange={(e) => setNewCommunityCategory(e.target.value as CommunityCategory)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal"><option>Home & Household</option><option>Services & Trades</option><option>Families & Lifestyle</option><option>Local Communities</option></select></label>
            <label className="block text-xs font-bold text-slate-700">Description<textarea value={newCommunityDescription} onChange={(e) => setNewCommunityDescription(e.target.value)} rows={3} placeholder="Describe the focus of your community..." className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-orange-400" /></label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
              <button type="submit" disabled={!newCommunityName.trim()} className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Create Group</button>
            </div>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <div className="space-y-4">
            <div className="relative h-36 overflow-hidden rounded-xl bg-slate-100"><img src={detail.image} alt="" className="h-full w-full object-cover" /></div>
            <p className="text-xs text-slate-600">{detail.description}</p>
            <div className="flex gap-2">
              <button onClick={() => toggleJoin(detail)} className={`rounded-lg px-4 py-2 text-xs font-bold ${joined.includes(detail.id) ? 'border border-slate-200 text-slate-700' : 'bg-orange-500 text-white'}`}>{joined.includes(detail.id) ? 'Joined' : 'Join Group'}</button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
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
  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div>
        <div className="relative h-28 overflow-hidden rounded-xl bg-slate-100">
          <img src={community.image} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          <button onClick={onOpen} aria-label={`Open ${community.name}`} className="absolute inset-0 z-0" />
          <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-white/90 px-2 py-0.5 text-[9px] font-extrabold text-slate-900 backdrop-blur-sm">{community.label}</span>
          <div className="absolute right-2 top-2 flex gap-1">
            <button onClick={onFollow} aria-label="Follow" className="rounded-lg bg-white/90 p-1.5 text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white"><UserPlus className="h-3.5 w-3.5" /></button>
            <button onClick={onSave} aria-label="Save" className="rounded-lg bg-white/90 p-1.5 text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white"><Bookmark className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <button onClick={onOpen} className="mt-3 text-left font-extrabold text-slate-900 text-sm hover:text-orange-600 line-clamp-1">{community.name}</button>
        <p className="mt-0.5 text-[10px] text-slate-500 flex items-center gap-1"><Users className="h-3 w-3" />{formatMembers(community.members)} members · {community.location}</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 line-clamp-2">{community.description}</p>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <button onClick={onJoin} className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${joined ? 'border-slate-200 bg-slate-100 text-slate-700' : 'border-orange-500 bg-orange-50 text-orange-600 hover:bg-orange-100'}`}>
          {joined ? 'Joined' : 'Join Group'}
        </button>
      </div>
    </article>
  );
}

function FeedPostCard({ post, liked, commentsOpen, commentCount, commentDraft, onLike, onToggleComments, onCommentDraftChange, onSubmitComment, onShare }: {
  post: FeedPost;
  liked: boolean;
  commentsOpen: boolean;
  commentCount: number;
  commentDraft: string;
  onLike: () => void;
  onToggleComments: () => void;
  onCommentDraftChange: (v: string) => void;
  onSubmitComment: () => void;
  onShare: () => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 font-extrabold text-slate-700">{post.author.charAt(0)}</div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-slate-900">{post.author}</span>
              {post.verified && <CheckCircle2 className="h-3.5 w-3.5 fill-blue-600 text-white" />}
            </div>
            <p className="text-[10px] text-slate-500">{post.role} · {post.community} · {post.time}</p>
          </div>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{post.kind}</span>
      </div>

      <p className="text-xs leading-relaxed text-slate-800 whitespace-pre-line">{post.text}</p>

      {post.image && (
        <div className="overflow-hidden rounded-xl bg-slate-100 max-h-96">
          <img src={post.image} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {post.pollOptions && (
        <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs font-medium">
          {post.pollOptions.map((opt) => (
            <button key={opt} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-orange-400">{opt}</button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-slate-600">
        <button onClick={onLike} className={`flex items-center gap-1.5 hover:text-orange-600 ${liked ? 'text-orange-600' : ''}`}>
          <Heart className={`h-4 w-4 ${liked ? 'fill-orange-600' : ''}`} /> {post.likes + (liked ? 1 : 0)}
        </button>
        <button onClick={onToggleComments} className="flex items-center gap-1.5 hover:text-orange-600">
          <MessageCircle className="h-4 w-4" /> {commentCount} replies
        </button>
        <button onClick={onShare} className="flex items-center gap-1.5 hover:text-orange-600">
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>

      {commentsOpen && (
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <div className="flex gap-2">
            <input
              value={commentDraft}
              onChange={(e) => onCommentDraftChange(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-orange-400 focus:bg-white"
            />
            <button onClick={onSubmitComment} disabled={!commentDraft.trim()} className="rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function QuickComposerButton({ icon: Icon, label, color, onClick }: { icon: typeof MessageCircle; label: string; color: string; onClick: () => void }) {
  const colors: Record<string, string> = {
    orange: 'text-orange-600 bg-orange-50 hover:bg-orange-100',
    blue: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
    green: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100',
    purple: 'text-purple-600 bg-purple-50 hover:bg-purple-100',
    slate: 'text-slate-600 bg-slate-100 hover:bg-slate-200',
  };
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${colors[color] || colors.slate}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}