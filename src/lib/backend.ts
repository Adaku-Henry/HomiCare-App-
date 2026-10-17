import { supabase } from '@/lib/supabase';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || '/api').replace(/\/$/, '');
const getCacheTtlMs = 15_000;
const getCache = new Map<string, { expiresAt: number; value: unknown }>();

const fallbackCategories = [
  { id: 'cleaning', name: 'Cleaning', slug: 'cleaning', icon: 'Sparkles', description: 'Routine and deep cleaning for homes and offices.', sort_order: 1 },
  { id: 'plumbing', name: 'Plumbing', slug: 'plumbing', icon: 'Wrench', description: 'Repairs, installations, and maintenance for pipes and fixtures.', sort_order: 2 },
  { id: 'electrical', name: 'Electrical', slug: 'electrical', icon: 'Zap', description: 'Electrical repairs, rewiring, and troubleshooting.', sort_order: 3 },
  { id: 'carpentry', name: 'Carpentry', slug: 'carpentry', icon: 'Hammer', description: 'Joinery, repair, and custom woodwork.', sort_order: 4 },
  { id: 'painting', name: 'Painting', slug: 'painting', icon: 'Paintbrush', description: 'Interior and exterior painting services.', sort_order: 5 },
  { id: 'laundry', name: 'Laundry', slug: 'laundry', icon: 'Settings', description: 'Washing, ironing, and linen care.', sort_order: 6 },
  { id: 'cooking', name: 'Cooking', slug: 'cooking', icon: 'Sun', description: 'Home cooking and meal prep support.', sort_order: 7 },
  { id: 'delivery', name: 'Delivery', slug: 'delivery', icon: 'Truck', description: 'Errands, logistics, and home delivery support.', sort_order: 8 },
];

async function handleFallbackRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  const cleanPath = path.split('?')[0];
  if (method !== 'GET') {
    throw new Error(`The backend is unavailable. The ${method} request to ${cleanPath} was not saved.`);
  }

  if (cleanPath === '/services/categories') {
    try {
      const { data, error } = await supabase.from('service_categories').select('*').order('sort_order');
      if (!error && data && data.length > 0) return data as unknown as T;
    } catch {
      // Fallback
    }
    return fallbackCategories as unknown as T;
  }

  if (cleanPath === '/providers') {
    const { data, error } = await supabase.from('public_provider_profiles').select('*');
    if (error) throw new Error(`Public providers could not be loaded from Supabase: ${error.message}`);
    return (data || []) as unknown as T;
  }

  if (cleanPath === '/bookings') {
    const { data, error } = await supabase.from('bookings').select('*');
    if (error) throw new Error(`Bookings could not be loaded from Supabase: ${error.message}`);
    return (data || []) as unknown as T;
  }

  if (cleanPath === '/profiles/me') {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(`Your sign-in session could not be loaded: ${sessionError.message}`);
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('Sign in to load your profile.');
    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw new Error(`Your profile could not be loaded from Supabase: ${error.message}`);
    return (data ?? null) as T;
  }

  throw new Error(`The backend is unavailable for ${cleanPath}. Configure VITE_BACKEND_URL and restart the app.`);
}

export async function backendRequest<T>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(init.headers);
  const { data, error } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (error) throw new Error(`Your sign-in session could not be loaded: ${error.message}`);
  if (authenticated && !accessToken) throw new Error('Sign in to continue.');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const method = (init.method || 'GET').toUpperCase();
  const requestUrl = `${backendBaseUrl}${path}`;
  const cacheKey = `${headers.get('Authorization') || ''}:${requestUrl}`;

  if (method === 'GET') {
    const cached = getCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    if (cached) getCache.delete(cacheKey);
  } else {
    getCache.clear();
  }

  // If no backend URL is configured or relative /api is used on Capacitor mobile
  const isCapacitor = typeof window !== 'undefined' && window.location.protocol === 'capacitor:';

  if (!import.meta.env.VITE_BACKEND_URL && isCapacitor) {
    return handleFallbackRequest<T>(path, init);
  }

  let response: Response;
  try {
    response = await fetch(requestUrl, { ...init, headers });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Network request failed.';
    throw new Error(`Backend request to ${path} failed: ${message}`);
  }

  const responseText = await response.text();
  let payload: ApiResponse<T> | null = null;
  if (responseText.trim()) {
    try {
      const parsed: unknown = JSON.parse(responseText);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) payload = parsed as ApiResponse<T>;
    } catch {
      throw new Error(`Backend request to ${path} returned an invalid response (HTTP ${response.status}).`);
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.error || `Backend request to ${path} failed with HTTP ${response.status}.`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  if (!payload || !('data' in payload)) {
    throw new Error(`Backend request to ${path} returned no data.`);
  }

  if (method === 'GET') {
    if (getCache.size >= 50) getCache.delete(getCache.keys().next().value as string);
    getCache.set(cacheKey, { expiresAt: Date.now() + getCacheTtlMs, value: payload.data });
  }
  return payload.data as T;
}