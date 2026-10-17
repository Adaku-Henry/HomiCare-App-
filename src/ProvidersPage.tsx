import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck, BriefcaseBusiness, Calendar, CheckCircle2, Clock3, MapPin,
  Search, ShieldCheck, SlidersHorizontal, Star, Wrench,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { ProfileMediaImage } from '@/ProfileMediaImage';
import { formatUGX, getAvailabilityLabel } from '@/lib/utils';
import type { Provider, ServiceCategory } from '@/types';

type DirectoryFilters = {
  query: string;
  location: string;
  categoryId: string;
  minRating: number;
  verifiedOnly: boolean;
  availableOnly: boolean;
  sort: 'recommended' | 'rating' | 'experience' | 'price';
};

const initialFilters: DirectoryFilters = {
  query: '',
  location: '',
  categoryId: '',
  minRating: 0,
  verifiedOnly: false,
  availableOnly: false,
  sort: 'recommended',
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ProvidersPage() {
  const {
    setSelectedProviderId, setCurrentPage, setBookingProviderId,
    setBookingServiceName, setBookingRequestMode,
  } = useApp();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [filters, setFilters] = useState<DirectoryFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryWarning, setCategoryWarning] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError('');
    setCategoryWarning('');
    try {
      const [providerResult, categoryResult] = await Promise.all([
        supabase.from('public_provider_profiles').select('*').order('rating', { ascending: false }).limit(100),
        supabase.from('service_categories').select('*').order('sort_order'),
      ]);
      if (providerResult.error) throw new Error(`Provider directory could not be loaded: ${providerResult.error.message}`);
      setProviders((providerResult.data || []) as Provider[]);
      if (categoryResult.error) {
        setCategories([]);
        setCategoryWarning(`Service categories could not be loaded: ${categoryResult.error.message}. Provider listings are still available.`);
      } else {
        setCategories((categoryResult.data || []) as ServiceCategory[]);
      }
    } catch (cause) {
      setProviders([]);
      setCategories([]);
      setError(cause instanceof Error ? cause.message : 'Provider directory could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProviders(); }, [loadProviders, retryKey]);

  const visibleProviders = useMemo(() => {
    const query = filters.query.trim().toLocaleLowerCase();
    const location = filters.location.trim().toLocaleLowerCase();
    const matches = providers.filter((provider) => {
      const categoryMatches = !filters.categoryId || provider.primary_service_category_id === filters.categoryId;
      const locationMatches = !location || provider.location.toLocaleLowerCase().includes(location);
      const queryMatches = !query || [
        provider.full_name,
        provider.professional_title,
        provider.location,
        provider.bio || '',
        ...(provider.skills || []),
      ].some((value) => value.toLocaleLowerCase().includes(query));
      return categoryMatches
        && locationMatches
        && queryMatches
        && provider.rating >= filters.minRating
        && (!filters.verifiedOnly || provider.identity_verified)
        && (!filters.availableOnly || provider.availability_status === 'available');
    });

    return matches.sort((left, right) => {
      if (filters.sort === 'rating') return right.rating - left.rating || right.review_count - left.review_count;
      if (filters.sort === 'experience') return right.years_experience - left.years_experience;
      if (filters.sort === 'price') return left.starting_price - right.starting_price;
      return Number(right.identity_verified) - Number(left.identity_verified)
        || right.rating - left.rating
        || right.completed_jobs - left.completed_jobs;
    });
  }, [filters, providers]);

  const openProfile = (provider: Provider) => {
    if (!uuidPattern.test(provider.id)) {
      setError(`The listing for ${provider.full_name} is sample directory data and has no saved profile yet.`);
      return;
    }
    setSelectedProviderId(provider.id);
    setCurrentPage('provider');
  };

  const requestBooking = (provider: Provider) => {
    if (!uuidPattern.test(provider.id)) {
      setError(`Bookings are unavailable for ${provider.full_name} because this listing has no saved provider record.`);
      return;
    }
    setBookingProviderId(provider.id);
    setBookingServiceName(provider.professional_title);
    setBookingRequestMode('booking');
    setCurrentPage('booking');
  };

  const updateFilter = <K extends keyof DirectoryFilters>(key: K, value: DirectoryFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return <main className="min-h-[calc(100dvh-4rem)] bg-slate-50">
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-5 lg:px-6">
      <header className="relative overflow-hidden rounded-xl border border-orange-100 bg-gradient-to-r from-orange-100 via-orange-50 to-amber-50 p-5 sm:p-7">
        <div className="relative z-10 max-w-3xl"><p className="text-[10px] font-bold uppercase tracking-widest text-orange-800">HomiCare · Service providers</p><h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">Find trusted local professionals</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">Compare provider skills, experience, ratings, availability, and verified work before opening a profile or requesting a service.</p></div>
        <Wrench aria-hidden="true" className="absolute -bottom-6 right-4 h-36 w-36 rotate-[-18deg] text-orange-200/70" />
      </header>

      <section aria-label="Provider filters" className="mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_minmax(145px,0.8fr)_minmax(145px,0.8fr)_minmax(145px,0.8fr)_minmax(145px,0.8fr)]">
          <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} placeholder="Search providers, skills, or services" aria-label="Search providers" className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>
          <label><span className="sr-only">Location</span><input value={filters.location} onChange={(event) => updateFilter('location', event.target.value)} placeholder="Location" aria-label="Filter by location" className="h-10 w-full rounded-md border border-slate-200 px-3 text-xs outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>
          <label><span className="sr-only">Service category</span><select value={filters.categoryId} onChange={(event) => updateFilter('categoryId', event.target.value)} aria-label="Filter by service category" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:border-orange-400"><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label><span className="sr-only">Minimum rating</span><select value={filters.minRating} onChange={(event) => updateFilter('minRating', Number(event.target.value))} aria-label="Minimum rating" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:border-orange-400"><option value={0}>Any rating</option><option value={3}>3+ stars</option><option value={4}>4+ stars</option><option value={4.5}>4.5+ stars</option></select></label>
          <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 text-xs text-slate-700"><SlidersHorizontal className="h-4 w-4 text-orange-700" /><select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value as DirectoryFilters['sort'])} aria-label="Sort providers" className="h-10 min-w-0 flex-1 bg-transparent outline-none"><option value="recommended">Recommended</option><option value="rating">Highest rated</option><option value="experience">Most experienced</option><option value="price">Lowest price</option></select></label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap gap-4"><label className="inline-flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={filters.verifiedOnly} onChange={(event) => updateFilter('verifiedOnly', event.target.checked)} className="accent-orange-600" />Verified providers</label><label className="inline-flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={filters.availableOnly} onChange={(event) => updateFilter('availableOnly', event.target.checked)} className="accent-orange-600" />Available now</label></div>
          <button onClick={() => setFilters(initialFilters)} className="text-xs font-semibold text-orange-800 hover:underline">Clear filters</button>
        </div>
      </section>

      <div className="mb-3 mt-4 flex items-center justify-between gap-2"><h2 className="text-sm font-bold text-slate-900">{loading ? 'Loading providers...' : `${visibleProviders.length} provider${visibleProviders.length === 1 ? '' : 's'} found`}</h2><button onClick={() => setRetryKey((count) => count + 1)} disabled={loading} className="text-xs font-semibold text-orange-800 disabled:opacity-50">Refresh directory</button></div>

      {error && <div role="alert" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>{error}</p>{error.startsWith('Provider directory could not be loaded:') && <p className="mt-2 text-xs">Confirm that the public provider profile migration is applied and your Supabase connection is configured. Private or unpublished providers are intentionally not listed here.</p>}</div>}
      {categoryWarning && <p role="status" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{categoryWarning}</p>}

      {loading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />)}</div>
        : visibleProviders.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleProviders.map((provider) => <article key={provider.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-400" />
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-orange-100 text-lg font-bold text-orange-800">{provider.avatar_url ? <ProfileMediaImage source={provider.avatar_url} alt={`${provider.full_name} profile`} className="h-full w-full object-cover" /> : provider.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('')}</div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><h3 className="truncate text-sm font-bold text-slate-950">{provider.full_name}</h3>{provider.identity_verified && <BadgeCheck aria-label="Identity verified by HomiCare" className="h-4 w-4 shrink-0 text-emerald-600" />}</div><p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{provider.professional_title}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500"><MapPin className="h-3 w-3" />{provider.location}</p></div>
            </div>
            <p className="mt-3 line-clamp-3 min-h-12 text-xs leading-relaxed text-slate-600">{provider.bio || 'This provider has not added a professional introduction.'}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{(provider.skills || []).slice(0, 4).map((skill) => <span key={skill} className="rounded-full bg-orange-50 px-2 py-1 text-[9px] font-semibold text-orange-900">{skill}</span>)}</div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 border-y border-slate-100 py-3 text-center">
              <div><p className="inline-flex items-center gap-1 text-xs font-bold text-slate-900"><Star className="h-3 w-3 fill-orange-400 text-orange-400" />{provider.rating.toFixed(1)}</p><p className="text-[9px] text-slate-500">{provider.review_count} reviews</p></div>
              <div><p className="text-xs font-bold text-slate-900">{provider.years_experience} yrs</p><p className="text-[9px] text-slate-500">Experience</p></div>
              <div><p className="text-xs font-bold text-slate-900">{provider.completed_jobs}</p><p className="text-[9px] text-slate-500">Completed jobs</p></div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ${provider.availability_status === 'available' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}><CheckCircle2 className="h-3 w-3" />{getAvailabilityLabel(provider.availability_status)}</span><span className="text-right"><span className="block text-[9px] text-slate-500">Starting from</span><strong className="text-xs text-orange-800">{formatUGX(provider.starting_price)}</strong></span></div>
            <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => openProfile(provider)} className="rounded-md border border-orange-300 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-50">View profile</button><button onClick={() => requestBooking(provider)} className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700"><Calendar className="mr-1 inline h-3.5 w-3.5" />Book service</button></div>
          </div>
        </article>)}</div>
        : !error && <section className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><BriefcaseBusiness className="mx-auto h-8 w-8 text-orange-400" /><h2 className="mt-3 text-base font-bold text-slate-900">{providers.length ? 'No providers match those filters' : 'No published providers yet'}</h2><p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">{providers.length ? 'Try a wider search or clear some filters.' : 'Approved, publicly listed providers will appear here. Private profiles are not shown.'}</p><button onClick={() => setFilters(initialFilters)} className="mt-4 rounded-md bg-orange-600 px-4 py-2 text-xs font-semibold text-white">Clear filters</button></section>}

      <footer className="mt-6 flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-[10px] leading-relaxed text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><p>Provider visibility follows HomiCare’s public profile rules. Customer reviews, portfolio verification, and provider identity badges are kept distinct; a provider’s own CV claims are not treated as verified facts.</p><Clock3 className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" /></footer>
    </div>
  </main>;
}
