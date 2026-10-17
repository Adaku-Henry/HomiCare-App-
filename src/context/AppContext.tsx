import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/lib/supabase';
import type { Page } from '@/types';

interface AppState {
  currentPage: Page;
  setCurrentPage: (p: Page) => void;
  callIntent: { id: number; type: 'voice' | 'video' } | null;
  setCallIntent: (intent: { id: number; type: 'voice' | 'video' } | null) => void;
  selectedProviderId: string | null;
  setSelectedProviderId: (id: string | null) => void;
  selectedPublicProfileId: string | null;
  setSelectedPublicProfileId: (id: string | null) => void;
  selectedServiceSlug: string | null;
  setSelectedServiceSlug: (s: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  userRole: 'customer' | 'provider' | 'admin';
  setUserRole: (r: 'customer' | 'provider' | 'admin') => void;
  bookingProviderId: string | null;
  setBookingProviderId: (id: string | null) => void;
  bookingServiceName: string | null;
  setBookingServiceName: (name: string | null) => void;
  bookingRequestMode: 'booking' | 'quote';
  setBookingRequestMode: (mode: 'booking' | 'quote') => void;
  bookingDraft: { date: string; time: string; location: string; paymentMethod: string };
  setBookingDraft: (draft: { date: string; time: string; location: string; paymentMethod: string }) => void;
  activeBookingCode: string | null;
  setActiveBookingCode: (code: string | null) => void;
  authReady: boolean;
  isAuthenticated: boolean;
  nativeAuthError: string;
  setNativeAuthError: (error: string) => void;
}

const AppContext = createContext<AppState | null>(null);

function readAppLocation() {
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const providerMatch = path.match(/^\/providers\/([^/]+)$/);
  if (providerMatch) return { page: 'provider' as Page, providerId: decodeURIComponent(providerMatch[1]) };
  const conversationMatch = path.match(/^\/messages\/([^/]+)$/);
  if (conversationMatch) {
    const segment = decodeURIComponent(conversationMatch[1]);
    if (segment === 'center') return { page: 'communication-center' as Page, providerId: null };
    if (segment === 'booking') return { page: 'booking-communication' as Page, providerId: null };
    return { page: 'message-conversation' as Page, providerId: segment };
  }
  if (path === '/messages') return { page: 'messages' as Page, providerId: null };
  const routes: Record<string, Page> = {
    '/': 'home',
    '/register': 'signup',
    '/login': 'login',
    '/provider/onboarding': 'provider-onboarding',
    '/provider/dashboard': 'provider-dashboard',
    '/services': 'search',
    '/providers': 'providers',
    '/people': 'people',
    '/member-messages': 'member-messages',
    '/opportunities': 'opportunities',
    '/cv-portfolio': 'documents',
    '/bookings': 'my-bookings',
    '/booking': 'booking',
    '/payment': 'payment',
    '/connect': 'communities',
    '/wallet': 'wallet',
    '/profile': 'profile',
  };
  if (routes[path]) return { page: routes[path], providerId: null };
  return {
    page: params.has('profile') ? 'public-profile' as Page : params.has('provider') ? 'provider' as Page : 'home' as Page,
    providerId: params.get('provider'),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [initialLocation] = useState(readAppLocation);
  const isNativeApp = Capacitor.isNativePlatform();
  const [currentPage, setCurrentPageState] = useState<Page>(
    isNativeApp && initialLocation.page === 'home' ? 'login' : initialLocation.page,
  );
  const [callIntent, setCallIntent] = useState<{ id: number; type: 'voice' | 'video' } | null>(null);
  const [selectedProviderId, setSelectedProviderIdState] = useState<string | null>(initialLocation.providerId);
  const selectedProviderIdRef = useRef(selectedProviderId);
  const [selectedPublicProfileId, setSelectedPublicProfileId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('profile'));
  const selectedPublicProfileIdRef = useRef(selectedPublicProfileId);
  const [selectedServiceSlug, setSelectedServiceSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState<'customer' | 'provider' | 'admin'>('customer');
  const [bookingProviderId, setBookingProviderId] = useState<string | null>(null);
  const [bookingServiceName, setBookingServiceName] = useState<string | null>(null);
  const [bookingRequestMode, setBookingRequestMode] = useState<'booking' | 'quote'>('booking');
  const [bookingDraft, setBookingDraft] = useState({ date: '', time: '', location: '', paymentMethod: 'MTN Mobile Money' });
  const [activeBookingCode, setActiveBookingCode] = useState<string | null>(() => new URLSearchParams(window.location.search).get('booking_code'));
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [nativeAuthError, setNativeAuthError] = useState('');

  const setSelectedProviderId = (id: string | null) => {
    selectedProviderIdRef.current = id;
    setSelectedProviderIdState(id);
    if (id && window.location.pathname.startsWith('/messages/')) {
      window.history.replaceState({}, '', `/messages/${encodeURIComponent(id)}`);
    }
  };

  const updateSelectedPublicProfileId = (id: string | null) => {
    selectedPublicProfileIdRef.current = id;
    setSelectedPublicProfileId(id);
  };

  const setCurrentPage = (page: Page) => {
    setCurrentPageState(page);
    const pagePaths: Partial<Record<Page, string>> = {
      home: '/',
      signup: '/register',
      login: '/login',
      'provider-onboarding': '/provider/onboarding',
      'provider-dashboard': '/provider/dashboard',
      search: '/services',
      providers: '/providers',
      people: '/people',
      'member-messages': '/member-messages',
      opportunities: '/opportunities',
      documents: '/cv-portfolio',
      'my-bookings': '/bookings',
      booking: '/booking',
      payment: '/payment',
      communities: '/connect',
      wallet: '/wallet',
      profile: '/profile',
    };
    const nextPath = page === 'messages'
      ? '/messages'
      : page === 'member-messages'
        ? `/member-messages${selectedPublicProfileIdRef.current ? `?profile=${encodeURIComponent(selectedPublicProfileIdRef.current)}` : ''}`
      : page === 'communication-center'
        ? '/messages/center'
        : page === 'booking-communication'
          ? '/messages/booking'
          : page === 'payment'
            ? `/payment${activeBookingCode ? `?booking_code=${encodeURIComponent(activeBookingCode)}` : ''}`
          : page === 'provider' && selectedProviderIdRef.current
            ? `/providers/${encodeURIComponent(selectedProviderIdRef.current)}`
          : page === 'message-conversation' && selectedProviderIdRef.current
            ? `/messages/${encodeURIComponent(selectedProviderIdRef.current)}`
            : page === 'message-conversation'
              ? '/messages'
                : pagePaths[page] || (window.location.pathname.startsWith('/messages') ? '/' : window.location.pathname);
    if (nextPath !== window.location.pathname) window.history.pushState({}, '', nextPath);
  };

  useEffect(() => {
    const restoreLocation = () => {
      const location = readAppLocation();
      selectedProviderIdRef.current = location.providerId;
      setSelectedProviderIdState(location.providerId);
      const publicProfileId = new URLSearchParams(window.location.search).get('profile');
      selectedPublicProfileIdRef.current = publicProfileId;
      setSelectedPublicProfileId(publicProfileId);
      setCurrentPageState(location.page);
    };
    window.addEventListener('popstate', restoreLocation);
    return () => window.removeEventListener('popstate', restoreLocation);
  }, []);

  useEffect(() => {
    if (!isNativeApp || !authReady) return;
    if (!isAuthenticated && currentPage !== 'login' && currentPage !== 'signup') {
      setCurrentPage('login');
    } else if (isAuthenticated && currentPage === 'login') {
      const page = userRole === 'provider' ? 'provider-dashboard' : userRole === 'admin' ? 'admin' : 'home';
      setCurrentPage(page);
    }
  }, [authReady, currentPage, isAuthenticated, isNativeApp, userRole]);

  useEffect(() => {
    let active = true;
    let deepLinkListener: { remove: () => Promise<void> } | undefined;

    const updateSession = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!active) return;
      setIsAuthenticated(Boolean(session));
      const pendingRole = isNativeApp ? localStorage.getItem('homicare-pending-auth-role') : null;
      const role = session?.user.app_metadata?.role === 'admin'
        ? 'admin'
        : session?.user.user_metadata?.role === 'provider' || pendingRole === 'provider'
          ? 'provider'
          : 'customer';
      setUserRole(role);
      if (session && isNativeApp && currentPage === 'login') {
        setCurrentPage(role === 'provider' ? 'provider-dashboard' : role === 'admin' ? 'admin' : 'home');
        localStorage.removeItem('homicare-pending-auth-role');
      }
      if (!session && isNativeApp && authReady && currentPage !== 'login' && currentPage !== 'signup') {
        setCurrentPage('login');
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      updateSession(session);
      if (event === 'PASSWORD_RECOVERY') setCurrentPage('profile-password');
      if (event === 'SIGNED_OUT' && isNativeApp) setCurrentPage('login');
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setNativeAuthError(`Your saved sign-in could not be checked: ${error.message}`);
      updateSession(data.session);
      setAuthReady(true);
      if (isNativeApp && !data.session && currentPage !== 'login' && currentPage !== 'signup') {
        setCurrentPage('login');
      }
      if (isNativeApp && data.session && currentPage === 'login') {
        const role = data.session.user.app_metadata?.role === 'admin'
          ? 'admin'
          : data.session.user.user_metadata?.role === 'provider' ? 'provider' : 'customer';
        setCurrentPage(role === 'provider' ? 'provider-dashboard' : role === 'admin' ? 'admin' : 'home');
      }
    });

    const finishNativeSignIn = async (url: string) => {
      if (!url.startsWith('com.homicare.app://login-callback')) return;
      setNativeAuthError('');
      try {
        const callback = new URL(url);
        const providerError = callback.searchParams.get('error_description') || callback.searchParams.get('error');
        if (providerError) throw new Error(providerError);
        const code = callback.searchParams.get('code');
        if (!code) throw new Error('The sign-in callback did not contain an authorization code.');
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        await Browser.close();
      } catch (cause) {
        setNativeAuthError(cause instanceof Error ? cause.message : 'Google sign-in could not be completed.');
      }
    };

    void CapacitorApp.addListener('appUrlOpen', ({ url }) => finishNativeSignIn(url)).then((listener) => {
      if (active) deepLinkListener = listener;
      else void listener.remove();
    }).catch((cause: unknown) => {
      if (active) setNativeAuthError(cause instanceof Error ? cause.message : 'Native sign-in callback could not be registered.');
    });
    void CapacitorApp.getLaunchUrl().then((launch) => {
      if (active && launch?.url) return finishNativeSignIn(launch.url);
    }).catch((cause: unknown) => {
      if (active) setNativeAuthError(cause instanceof Error ? cause.message : 'The sign-in callback could not be read.');
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      if (deepLinkListener) void deepLinkListener.remove();
    };
  }, []);

  return (
    <AppContext.Provider value={{
      currentPage, setCurrentPage, callIntent, setCallIntent,
      selectedProviderId, setSelectedProviderId,
      selectedPublicProfileId, setSelectedPublicProfileId: updateSelectedPublicProfileId,
      selectedServiceSlug, setSelectedServiceSlug,
      searchQuery, setSearchQuery,
      userRole, setUserRole,
      bookingProviderId, setBookingProviderId,
      bookingServiceName, setBookingServiceName,
      bookingRequestMode, setBookingRequestMode,
      bookingDraft, setBookingDraft,
      activeBookingCode, setActiveBookingCode,
      authReady, isAuthenticated, nativeAuthError, setNativeAuthError,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
