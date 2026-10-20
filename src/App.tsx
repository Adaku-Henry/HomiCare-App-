import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  Home, Search, MessageSquare, Wallet, LayoutDashboard, Shield, Heart,
  Menu, X, Bell, User, ChevronRight, ChevronDown, Wrench, Zap, Sparkles, Hammer,
  Paintbrush, Sprout, Truck, Settings, Sun, HeartHandshake, Package,
  Building2, Star, MapPin, Clock, CheckCircle2, BadgeCheck,
  Calendar, TrendingUp, Users, AlertCircle, ArrowRight, Filter,
  SlidersHorizontal, Award, FileText, Briefcase, GraduationCap,
  Building, ThumbsUp, ChevronLeft, Share2,
  ArrowUpRight, DollarSign, CreditCard, Smartphone, Landmark,
  RefreshCw, Circle, AlertTriangle, ShieldCheck, Activity, BarChart3,
  MapPinned, LayoutGrid, Video,
  HelpCircle, Phone, Save, Plus, Camera, Download, Wand2, Sliders,
} from 'lucide-react';
import { AppProvider, useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { backendRequest } from '@/lib/backend';
import { AuthPage, ProviderOnboardingPage } from '@/features/auth';
import {
  CalendarPage, EmergencyPage, InvoicePage, MyBookingsPage, PaymentPage,
  ProviderCalendarPage, ReviewPage, SubscriptionsPage, TrackingPage,
} from '@/features/bookings';
import { CommunityHub } from '@/features/community';
import { MessagingPages } from '@/features/messaging';
import {
  CallHistoryPage, ComplaintsPage, ContactDetailsPage, FinanceCenterPage,
  HouseholdPlannerPage, ReferralCenterPage, RefundRequestPage, RewardsCenterPage,
  PublicProfilePage, SafetyCenterPage, ServiceBundlesPage, SharedMediaPage,
  VerificationDetailsPage,
} from '@/features/operations';
import { MyProfilePage, ProfileSettingsPage } from '@/features/profile';
import { ProvidersPage } from '@/features/providers';
import { PeoplePage } from '@/PeoplePages';
import { EcosystemPage, getWorkspaceLinks, isEcosystemPage, ServiceAssistantPage } from '@/features/workspaces';
import { ProfileMediaImage, ProfileMediaVideo } from '@/ProfileMediaImage';
import constructionImage from '../images/construction.jfif';
import householdSupportImage from '../images/Household support.jfif';
import movingImage from '../images/moving.jfif';
import type { ChangeEvent, FormEvent } from 'react';
import type {
  ServiceCategory, Provider, ProviderService, Review, Booking, BookingQuote,
  PortfolioProject, WalletTransaction, Notification, Page,
  HouseholdProperty, MaintenanceReminder, ProviderAvailability, ProviderCvProfile,
} from '@/types';

interface ProviderVerificationSubmission {
  id: string;
  provider_id: string;
  verification_type: string;
  storage_path: string;
  notes: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  review_notes: string | null;
}

interface ProviderActivityMedia {
  id: string;
  provider_id: string;
  media_type: 'image' | 'video';
  storage_path: string;
  caption: string;
  created_at: string;
}

const providerVerificationOptions = [
  { value: 'identity', label: 'Identity', evidence: 'Government-issued photo ID' },
  { value: 'phone', label: 'Phone', evidence: 'Proof you control the provider phone number' },
  { value: 'skills', label: 'Skills', evidence: 'Work samples or a skills assessment' },
  { value: 'certification', label: 'License or certification', evidence: 'A current trade license or certificate' },
  { value: 'business', label: 'Business', evidence: 'Business registration documents' },
  { value: 'portfolio', label: 'Portfolio', evidence: 'Evidence of completed work' },
] as const;

import {
  formatUGX, formatUGXFull, formatDate, formatDateTime, timeAgo, normalizeUgandaMobileNumber,
  getAvailabilityColor, getAvailabilityLabel, getBookingStatusColor,
  getBookingStatusLabel, getUrgencyColor,
} from '@/lib/utils';

// Icon mapping for service categories
const iconMap: Record<string, typeof Wrench> = {
  Wrench, Zap, Sparkles, Hammer, Paintbrush, Sprout, Truck, Settings,
  Sun, HeartHandshake, Package, Building2,
};

function getCategoryIcon(iconName: string) {
  return iconMap[iconName] || Wrench;
}

const serviceImageMap: Record<string, string> = {
  'appliance repair': '/doc1-images/image13.jpeg',
  carpentry: '/doc1-images/image7.jpeg',
  cleaning: '/doc1-images/image2.jpeg',
  construction: '/doc1-images/image14.jpeg',
  electrical: '/doc1-images/image4.jpeg',
  gardening: '/doc1-images/image9.jpeg',
  'home delivery': '/doc1-images/image5.jpeg',
  delivery: '/doc1-images/image5.jpeg',
  'household support': '/doc1-images/image10.jpeg',
  moving: '/doc1-images/image6.jpeg',
  painting: '/doc1-images/image11.jpeg',
  plumbing: '/doc1-images/image3.jpeg',
  'solar energy': '/doc1-images/image12.jpeg',
};

const serviceImageMatchers: { terms: string[]; image: string }[] = [
  { terms: ['appliance repair'], image: serviceImageMap['appliance repair'] },
  { terms: ['carpentry', 'carpenter', 'woodwork', 'joinery'], image: serviceImageMap.carpentry },
  { terms: ['cleaning', 'cleaner'], image: serviceImageMap.cleaning },
  { terms: ['construction', 'building'], image: serviceImageMap.construction },
  { terms: ['electrical', 'electrician', 'wiring'], image: serviceImageMap.electrical },
  { terms: ['gardening', 'garden', 'landscaping'], image: serviceImageMap.gardening },
  { terms: ['delivery', 'errand'], image: serviceImageMap.delivery },
  { terms: ['household support'], image: serviceImageMap['household support'] },
  { terms: ['moving', 'logistics', 'transport', 'relocation'], image: serviceImageMap.moving },
  { terms: ['painting', 'painter'], image: serviceImageMap.painting },
  { terms: ['plumbing', 'plumber', 'pipe repair'], image: serviceImageMap.plumbing },
  { terms: ['solar', 'inverter'], image: serviceImageMap['solar energy'] },
];

function getServiceImage(serviceDetails: string | null | undefined) {
  const normalizedDetails = (serviceDetails || '').toLowerCase();
  return serviceImageMatchers.find(({ terms }) => terms.some((term) => normalizedDetails.includes(term)))?.image || serviceImageMap['household support'];
}

const providerPortraitImages = ['/doc1-images/image1.jpeg', '/doc1-images/image8.jpeg'];

const trustSlides = [
  { image: '/doc1-images/image2.jpeg', label: 'Home cleaning professionals' },
  { image: '/doc1-images/image4.jpeg', label: 'Electrical service work' },
  { image: '/doc1-images/image6.jpeg', label: 'Moving and logistics teams' },
  { image: '/doc1-images/image7.jpeg', label: 'Carpentry and woodwork' },
  { image: '/doc1-images/image9.jpeg', label: 'Garden care professionals' },
  { image: '/doc1-images/image11.jpeg', label: 'Home painting services' },
  { image: '/doc1-images/image14.jpeg', label: 'Home improvement projects' },
];

function getProviderPortraitImage(provider: Provider) {
  const hash = [...provider.id || provider.full_name].reduce((value, character) => value + character.charCodeAt(0), 0);
  return providerPortraitImages[hash % providerPortraitImages.length];
}

function getProviderServiceImage(provider: Provider, categories: ServiceCategory[] = []) {
  const category = categories.find((item) => item.id === provider.primary_service_category_id);
  return getServiceImage(`${category?.slug || ''} ${category?.name || ''} ${provider.professional_title} ${provider.business_name || ''}`);
}

const defaultServiceCategories: ServiceCategory[] = [
  { id: 'cleaning', name: 'Cleaning', slug: 'cleaning', icon: 'Sparkles', description: null, sort_order: 1 },
  { id: 'plumbing', name: 'Plumbing', slug: 'plumbing', icon: 'Wrench', description: null, sort_order: 2 },
  { id: 'electrical', name: 'Electrical', slug: 'electrical', icon: 'Zap', description: null, sort_order: 3 },
  { id: 'carpentry', name: 'Carpentry', slug: 'carpentry', icon: 'Hammer', description: null, sort_order: 4 },
  { id: 'painting', name: 'Painting', slug: 'painting', icon: 'Paintbrush', description: null, sort_order: 5 },
  { id: 'laundry', name: 'Laundry', slug: 'laundry', icon: 'Settings', description: null, sort_order: 6 },
  { id: 'cooking', name: 'Cooking', slug: 'cooking', icon: 'Sun', description: null, sort_order: 7 },
  { id: 'delivery', name: 'Delivery', slug: 'delivery', icon: 'Truck', description: null, sort_order: 8 },
  { id: 'moving', name: 'Moving', slug: 'moving', icon: 'Truck', description: 'Packing, transport and relocation help', sort_order: 9 },
];

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ============================================================
// NAVIGATION HEADER
// ============================================================
function Header() {
  const { currentPage, setCurrentPage, userRole, setUserRole, searchQuery, setSearchQuery } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountPhoto, setAccountPhoto] = useState('');
  const profileSettingsPage = ['profile', 'profile-edit', 'profile-password', 'privacy-settings', 'notification-settings'].includes(currentPage);
  const homePage = currentPage === 'home';
  const workspaceLinks = getWorkspaceLinks();
  const flowLinks: { label: string; page: Page; icon: typeof Calendar }[] = [
    { label: 'Service tracking', page: 'tracking', icon: MapPin },
    { label: 'Payment details', page: 'payment', icon: CreditCard },
    { label: 'Invoice', page: 'invoice', icon: FileText },
    { label: 'Service calendar', page: 'calendar', icon: Calendar },
    { label: 'Provider calendar', page: 'provider-calendar', icon: Calendar },
    { label: 'Home care plans', page: 'subscriptions', icon: RefreshCw },
    { label: 'Emergency help', page: 'emergency', icon: AlertCircle },
    { label: 'Help & support', page: 'help', icon: HelpCircle },
    { label: 'Community', page: 'communities', icon: Users },
    { label: 'HomiCare members', page: 'people', icon: Users },
    { label: 'Finance center', page: 'finance', icon: Wallet },
    { label: 'Refund request', page: 'refunds', icon: RefreshCw },
    { label: 'Complaints & disputes', page: 'complaints', icon: Shield },
    { label: 'Safety center', page: 'safety', icon: ShieldCheck },
    { label: 'Provider verification', page: 'verification-details', icon: BadgeCheck },
    { label: 'Call history', page: 'call-history', icon: MessageSquare },
    { label: 'Shared media', page: 'shared-media', icon: FileText },
    { label: 'Provider details', page: 'contact-details', icon: User },
    { label: 'Referral center', page: 'referrals', icon: HeartHandshake },
    { label: 'Rewards & loyalty', page: 'rewards', icon: Star },
    { label: 'AI service matcher', page: 'service-matcher', icon: Sparkles },
    { label: 'Household planner', page: 'household-planner', icon: Home },
    { label: 'Service bundles', page: 'service-bundles', icon: Package },
  ];

  useEffect(() => {
    const updateAccount = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      setSignedIn(Boolean(session));
      setAccountName(String(session?.user.user_metadata?.full_name || ''));
      setAccountPhoto(String(session?.user.user_metadata?.photoUrl || ''));
      if (session) {
        supabase.from('profiles').select('display_name, avatar_url').eq('user_id', session.user.id).maybeSingle().then(({ data }) => {
          if (data?.display_name) setAccountName(data.display_name);
          if (data?.avatar_url) setAccountPhoto(data.avatar_url);
        });
      }
    };
    supabase.auth.getSession().then(({ data }) => updateAccount(data.session));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => updateAccount(session));
    return () => authListener.subscription.unsubscribe();
  }, []);

  const navItems = [
    { label: 'Home', page: 'home' as const, icon: Home },
    { label: 'Find Services', page: 'search' as const, icon: Search },
    { label: 'Dashboard', page: userRole === 'provider' ? 'provider-dashboard' as const : userRole === 'admin' ? 'admin' as const : 'customer-dashboard' as const, icon: LayoutDashboard },
    { label: 'Messages', page: 'messages' as const, icon: MessageSquare },
    { label: 'People', page: 'people' as const, icon: Users },
    { label: 'Wallet', page: 'wallet' as const, icon: Wallet },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAccountMenuOpen(false);
    setCurrentPage('home');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => setCurrentPage('home')} className="flex items-center gap-2 shrink-0">
            <img src="/icons/HomiCare%20Glossy%20Heart%20Logo.png" alt="HomiCare Logo" className="h-10 w-auto max-w-[170px] sm:max-w-[200px] object-contain" />
          </button>

          {/* Search bar - desktop */}
          <div className="hidden md:flex flex-1 max-w-xl mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') setCurrentPage('search'); }}
                placeholder="Search services, providers, posts..."
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-full text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 ${homePage ? 'focus:ring-orange-500' : 'focus:ring-blue-500'} focus:bg-white transition-all`}
              />
            </div>
          </div>

          {/* Right nav */}
          <div className="flex items-center gap-2">
            {!signedIn && (
              <>
                <button onClick={() => setCurrentPage('login')} className={`hidden rounded-lg px-3 py-2 text-sm font-semibold sm:inline-flex ${homePage ? 'text-orange-700 hover:bg-orange-50' : 'text-violet-800 hover:bg-violet-50'}`}>Log in</button>
                <button onClick={() => setCurrentPage('signup')} className={`rounded-lg px-3 py-2 text-sm font-semibold text-white ${homePage ? 'bg-orange-600 hover:bg-orange-700' : 'bg-violet-800 hover:bg-violet-900'}`}>Sign up</button>
              </>
            )}
            {currentPage === 'search' ? (
              <div className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-700 lg:flex">
                <MapPin className="h-4 w-4 text-orange-600" /> Arua City, Uganda <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </div>
            ) : (
              <button
                onClick={() => setWorkspaceOpen(!workspaceOpen)}
                aria-expanded={workspaceOpen}
                aria-label="Explore HomiCare workspaces"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden lg:inline">Explore</span>
              </button>
            )}

            {currentPage === 'search' && (
              <div className="hidden items-center gap-1 sm:flex">
                <button onClick={() => setCurrentPage('messages')} aria-label="Messages" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><MessageSquare className="h-4 w-4" /></button>
                <button onClick={() => setCurrentPage('wallet')} aria-label="Wallet" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Wallet className="h-4 w-4" /></button>
              </div>
            )}

            {/* Role switcher */}
            <div className={`hidden items-center rounded-full bg-slate-100 p-0.5 sm:flex ${currentPage === 'search' ? 'lg:hidden' : ''}`}>
              {(['customer', 'provider', 'admin'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => setUserRole(role)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                    userRole === role ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Notifications */}
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full"></span>
            </button>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setAccountMenuOpen((current) => !current)}
                aria-expanded={accountMenuOpen}
                className={`flex h-9 items-center gap-2 rounded-full border px-1.5 ${profileSettingsPage ? 'border-orange-200' : 'border-slate-200'} hover:bg-slate-50`}
              >
                {accountPhoto ? <ProfileMediaImage source={accountPhoto} alt="" className="h-7 w-7 rounded-full object-cover" /> : <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white ${profileSettingsPage ? 'bg-orange-600' : 'bg-slate-700'}`}>{accountName ? accountName.slice(0, 1).toUpperCase() : userRole === 'admin' ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}</span>}
                <span className="hidden max-w-24 truncate text-xs font-semibold text-slate-700 lg:block">{accountName || 'Profile'}</span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-slate-500 lg:block" />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  {signedIn ? (
                    <>
                      <button onClick={() => { setCurrentPage('profile'); setAccountMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100">My Profile</button>
                      <button onClick={() => { setCurrentPage('profile-edit'); setAccountMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100">Account Settings</button>
                      <button onClick={() => void handleSignOut()} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50">Log out</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setCurrentPage('login'); setAccountMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100">Log in</button>
                      <button onClick={() => { setCurrentPage('signup'); setAccountMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100">Create account</button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setCurrentPage('search'); }}
              placeholder="Search services..."
              className={`w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 ${homePage ? 'focus:ring-orange-500' : 'focus:ring-blue-500'}`}
            />
          </div>
        </div>
      </div>

      {workspaceOpen && (
        <>
          <button className="fixed inset-0 z-30 cursor-default" aria-label="Close workspace menu" onClick={() => setWorkspaceOpen(false)} />
          <div className="fixed right-3 top-16 z-50 max-h-[calc(100dvh-5rem)] w-[min(94vw,42rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 shadow-xl sm:right-6" aria-label="HomiCare workspaces">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {workspaceLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.page} onClick={() => { setCurrentPage(item.page); setWorkspaceOpen(false); }} className="flex min-h-14 items-center gap-2 rounded-lg border border-slate-100 p-3 text-left text-sm text-slate-700 hover:border-teal-700 hover:bg-teal-50">
                    <Icon className="h-4 w-4 shrink-0 text-teal-800" />{item.label}
                  </button>
                );
              })}
              {flowLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.page} onClick={() => { setCurrentPage(item.page); setWorkspaceOpen(false); }} className="flex min-h-14 items-center gap-2 rounded-lg border border-slate-100 p-3 text-left text-sm text-slate-700 hover:border-violet-700 hover:bg-violet-50">
                    <Icon className="h-4 w-4 shrink-0 text-violet-800" />{item.label}
                  </button>
                );
              })}
              <button onClick={() => { setCurrentPage('admin'); setWorkspaceOpen(false); }} className="flex min-h-14 items-center gap-2 rounded-lg border border-slate-100 p-3 text-left text-sm text-slate-700 hover:border-teal-700 hover:bg-teal-50">
                <Shield className="h-4 w-4 shrink-0 text-teal-800" />Admin operations
              </button>
            </div>
          </div>
        </>
      )}

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.page}
                onClick={() => { setCurrentPage(item.page); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === item.page ? (homePage ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-600') : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1 px-3 py-2">
                {(['customer', 'provider', 'admin'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => { setUserRole(role); setMobileMenuOpen(false); }}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                      userRole === role ? 'bg-blue-100 text-blue-600' : 'text-slate-500'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications dropdown */}
      {notificationsOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
          <div className="absolute right-4 top-16 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Notifications</h3>
            </div>
            <NotificationsList onOpen={() => { setCurrentPage('notifications'); setNotificationsOpen(false); }} />
          </div>
        </>
      )}
    </header>
  );
}

// ============================================================
// NOTIFICATIONS LIST
// ============================================================
function NotificationsList({ onOpen }: { onOpen: () => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !auth.user) {
        setError('Sign in to view your notifications.');
        setLoading(false);
        return;
      }
      const { data, error: queryError } = await supabase.from('notifications').select('*')
        .eq('recipient_id', auth.user.id).order('created_at', { ascending: false }).limit(10);
      if (!active) return;
      if (queryError) setError(`Notifications could not be loaded: ${queryError.message}`);
      else setNotifications(data || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  if (loading) return <div className="p-4 text-sm text-slate-400">Loading...</div>;
  if (error) return <div role="alert" className="p-4 text-sm text-red-700">{error}</div>;
  if (notifications.length === 0) return <div className="p-4 text-sm text-slate-400">No notifications</div>;

  return (
    <div className="divide-y divide-slate-50">
      {notifications.map((n) => (
        <button key={n.id} onClick={onOpen} className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-orange-50/50' : ''}`}>
          <div className="flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
              n.priority === 'high' ? 'bg-red-500' : n.priority === 'normal' ? 'bg-orange-500' : 'bg-slate-300'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{n.title}</p>
              {n.body && <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>}
              <p className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
            </div>
          </div>
        </button>
      ))}
      <button onClick={onOpen} className="w-full p-3 text-center text-xs font-semibold text-orange-700 hover:bg-orange-50">View all notifications</button>
    </div>
  );
}

// ============================================================
// CREATOR STUDIO & MEDIA EDITOR SUITE
// ============================================================
function CreatorStudioModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'upload' | 'enhance' | 'filter' | 'adjust'>('upload');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'normal' | 'vivid' | 'warm' | 'cinematic' | 'clean' | 'monochrome'>('normal');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [enhanced, setEnhanced] = useState(false);
  const [toast, setToast] = useState('');

  const notify = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(''), 2500); };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedImage(reader.result);
        setActiveTab('enhance');
        notify('Media loaded into Editor!');
      }
    };
    reader.readAsDataURL(file);
  };

  const applyAiEnhance = () => {
    setBrightness(115);
    setContrast(120);
    setSaturation(110);
    setEnhanced(true);
    notify('AI Image Enhancement Applied ✨');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in">
      {toast && <div className="absolute top-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-2xl">{toast}</div>}
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-100 text-orange-600"><Wand2 className="h-4 w-4" /></span>
            <h3 className="text-base font-extrabold text-slate-900">HomiCare Studio & Media Suite</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>

        {/* Studio Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-bold">
          {(['upload', 'enhance', 'filter', 'adjust'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 capitalize rounded-lg py-2 transition ${activeTab === tab ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {tab === 'upload' ? 'Upload Files' : tab === 'enhance' ? 'AI Enhance' : tab === 'filter' ? 'Filters' : 'Adjust'}
            </button>
          ))}
        </div>

        {activeTab === 'upload' && (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex max-w-xs flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/50 p-8">
              <Camera className="h-10 w-10 text-orange-600 mb-2" />
              <p className="text-xs font-bold text-slate-800">Upload Photos, Videos or Documents</p>
              <p className="mt-1 text-[10px] text-slate-500">Supports JPG, PNG, MP4, PDF up to 25MB</p>
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-orange-700">
                Browse Files <input type="file" accept="image/*,video/*,application/pdf" onChange={handleFileSelect} className="sr-only" />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'enhance' && (
          <div className="space-y-4">
            <div className="relative h-64 overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt="Preview"
                  style={{
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${
                      filterMode === 'vivid' ? 'saturate(150%)' :
                      filterMode === 'warm' ? 'sepia(30%)' :
                      filterMode === 'cinematic' ? 'contrast(125%) saturate(85%)' :
                      filterMode === 'clean' ? 'contrast(105%)' :
                      filterMode === 'monochrome' ? 'grayscale(100%)' : ''
                    }`,
                  }}
                  className="h-full w-full object-cover transition duration-300"
                />
              ) : (
                <div className="text-center p-6 text-xs text-slate-500">
                  <Camera className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  No image selected. Click Upload Files to select a photo/video.
                </div>
              )}
            </div>
            {selectedImage && (
              <button onClick={applyAiEnhance} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-xs font-bold text-white shadow-md hover:opacity-95">
                <Wand2 className="h-4 w-4" /> {enhanced ? 'AI Enhanced ✨' : 'One-Click AI Image Enhancer'}
              </button>
            )}
          </div>
        )}

        {activeTab === 'filter' && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-700">Select Filter Effect</p>
            <div className="grid grid-cols-3 gap-2">
              {(['normal', 'vivid', 'warm', 'cinematic', 'clean', 'monochrome'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`rounded-xl border p-2.5 text-center capitalize text-xs font-bold transition ${filterMode === mode ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'adjust' && (
          <div className="space-y-3 text-xs font-bold text-slate-700">
            <label className="block">Brightness: {brightness}%
              <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="mt-1.5 w-full accent-orange-600" />
            </label>
            <label className="block">Contrast: {contrast}%
              <input type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="mt-1.5 w-full accent-orange-600" />
            </label>
            <label className="block">Saturation: {saturation}%
              <input type="range" min="0" max="200" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="mt-1.5 w-full accent-orange-600" />
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
          <button type="button" onClick={() => { notify('Media and edited photo saved successfully!'); window.setTimeout(onClose, 1000); }} className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-700">Save & Export</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BOTTOM NAV (Mobile with Center Floating Plus Action Button)
// ============================================================
function BottomNav({ onOpenStudio }: { onOpenStudio: () => void }) {
  const { currentPage, setCurrentPage } = useApp();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
        <button
          onClick={() => setCurrentPage('home')}
          className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-1 transition ${currentPage === 'home' ? 'text-orange-600 font-bold' : 'text-slate-400'}`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={() => setCurrentPage('search')}
          className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-1 transition ${currentPage === 'search' ? 'text-orange-600 font-bold' : 'text-slate-400'}`}
        >
          <Search className="h-5 w-5" />
          <span className="text-[10px]">Services</span>
        </button>

        {/* Center Floating Orange Plus Button */}
        <div className="relative -top-4 px-1">
          <button
            onClick={onOpenStudio}
            aria-label="Upload files, edit images, & open studio"
            className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/40 transition hover:scale-105 active:scale-95"
          >
            <Plus className="h-6 w-6 stroke-[3]" />
          </button>
        </div>

        <button
          onClick={() => setCurrentPage('notifications')}
          className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 py-1 transition ${currentPage === 'notifications' ? 'text-orange-600 font-bold' : 'text-slate-400'}`}
        >
          <div className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-orange-600 text-[9px] font-bold text-white">2</span>
          </div>
          <span className="text-[10px]">Notifications</span>
        </button>

        <button
          onClick={() => setCurrentPage('profile')}
          className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-1 transition ${currentPage === 'profile' ? 'text-orange-600 font-bold' : 'text-slate-400'}`}
        >
          <User className="h-5 w-5" />
          <span className="text-[10px]">Profile</span>
        </button>
      </div>
    </nav>
  );
}

function LandingPage() {
  const {
    setCurrentPage, selectedServiceSlug, setSelectedServiceSlug, selectedProviderId, setSelectedProviderId,
    setBookingProviderId, setBookingServiceName, setBookingRequestMode, setUserRole,
    searchQuery, setSearchQuery, userRole,
  } = useApp();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [topProviders, setTopProviders] = useState<Provider[]>([]);
  const [providerHomeProfile, setProviderHomeProfile] = useState<Pick<Provider, 'id' | 'full_name' | 'professional_title' | 'location' | 'provider_status'> | null>(null);
  const [providerHomeError, setProviderHomeError] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [categoryError, setCategoryError] = useState('');
  const [providerDirectoryError, setProviderDirectoryError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [trustSlideIndex, setTrustSlideIndex] = useState(0);
  const featuredAverageRating = topProviders.length ? topProviders.reduce((sum, provider) => sum + provider.rating, 0) / topProviders.length : 0;
  const featuredCompletedJobs = topProviders.reduce((sum, provider) => sum + provider.completed_jobs, 0);
  const visibleCategories = categories.length > 0 ? categories : defaultServiceCategories;
  const activeCategory = visibleCategories.find((category) => category.slug === selectedServiceSlug)
    || visibleCategories.find((category) => category.slug === 'moving')
    || visibleCategories[0];
  const activeCategorySlug = activeCategory?.slug;
  const activeCategoryName = activeCategory?.name || 'Household services';
  const activeImage = serviceImageMap[activeCategory?.slug.toLowerCase().replace(/[-_]/g, ' ') || 'moving'] || movingImage;
  const isMovingCategory = /moving|logistics|transport/i.test(`${activeCategory?.name || ''} ${activeCategory?.slug || ''}`);
  const homeCategories = activeCategory ? [activeCategory, ...visibleCategories.filter((category) => category.slug !== activeCategory.slug)] : visibleCategories;

  useEffect(() => {
    setCategoriesLoading(true);
    setCategoryError('');
    backendRequest<ServiceCategory[]>('/services/categories')
      .then(setCategories)
      .catch((cause) => {
        setCategories([]);
        setCategoryError(`Service categories unavailable: ${cause instanceof Error ? cause.message : 'Backend request failed.'}`);
      })
      .finally(() => setCategoriesLoading(false));
  }, [loadAttempt]);

  useEffect(() => {
    if (!activeCategorySlug) return;
    let cancelled = false;
    setProvidersLoading(true);
    setProviderDirectoryError('');
    const params = new URLSearchParams({ limit: '4', categorySlug: activeCategorySlug });
    if (selectedProviderId) params.set('includeProviderId', selectedProviderId);
    backendRequest<Provider[]>(`/providers?${params.toString()}`)
      .then((providers) => { if (!cancelled) setTopProviders(providers); })
      .catch((cause) => {
        if (cancelled) return;
        setTopProviders([]);
        setProviderDirectoryError(cause instanceof Error ? cause.message : 'Provider directory request failed.');
      })
      .finally(() => { if (!cancelled) setProvidersLoading(false); });
    return () => { cancelled = true; };
  }, [activeCategorySlug, selectedProviderId]);

  useEffect(() => {
    let active = true;
    const loadOwnProviderProfile = async () => {
      setProviderHomeError('');
      if (userRole !== 'provider') {
        setProviderHomeProfile(null);
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setProviderHomeProfile(null);
        return;
      }
      const { data, error } = await supabase
        .from('providers')
        .select('id, full_name, professional_title, location, provider_status')
        .eq('user_id', authData.user.id)
        .maybeSingle();
      if (error) throw error;
      if (active) setProviderHomeProfile(data);
    };
    loadOwnProviderProfile().catch((cause) => {
      if (active) setProviderHomeError(cause instanceof Error ? cause.message : 'Your provider profile could not be loaded.');
    });
    return () => { active = false; };
  }, [userRole]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const intervalId = window.setInterval(() => {
      setTrustSlideIndex((current) => (current + 1) % trustSlides.length);
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, []);

  const openCategory = (category: ServiceCategory) => {
    setSelectedServiceSlug(category.slug);
    setSearchQuery('');
  };

  const searchCategory = () => {
    if (activeCategory) setSelectedServiceSlug(activeCategory.slug);
    if (!searchQuery.trim()) setSearchQuery(activeCategory?.name || '');
    setCurrentPage('search');
  };

  const bookProvider = (provider: Provider) => {
    setSelectedProviderId(provider.id);
    setBookingProviderId(provider.id);
    setBookingRequestMode('booking');
    setBookingServiceName(activeCategoryName);
    setCurrentPage('booking');
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="relative isolate overflow-hidden bg-[#f3f2e9] py-8 sm:py-12">
        <img src={activeImage} alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-30" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#f7f4e8] via-[#f7f4e8]/95 to-[#f7f4e8]/65" />
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="py-3 sm:py-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-emerald-900">
              <ShieldCheck className="h-4 w-4" /> Trusted local professionals
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-orange-800">HomiCare marketplace</p>
            <h1 className="mt-2 max-w-xl text-4xl font-black leading-[1.04] text-slate-950 sm:text-5xl lg:text-6xl">
              {isMovingCategory ? <>Move with<br /><span className="text-orange-700">confidence.</span></> : <>Make home<br /><span className="text-orange-700">feel cared for.</span></>}
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-700 sm:text-base">
              {isMovingCategory
                ? 'From the first packed box to the last piece of furniture, compare trusted moving professionals for your next move.'
                : `Find and compare trusted ${activeCategoryName.toLowerCase()} professionals, then book the right help for your home.`}
            </p>
            <div className="mt-6 flex max-w-xl flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-slate-50 px-3 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-slate-500" />
                <input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') searchCategory(); }} placeholder={`Search ${activeCategoryName.toLowerCase()} services`} className="w-full min-w-0 border-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none" />
              </div>
              <button onClick={searchCategory} className="inline-flex items-center justify-center gap-2 rounded-md bg-orange-700 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-800"><Search className="h-4 w-4" />Find services</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Popular categories">
              {homeCategories.slice(0, 6).map((category) => {
                const Icon = getCategoryIcon(category.icon);
                return <button key={category.id} onClick={() => openCategory(category)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${activeCategory?.slug === category.slug ? 'border-orange-700 bg-orange-700 text-white' : 'border-white/80 bg-white/80 text-slate-700 hover:border-orange-300 hover:text-orange-800'}`}><Icon className="h-3.5 w-3.5" />{category.name}</button>;
              })}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="relative overflow-hidden rounded-md bg-slate-900 shadow-[0_22px_60px_rgba(15,23,42,0.2)]">
              <img src={activeImage} alt={`${activeCategoryName} service`} className="aspect-[5/3] w-full object-cover opacity-90 sm:aspect-[4/3]" />
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950/80 to-transparent" />
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 sm:inset-x-7 sm:bottom-7">
                <div className="text-white"><p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-200">Explore HomiCare</p><p className="mt-1 text-xl font-bold sm:text-2xl">{activeCategoryName}, made easier.</p></div>
                {isMovingCategory ? <div className="hc-moving-scene relative grid h-14 w-24 shrink-0 place-items-center sm:h-16 sm:w-28" aria-hidden="true">
                  <span className="hc-route absolute bottom-2 left-0 right-0 h-px bg-white/60" />
                  <Package className="hc-box absolute left-1 top-1 h-5 w-5 text-amber-200" />
                  <Truck className="hc-truck absolute bottom-3 left-0 h-8 w-8 text-white sm:h-9 sm:w-9" />
                  <Home className="absolute right-0 top-0 h-6 w-6 text-emerald-200" />
                </div> : <span className="grid h-14 w-24 shrink-0 place-items-center text-emerald-200 sm:h-16 sm:w-28" aria-hidden="true">{(() => { const Icon = getCategoryIcon(activeCategory?.icon || 'Wrench'); return <Icon className="h-10 w-10" />; })()}</span>}
              </div>
            </div>
            <div className="absolute -bottom-4 left-4 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-lg sm:left-8">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-emerald-800"><BadgeCheck className="h-4 w-4" /></span>
              <span><span className="block text-xs font-bold text-slate-900">Compare before you book</span><span className="block text-[10px] text-slate-500">Profiles, reviews and starting prices</span></span>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="HomiCare service benefits" className="border-b border-orange-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-orange-100 px-3 py-3 sm:px-6 sm:py-4">
          {[
            { icon: HelpCircle, label: '24/7 Support', page: 'help' as const },
            { icon: BadgeCheck, label: 'Verified Providers', page: 'search' as const },
            { icon: ShieldCheck, label: 'Secure Payments', page: 'payment' as const },
          ].map(({ icon: Icon, label, page }) => (
            <button key={label} onClick={() => setCurrentPage(page)} className="flex min-w-0 items-center justify-center gap-1.5 px-1 text-center text-[10px] font-semibold text-slate-700 hover:text-orange-700 sm:gap-2 sm:text-sm">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-700 sm:h-8 sm:w-8"><Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></span><span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Popular Services */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-800">Discover</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">What do you need today?</h2>
            <p className="mt-1 text-sm text-slate-500">Choose a category to see matching professionals and services.</p>
          </div>
          <button onClick={() => setCurrentPage('search')} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-orange-800 hover:text-orange-950">
            View all <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {categoriesLoading ? (
          <p role="status" className="text-sm text-slate-500">Loading service categories...</p>
        ) : (
          <>
          {categoryError && <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span>{categoryError} Showing common services for now.</span><button onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="font-semibold underline">Try again</button></div>}
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">
            {visibleCategories.map((cat) => {
              const Icon = getCategoryIcon(cat.icon);
              const imageKey = cat.slug.toLowerCase().replace(/[-_]/g, ' ');
              const image = serviceImageMap[imageKey] || serviceImageMap[cat.name.toLowerCase()];
              const selected = activeCategory?.slug === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => openCategory(cat)}
                  aria-pressed={selected}
                  className={`group w-48 shrink-0 snap-start overflow-hidden rounded-md border bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:w-56 ${selected ? 'border-orange-700 ring-2 ring-orange-100' : 'border-slate-200 hover:border-orange-300'}`}
                >
                  {image ? (
                    <img src={image} alt={`${cat.name} service`} className="h-28 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-32" />
                  ) : (
                    <div className="flex h-28 items-center justify-center bg-emerald-50 transition-colors group-hover:bg-emerald-100 sm:h-32">
                      <Icon className="h-8 w-8 text-emerald-800" />
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-900">{cat.name}</h3><p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{cat.description || `Browse ${cat.name.toLowerCase()} professionals`}</p></div>
                    <ArrowUpRight className={`h-4 w-4 shrink-0 ${selected ? 'text-orange-700' : 'text-slate-400'}`} />
                  </div>
                </button>
              );
            })}
          </div>
          </>
        )}
      </section>

      {providerHomeProfile && (
        <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
          <div className="flex flex-col gap-4 rounded-xl border border-orange-200 bg-orange-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-orange-800">Your provider profile</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">{providerHomeProfile.full_name}</h2>
              <p className="text-sm text-slate-600">{providerHomeProfile.professional_title} · {providerHomeProfile.location}</p>
              <p className="mt-2 text-xs text-slate-600">
                {providerHomeProfile.provider_status === 'active'
                  ? 'Your profile is published. Customers can view your details and connect with you.'
                  : providerHomeProfile.provider_status === 'suspended'
                    ? 'Your profile is not currently published. Contact HomiCare support for help.'
                    : 'Your profile has been submitted for review. Customers can discover and connect with you after it is approved.'}
              </p>
            </div>
            <button onClick={() => setCurrentPage('provider-dashboard')} className="shrink-0 rounded-lg border border-orange-300 bg-white px-4 py-2.5 text-sm font-semibold text-orange-800 hover:bg-orange-100">Open provider dashboard</button>
          </div>
        </section>
      )}
      {providerHomeError && userRole === 'provider' && <p role="status" className="mx-auto mt-6 max-w-7xl px-4 text-sm text-amber-800 sm:px-6">Your provider profile status could not be loaded: {providerHomeError}</p>}

      {/* Top Providers */}
      <section className="border-y border-slate-200 bg-[#f5f6f3] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-800">Compare and choose</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Featured {activeCategoryName} professionals</h2>
            <p className="mt-1 text-sm text-slate-500">Profiles, ratings and starting prices for your selected category.</p>
          </div>
          <button onClick={searchCategory} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-orange-800 hover:text-orange-950">
            Compare all <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {providerDirectoryError && <p role="status" className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{providerDirectoryError}</p>}
        {providersLoading ? <p role="status" className="text-sm text-slate-500">Finding {activeCategoryName.toLowerCase()} professionals...</p> : !providerDirectoryError && (
          topProviders.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topProviders.map((provider) => (
              <article key={provider.id} className="overflow-hidden rounded-md border border-slate-200 bg-white transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
                <button onClick={() => { setSelectedProviderId(provider.id); setCurrentPage('provider'); }} className="block w-full text-left">
                  <div className="relative h-36 bg-slate-100">{provider.cover_url ? <ProfileMediaImage source={provider.cover_url} alt={`${provider.full_name}'s work`} className="h-full w-full object-cover" /> : <img src={activeImage} alt="" className="h-full w-full object-cover" />}<span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-sm bg-white px-2 py-1 text-[10px] font-bold text-slate-800">{provider.identity_verified && <BadgeCheck className="h-3.5 w-3.5 text-emerald-700" />}{provider.identity_verified ? 'Verified' : 'Provider'}</span></div>
                  <div className="p-4">
                    <div className="flex items-center gap-3"><div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-100">{provider.avatar_url ? <ProfileMediaImage source={provider.avatar_url} alt={provider.full_name} className="h-full w-full object-cover" /> : <img src={getProviderPortraitImage(provider)} alt={provider.full_name} className="h-full w-full object-cover" />}</div><div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-900">{provider.full_name}</h3><p className="truncate text-xs text-slate-500">{provider.professional_title}</p></div></div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-600"><span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />{provider.rating.toFixed(1)} ({provider.review_count})</span><span>{provider.years_experience}+ years</span></div>
                    <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{provider.location}</p>
                    <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3"><span className="text-xs text-slate-500">Starting from</span><strong className="text-sm text-slate-900">{formatUGX(provider.starting_price)}</strong></div>
                  </div>
                </button>
                <div className="grid grid-cols-3 gap-2 px-4 pb-4"><button onClick={() => { setSelectedProviderId(provider.id); setCurrentPage('provider'); }} className="rounded-md border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">View</button><button onClick={() => { setSelectedProviderId(provider.id); setCurrentPage('provider'); }} className="rounded-md border border-orange-200 bg-orange-50 px-2 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-100">Connect</button><button onClick={() => bookProvider(provider)} className="rounded-md bg-orange-700 px-2 py-2 text-xs font-semibold text-white hover:bg-orange-800">Book</button></div>
              </article>
            ))}
          </div> : <div className="flex flex-col items-start justify-between gap-4 rounded-md border border-slate-200 bg-white p-5 sm:flex-row sm:items-center"><div><h3 className="text-sm font-bold text-slate-900">No featured {activeCategoryName.toLowerCase()} providers yet</h3><p className="mt-1 text-sm text-slate-500">Try the full directory or choose another service category.</p></div><button onClick={searchCategory} className="inline-flex shrink-0 items-center gap-2 rounded-md bg-orange-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-800">Browse directory <ArrowRight className="h-4 w-4" /></button></div>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-200 pt-4 text-xs text-slate-600">
          <span><strong className="text-slate-900">{topProviders.length}</strong> featured profiles</span>
          <span><strong className="text-slate-900">{featuredCompletedJobs}</strong> completed jobs</span>
          <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /><strong className="text-slate-900">{topProviders.length ? featuredAverageRating.toFixed(1) : '—'}</strong> average rating</span>
        </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-800">Simple from start to finish</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{activeCategoryName}, made simple</h2>
          <p className="mt-2 text-sm text-slate-500">Discover a professional, agree the details, and follow your booking in one place.</p>
        </div>
        <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Search, title: 'Tell us what you need', description: `Find ${activeCategoryName.toLowerCase()} services that fit your job.` },
            { icon: Users, title: 'Compare professionals', description: 'Review profiles, experience, ratings and starting prices.' },
            { icon: Calendar, title: 'Confirm your booking', description: 'Choose a provider and share your schedule and location.' },
            { icon: MapPinned, title: 'Keep in the loop', description: 'Follow booking updates and contact your provider.' },
          ].map(({ icon: Icon, title, description }, index) => <article key={title} className="relative border-t border-slate-200 py-5 sm:px-5 sm:odd:border-r lg:px-6 lg:odd:border-r-0 lg:not(:last-child):border-r"><span className="text-xs font-bold text-orange-800">0{index + 1}</span><span className="mt-3 grid h-10 w-10 place-items-center rounded-md bg-emerald-100 text-emerald-900"><Icon className="h-5 w-5" /></span><h3 className="mt-3 text-sm font-bold text-slate-900">{title}</h3><p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">{description}</p></article>)}
        </div>
        <button onClick={searchCategory} className="mt-6 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Explore {activeCategoryName} services <ArrowRight className="h-4 w-4" /></button>
      </section>

      <section className="relative isolate overflow-hidden bg-[#101b25] py-14 sm:py-20" aria-label="HomiCare trust and verification">
        {trustSlides.map((slide, index) => <img key={slide.image} src={slide.image} alt="" aria-hidden="true" className={`absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-1000 ${index === trustSlideIndex ? 'opacity-35' : 'opacity-0'}`} />)}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-emerald-950/80" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-300">Proof behind every profile</p>
            <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">Trust you can <span className="text-emerald-300">see in every detail.</span></h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">We show the evidence behind each provider: identity checks, verified skills, completed work and customer feedback.</p>
            <div className="mt-7 space-y-2">
              {[
                { icon: BadgeCheck, label: 'Identity verified', desc: 'Government ID verification' },
                { icon: Award, label: 'Skills assessed', desc: 'Platform-verified skill assessments' },
                { icon: FileText, label: 'Certification checked', desc: 'Professional credentials verified' },
                { icon: Star, label: 'Customer reviews', desc: 'Structured multi-category ratings' },
              ].map((item, index) => {
                const active = trustSlideIndex % 4 === index;
                const accent = index % 2 === 0 ? 'orange' : 'emerald';
                return <div key={item.label} className={`flex items-center gap-3 rounded-md border px-3 py-2.5 transition-all duration-700 ${active ? 'border-white/20 bg-white/10' : 'border-transparent bg-transparent'}`}>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md transition-colors duration-700 ${active ? accent === 'orange' ? 'bg-orange-500 text-white' : 'bg-emerald-400 text-slate-950' : 'bg-white/10 text-slate-300'}`}><item.icon className="h-5 w-5" /></span>
                  <span><strong className="block text-sm font-bold text-white">{item.label}</strong><span className="mt-0.5 block text-xs text-slate-300">{item.desc}</span></span>
                  {active && <span className={`ml-auto h-2 w-2 shrink-0 rounded-full ${accent === 'orange' ? 'bg-orange-400' : 'bg-emerald-300'}`} />}
                </div>;
              })}
            </div>
          </div>

          <div>
            <div className="relative min-h-[280px] overflow-hidden rounded-md border border-white/20 bg-slate-900 sm:min-h-[360px]">
              {trustSlides.map((slide, index) => <img key={slide.image} src={slide.image} alt={slide.label} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${index === trustSlideIndex ? 'opacity-100' : 'opacity-0'}`} />)}
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-slate-950/25" />
              <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3 sm:inset-x-6 sm:top-6"><span className="inline-flex items-center gap-2 rounded-sm bg-emerald-300 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-950"><BadgeCheck className="h-3.5 w-3.5" />HomiCare verified</span><span className="rounded-sm bg-slate-950/60 px-2.5 py-1.5 text-[10px] font-semibold text-white">{String(trustSlideIndex + 1).padStart(2, '0')} / {String(trustSlides.length).padStart(2, '0')}</span></div>
              <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 sm:inset-x-6 sm:bottom-6"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-300">Real work. Local professionals.</p><p aria-live="polite" className="mt-1 truncate text-lg font-bold text-white sm:text-2xl">{trustSlides[trustSlideIndex].label}</p></div><div className="flex shrink-0 items-center gap-1.5" aria-label="Trust photo selection">{trustSlides.map((slide, index) => <button key={slide.image} onClick={() => setTrustSlideIndex(index)} aria-label={`Show photo: ${slide.label}`} aria-pressed={trustSlideIndex === index} className={`h-2.5 rounded-full transition-all ${trustSlideIndex === index ? 'w-7 bg-orange-400' : 'w-2.5 bg-white/70 hover:bg-emerald-300'}`} />)}</div></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-white/20 pt-5 sm:grid-cols-4">
              {[
                { value: categories.length, label: 'Service categories' },
                { value: topProviders.length, label: 'Featured profiles' },
                { value: topProviders.length ? featuredCompletedJobs.toLocaleString() : '—', label: 'Jobs completed by featured providers' },
                { value: topProviders.length ? featuredAverageRating.toFixed(1) : '—', label: 'Average rating of featured providers' },
              ].map((stat, index) => <div key={stat.label} className="border-l-2 pl-3" style={{ borderColor: index % 2 === 0 ? '#fb923c' : '#6ee7b7' }}><p className="text-2xl font-black text-white sm:text-3xl">{stat.value}</p><p className="mt-0.5 text-[10px] leading-snug text-slate-300 sm:text-xs">{stat.label}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
  <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-700 to-orange-900 p-8 text-center shadow-lg shadow-orange-950/10 sm:p-12">
    <h2 className="mb-4 text-3xl font-bold text-white">Ready to get started?</h2>
    <p className="mx-auto mb-8 max-w-2xl text-lg text-orange-100">
      Explore listed services, create a HomiCare account, or download the Android app installer.
    </p>

    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <a
        href="/downloads/homicare-release.apk"
        download
        className="rounded-lg bg-white px-6 py-3.5 font-semibold text-orange-900 transition-colors hover:bg-orange-50"
      >
        Download HomiCare APK
      </a>

      <button
        onClick={() => setCurrentPage('search')}
        className="rounded-lg border border-white/30 bg-orange-950/30 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-orange-950/60"
      >
        Find a Service
      </button>

      <button
        onClick={() => { setUserRole('provider'); setCurrentPage('signup'); }}
        className="rounded-lg border border-white/30 bg-orange-950/30 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-orange-950/60"
      >
        Become a Provider
      </button>
    </div>
  </div>
</section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600">
                  <Home className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-slate-900">HomiCare</span>
              </div>
              <p className="text-sm text-slate-500">The professional digital ecosystem for essential household services.</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm mb-3">Services</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>Plumbing</li><li>Electrical</li><li>Cleaning</li><li>Solar Installation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>For Providers</li><li>For Businesses</li><li>HomiCare Academy</li><li>Communities</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>About Us</li><li>Safety Center</li><li>Support</li><li>Contact</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-200 text-center text-sm text-slate-400">
            © 2026 HomiCare. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// PROVIDER CARD (reusable)
// ============================================================
// ============================================================
// SEARCH PAGE
// ============================================================
function SearchPage() {
  const {
    searchQuery, setSearchQuery, selectedServiceSlug, setSelectedServiceSlug,
    selectedProviderId, setSelectedProviderId, setBookingProviderId,
    setBookingServiceName, setBookingRequestMode, bookingDraft, setBookingDraft, setCurrentPage,
  } = useApp();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerLoadError, setProviderLoadError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [savedProviderIds, setSavedProviderIds] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState(bookingDraft.paymentMethod);
  const [filters, setFilters] = useState({
    verifiedOnly: false,
    availableOnly: false,
    minRating: 0,
    maxPrice: 0,
    minExperience: 0,
  emergencyOnly: false,
  businessOnly: false,
  sortBy: 'recommended' as 'recommended' | 'rating' | 'price' | 'experience' | 'distance',
  location: '',
  serviceSlug: selectedServiceSlug || '',
  query: searchQuery || '',
  page: 0,
  limit: 20,
  offset: 0,
  });

  useEffect(() => {
    backendRequest<ServiceCategory[]>('/services/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setFilters(f => ({ ...f, query: searchQuery, serviceSlug: selectedServiceSlug || '' }));
  }, [searchQuery, selectedServiceSlug]);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setProviderLoadError('');
    const params = new URLSearchParams({ limit: '30' });
    if (filters.serviceSlug) params.set('categorySlug', filters.serviceSlug);
    if (filters.query) params.set('q', filters.query);
    if (filters.location) params.set('location', filters.location);
    if (filters.verifiedOnly) params.set('verifiedOnly', 'true');
    if (filters.availableOnly) params.set('availableOnly', 'true');
    if (filters.businessOnly) params.set('businessOnly', 'true');
    if (filters.minRating > 0) params.set('minRating', String(filters.minRating));
    if (filters.minExperience > 0) params.set('minExperience', String(filters.minExperience));
    if (filters.maxPrice > 0) params.set('maxPrice', String(filters.maxPrice));
    params.set('sortBy', filters.sortBy);
    try {
      setProviders(await backendRequest<Provider[]>(`/providers?${params.toString()}`));
    } catch (cause) {
      setProviders([]);
      setProviderLoadError(cause instanceof Error ? cause.message : 'Provider directory request failed.');
    } finally {
      setLoading(false);
    }
  }, [filters, categories]);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  const visibleCategories = categories.length > 0 ? categories : defaultServiceCategories;
  const activeCategory = visibleCategories.find((category) => category.slug === selectedServiceSlug);
  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId) || providers[0] || null;
  const serviceFee = selectedProvider?.starting_price || 0;
  const platformFee = Math.round(serviceFee * 0.05);
  const totalAmount = serviceFee + platformFee;

  const updateBookingDraft = (draft: Partial<typeof bookingDraft>) => {
    setBookingDraft({ ...bookingDraft, ...draft });
  };

  const continueBooking = () => {
    if (!selectedProvider) return;
    setBookingProviderId(selectedProvider.id);
    setBookingRequestMode('booking');
    setBookingServiceName(activeCategory?.name || selectedProvider.professional_title);
    setCurrentPage('booking');
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-2 px-2 md:grid-cols-[7rem_minmax(0,1fr)_13rem] xl:grid-cols-[10rem_minmax(0,1fr)_17rem]">
        <aside className="hidden border-r border-slate-200 bg-white px-2 py-3 md:block xl:px-3" aria-label="Main navigation">
          <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">Main</p>
          <nav className="space-y-0.5">
            {[
              { label: 'Dashboard', page: 'customer-dashboard' as const, icon: LayoutDashboard },
              { label: 'Find Services', page: 'search' as const, icon: Search },
              { label: 'My Bookings', page: 'my-bookings' as const, icon: Calendar },
              { label: 'My Wallet', page: 'wallet' as const, icon: Wallet },
              { label: 'Messages', page: 'messages' as const, icon: MessageSquare },
              { label: 'Notifications', page: 'notifications' as const, icon: Bell },
            ].map((item) => <button key={item.page} onClick={() => setCurrentPage(item.page)} className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[10px] font-medium xl:text-xs ${item.page === 'search' ? 'bg-orange-100 text-orange-800' : 'text-slate-700 hover:bg-slate-50'}`}><item.icon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{item.label}</span></button>)}
          </nav>
          <p className="mb-2 mt-4 px-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">Service categories</p>
          <nav className="space-y-0.5">
            {visibleCategories.map((category) => {
              const Icon = getCategoryIcon(category.icon);
              return <button key={category.id} onClick={() => { setSelectedServiceSlug(category.slug); setFilters((current) => ({ ...current, serviceSlug: category.slug })); }} className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[10px] xl:text-xs ${selectedServiceSlug === category.slug ? 'bg-orange-100 font-semibold text-orange-800' : 'text-slate-700 hover:bg-slate-50'}`}><Icon className="h-3.5 w-3.5 shrink-0 text-orange-600" /><span className="truncate">{category.name}</span></button>;
            })}
          </nav>
          <p className="mb-2 mt-4 px-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">My account</p>
          <nav className="space-y-0.5">
            {[
              { label: 'My Household', page: 'household' as const, icon: Home },
              { label: 'Saved Providers', page: 'search' as const, icon: Heart },
              { label: 'Reviews & Ratings', page: 'customer-dashboard' as const, icon: Star },
              { label: 'Help & Support', page: 'emergency' as const, icon: ShieldCheck },
              { label: 'Settings', page: 'profile-edit' as const, icon: Settings },
            ].map((item) => <button key={item.label} onClick={() => setCurrentPage(item.page)} className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[10px] text-slate-700 hover:bg-slate-50 xl:text-xs"><item.icon className="h-3.5 w-3.5 shrink-0 text-orange-600" /><span className="truncate">{item.label}</span></button>)}
          </nav>
          <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-2 text-center"><Star className="mx-auto h-4 w-4 fill-orange-500 text-orange-500" /><p className="mt-1 text-[10px] font-bold text-orange-900">Go Premium!</p><p className="hidden text-[9px] text-slate-600 xl:block">Get more benefits</p><button onClick={() => setCurrentPage('signup')} className="mt-1 w-full rounded bg-orange-600 px-1 py-1 text-[9px] font-semibold text-white hover:bg-orange-700">Upgrade Now</button></div>
        </aside>

        <section className="min-w-0 space-y-2 py-2 md:py-3" aria-label="Find household services">
          <header className="relative flex min-h-24 items-center overflow-hidden rounded-lg border border-orange-100 bg-gradient-to-r from-orange-100 via-orange-50 to-amber-50 p-3 sm:min-h-28 sm:px-5">
            <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=360&q=80" alt="Professional preparing a home for cleaning" className="absolute inset-y-0 left-0 hidden w-32 object-cover sm:block xl:w-40" />
            <div className="absolute inset-y-0 left-0 hidden w-40 bg-gradient-to-r from-transparent to-orange-50 sm:block xl:w-52" />
            <div className="relative z-10 ml-0 sm:ml-24 xl:ml-32"><h1 className="text-base font-bold text-slate-900 sm:text-lg">Find Trusted Household Services</h1><p className="mt-0.5 max-w-lg text-[10px] leading-snug text-slate-700 sm:text-xs">Get professional, verified and affordable services for your home, office and more.</p><div className="mt-2 hidden flex-wrap gap-1.5 sm:flex">{['Verified Providers', 'Affordable Prices', 'Fast & Easy Booking', 'Secure Payments'].map((benefit) => <span key={benefit} className="rounded border border-orange-200 bg-white/70 px-2 py-1 text-[9px] font-semibold text-orange-900">{benefit}</span>)}</div></div>
            <p className="relative z-10 ml-auto hidden max-w-32 rotate-[-4deg] text-right font-serif text-sm italic leading-tight text-orange-700 xl:block">Better services,<br />a cleaner, safer<br />and smarter home!</p>
          </header>

          <div className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Service categories">
            <button onClick={() => { setSelectedServiceSlug(null); setFilters((current) => ({ ...current, serviceSlug: '' })); }} className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border text-[10px] font-semibold ${!selectedServiceSlug ? 'border-orange-500 bg-white text-orange-700' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300'}`}><LayoutGrid className="h-5 w-5 text-orange-600" />All</button>
            {visibleCategories.map((category) => { const Icon = getCategoryIcon(category.icon); return <button key={category.id} onClick={() => { setSelectedServiceSlug(category.slug); setFilters((current) => ({ ...current, serviceSlug: category.slug })); }} className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border text-[9px] font-medium ${selectedServiceSlug === category.slug ? 'border-orange-500 bg-orange-50 text-orange-800' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300'}`}><Icon className="h-5 w-5 text-orange-600" /><span className="truncate">{category.name}</span></button>; })}
            <button aria-label="More service categories" className="my-auto grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-orange-600"><ChevronRight className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 xl:grid-cols-[minmax(130px,1fr)_repeat(3,minmax(100px,0.7fr))]">
            <label className="relative col-span-2 flex min-w-0 items-center xl:col-span-1"><Search className="absolute left-2.5 h-4 w-4 text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search services..." aria-label="Search services" className="h-9 w-full rounded-md border border-slate-200 pl-8 pr-2 text-[10px] outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 sm:text-xs" /></label>
            <label className="flex min-w-0 items-center gap-1 rounded-md border border-slate-200 px-2"><MapPin className="h-4 w-4 shrink-0 text-orange-600" /><select aria-label="Location" value={filters.location} onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))} className="h-9 min-w-0 flex-1 bg-transparent text-[10px] text-slate-700 outline-none"><option value="">All Areas</option><option value="Arua">Arua City</option></select></label>
            <label className="flex min-w-0 items-center gap-1 rounded-md border border-slate-200 px-2"><Wallet className="h-4 w-4 shrink-0 text-orange-600" /><select aria-label="Price range" value={filters.maxPrice} onChange={(event) => setFilters((current) => ({ ...current, maxPrice: Number(event.target.value) }))} className="h-9 min-w-0 flex-1 bg-transparent text-[10px] text-slate-700 outline-none"><option value={0}>Any Price</option><option value={30000}>Up to UGX 30k</option><option value={50000}>Up to UGX 50k</option><option value={100000}>Up to UGX 100k</option></select></label>
            <label className="flex min-w-0 items-center gap-1 rounded-md border border-slate-200 px-2"><Star className="h-4 w-4 shrink-0 fill-orange-500 text-orange-500" /><select aria-label="Minimum rating" value={filters.minRating} onChange={(event) => setFilters((current) => ({ ...current, minRating: Number(event.target.value) }))} className="h-9 min-w-0 flex-1 bg-transparent text-[10px] text-slate-700 outline-none"><option value={0}>Any Rating</option><option value={4}>4+ Stars</option><option value={4.5}>4.5+ Stars</option></select></label>
            <label className="col-span-2 flex min-w-0 items-center gap-1 rounded-md border border-slate-200 px-2 xl:col-span-1"><SlidersHorizontal className="h-4 w-4 shrink-0 text-orange-600" /><select aria-label="Sort providers" value={filters.sortBy} onChange={(event) => setFilters((current) => ({ ...current, sortBy: event.target.value as typeof current.sortBy }))} className="h-9 min-w-0 flex-1 bg-transparent text-[10px] text-slate-700 outline-none"><option value="recommended">Most Popular</option><option value="rating">Highest Rated</option><option value="price">Lowest Price</option><option value="experience">Most Experience</option></select></label>
          </div>

          <div className="grid gap-2 xl:grid-cols-[10.5rem_minmax(0,1fr)]">
            <aside className="hidden rounded-lg border border-slate-200 bg-white p-3 xl:block" aria-label="Service filters">
              <div className="flex items-center justify-between"><h2 className="text-xs font-bold text-slate-900">Filter Services</h2><button onClick={() => setFilters((current) => ({ ...current, verifiedOnly: false, availableOnly: false, emergencyOnly: false, minRating: 0, maxPrice: 0 }))} className="text-[10px] font-semibold text-orange-600">Clear All</button></div>
              <p className="mb-1 mt-3 text-[10px] font-semibold text-slate-800">Service Type</p><div className="space-y-1.5"><FilterToggle label="Verified" checked={filters.verifiedOnly} onChange={(value) => setFilters((current) => ({ ...current, verifiedOnly: value }))} /><FilterToggle label="Available now" checked={filters.availableOnly} onChange={(value) => setFilters((current) => ({ ...current, availableOnly: value }))} /><FilterToggle label="Emergency" checked={filters.emergencyOnly} onChange={(value) => setFilters((current) => ({ ...current, emergencyOnly: value }))} /></div>
              <p className="mb-1 mt-3 text-[10px] font-semibold text-slate-800">Price Range (UGX)</p><div className="space-y-1.5"><input aria-label="Maximum price in UGX" type="range" min="0" max="200000" step="10000" value={filters.maxPrice || 200000} onChange={(event) => setFilters((current) => ({ ...current, maxPrice: Number(event.target.value) === 200000 ? 0 : Number(event.target.value) }))} className="w-full accent-orange-600" /><div className="flex justify-between text-[9px] text-slate-500"><span>Any</span><span>{filters.maxPrice ? formatUGX(filters.maxPrice) : '200,000+'}</span></div></div>
              <p className="mb-1 mt-3 text-[10px] font-semibold text-slate-800">Rating</p><div className="space-y-1.5">{[4.5, 4, 3.5].map((rating) => <button key={rating} onClick={() => setFilters((current) => ({ ...current, minRating: current.minRating === rating ? 0 : rating }))} className={`flex w-full items-center gap-1 text-[10px] ${filters.minRating === rating ? 'text-orange-700' : 'text-slate-600'}`}><span className="text-orange-500">★★★★★</span><span>{rating}+ above</span></button>)}</div>
              <div className="mt-3 border-t border-slate-100 pt-2"><FilterToggle label="Only verified" checked={filters.verifiedOnly} onChange={(value) => setFilters((current) => ({ ...current, verifiedOnly: value }))} /></div><button onClick={() => setShowFilters(false)} className="mt-3 w-full rounded-md bg-orange-600 px-2 py-2 text-[10px] font-semibold text-white hover:bg-orange-700"><Filter className="mr-1 inline h-3 w-3" />Apply Filters</button>
            </aside>

            <div className="min-w-0"><div className="mb-1.5 flex items-center justify-between gap-2 px-1"><p className="text-[10px] font-medium text-slate-600 sm:text-xs">{loading ? 'Searching providers...' : `${providers.length} providers found`}</p><button onClick={() => setShowFilters(!showFilters)} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-700 xl:hidden"><Filter className="h-3 w-3" />Filters</button></div>
              {showFilters && <div className="mb-2 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-3 xl:hidden"><FilterToggle label="Verified" checked={filters.verifiedOnly} onChange={(value) => setFilters((current) => ({ ...current, verifiedOnly: value }))} /><FilterToggle label="Available" checked={filters.availableOnly} onChange={(value) => setFilters((current) => ({ ...current, availableOnly: value }))} /><FilterToggle label="Emergency" checked={filters.emergencyOnly} onChange={(value) => setFilters((current) => ({ ...current, emergencyOnly: value }))} /></div>}
              <div className="space-y-1.5">{loading ? [...Array(4)].map((_, index) => <div key={index} className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white" />) : providerLoadError ? <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{providerLoadError}</div> : providers.length === 0 ? <div className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center"><Search className="mx-auto h-7 w-7 text-orange-400" /><h2 className="mt-2 text-sm font-semibold text-slate-900">No public providers found</h2><p className="mt-1 text-xs text-slate-500">Try another category or adjust your filters.</p></div> : providers.map((provider) => {
                const isSelected = selectedProvider?.id === provider.id;
                return <article key={provider.id} onClick={() => setSelectedProviderId(provider.id)} className={`relative grid cursor-pointer grid-cols-[3.5rem_minmax(0,1fr)] gap-2 rounded-lg border bg-white p-2 transition-colors sm:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] ${isSelected ? 'border-orange-400 ring-1 ring-orange-100' : 'border-slate-200 hover:border-orange-300'}`}>
                  <div className="relative h-20 overflow-hidden rounded-md bg-orange-50">{provider.cover_url || provider.avatar_url ? <ProfileMediaImage source={provider.cover_url || provider.avatar_url} alt="" className="h-full w-full object-cover" /> : <img src={getProviderServiceImage(provider, visibleCategories)} alt="" className="h-full w-full object-cover" />}<span className="absolute left-1 top-1 rounded bg-emerald-600 px-1 py-0.5 text-[8px] font-semibold text-white">{provider.identity_verified ? 'Verified' : 'Provider'}</span></div>
                  <div className="min-w-0 self-center"><button onClick={(event) => { event.stopPropagation(); setSelectedProviderId(provider.id); }} className="block max-w-full truncate text-left text-xs font-bold text-slate-900 hover:text-orange-700 sm:text-sm">{provider.full_name}{provider.identity_verified && <BadgeCheck className="ml-1 inline h-3.5 w-3.5 text-orange-600" />}</button><p className="truncate text-[10px] text-slate-500">{provider.professional_title}</p><div className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-slate-600"><span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-orange-400 text-orange-400" />{provider.rating.toFixed(1)} ({provider.review_count})</span><span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{provider.location}</span></div><div className="mt-1 flex flex-wrap gap-1"><span className="rounded bg-orange-50 px-1.5 py-0.5 text-[9px] text-orange-800">{visibleCategories.find((category) => category.id === provider.primary_service_category_id)?.name || 'Home services'}</span><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">{provider.years_experience} years</span></div></div>
                  <div className="col-span-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-1.5 sm:col-span-1 sm:flex-col sm:items-stretch sm:justify-center sm:border-l sm:border-t-0 sm:pl-2 sm:pt-0"><p className="text-[9px] text-slate-500 sm:text-[10px]">From <strong className="block text-xs text-orange-700 sm:text-sm">{formatUGX(provider.starting_price)}</strong></p><div className="flex gap-1 sm:flex-col"><button onClick={(event) => { event.stopPropagation(); setSelectedProviderId(provider.id); setBookingProviderId(provider.id); setBookingRequestMode('booking'); setBookingServiceName(activeCategory?.name || provider.professional_title); setCurrentPage('booking'); }} className="rounded-md bg-orange-600 px-2 py-1.5 text-[9px] font-semibold text-white hover:bg-orange-700 sm:text-[10px]">Book Now</button><button onClick={(event) => { event.stopPropagation(); setSelectedProviderId(provider.id); setCurrentPage('provider'); }} className="rounded-md border border-orange-300 px-2 py-1 text-[9px] font-semibold text-orange-800 hover:bg-orange-50 sm:text-[10px]">View Profile</button></div></div>
                </article>;
              })}</div>
            </div>
          </div>
        </section>

        <aside className="py-3" aria-label="Booking summary"><div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 md:sticky md:top-20 xl:p-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2"><h2 className="text-xs font-bold text-slate-900 xl:text-sm">Booking Summary</h2><Calendar className="h-3.5 w-3.5 text-slate-400" /></div>
          {selectedProvider ? <>
            <div className="flex gap-2"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-orange-50">{selectedProvider.avatar_url || selectedProvider.cover_url ? <ProfileMediaImage source={selectedProvider.avatar_url || selectedProvider.cover_url} alt="" className="h-full w-full object-cover" /> : <img src={getProviderServiceImage(selectedProvider, visibleCategories)} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0"><p className="truncate text-[10px] font-bold text-slate-900 xl:text-xs">{selectedProvider.full_name}<BadgeCheck className="ml-1 inline h-3 w-3 text-orange-600" /></p><p className="truncate text-[9px] text-slate-500">{selectedProvider.professional_title}</p><p className="mt-0.5 text-[9px] font-semibold text-slate-700"><Star className="mr-0.5 inline h-3 w-3 fill-orange-400 text-orange-400" />{selectedProvider.rating.toFixed(1)} ({selectedProvider.review_count} reviews)</p></div></div>
            <div className="border-t border-slate-100 pt-2"><p className="text-[10px] font-semibold text-slate-900">Selected Service</p><div className="mt-1 flex items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-orange-100 text-orange-700"><Wrench className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[10px] font-semibold text-slate-900">{activeCategory?.name || selectedProvider.professional_title}</p><p className="line-clamp-2 text-[9px] leading-snug text-slate-500">Service with {selectedProvider.full_name}</p></div><strong className="ml-auto shrink-0 text-[10px] text-orange-700">{formatUGX(serviceFee)}</strong></div></div>
            <label className="block text-[10px] font-semibold text-slate-800">Date<input type="date" min={new Date().toISOString().slice(0, 10)} value={bookingDraft.date} onChange={(event) => updateBookingDraft({ date: event.target.value })} className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-[10px] font-normal" /></label>
            <label className="block text-[10px] font-semibold text-slate-800">Time<select value={bookingDraft.time} onChange={(event) => updateBookingDraft({ time: event.target.value })} className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[10px] font-normal"><option value="">Choose a time</option><option value="08:00">8:00 AM - 10:00 AM</option><option value="10:00">10:00 AM - 12:00 PM</option><option value="13:00">1:00 PM - 3:00 PM</option><option value="15:00">3:00 PM - 5:00 PM</option></select></label>
            <label className="block text-[10px] font-semibold text-slate-800">Location<input value={bookingDraft.location} onChange={(event) => updateBookingDraft({ location: event.target.value })} placeholder="Enter service address" className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-[10px] font-normal" /></label>
            <div><p className="mb-1 text-[10px] font-semibold text-slate-800">Payment Method</p><div className="grid grid-cols-2 gap-1">{['MTN Mobile Money', 'Airtel Money', 'Card', 'Bank Transfer'].map((method) => <button key={method} onClick={() => { setPaymentMethod(method); updateBookingDraft({ paymentMethod: method }); }} className={`rounded-md border px-1 py-1.5 text-[9px] ${paymentMethod === method ? 'border-orange-500 bg-orange-50 font-semibold text-orange-800' : 'border-slate-200 text-slate-600 hover:border-orange-300'}`}>{method}</button>)}</div></div>
            <div className="space-y-1 border-t border-slate-100 pt-2 text-[10px]"><div className="flex justify-between text-slate-600"><span>Service Fee</span><span>{formatUGX(serviceFee)}</span></div><div className="flex justify-between text-slate-600"><span>Platform Fee (5%)</span><span>{formatUGX(platformFee)}</span></div><div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold text-slate-900"><span>Total Amount</span><span className="text-orange-700">{formatUGX(totalAmount)}</span></div></div>
            <button onClick={continueBooking} className="flex w-full items-center justify-center gap-1.5 rounded-md bg-orange-600 px-2 py-2.5 text-[10px] font-semibold text-white hover:bg-orange-700"><Calendar className="h-3.5 w-3.5" />Continue Booking</button>
            <button onClick={() => setSavedProviderIds((current) => current.includes(selectedProvider.id) ? current.filter((id) => id !== selectedProvider.id) : [...current, selectedProvider.id])} className="flex w-full items-center justify-center gap-1.5 rounded-md border border-orange-300 px-2 py-2 text-[10px] font-semibold text-orange-700 hover:bg-orange-50"><Heart className={`h-3.5 w-3.5 ${savedProviderIds.includes(selectedProvider.id) ? 'fill-orange-600' : ''}`} />{savedProviderIds.includes(selectedProvider.id) ? 'Saved to Wishlist' : 'Add to Wishlist'}</button>
            <p className="rounded-md bg-orange-50 p-2 text-[9px] leading-snug text-slate-600"><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-orange-600" />Your payment is protected. No payment is taken until your booking is confirmed.</p>
          </> : <div className="py-8 text-center"><Calendar className="mx-auto h-7 w-7 text-orange-400" /><p className="mt-2 text-xs font-semibold text-slate-800">Choose a provider</p><p className="mt-1 text-[10px] text-slate-500">Select a service professional to see the booking summary.</p></div>}
        </div></aside>
      </div>
    </div>
  );
}

function FilterToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full text-sm text-slate-600"
    >
      <span>{label}</span>
      <div className={`w-9 h-5 rounded-full transition-colors relative ${checked ? 'bg-blue-500' : 'bg-slate-200'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
      </div>
    </button>
  );
}

// ============================================================
// PROVIDER PROFILE PAGE
// ============================================================
function ProviderProfilePage() {
  const { selectedProviderId, setSelectedProviderId, setCurrentPage, setBookingProviderId, setBookingServiceName, setBookingRequestMode, setCallIntent, userRole } = useApp();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [availability, setAvailability] = useState<ProviderAvailability[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioProject[]>([]);
  const [providerCv, setProviderCv] = useState<ProviderCvProfile | null>(null);
  const [activityMedia, setActivityMedia] = useState<ProviderActivityMedia[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [profilePublicId, setProfilePublicId] = useState('');
  const [verificationSubmissions, setVerificationSubmissions] = useState<ProviderVerificationSubmission[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'portfolio' | 'reviews' | 'availability' | 'trust' | 'cv'>('overview');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [shareNotice, setShareNotice] = useState('');
  const [connected, setConnected] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState('');
  const [activityCaption, setActivityCaption] = useState('');
  const [activityFiles, setActivityFiles] = useState<File[]>([]);
  const [uploadingActivity, setUploadingActivity] = useState(false);
  const [verificationType, setVerificationType] = useState<'identity' | 'phone' | 'skills' | 'certification' | 'business' | 'portfolio'>('identity');
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [profileActionError, setProfileActionError] = useState('');
  const [profileActionNotice, setProfileActionNotice] = useState('');

  const startInAppCall = (type: 'voice' | 'video') => {
    if (!provider) return;
    setSelectedProviderId(provider.id);
    setCallIntent({ id: Date.now(), type });
    setCurrentPage('message-conversation');
  };

  const shareProfile = async () => {
    if (!provider) return;
    const shareUrl = new URL(`/providers/${encodeURIComponent(provider.id)}`, window.location.origin);
    const shareData = { title: `${provider.full_name} | HomiCare`, text: `${provider.professional_title} in ${provider.location}`, url: shareUrl.toString() };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(shareUrl.toString());
        setShareNotice('Profile link copied');
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') return;
      setShareNotice('Could not share the profile link');
    }
  };

  useEffect(() => {
    if (!selectedProviderId) {
      setProvider(null);
      setLoading(false);
      setLoadError('No provider was selected. Return to the provider directory and choose a published profile.');
      return;
    }
    setLoading(true);
    setLoadError('');
    let active = true;
    const selectedIdIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedProviderId);
    Promise.all([
      selectedIdIsUuid ? supabase.from('public_provider_profiles').select('*').eq('id', selectedProviderId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      selectedIdIsUuid ? supabase.from('provider_services').select('*, service:services(*)').eq('provider_id', selectedProviderId).eq('is_active', true) : Promise.resolve({ data: [], error: null }),
      selectedIdIsUuid ? supabase.from('public_provider_reviews').select('*').eq('provider_id', selectedProviderId).order('created_at', { ascending: false }).limit(10) : Promise.resolve({ data: [], error: null }),
      selectedIdIsUuid ? supabase.from('public_provider_portfolio').select('*').eq('provider_id', selectedProviderId).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
      selectedIdIsUuid ? supabase.from('public_provider_activity_media').select('*').eq('provider_id', selectedProviderId).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
      selectedIdIsUuid ? supabase.from('provider_availability').select('*').eq('provider_id', selectedProviderId).order('day_of_week') : Promise.resolve({ data: [], error: null }),
      supabase.from('provider_cv_profiles').select('*').eq('provider_id', selectedProviderId).maybeSingle(),
      supabase.auth.getUser(),
    ]).then(async ([pRes, sRes, rRes, portRes, mediaRes, availabilityRes, cvRes, authRes]) => {
      if (!active) return;
      let providerData = pRes.data as Provider | null;
      let providerDirectoryFallback = false;
      let ownerProfileFallback = false;
      let ownerLookupError = '';
      if (pRes.error || !selectedIdIsUuid) {
        try {
          const directoryProviders = await backendRequest<Provider[]>('/providers');
          providerData = directoryProviders.find((item) => item.id === selectedProviderId) || null;
          providerDirectoryFallback = Boolean(providerData);
        } catch {
          providerData = null;
        }
      }
      if (!providerData && authRes.data.user && selectedIdIsUuid) {
        const { data: ownProvider, error: ownProviderError } = await supabase
          .from('providers')
          .select('*')
          .eq('id', selectedProviderId)
          .eq('user_id', authRes.data.user.id)
          .maybeSingle();
        if (!active) return;
        if (ownProviderError) {
          ownerLookupError = ownProviderError.message;
        } else if (ownProvider) {
          providerData = ownProvider as Provider;
          ownerProfileFallback = true;
        }
      }
      if (!active) return;
      setProvider(providerData);
      setServices(sRes.data || []);
      setReviews(rRes.data || []);
      setPortfolio(portRes.data || []);
      setActivityMedia(mediaRes.data || []);
      setAvailability(availabilityRes.data || []);
      setProviderCv(cvRes.data as ProviderCvProfile | null);
      if (authRes.data.user && !providerDirectoryFallback) {
        const { data: ownerRecord } = await supabase.from('providers').select('id')
          .eq('id', selectedProviderId)
          .eq('user_id', authRes.data.user.id)
          .maybeSingle();
        if (!active) return;
        setIsOwner(Boolean(ownerRecord));
        if (ownerRecord) {
          setActiveTab('trust');
          const [profileResult, verificationResult] = await Promise.all([
            supabase.from('profiles').select('public_id').eq('user_id', authRes.data.user.id).maybeSingle(),
            supabase.from('provider_verification_submissions').select('*').eq('provider_id', selectedProviderId).order('submitted_at', { ascending: false }),
          ]);
          if (!active) return;
          setProfilePublicId(profileResult.data?.public_id || '');
          setVerificationSubmissions(verificationResult.data || []);
          if (verificationResult.error) setProfileActionError('Verification submissions need the latest Supabase migration.');
        }
      } else {
        setIsOwner(false);
        setProfilePublicId('');
        setVerificationSubmissions([]);
      }
      const failedSections = [
        sRes.error && 'services',
        rRes.error && 'reviews',
        portRes.error && 'portfolio',
        mediaRes.error && 'activity media',
        availabilityRes.error && 'availability',
        cvRes.error && 'CV',
      ].filter(Boolean);
      if (!providerData && ownerLookupError) setLoadError(`Your provider profile could not be checked: ${ownerLookupError}`);
      else if (pRes.error && !providerDirectoryFallback && !ownerProfileFallback) setLoadError(`Provider profile query failed: ${pRes.error.message}. Confirm the public provider-profile migration is applied and try again.`);
      else if (!providerData && !selectedIdIsUuid) setLoadError('This profile link does not refer to a saved provider record. Return to the provider directory and choose an active provider.');
      else if (!providerData && !pRes.error) setLoadError('This provider is not publicly available. It may be unpublished, private, or no longer active. Sign in as the provider to view an unpublished profile.');
      else if (!providerData) setLoadError('The provider profile could not be found. Check the profile link and try again.');
      else if (providerDirectoryFallback) setLoadError('Showing provider directory details. Reviews, services and portfolio require the public profile service.');
      else if (ownerProfileFallback) setLoadError('Showing your saved provider profile. This profile is not currently available in the public directory.');
      else if (failedSections.length) setLoadError(`Some profile details could not be loaded: ${failedSections.join(', ')}. Retry to load them again.`);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setLoadError('Provider profile could not be loaded. Check your connection and try again.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [retryCount, selectedProviderId]);

  useEffect(() => {
    let active = true;
    const loadConnection = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!active || !authData.user || !selectedProviderId || userRole === 'provider') return;
      const { data } = await supabase.from('provider_connections').select('id').eq('customer_id', authData.user.id).eq('provider_id', selectedProviderId).maybeSingle();
      if (active) setConnected(Boolean(data));
    };
    loadConnection();
    return () => { active = false; };
  }, [selectedProviderId, userRole]);

  const toggleConnection = async () => {
    if (!provider) return;
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { setCurrentPage('login'); return; }
    setConnectionNotice('');
    const result = connected
      ? await supabase.from('provider_connections').delete().eq('customer_id', authData.user.id).eq('provider_id', provider.id)
      : await supabase.from('provider_connections').insert({ customer_id: authData.user.id, provider_id: provider.id });
    if (result.error) {
      setConnectionNotice(result.error.message.includes('provider_connections') ? 'Apply the provider-connections migration to use Connect.' : result.error.message);
      return;
    }
    setConnected(!connected);
  };

  const uploadActivityMedia = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!provider || !profilePublicId || !activityFiles.length) return;
    if (activityFiles.length > 10) {
      setProfileActionError('Choose up to 10 photos or videos at a time.');
      return;
    }
    const supported = activityFiles.every((file) => ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(file.type));
    if (!supported || activityFiles.some((file) => file.size > 50 * 1024 * 1024)) {
      setProfileActionError('Use JPG, PNG, WebP, MP4, or WebM files up to 50 MB each.');
      return;
    }

    setProfileActionError('');
    setProfileActionNotice('');
    setUploadingActivity(true);
    const uploaded: ProviderActivityMedia[] = [];
    try {
      for (const file of activityFiles) {
        const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
        const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
        const storagePath = `${profilePublicId}/activities/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('profile-media').upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;

        const { data: media, error: insertError } = await supabase.from('provider_activity_media').insert({
          provider_id: provider.id,
          media_type: mediaType,
          storage_path: storagePath,
          caption: activityCaption.trim(),
        }).select('*').single();
        if (insertError || !media) {
          await supabase.storage.from('profile-media').remove([storagePath]);
          throw insertError || new Error('Activity media could not be saved.');
        }
        uploaded.push(media);
      }
      setActivityMedia((current) => [...uploaded, ...current]);
      setActivityFiles([]);
      setActivityCaption('');
      setProfileActionNotice(`${uploaded.length} ${uploaded.length === 1 ? 'item' : 'items'} added to Recent Work.`);
    } catch (cause) {
      setActivityMedia((current) => [...uploaded, ...current]);
      setProfileActionError(cause instanceof Error ? cause.message : 'Activity media could not be uploaded.');
    } finally {
      setUploadingActivity(false);
    }
  };

  const removeActivityMedia = async (media: ProviderActivityMedia) => {
    setProfileActionError('');
    const { error: deleteError } = await supabase.from('provider_activity_media').delete().eq('id', media.id);
    if (deleteError) {
      setProfileActionError(deleteError.message);
      return;
    }
    setActivityMedia((current) => current.filter((item) => item.id !== media.id));
    await supabase.storage.from('profile-media').remove([media.storage_path]);
  };

  const submitVerificationEvidence = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!provider || !verificationFile) return;
    if (verificationFile.size > 10 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(verificationFile.type)) {
      setProfileActionError('Choose a PDF, JPG, PNG, or WebP file up to 10 MB.');
      return;
    }
    if (verificationSubmissions.some((submission) => submission.verification_type === verificationType && submission.status === 'pending')) {
      setProfileActionError('This verification is already waiting for review.');
      return;
    }

    setProfileActionError('');
    setProfileActionNotice('');
    setSubmittingVerification(true);
    const extension = verificationFile.type === 'application/pdf' ? 'pdf' : verificationFile.type === 'image/jpeg' ? 'jpg' : verificationFile.type.split('/')[1];
    const storagePath = `${provider.id}/${verificationType}/${crypto.randomUUID()}.${extension}`;
    try {
      const { error: uploadError } = await supabase.storage.from('verification-evidence').upload(storagePath, verificationFile, {
        cacheControl: '3600',
        contentType: verificationFile.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: submission, error: insertError } = await supabase.from('provider_verification_submissions').insert({
        provider_id: provider.id,
        verification_type: verificationType,
        storage_path: storagePath,
        notes: verificationNotes.trim(),
      }).select('*').single();
      if (insertError || !submission) {
        await supabase.storage.from('verification-evidence').remove([storagePath]);
        throw insertError || new Error('Verification evidence could not be submitted.');
      }
      setVerificationSubmissions((current) => [submission, ...current]);
      setVerificationFile(null);
      setVerificationNotes('');
      setProfileActionNotice('Evidence submitted privately for HomiCare review.');
    } catch (cause) {
      setProfileActionError(cause instanceof Error ? cause.message : 'Verification evidence could not be submitted.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-20 text-center text-slate-400">Loading profile...</div>;
  if (!provider) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><div role={loadError.includes('unavailable or is not published') ? 'status' : 'alert'} className="rounded-md border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{loadError || 'Provider profile not found.'}{!loadError.includes('unavailable or is not published') && <button onClick={() => setRetryCount((count) => count + 1)} className="ml-3 font-semibold underline">Retry</button>}</div></div>;

  const trustItems = [
    { label: 'Identity', verified: provider.identity_verified },
    { label: 'Phone', verified: provider.phone_verified },
    { label: 'Skills', verified: provider.skills_verified },
    { label: 'Certification', verified: provider.certification_verified },
    { label: 'Business', verified: provider.business_verified },
    { label: 'Portfolio', verified: provider.portfolio_verified },
  ];
  const verificationFlags: Record<(typeof providerVerificationOptions)[number]['value'], boolean> = {
    identity: provider.identity_verified,
    phone: provider.phone_verified,
    skills: provider.skills_verified,
    certification: provider.certification_verified,
    business: provider.business_verified,
    portfolio: provider.portfolio_verified,
  };
  const reviewDimensions = [
    { label: 'Quality', key: 'rating_quality' },
    { label: 'Professionalism', key: 'rating_professionalism' },
    { label: 'Communication', key: 'rating_communication' },
    { label: 'Timeliness', key: 'rating_timeliness' },
    { label: 'Value', key: 'rating_value' },
    { label: 'Cleanliness', key: 'rating_cleanliness' },
  ] as const;
  const reviewAverages = reviewDimensions.map((dimension) => ({
    label: dimension.label,
    value: reviews.length ? reviews.reduce((sum, review) => sum + review[dimension.key], 0) / reviews.length : 0,
  }));
  const activityComposer = isOwner && (
    <form onSubmit={uploadActivityMedia} className="mb-4 space-y-3 rounded-lg border border-orange-200 bg-orange-50/50 p-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="block text-xs font-semibold text-slate-700">Activity caption<textarea value={activityCaption} onChange={(event) => setActivityCaption(event.target.value)} maxLength={500} rows={2} placeholder="Share a project update or describe your work" className="mt-1.5 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" /></label>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-orange-300 bg-white px-3 py-2.5 text-xs font-semibold text-orange-800 hover:bg-orange-50">Choose photos/videos<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple onChange={(event: ChangeEvent<HTMLInputElement>) => setActivityFiles(Array.from(event.target.files || []))} className="sr-only" /></label>
      </div>
      {activityFiles.length > 0 && <p className="text-xs text-slate-600">{activityFiles.length} file{activityFiles.length === 1 ? '' : 's'} selected · {activityFiles.map((file) => file.name).join(', ')}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] text-slate-500">JPG, PNG, WebP, MP4, or WebM · up to 50 MB each</p><button type="submit" disabled={!activityFiles.length || uploadingActivity} className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">{uploadingActivity ? 'Uploading...' : 'Post to profile'}</button></div>
    </form>
  );
  const renderActivityMedia = (items: ProviderActivityMedia[], columns = 'sm:grid-cols-2 lg:grid-cols-3') => (
    <div className={`grid grid-cols-2 gap-3 ${columns}`}>
      {items.map((media) => <article key={media.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {media.media_type === 'video' ? <ProfileMediaVideo source={media.storage_path} label={media.caption || 'Provider activity video'} className="aspect-[4/3] w-full bg-black object-contain" /> : <ProfileMediaImage source={media.storage_path} alt={media.caption || 'Provider activity photo'} className="aspect-[4/3] w-full bg-slate-100 object-cover" />}
        <div className="flex items-start gap-2 p-2.5"><p className="min-w-0 flex-1 whitespace-pre-wrap text-xs text-slate-700">{media.caption || (media.media_type === 'video' ? 'Work video' : 'Work photo')}</p>{isOwner && <button type="button" onClick={() => void removeActivityMedia(media)} aria-label="Remove activity media" className="shrink-0 text-xs font-semibold text-red-700 hover:underline">Remove</button>}</div>
      </article>)}
    </div>
  );

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#fffaf7] lg:grid lg:grid-cols-[190px_minmax(0,1fr)]">
      <aside className="hidden min-h-[calc(100dvh-4rem)] bg-[#ff4b16] px-3 py-5 text-white lg:block" aria-label="Customer navigation">
        <nav className="space-y-1">
          {[
            { label: 'Dashboard', page: 'customer-dashboard' as const, icon: LayoutDashboard },
            { label: 'Find Services', page: 'search' as const, icon: Search },
            { label: 'My Bookings', page: 'my-bookings' as const, icon: Calendar },
            { label: 'My Wallet', page: 'wallet' as const, icon: Wallet },
            { label: 'Messages', page: 'messages' as const, icon: MessageSquare },
            { label: 'Notifications', page: 'notifications' as const, icon: Bell },
          ].map((item) => <button key={item.page} onClick={() => setCurrentPage(item.page)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold text-white/95 hover:bg-white/15"><item.icon className="h-4 w-4 shrink-0" />{item.label}</button>)}
        </nav>
        <p className="mb-2 mt-5 px-2 text-[9px] font-bold uppercase tracking-widest text-orange-100">Categories</p>
        <nav className="space-y-0.5">
          {defaultServiceCategories.slice(0, 8).map((category) => {
            const Icon = getCategoryIcon(category.icon);
            return <button key={category.id} onClick={() => setCurrentPage('search')} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] text-white/95 hover:bg-white/15"><Icon className="h-3.5 w-3.5 shrink-0" />{category.name}</button>;
          })}
        </nav>
        <button onClick={() => setCurrentPage('search')} className="mt-5 w-full rounded-xl bg-orange-100 p-3 text-left text-xs font-bold text-orange-900 shadow-sm"><span className="block text-sm">Need a service now?</span><span className="mt-2 inline-flex rounded-md bg-orange-700 px-2 py-1 text-[10px] text-white">Find providers <ArrowRight className="ml-1 h-3 w-3" /></span></button>
      </aside>
      <main className="min-w-0 px-3 py-4 sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1280px]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button onClick={() => { setCurrentPage('search'); window.history.replaceState({}, '', window.location.pathname); }} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-orange-700">
          <ChevronLeft className="h-4 w-4" />Back to Providers
        </button>
        <button onClick={shareProfile} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-orange-700"><Share2 className="h-3.5 w-3.5 text-orange-600" />Share Profile</button>
      </div>

      {/* Profile header */}
      <div className="mb-4 overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm">
        <div className="relative h-36 bg-gradient-to-br from-slate-200 to-slate-300 sm:h-52">
          <img src={getProviderServiceImage(provider)} alt="" className="h-full w-full object-cover" />
          {provider.cover_url && <span className="absolute inset-0"><ProfileMediaImage source={provider.cover_url} alt={`${provider.full_name}'s work`} className="h-full w-full object-cover" /></span>}
        </div>
        <div className="grid gap-3 px-4 pb-4 sm:px-5 xl:grid-cols-[minmax(0,1fr)_170px]">
          <div className="grid min-w-0 gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
            <div className="-mt-14 h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-md sm:-mt-20 sm:h-32 sm:w-32">
              {provider.avatar_url ? (
                <ProfileMediaImage source={provider.avatar_url} alt={provider.full_name} className="w-full h-full object-cover" />
              ) : (
                <img src={getProviderPortraitImage(provider)} alt={provider.full_name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="min-w-0 pb-1 pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{provider.full_name}</h1>
                {provider.identity_verified && (
                  <button onClick={() => setCurrentPage('verification-details')} className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 hover:bg-orange-100" title="View verification details">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified
                  </button>
                )}
              </div>
              <p className="text-xs font-medium text-slate-600 sm:text-sm">{provider.professional_title}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-600">
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
                  <span className="font-semibold text-orange-700">{provider.rating.toFixed(1)}</span>
                  <span>({provider.review_count} reviews)</span>
                </div>
                <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {provider.location}</div>
                <div className="flex items-center gap-1"><Clock className="w-4 h-4" /> Responds in {provider.response_time_min}min</div>
              </div>
              <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold ${provider.availability_status === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{getAvailabilityLabel(provider.availability_status)}</span>
              {provider.skills && provider.skills.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{provider.skills.slice(0, 5).map((skill) => <span key={skill} className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-900">{skill}</span>)}{provider.skills.length > 5 && <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-900">+{provider.skills.length - 5}</span>}</div>}
            </div>
          </div>
            <div className="grid grid-cols-2 gap-2 self-end xl:grid-cols-1">
              {isOwner && <button onClick={() => setCurrentPage('profile')} className="rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-sm font-semibold text-orange-800 hover:bg-orange-50">Edit Profile</button>}
              <button
                onClick={() => { setBookingProviderId(provider.id); setBookingRequestMode('booking'); setBookingServiceName(null); setCurrentPage('booking'); }}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-orange-700"
              >
                <Calendar className="h-4 w-4" />Book Now
              </button>
              {userRole !== 'provider' && <button onClick={() => void toggleConnection()} aria-pressed={connected} className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold ${connected ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-orange-300 bg-white text-orange-800 hover:bg-orange-50'}`}>{connected ? 'Connected' : 'Connect'}</button>}
              {userRole !== 'provider' && <>
                <button onClick={() => startInAppCall('voice')} aria-label="Start in-app voice call" title="Start an in-app voice call" className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-xs font-semibold text-orange-800 hover:bg-orange-50"><Phone className="h-4 w-4" />Call in app</button>
                <button onClick={() => startInAppCall('video')} aria-label="Start in-app video call" title="Start an in-app video call" className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-xs font-semibold text-orange-800 hover:bg-orange-50"><Video className="h-4 w-4" />Video</button>
              </>}
              <button
                onClick={() => setCurrentPage('message-conversation')}
                aria-label="Message provider"
                title="Message provider"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-xs font-semibold text-orange-800 hover:bg-orange-50"
              >
                <MessageSquare className="h-4 w-4" />Message
              </button>
              <div className="col-span-2 rounded-lg border border-orange-100 bg-[#fffaf7] px-3 py-2 xl:col-span-1">
                <p className="text-[10px] font-semibold text-slate-600">Starting Price</p><p className="text-sm font-black text-orange-700">{formatUGX(provider.starting_price)}</p><p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-500"><Clock className="h-3 w-3" />Response {provider.response_time_min} min</p>
              </div>
            </div>
          </div>
          {(shareNotice || connectionNotice) && <p role="status" className="mt-2 text-right text-xs text-slate-500">{shareNotice || connectionNotice}</p>}

          <div className="grid grid-cols-2 gap-2 border-t border-orange-50 bg-[#fffdfb] pt-3 sm:grid-cols-4">
            {[
              { label: 'Verified Provider', detail: 'Background checked', icon: ShieldCheck, done: provider.identity_verified },
              { label: 'Identity Verified', detail: provider.identity_verified ? 'ID confirmed' : 'Not verified', icon: BadgeCheck, done: provider.identity_verified },
              { label: 'Phone Verified', detail: provider.phone_verified ? 'Contact confirmed' : 'Not verified', icon: Phone, done: provider.phone_verified },
              { label: 'Business Verified', detail: provider.business_verified ? 'Business checked' : 'Not verified', icon: Building2, done: provider.business_verified },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${stat.done ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}><stat.icon className="h-4 w-4" /></span>
                <span className="min-w-0"><strong className="block truncate text-[10px] text-slate-800">{stat.label}</strong><span className="block truncate text-[9px] text-slate-500">{stat.detail}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      {loadError && <p role="status" className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{loadError}<button onClick={() => setRetryCount((count) => count + 1)} className="ml-2 font-semibold underline">Retry profile data</button></p>}
      <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-hide border-b border-slate-200">
        {[
          { id: 'overview' as const, label: 'Overview', icon: Home },
          { id: 'services' as const, label: 'Services', icon: Wrench },
          { id: 'portfolio' as const, label: 'Portfolio', icon: Briefcase },
          ...(providerCv?.is_published ? [{ id: 'cv' as const, label: 'Professional CV', icon: FileText }] : []),
          { id: 'reviews' as const, label: 'Reviews', icon: Star },
          { id: 'availability' as const, label: 'Availability', icon: Clock },
          { id: 'trust' as const, label: 'Trust Profile', icon: ShieldCheck },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'border-orange-500 text-orange-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-3">
            <section className="rounded-xl border border-orange-100 bg-white p-4 sm:p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="grid h-8 w-8 place-items-center rounded-full bg-orange-100 text-orange-700"><User className="h-4 w-4" /></span>About Me</h2>
              <p className="mt-3 text-xs leading-relaxed text-slate-700 sm:text-sm">{provider.bio || 'This provider has not added an introduction yet.'}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                {[{ label: 'Completed Jobs', value: provider.completed_jobs }, { label: 'Experience', value: `${provider.years_experience}+ years` }, { label: 'Rating', value: `${provider.rating.toFixed(1)} / 5` }].map((item) => <div key={item.label}><p className="text-sm font-bold text-slate-900">{item.value}</p><p className="mt-0.5 text-[10px] text-slate-500">{item.label}</p></div>)}
              </div>
            </section>

            {providerCv?.is_published && <section className="rounded-xl border border-orange-100 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="grid h-8 w-8 place-items-center rounded-full bg-orange-100 text-orange-700"><FileText className="h-4 w-4" /></span>Professional CV</h2><button onClick={() => setActiveTab('cv')} className="text-[10px] font-semibold text-orange-700 hover:text-orange-900">View full CV <ArrowRight className="inline h-3 w-3" /></button></div>
              <p className="mt-3 text-xs leading-relaxed text-slate-700 sm:text-sm">{providerCv.summary || provider.bio || 'Professional summary not provided.'}</p>
              <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                {providerCv.experiences.slice(0, 2).map((item) => <div key={item.id}><p className="text-xs font-bold text-slate-800">{item.title}</p><p className="text-[10px] text-slate-500">{item.company} · {item.start_date}–{item.current ? 'Present' : item.end_date}</p></div>)}
                {providerCv.education.slice(0, 1).map((item) => <div key={item.id}><p className="text-xs font-bold text-slate-800">{item.qualification}</p><p className="text-[10px] text-slate-500">{item.institution} · {item.start_year}–{item.end_year}</p></div>)}
              </div>
              {providerCv.skills.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{providerCv.skills.slice(0, 6).map((skill) => <span key={skill} className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-900">{skill}</span>)}</div>}
              {providerCv.certifications.length > 0 && <p className="mt-3 text-[10px] text-slate-600"><BadgeCheck className="mr-1 inline h-3.5 w-3.5 text-orange-600" />{providerCv.certifications.length} listed certification{providerCv.certifications.length === 1 ? '' : 's'}; credential claims are not verification badges.</p>}
            </section>}

            <section className="rounded-xl border border-orange-100 bg-white p-4 sm:p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="grid h-8 w-8 place-items-center rounded-full bg-orange-100 text-orange-700"><Wrench className="h-4 w-4" /></span>Skills &amp; Expertise</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">{(provider.skills?.length ? provider.skills : services.map((service) => service.custom_name || service.service?.name || 'Household service')).length ? (provider.skills?.length ? provider.skills : services.map((service) => service.custom_name || service.service?.name || 'Household service')).map((skill) => <span key={skill} className="rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-semibold text-orange-900">{skill}</span>) : <p className="text-xs text-slate-500">Skills have not been listed yet.</p>}</div>
            </section>

            <section className="rounded-xl border border-orange-100 bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="grid h-8 w-8 place-items-center rounded-full bg-orange-100 text-orange-700"><Wrench className="h-4 w-4" /></span>Services Offered</h2><button onClick={() => setActiveTab('services')} className="text-[10px] font-semibold text-orange-700 hover:text-orange-900">View all <ArrowRight className="inline h-3 w-3" /></button></div>
              {services.length === 0 ? <p className="text-xs text-slate-500">No active services listed.</p> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{services.slice(0, 4).map((service) => <article key={service.id} className="rounded-lg border border-slate-100 bg-white p-3 text-center"><span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-orange-50 text-orange-700"><Wrench className="h-5 w-5" /></span><h3 className="mt-2 text-[10px] font-bold text-slate-900">{service.custom_name || service.service?.name || 'Household service'}</h3><p className="mt-1 text-[9px] text-slate-500">From <strong className="text-orange-700">{formatUGX(service.price_from)}</strong></p></article>)}</div>}
            </section>

            <section className="rounded-xl border border-orange-100 bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="grid h-8 w-8 place-items-center rounded-full bg-orange-100 text-orange-700"><Briefcase className="h-4 w-4" /></span>Portfolio / Recent Work</h2><button onClick={() => setActiveTab('portfolio')} className="text-[10px] font-semibold text-orange-700 hover:text-orange-900">View all <ArrowRight className="inline h-3 w-3" /></button></div>
              {activityComposer}
              {(profileActionError || profileActionNotice) && <p role={profileActionError ? 'alert' : 'status'} className={`mb-3 rounded-md p-3 text-xs ${profileActionError ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{profileActionError || profileActionNotice}</p>}
              {activityMedia.length > 0 ? renderActivityMedia(activityMedia.slice(0, 4), 'sm:grid-cols-4') : portfolio.filter((project) => project.after_image_url || project.during_image_url || project.before_image_url).length > 0 ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{portfolio.filter((project) => project.after_image_url || project.during_image_url || project.before_image_url).slice(0, 4).map((project) => <button key={project.id} onClick={() => setActiveTab('portfolio')} className="overflow-hidden rounded-lg border border-slate-100 text-left"><ProfileMediaImage source={project.after_image_url || project.during_image_url || project.before_image_url} alt={project.title} className="aspect-[4/3] w-full object-cover" /><span className="block truncate px-2 py-1.5 text-[10px] font-medium text-slate-700">{project.title}</span></button>)}</div> : <p className="py-4 text-center text-xs text-slate-500">No work photos or videos shared yet.</p>}
            </section>

            <section className="rounded-xl border border-orange-100 bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="grid h-8 w-8 place-items-center rounded-full bg-orange-100 text-orange-700"><Star className="h-4 w-4" /></span>Customer Reviews <span className="text-[10px] font-medium text-slate-500">({provider.review_count})</span></h2><button onClick={() => setActiveTab('reviews')} className="text-[10px] font-semibold text-orange-700 hover:text-orange-900">View all <ArrowRight className="inline h-3 w-3" /></button></div>
              {reviews[0] ? <article className="rounded-lg border border-slate-100 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-900">{reviews[0].customer_name}</p><div className="mt-1 flex items-center gap-0.5">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-3 w-3 ${star <= Math.round(reviews[0].overall_rating) ? 'fill-orange-400 text-orange-400' : 'text-slate-200'}`} />)}<span className="ml-1 text-[9px] text-slate-500">{timeAgo(reviews[0].created_at)}</span></div></div>{reviews[0].would_hire_again && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">Verified</span>}</div><p className="mt-2 text-[11px] leading-relaxed text-slate-700">{reviews[0].comment || 'Customer left a rating for this service.'}</p></article> : <p className="text-xs text-slate-500">No customer reviews yet.</p>}
            </section>
          </div>

          <aside className="space-y-3">
            <section className="rounded-xl border border-orange-100 bg-white p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="grid h-7 w-7 place-items-center rounded-full bg-orange-100 text-orange-700"><User className="h-4 w-4" /></span>Professional Information</h2>
              <dl className="mt-3 divide-y divide-slate-100 text-[10px]">
                <div className="flex justify-between gap-2 py-2"><dt className="text-slate-500">Full Name</dt><dd className="text-right font-semibold text-slate-800">{provider.full_name}</dd></div>
                <div className="flex justify-between gap-2 py-2"><dt className="text-slate-500">Phone Number</dt><dd className="text-right font-semibold text-slate-800">{provider.public_phone || 'Not shared'}</dd></div>
                <div className="flex justify-between gap-2 py-2"><dt className="text-slate-500">Experience</dt><dd className="text-right font-semibold text-slate-800">{provider.years_experience}+ years</dd></div>
                <div className="flex justify-between gap-2 py-2"><dt className="text-slate-500">Member Since</dt><dd className="text-right font-semibold text-slate-800">{formatDate(provider.member_since)}</dd></div>
              </dl>
            </section>
            <section className="rounded-xl border border-orange-100 bg-white p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="grid h-7 w-7 place-items-center rounded-full bg-orange-100 text-orange-700"><MapPin className="h-4 w-4" /></span>Location &amp; Address</h2>
              <p className="mt-3 text-[10px] text-slate-500">Service area</p><p className="mt-1 text-xs font-semibold text-slate-800">{provider.location}</p>
              <div className="mt-3 grid h-20 place-items-center rounded-lg bg-[linear-gradient(30deg,#e8ede6_12%,transparent_12.5%,transparent_87%,#e8ede6_87.5%),linear-gradient(150deg,#e8ede6_12%,transparent_12.5%,transparent_87%,#e8ede6_87.5%),linear-gradient(30deg,#e8ede6_12%,transparent_12.5%,transparent_87%,#e8ede6_87.5%),linear-gradient(150deg,#e8ede6_12%,transparent_12.5%,transparent_87%,#e8ede6_87.5%)] bg-[length:32px_56px] text-orange-600"><MapPin className="h-7 w-7 fill-orange-500 text-orange-700" /></div>
              <p className="mt-2 text-[9px] leading-relaxed text-slate-500">Exact service address is shared only when arranging a booking.</p>
            </section>
            <section className="rounded-xl border border-orange-100 bg-white p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="grid h-7 w-7 place-items-center rounded-full bg-orange-100 text-orange-700"><DollarSign className="h-4 w-4" /></span>Pricing</h2>
              <div className="mt-3 flex justify-between gap-2 text-xs"><span className="text-slate-600">Starting Price</span><strong className="text-orange-700">{formatUGX(provider.starting_price)}</strong></div>
              {services.slice(0, 2).map((service) => <div key={service.id} className="mt-2 flex justify-between gap-2 border-t border-slate-100 pt-2 text-[10px]"><span className="text-slate-600">{service.custom_name || service.service?.name || 'Service'}</span><strong className="text-slate-800">{formatUGX(service.price_from)}</strong></div>)}
            </section>
            <section className="rounded-xl border border-orange-100 bg-white p-4">
              <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="grid h-7 w-7 place-items-center rounded-full bg-orange-100 text-orange-700"><Clock className="h-4 w-4" /></span>Availability</h2><button onClick={() => setActiveTab('availability')} className="text-[10px] font-semibold text-orange-700">Full hours</button></div>
              <div className="mt-2 divide-y divide-slate-100">{weekdayNames.slice(1).map((day, offset) => { const hours = availability.find((item) => item.day_of_week === offset + 1); return <div key={day} className="flex justify-between gap-2 py-1.5 text-[10px]"><span className="text-slate-600">{day.slice(0, 3)}</span><span className={hours?.is_available ? 'font-medium text-slate-700' : 'text-slate-400'}>{hours?.is_available ? `${hours.start_time?.slice(0, 5)}–${hours.end_time?.slice(0, 5)}` : 'Closed'}</span></div>; })}</div>
            </section>
            <button onClick={() => setCurrentPage('message-conversation')} className="flex w-full items-center justify-between rounded-xl border border-orange-100 bg-orange-50 p-4 text-left"><span><strong className="block text-xs text-slate-900">Need help?</strong><span className="text-[10px] text-slate-600">Chat with {provider.full_name.split(' ')[0]} directly</span></span><span className="rounded-lg bg-orange-600 px-3 py-2 text-[10px] font-bold text-white">Start Chat <ArrowRight className="ml-1 inline h-3 w-3" /></span></button>
          </aside>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="space-y-4">
          {services.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No services listed</div>
          ) : services.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <img src={getServiceImage(`${s.custom_name || ''} ${s.service?.name || ''} ${provider.professional_title}`)} alt={`${s.custom_name || s.service?.name || 'Home'} service`} className="hidden h-24 w-32 shrink-0 rounded-lg object-cover sm:block" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{s.custom_name || s.service?.name}</h3>
                    {s.emergency_available && (
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium">Emergency</span>
                    )}
                  </div>
                  {s.description && <p className="text-sm text-slate-500 mt-1">{s.description}</p>}
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    {s.estimated_duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.estimated_duration}</span>}
                    {s.warranty && <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> {s.warranty} warranty</span>}
                    {s.materials_included && <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Materials included</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">From</p>
                  <p className="font-bold text-slate-900">{s.price_to && s.price_to > s.price_from ? `${formatUGX(s.price_from)}–${formatUGX(s.price_to)}` : `From ${formatUGX(s.price_from)}`}</p>
                  <p className="mt-1 text-[10px] capitalize text-slate-500">{s.pricing_model.replace(/[_-]+/g, ' ')}</p>
                  <button
                    onClick={() => { setBookingProviderId(provider.id); setBookingRequestMode('booking'); setBookingServiceName(s.custom_name || s.service?.name || null); setCurrentPage('booking'); }}
                    className="mt-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-semibold hover:bg-orange-100 transition-colors"
                  >
                    Book Now
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{provider.location} · {provider.service_radius_km} km service radius</span>
                {s.emergency_available && <span className="font-medium text-orange-700">Emergency availability listed</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div className="space-y-5">
          {activityComposer}
          {(profileActionError || profileActionNotice) && <p role={profileActionError ? 'alert' : 'status'} className={`rounded-md p-3 text-xs ${profileActionError ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{profileActionError || profileActionNotice}</p>}
          {activityMedia.length > 0 && <section><h3 className="mb-3 text-sm font-semibold text-slate-900">Photos & videos</h3>{renderActivityMedia(activityMedia)}</section>}
          <div className="grid sm:grid-cols-2 gap-5">
          {portfolio.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-slate-400">No portfolio projects yet</div>
          ) : portfolio.map((proj) => (
            <div key={proj.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="grid grid-cols-3 gap-1 h-32">
                <div className="bg-slate-100 relative">
                  {proj.before_image_url && <ProfileMediaImage source={proj.before_image_url} alt={`${proj.title} before`} className="w-full h-full object-cover" />}
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white rounded text-[10px]">Before</span>
                </div>
                <div className="bg-slate-100 relative">
                  {proj.during_image_url && <ProfileMediaImage source={proj.during_image_url} alt={`${proj.title} during`} className="w-full h-full object-cover" />}
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white rounded text-[10px]">During</span>
                </div>
                <div className="bg-slate-100 relative">
                  {proj.after_image_url && <ProfileMediaImage source={proj.after_image_url} alt={`${proj.title} after`} className="w-full h-full object-cover" />}
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white rounded text-[10px]">After</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 text-sm">{proj.title}</h3>
                  {proj.customer_confirmed && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{proj.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {provider.location}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(proj.completion_date)}</span>
                </div>
                {proj.services_performed && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {proj.services_performed.map((svc, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{svc}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {activeTab === 'cv' && providerCv?.is_published && (
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-3">
            <section className="rounded-xl border border-orange-100 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-orange-700" /><div><h2 className="text-base font-bold text-slate-900">Professional CV</h2><p className="text-[10px] text-slate-500">{providerCv.template} · Published {formatDate(providerCv.updated_at)}</p></div></div>
              <h3 className="mt-4 text-sm font-bold text-slate-800">Professional Summary</h3><p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{providerCv.summary || provider.bio || 'No summary provided.'}</p>
              {providerCv.experiences.length > 0 && <div className="mt-4 border-t border-slate-100 pt-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">Experience</h3><div className="mt-2 space-y-3">{providerCv.experiences.map((item) => <article key={item.id}><p className="text-xs font-semibold text-slate-800">{item.title} · {item.company}</p><p className="text-[10px] text-slate-500">{item.location} · {item.start_date}–{item.current ? 'Present' : item.end_date}</p>{item.description && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{item.description}</p>}</article>)}</div></div>}
              {providerCv.education.length > 0 && <div className="mt-4 border-t border-slate-100 pt-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">Education</h3><div className="mt-2 space-y-2">{providerCv.education.map((item) => <article key={item.id}><p className="text-xs font-semibold text-slate-800">{item.qualification} · {item.institution}</p><p className="text-[10px] text-slate-500">{item.field} · {item.start_year}–{item.end_year}{item.grade ? ` · ${item.grade}` : ''}</p></article>)}</div></div>}
              {providerCv.skills.length > 0 && <div className="mt-4 border-t border-slate-100 pt-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">Skills</h3><div className="mt-2 flex flex-wrap gap-1.5">{providerCv.skills.map((skill) => <span key={skill} className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-medium text-orange-900">{skill}</span>)}</div></div>}
              {providerCv.certifications.length > 0 && <div className="mt-4 border-t border-slate-100 pt-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">Certifications</h3><div className="mt-2 space-y-2">{providerCv.certifications.map((item) => <article key={item.id} className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-600" /><div><p className="text-xs font-semibold text-slate-800">{item.name}</p><p className="text-[10px] text-slate-500">{item.issuer} · {item.status || 'Self-reported'}{item.expires_on ? ` · Expires ${formatDate(item.expires_on)}` : ''}</p></div></article>)}</div></div>}
              {providerCv.licenses.length > 0 && <div className="mt-4 border-t border-slate-100 pt-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">Licenses</h3>{providerCv.licenses.map((item) => <p key={item.id} className="mt-2 text-xs text-slate-700">{item.name} · {item.issuer} · {item.status || 'Self-reported'}</p>)}</div>}
              {providerCv.languages.length > 0 && <div className="mt-4 border-t border-slate-100 pt-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">Languages</h3><p className="mt-2 text-xs text-slate-700">{providerCv.languages.map((item) => `${item.name} (${item.proficiency})`).join(' · ')}</p></div>}
            </section>
            <section className="rounded-xl border border-orange-100 bg-white p-4"><h2 className="text-sm font-bold text-slate-900">Portfolio &amp; verified work</h2><p className="mt-1 text-xs text-slate-600">{portfolio.length} project{portfolio.length === 1 ? '' : 's'} · {portfolio.filter((project) => project.customer_confirmed).length} customer-confirmed</p><button onClick={() => setActiveTab('portfolio')} className="mt-3 rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white">View portfolio</button></section>
          </div>
          <aside className="rounded-xl border border-orange-100 bg-white p-4"><h2 className="text-sm font-bold text-slate-900">CV evidence note</h2><p className="mt-2 text-xs leading-relaxed text-slate-600">A published CV shows provider-supplied work history and credentials. HomiCare verification badges are displayed separately and only reflect approved checks.</p><div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><p><strong>Template:</strong> {providerCv.template}</p><p className="mt-1"><strong>Last updated:</strong> {formatDate(providerCv.updated_at)}</p></div></aside>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No reviews yet</div>
          ) : (
            <>
              {/* Rating summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-slate-900">{provider.rating}</p>
                    <div className="flex items-center gap-0.5 mt-1 justify-center">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className={`w-4 h-4 ${i <= Math.round(provider.rating) ? 'fill-orange-400 text-orange-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{provider.review_count} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {reviewAverages.map((r) => (
                      <div key={r.label} className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500 w-24 text-xs">{r.label}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(r.value / 5) * 100}%` }} />
                        </div>
                        <span className="text-slate-700 font-medium text-xs w-8">{r.value.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500">Category averages use the {reviews.length} most recent reviews shown for this provider.</p>

              {/* Individual reviews */}
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-sm font-semibold">
                        {rev.customer_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{rev.customer_name}</p>
                        <p className="text-xs text-slate-400">{timeAgo(rev.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rev.overall_rating) ? 'fill-orange-400 text-orange-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{rev.comment}</p>
                  {rev.would_hire_again && (
                    <div className="flex items-center gap-1 mt-3 text-xs text-emerald-600">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      Would hire again
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'availability' && (
        <section className="max-w-3xl rounded-md border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-950">Weekly availability</h2><p className="mt-1 text-sm text-slate-500">Hours published by this provider. Booking requests are checked against this schedule.</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${provider.availability_status === 'available' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{getAvailabilityLabel(provider.availability_status)}</span></div>
          <div className="mt-5 divide-y divide-slate-100">{availability.length === 0 ? <p className="py-5 text-sm text-slate-500">No weekly hours have been published yet. Contact the provider to confirm a time.</p> : weekdayNames.map((day, index) => { const hours = availability.find((item) => item.day_of_week === index); return <div key={day} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="font-medium text-slate-800">{day}</span><span className={hours?.is_available ? 'text-emerald-800' : 'text-slate-400'}>{hours?.is_available ? `${hours.start_time?.slice(0, 5)}–${hours.end_time?.slice(0, 5)}${hours.emergency_only ? ' · Emergency only' : ''}` : 'Closed'}</span></div>; })}</div>
          <p className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />Your exact service address is not shown here. Share a service location only when arranging a booking.</p>
        </section>
      )}

      {activeTab === 'trust' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-slate-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-orange-600" />HomiCare Trust Profile</h3><p className="text-xs text-slate-500">Verification is reviewed by HomiCare; uploads do not self-verify your account.</p></div>
            <div className="grid sm:grid-cols-2 gap-3">
              {trustItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm text-slate-600">{item.label}</span>
                  {item.verified ? (
                    <span className="flex items-center gap-1 text-orange-700 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Verified
                    </span>
                  ) : (
                    <span className="text-slate-400 text-sm">Not verified</span>
                  )}
                </div>
              ))}
            </div>
            {isOwner && <>
              <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
                {providerVerificationOptions.map((option) => {
                  const submission = verificationSubmissions.find((item) => item.verification_type === option.value);
                  const verified = verificationFlags[option.value];
                  const status = verified ? 'Verified' : submission?.status === 'pending' ? 'In review' : submission?.status === 'rejected' ? 'Needs resubmission' : submission?.status === 'approved' ? 'Approved' : 'Not submitted';
                  const statusClass = verified || submission?.status === 'approved' ? 'text-emerald-700' : submission?.status === 'pending' ? 'text-orange-700' : submission?.status === 'rejected' ? 'text-red-700' : 'text-slate-500';
                  return <div key={option.value} className="flex items-start gap-3 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{option.label}</p>{submission?.review_notes && <p className="mt-1 text-xs text-red-700">Reviewer note: {submission.review_notes}</p>}</div><span className={`text-xs font-semibold ${statusClass}`}>{status}</span></div>;
                })}
              </div>
              <form onSubmit={submitVerificationEvidence} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <label className="block text-xs font-semibold text-slate-700">Evidence type<select value={verificationType} onChange={(event) => setVerificationType(event.target.value as typeof verificationType)} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20">{providerVerificationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <p className="text-xs text-slate-500">Provide: {providerVerificationOptions.find((option) => option.value === verificationType)?.evidence}</p>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-700 hover:border-orange-400"><span className="min-w-0 flex-1 truncate">{verificationFile?.name || 'Choose PDF or image (max 10 MB)'}</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setVerificationFile(event.target.files?.[0] || null)} className="sr-only" /></label>
                <textarea value={verificationNotes} onChange={(event) => setVerificationNotes(event.target.value)} maxLength={1000} rows={2} placeholder="Note for the reviewer (optional)" className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                <button type="submit" disabled={submittingVerification || !verificationFile} className="rounded-md bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">{submittingVerification ? 'Submitting...' : 'Submit evidence for review'}</button>
                {(profileActionError || profileActionNotice) && <p role={profileActionError ? 'alert' : 'status'} className={`rounded-md p-3 text-xs ${profileActionError ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{profileActionError || profileActionNotice}</p>}
              </form>
            </>}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Performance Metrics</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: 'Completed Jobs', value: provider.completed_jobs },
                { label: 'Response Rate', value: `${provider.response_rate}%` },
                { label: 'On-Time Completion', value: `${provider.on_time_rate}%` },
                { label: 'Average Response Time', value: `${provider.response_time_min} min` },
                { label: 'Average Rating', value: `${provider.rating.toFixed(1)} / 5 (${provider.review_count} reviews)` },
                { label: 'Member Since', value: formatDate(provider.member_since) },
              ].map((m, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500">{m.label}</p>
                  <p className="font-bold text-slate-900 mt-0.5">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

// ============================================================
// BOOKING PAGE
// ============================================================
function BookingPage() {
  const { bookingProviderId, bookingServiceName, bookingDraft, bookingRequestMode, setCurrentPage, setActiveBookingCode, setSelectedProviderId } = useApp();
  const isQuoteRequest = bookingRequestMode === 'quote';
  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerAvailability, setProviderAvailability] = useState<ProviderAvailability[]>([]);
  const [availabilityLoadError, setAvailabilityLoadError] = useState('');
  const [form, setForm] = useState(() => ({
    customerName: '', customerPhone: '', email: '', preferredContact: 'Phone call',
    serviceName: bookingServiceName || '', serviceType: '', description: '',
    location: bookingDraft.location, locationInstructions: '', pickupLocation: '', destination: '',
    roomCount: '', itemCount: '', floorInfo: '', vehicleRequired: 'unsure',
    date: bookingDraft.date, time: bookingDraft.time, flexibleSchedule: bookingRequestMode === 'quote', recurring: false, urgency: 'normal',
    paymentMethod: bookingDraft.paymentMethod,
  }));
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingCode, setBookingCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const isMovingService = /moving|logistics|transport/i.test(`${bookingServiceName || ''} ${provider?.professional_title || ''}`);
  const serviceTypes = isMovingService
    ? ['House Moving', 'Office Moving', 'Furniture Transport', 'Delivery', 'Packing & Unpacking', 'Storage', 'Other']
    : ['Repair or installation', 'Inspection', 'Maintenance', 'Emergency service', 'Other'];
  const estimatedFrom = provider?.starting_price || 0;
  const scheduledDayNumber = form.date ? new Date(`${form.date}T12:00:00`).getDay() : null;
  const selectedDayAvailability = providerAvailability.find((day) => day.day_of_week === scheduledDayNumber);
  const schedulePublished = providerAvailability.length > 0;
  const requestedTime = form.time.slice(0, 5);
  const requestOutsidePublishedHours = Boolean(
    !isQuoteRequest
    && !form.flexibleSchedule
    && form.date
    && schedulePublished
    && (!selectedDayAvailability?.is_available
      || (selectedDayAvailability.emergency_only && form.urgency !== 'emergency')
      || !requestedTime
      || requestedTime < (selectedDayAvailability.start_time || '').slice(0, 5)
      || requestedTime >= (selectedDayAvailability.end_time || '').slice(0, 5)),
  );

  useEffect(() => {
    if (bookingProviderId) {
      Promise.all([
        supabase.from('public_provider_profiles').select('*').eq('id', bookingProviderId).maybeSingle(),
        supabase.from('provider_availability').select('*').eq('provider_id', bookingProviderId),
      ]).then(([providerResult, availabilityResult]) => {
        setProvider(providerResult.data);
        setProviderAvailability(availabilityResult.data || []);
        if (availabilityResult.error) setAvailabilityLoadError('Weekly hours could not be loaded. The provider will need to confirm your requested time.');
        if (providerResult.error) setError('Provider details could not be loaded. Check your connection and try again.');
      }, () => {
        setError('Provider details could not be loaded. Check your connection and try again.');
      });
    }
  }, [bookingProviderId]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Location is not available in this browser. Enter the service address instead.');
      return;
    }
    setLocationStatus('Requesting your location...');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({ ...current, location: `GPS ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` }));
        setLocationStatus('Device location added. Add a street, landmark, or directions so the provider can find you.');
      },
      () => setLocationStatus('Could not access your location. Enter the service address manually.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!provider) return;
    if (requestOutsidePublishedHours) {
      setError('That date or time falls outside the provider’s published hours. Choose another time or mark your schedule flexible.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setError('Sign in to send a service request. No booking was saved and no payment was taken.');
        return;
      }

      const details = [
        form.serviceType && `Service type: ${form.serviceType}`,
        form.locationInstructions && `Location instructions: ${form.locationInstructions}`,
        isMovingService && form.pickupLocation && `Pickup: ${form.pickupLocation}`,
        isMovingService && form.destination && `Destination: ${form.destination}`,
        isMovingService && form.roomCount && `Rooms: ${form.roomCount}`,
        isMovingService && form.itemCount && `Items: ${form.itemCount}`,
        isMovingService && form.floorInfo && `Floor/building: ${form.floorInfo}`,
        isMovingService && `Vehicle required: ${form.vehicleRequired}`,
        form.email && `Email: ${form.email}`,
        `Preferred contact: ${form.preferredContact}`,
        `Flexible schedule: ${form.flexibleSchedule ? 'yes' : 'no'}`,
        `Recurring service: ${form.recurring ? 'yes' : 'no'}`,
      ].filter(Boolean).join('\n');
      const description = [form.description.trim(), details].filter(Boolean).join('\n\n');
      const bookingPayload = {
        provider_id: provider.id,
        ...(isQuoteRequest ? { request_type: 'quote' as const } : {}),
        customer_id: authData.user.id,
        customer_name: form.customerName.trim(),
        customer_phone: form.customerPhone.trim(),
        service_name: form.serviceName.trim(),
        service_category: provider.professional_title,
        description: description || null,
        location: form.location.trim(),
        scheduled_date: form.flexibleSchedule ? null : form.date || null,
        scheduled_time: form.flexibleSchedule ? null : form.time || null,
        urgency: form.urgency,
        status: 'requested',
        payment_method: form.paymentMethod,
      };
      const data = await backendRequest<{ booking_code: string }>('/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      }, true);
      setBookingCode(data?.booking_code ?? null);
      setActiveBookingCode(data?.booking_code ?? null);
      setSuccess(true);
    } catch (cause) {
      const submissionError = cause as { code?: string; status?: number; message?: string };
      if (/already has an active request at this date and time/i.test(submissionError.message || '')) {
        setError('This provider already has a request at that date and time. Choose another time.');
        return;
      }
      if (isQuoteRequest && /request_type|column .*does not exist|schema cache/i.test(submissionError.message || '')) {
        setError('Quote requests need the latest service-quotes Supabase migration. The request was not saved and no payment was taken.');
        return;
      }
      const isAuthorizationError = submissionError.status === 401
        || submissionError.status === 403
        || submissionError.code === '42501'
        || /row-level security|permission denied|unauthorized/i.test(submissionError.message || '');

      if (isAuthorizationError) {
        setError('HomiCare rejected this request because booking submission requires a signed-in account. Sign-in is not available in this prototype yet, so no booking was saved. No payment has been taken.');
      } else {
        setError('Your request was not sent because the booking service could not save it. Check your connection or contact HomiCare support. No payment has been taken.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-lg border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-8 w-8 text-emerald-700" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{isQuoteRequest ? 'Quote request sent' : 'Request submitted'}</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">Your request is with {provider?.full_name}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{isQuoteRequest ? 'The provider can send an itemized quote for your review. This is not a confirmed booking, and no payment has been taken.' : 'This is a request, not a confirmed booking. The provider must respond before the schedule or final price is confirmed. No payment has been taken.'}</p>
          {bookingCode && <p className="mt-4 font-mono text-sm text-slate-500">Reference: {bookingCode}</p>}
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={() => setCurrentPage('tracking')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-800 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-900">
              <MapPin className="h-4 w-4" /> Track booking
            </button>
            <button onClick={() => { setSelectedProviderId(provider?.id || null); setCurrentPage('booking-communication'); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <MessageSquare className="h-4 w-4" /> Message provider
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!provider) return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-sm text-slate-500">{error || (bookingProviderId ? 'Loading provider details...' : 'Choose a provider before starting a booking request.')}</p>
      <button onClick={() => setCurrentPage('search')} className="mt-4 rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white">Find a provider</button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-9">
      <button onClick={() => setCurrentPage('provider')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ChevronLeft className="h-4 w-4" /> Back to profile
      </button>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-semibold text-orange-700">{isQuoteRequest ? 'QUOTE REQUEST' : 'SERVICE REQUEST'}</p><h1 className="mt-1 text-3xl font-bold text-slate-950">{isQuoteRequest ? `Request a quote from ${provider.full_name}` : `Book ${provider.full_name}`}</h1></div>
        <p className="text-sm text-slate-500">{isQuoteRequest ? 'Describe the work and the provider will send an itemized quote.' : 'Request a quote; confirm details before any payment.'}</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {provider.avatar_url ? <ProfileMediaImage source={provider.avatar_url} alt={`${provider.full_name} profile`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl font-semibold text-slate-500">{provider.full_name.slice(0, 1)}</div>}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-slate-950">{provider.full_name}</h2>
                <p className="text-sm text-slate-600">{provider.professional_title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />{provider.rating.toFixed(1)} ({provider.review_count} reviews)</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{provider.location}</span>
                </p>
              </div>
              <span className={`hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${getAvailabilityColor(provider.availability_status)}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />{getAvailabilityLabel(provider.availability_status)}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {[
                { label: 'Identity', verified: provider.identity_verified },
                { label: 'Skills', verified: provider.skills_verified },
                { label: 'Credentials', verified: provider.certification_verified },
              ].map((item) => (
                <span key={item.label} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs ${item.verified ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  <BadgeCheck className="h-3.5 w-3.5" />{item.label} {item.verified ? 'verified' : 'not verified'}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Your information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Your name <span className="text-red-600">*</span>
                <input required autoComplete="name" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20" placeholder="Jane Atim" />
              </label>
              <label className="text-sm font-medium text-slate-700">Phone number <span className="text-red-600">*</span>
                <input required type="tel" autoComplete="tel" value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20" placeholder="+256 700 123 456" />
              </label>
              <label className="text-sm font-medium text-slate-700">Email address
                <input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20" placeholder="jane@example.com" />
              </label>
              <label className="text-sm font-medium text-slate-700">Preferred contact method
                <select value={form.preferredContact} onChange={(event) => setForm({ ...form, preferredContact: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20">
                  {['Phone call', 'SMS', 'WhatsApp', 'Email'].map((method) => <option key={method}>{method}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Service details</h2>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Service needed <span className="text-red-600">*</span>
                  <input required value={form.serviceName} onChange={(event) => setForm({ ...form, serviceName: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20" placeholder="e.g. House moving" />
                </label>
                <label className="text-sm font-medium text-slate-700">Service type <span className="text-red-600">*</span>
                  <select required value={form.serviceType} onChange={(event) => setForm({ ...form, serviceType: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20">
                    <option value="">Choose a service type</option>{serviceTypes.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">Describe the request <span className="text-red-600">*</span>
                <textarea required rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20" placeholder="What needs to be done? Include relevant details and access requirements." />
              </label>
              <label className="block text-sm font-medium text-slate-700">Photos or documents
                <input type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={(event) => setAttachments(Array.from(event.target.files ?? []))} className="mt-1.5 block w-full rounded-lg border border-slate-300 text-sm file:mr-3 file:border-0 file:bg-slate-100 file:px-3 file:py-2.5 file:font-medium file:text-slate-700" />
                <span className="mt-1 block text-xs font-normal text-slate-500">Selected files stay on this device. Secure attachment upload is not configured yet.</span>
                {attachments.length > 0 && <span className="mt-2 block text-xs text-slate-600">{attachments.map((file) => file.name).join(', ')}</span>}
              </label>
            </div>

            {isMovingService && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <h3 className="mb-3 font-medium text-slate-900">Moving details</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">Pickup location <span className="text-red-600">*</span><input required value={form.pickupLocation} onChange={(event) => setForm({ ...form, pickupLocation: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
                  <label className="text-sm font-medium text-slate-700">Destination <span className="text-red-600">*</span><input required value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
                  <label className="text-sm font-medium text-slate-700">Number of rooms<input type="number" min="0" value={form.roomCount} onChange={(event) => setForm({ ...form, roomCount: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
                  <label className="text-sm font-medium text-slate-700">Approximate items<input type="number" min="0" value={form.itemCount} onChange={(event) => setForm({ ...form, itemCount: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
                  <label className="text-sm font-medium text-slate-700">Floor / building access<input value={form.floorInfo} onChange={(event) => setForm({ ...form, floorInfo: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" placeholder="Floor, lift, stairs, gate" /></label>
                  <label className="text-sm font-medium text-slate-700">Moving vehicle
                    <select value={form.vehicleRequired} onChange={(event) => setForm({ ...form, vehicleRequired: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"><option value="unsure">Not sure yet</option><option value="yes">Required</option><option value="no">Not required</option></select>
                  </label>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-950"><MapPin className="h-5 w-5 text-teal-800" />Service location</h2>
            <label className="block text-sm font-medium text-slate-700">Service address <span className="text-red-600">*</span>
              <input required autoComplete="street-address" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20" placeholder="Area, street, or nearby landmark" />
            </label>
            <button type="button" onClick={useCurrentLocation} className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><MapPinned className="h-4 w-4" />Use current location</button>
            {locationStatus && <p role="status" className="mt-2 text-xs text-slate-600">{locationStatus}</p>}
            <label className="mt-4 block text-sm font-medium text-slate-700">Additional directions
              <textarea rows={2} value={form.locationInstructions} onChange={(event) => setForm({ ...form, locationInstructions: event.target.value })} className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 font-normal" placeholder="Building, gate, or safe access instructions" />
            </label>
            <p className="mt-2 text-xs text-amber-800">Your location is included in the booking request. Share only details needed to arrange this service.</p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-950"><Calendar className="h-5 w-5 text-teal-800" />Schedule and urgency</h2>
            <label className="mb-4 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.flexibleSchedule} onChange={(event) => setForm({ ...form, flexibleSchedule: event.target.checked })} className="h-4 w-4 accent-teal-800" />My date and time are flexible</label>
            {!form.flexibleSchedule && <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Preferred date <span className="text-red-600">*</span><input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
              <label className="text-sm font-medium text-slate-700">Preferred time <span className="text-red-600">*</span><input required type="time" min={selectedDayAvailability?.is_available ? (selectedDayAvailability.start_time || '').slice(0, 5) : undefined} max={selectedDayAvailability?.is_available ? (selectedDayAvailability.end_time || '').slice(0, 5) : undefined} value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
            </div>}
            {availabilityLoadError ? <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs text-amber-900">{availabilityLoadError}</p> : schedulePublished && form.date && !form.flexibleSchedule ? <p role={requestOutsidePublishedHours ? 'alert' : 'status'} className={`mt-3 rounded-md p-3 text-xs ${requestOutsidePublishedHours ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{requestOutsidePublishedHours ? 'This time is outside the provider’s published hours.' : selectedDayAvailability?.emergency_only ? `Emergency-only hours: ${selectedDayAvailability.start_time?.slice(0, 5)}–${selectedDayAvailability.end_time?.slice(0, 5)}. Select Emergency urgency to continue.` : `Provider hours: ${selectedDayAvailability?.start_time?.slice(0, 5)}–${selectedDayAvailability?.end_time?.slice(0, 5)}.`}</p> : !isQuoteRequest && !schedulePublished && <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs text-amber-900">This provider has not published weekly hours yet. Your requested time will need provider confirmation.</p>}
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.recurring} onChange={(event) => setForm({ ...form, recurring: event.target.checked })} className="h-4 w-4 accent-teal-800" />This is a recurring service request</label>
            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-slate-700">Urgency</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[{ id: 'normal', label: 'Normal' }, { id: 'high', label: 'High' }, { id: 'emergency', label: 'Emergency' }].map((option) => (
                  <button key={option.id} type="button" aria-pressed={form.urgency === option.id} onClick={() => setForm({ ...form, urgency: option.id })} className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${form.urgency === option.id ? getUrgencyColor(option.id) : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>{option.label}</button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Emergency availability depends on the provider. For immediate danger, contact local emergency services.</p>
            </fieldset>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="mb-2 text-lg font-semibold text-slate-950">Payment preference</h2>
            <p className="mb-4 text-sm text-slate-500">Choose a preferred method. You will not be charged by submitting this request.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {['MTN Mobile Money', 'Airtel Money', 'Bank Transfer', 'Card', 'HomiCare Wallet', 'Cash'].map((method) => (
                <button key={method} type="button" aria-pressed={form.paymentMethod === method} onClick={() => setForm({ ...form, paymentMethod: method })} className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${form.paymentMethod === method ? 'border-teal-800 bg-teal-50 text-teal-900' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{method}</button>
              ))}
            </div>
          </section>

          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-teal-800 px-5 py-3.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? (isQuoteRequest ? 'Sending quote request...' : 'Sending request...') : (isQuoteRequest ? 'Send quote request' : 'Send booking request')}
          </button>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-950">Request summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3"><span className="text-slate-500">Provider</span><span className="text-right font-medium text-slate-800">{provider.full_name}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Service</span><span className="text-right font-medium text-slate-800">{form.serviceName || 'Not selected'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">When</span><span className="text-right font-medium text-slate-800">{form.flexibleSchedule ? 'Flexible' : form.date ? `${form.date}${form.time ? ` · ${form.time}` : ''}` : 'Choose a date'}</span></div>
            </div>
            <div className="my-4 border-t border-slate-100" />
            <h3 className="text-sm font-semibold text-slate-800">Indicative estimate</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><span className="text-slate-500">Provider starting price</span><span className="font-medium text-slate-900">{estimatedFrom > 0 ? `From ${formatUGX(estimatedFrom)}` : 'Quote required'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">HomiCare fee</span><span className="text-right text-slate-600">Shown before payment</span></div>
              <div className="flex justify-between gap-3 border-t border-slate-100 pt-2 font-semibold"><span>Estimated total</span><span className="text-right">{estimatedFrom > 0 ? `From ${formatUGX(estimatedFrom)} + confirmed fee` : 'Confirmed after quote'}</span></div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">This is not a fixed quote. The provider confirms scope and price before you accept. Submitting the request does not initiate payment.</p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 font-semibold text-slate-950"><ShieldCheck className="h-5 w-5 text-teal-800" />Trust and booking</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 text-teal-800" />Verification status is shown above, evidence by evidence.</li>
              <li className="flex items-start gap-2"><MessageSquare className="mt-0.5 h-4 w-4 text-teal-800" />The provider reviews your request before confirming.</li>
              <li className="flex items-start gap-2"><Wallet className="mt-0.5 h-4 w-4 text-teal-800" />No payment is taken with this request.</li>
              <li className="flex items-start gap-2"><Star className="mt-0.5 h-4 w-4 text-teal-800" />Reviews shown are the provider's recorded customer feedback.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

// ============================================================
// CUSTOMER DASHBOARD
// ============================================================
function CustomerDashboard() {
  const { setCurrentPage, setActiveBookingCode } = useApp();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<HouseholdProperty[]>([]);
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.full_name;
      if (typeof name === 'string' && name.trim()) setCustomerName(name.trim());
    });
    Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('household_properties').select('*'),
      supabase.from('maintenance_reminders').select('*, property:household_properties(*)').order('next_due_date', { ascending: true }),
    ]).then(([bRes, pRes, rRes]) => {
      setBookings(bRes.data || []);
      setProperties(pRes.data || []);
      setReminders(rRes.data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="relative isolate mb-6 overflow-hidden rounded-xl border border-orange-200 bg-orange-50 px-5 py-6 sm:px-7 sm:py-8">
        <img src={householdSupportImage} alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-orange-50/95 via-orange-50/90 to-orange-50/35" />
        <h1 className="text-2xl font-bold text-slate-900">Welcome back{customerName ? `, ${customerName.split(' ')[0]}` : ''}</h1>
        <p className="mt-1 text-sm text-slate-700">Here's what's happening with your home</p>
        <button onClick={() => setCurrentPage('search')} className="mt-4 rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700">Find a service</button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Calendar', page: 'calendar' as const, icon: Calendar },
          { label: 'Home care plans', page: 'subscriptions' as const, icon: HeartHandshake },
          { label: 'Emergency help', page: 'emergency' as const, icon: AlertCircle },
        ].map((item) => (
          <button key={item.page} onClick={() => setCurrentPage(item.page)} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-violet-100 bg-white px-2 py-3 text-center text-xs font-semibold text-slate-700 shadow-sm hover:border-violet-300 hover:bg-violet-50">
            <item.icon className="h-5 w-5 text-violet-800" />{item.label}
          </button>
        ))}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Bookings', value: bookings.filter(b => !['completed', 'cancelled'].includes(b.status)).length, icon: Calendar, color: 'blue' },
          { label: 'Completed Services', value: bookings.filter(b => b.status === 'completed').length, icon: CheckCircle2, color: 'emerald' },
          { label: 'My Properties', value: properties.length, icon: Home, color: 'orange' },
          { label: 'Maintenance Due', value: reminders.filter(r => r.status === 'overdue').length, icon: AlertCircle, color: 'red' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent bookings */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Recent Bookings</h2>
              <button onClick={() => setCurrentPage('search')} className="text-sm text-blue-600 font-medium">Find Service</button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />)}
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No bookings yet</div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <button key={b.id} onClick={() => { setActiveBookingCode(b.booking_code); setCurrentPage('tracking'); }} className="flex w-full items-center gap-3 p-3 bg-slate-50 rounded-xl text-left hover:bg-violet-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <Wrench className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{b.service_name}</p>
                      <p className="text-xs text-slate-500">{b.location} · {b.scheduled_date || 'Flexible'}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getBookingStatusColor(b.status)}`}>
                      {getBookingStatusLabel(b.status)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Maintenance reminders */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Maintenance Reminders</h2>
            {reminders.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">All up to date</div>
            ) : (
              <div className="space-y-3">
                {reminders.map((r) => (
                  <div key={r.id} className={`p-3 rounded-xl border ${
                    r.status === 'overdue' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {r.status === 'overdue' ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : (
                        <Bell className="w-4 h-4 text-slate-400" />
                      )}
                      <p className="font-medium text-slate-900 text-sm">{r.asset_name}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{r.service_category} · Due {formatDate(r.next_due_date)}</p>
                    {r.status === 'overdue' && (
                      <button onClick={() => setCurrentPage('search')} className="mt-2 text-xs text-blue-600 font-medium">
                        Schedule Now →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* My Properties */}
      <div className="mt-6">
        <h2 className="font-semibold text-slate-900 mb-4">My Properties</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((prop) => (
            <div key={prop.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Home className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{prop.property_name}</h3>
                  <p className="text-xs text-slate-400 capitalize">{prop.property_type}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div>{prop.bedrooms} bedrooms</div>
                <div>{prop.bathrooms} bathrooms</div>
                {prop.has_kitchen && <div>Kitchen</div>}
                {prop.has_compound && <div>Compound</div>}
                {prop.has_garage && <div>Garage</div>}
              </div>
              {prop.assets.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-50">
                  {prop.assets.map((a, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{a}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROVIDER DASHBOARD
// ============================================================
function ProviderDashboard() {
  const { setCurrentPage, setSelectedProviderId, setActiveBookingCode } = useApp();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerLoadError, setProviderLoadError] = useState('');
  const [listedServiceCount, setListedServiceCount] = useState(0);
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [quotes, setQuotes] = useState<BookingQuote[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteError, setQuoteError] = useState('');
  const [quoteOpenBookingId, setQuoteOpenBookingId] = useState<string | null>(null);
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteDraft, setQuoteDraft] = useState({ labor: '', materials: '0', transport: '0', duration: '', warranty: '', message: '' });
  const [requestActionId, setRequestActionId] = useState<string | null>(null);
  const [requestActionError, setRequestActionError] = useState('');
  const [availability, setAvailability] = useState<ProviderAvailability[]>([]);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityNotice, setAvailabilityNotice] = useState('');
  useEffect(() => {
    const loadDashboard = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setProviderLoadError(authError?.message || 'Sign in to load your provider account.');
        setLoading(false);
        return;
      }

      const { data, error: providerError } = await supabase.from('providers')
        .select('*')
        .eq('user_id', authData.user.id)
        .maybeSingle();
      if (providerError) setProviderLoadError(`Your provider profile could not be loaded: ${providerError.message}`);
      setProvider(data);
      if (!data) {
        setLoading(false);
        return;
      }

      const [bookingResult, transactionResult, quoteResult, availabilityResult, serviceResult, portfolioResult] = await Promise.all([
        supabase.from('bookings').select('*').eq('provider_id', data.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('wallet_transactions').select('*').eq('provider_id', data.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('booking_quotes').select('*').eq('provider_id', data.id).order('updated_at', { ascending: false }),
        supabase.from('provider_availability').select('*').eq('provider_id', data.id),
        supabase.from('provider_services').select('id', { count: 'exact', head: true }).eq('provider_id', data.id),
        supabase.from('portfolio_projects').select('id', { count: 'exact', head: true }).eq('provider_id', data.id),
      ]);
      setBookings(bookingResult.data || []);
      setTransactions(transactionResult.data || []);
      setQuotes(quoteResult.data || []);
      setListedServiceCount(serviceResult.count || 0);
      setPortfolioCount(portfolioResult.count || 0);
      if (quoteResult.error) setQuoteError('Quote tools need the latest service-quotes Supabase migration.');
      if (availabilityResult.error) setAvailabilityError('Apply the provider-availability migration to publish weekly hours.');
      const savedAvailability = availabilityResult.data || [];
      setAvailability(weekdayNames.map((_, day) => savedAvailability.find((row) => row.day_of_week === day) || {
        provider_id: data.id,
        day_of_week: day,
        is_available: false,
        start_time: '08:00:00',
        end_time: '18:00:00',
        emergency_only: false,
      }));
      setLoading(false);
    };
    loadDashboard();
  }, []);

  const updateAvailabilityDay = (day: number, changes: Partial<ProviderAvailability>) => {
    setAvailability((current) => current.map((row) => row.day_of_week === day ? { ...row, ...changes } : row));
  };

  const saveAvailability = async () => {
    if (!provider) return;
    if (!availability.some((day) => day.is_available)) {
      setAvailabilityError('Enable at least one day before publishing your schedule.');
      setAvailabilityNotice('');
      return;
    }
    setAvailabilitySaving(true);
    setAvailabilityError('');
    setAvailabilityNotice('');
    const rows = availability.map((day) => ({
      provider_id: provider.id,
      day_of_week: day.day_of_week,
      is_available: day.is_available,
      start_time: day.is_available ? day.start_time : null,
      end_time: day.is_available ? day.end_time : null,
      emergency_only: day.is_available && day.emergency_only,
    }));
    const { error: saveError } = await supabase.from('provider_availability').upsert(rows, { onConflict: 'provider_id,day_of_week' });
    setAvailabilitySaving(false);
    if (saveError) setAvailabilityError(saveError.message);
    else setAvailabilityNotice('Weekly availability saved. New booking requests are checked against these hours.');
  };

  const submitProviderQuote = async (event: FormEvent<HTMLFormElement>, booking: Booking) => {
    event.preventDefault();
    const laborAmount = Number(quoteDraft.labor);
    const materialsAmount = Number(quoteDraft.materials || 0);
    const transportAmount = Number(quoteDraft.transport || 0);
    if (!Number.isInteger(laborAmount) || laborAmount < 0 || materialsAmount < 0 || transportAmount < 0 || laborAmount + materialsAmount + transportAmount <= 0) {
      setQuoteError('Enter valid UGX amounts with a total above zero.');
      return;
    }
    setQuoteSubmitting(true);
    setQuoteError('');
    const { error: submitError } = await supabase.rpc('submit_booking_quote', {
      p_booking_id: booking.id,
      p_labor_amount: laborAmount,
      p_materials_amount: materialsAmount,
      p_transport_amount: transportAmount,
      p_estimated_duration: quoteDraft.duration,
      p_warranty: quoteDraft.warranty,
      p_message: quoteDraft.message,
    });
    setQuoteSubmitting(false);
    if (submitError) {
      setQuoteError(submitError.message);
      return;
    }
    const { data: savedQuote, error: loadError } = await supabase.from('booking_quotes').select('*').eq('booking_id', booking.id).maybeSingle();
    if (loadError || !savedQuote) {
      setQuoteError('Quote was submitted but could not be reloaded. Refresh the dashboard to confirm its status.');
      return;
    }
    setQuotes((current) => [...current.filter((quote) => quote.id !== savedQuote.id), savedQuote]);
    setQuoteDraft({ labor: '', materials: '0', transport: '0', duration: '', warranty: '', message: '' });
    setQuoteOpenBookingId(null);
  };

  const respondToServiceRequest = async (booking: Booking, decision: 'accepted' | 'declined') => {
    setRequestActionId(booking.id);
    setRequestActionError('');
    const { data, error: responseError } = await supabase.rpc('respond_to_service_request', {
      p_booking_id: booking.id,
      p_decision: decision,
    });
    setRequestActionId(null);
    if (responseError) {
      setRequestActionError(responseError.message);
      return;
    }
    const updatedBooking = (Array.isArray(data) ? data[0] : data) as Booking;
    if (updatedBooking?.id) setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, status: updatedBooking.status } : item));
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">Loading dashboard...</div>;
  if (!provider) return <div className="mx-auto max-w-xl px-4 py-16 text-center"><div className="rounded-xl border border-orange-200 bg-white p-7"><ShieldCheck className="mx-auto h-8 w-8 text-orange-600" /><h1 className="mt-3 text-xl font-bold text-slate-950">{providerLoadError ? 'Provider profile could not be loaded' : 'Set up your provider profile'}</h1><p role={providerLoadError ? 'alert' : 'status'} className="mt-2 text-sm text-slate-600">{providerLoadError || 'No provider profile is linked to this account yet. Complete setup to create a profile connected to your signed-in account.'}</p><button onClick={() => setCurrentPage('provider-onboarding')} className="mt-5 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">{providerLoadError ? 'Retry provider setup' : 'Create provider profile'}</button></div></div>;

  const availableBalance = transactions.filter(t => t.status === 'completed' && t.transaction_type === 'earning').reduce((s, t) => s + t.amount, 0)
    - transactions.filter(t => t.status === 'completed' && t.transaction_type === 'withdrawal').reduce((s, t) => s + t.amount, 0);
  const pendingBalance = transactions.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0);
  const todaysJobs = bookings.filter(b => b.scheduled_date === new Date().toISOString().split('T')[0]).length;
  const pendingRequests = bookings.filter(b => b.status === 'requested').length;
  const completionChecks = [
    { label: 'Basic information', done: Boolean(provider.full_name && provider.professional_title && provider.bio) },
    { label: 'Profile photo', done: Boolean(provider.avatar_url) },
    { label: 'Phone verification', done: provider.phone_verified },
    { label: 'Services', done: listedServiceCount > 0 },
    { label: 'Skills', done: Boolean(provider.skills?.length) },
    { label: 'Service area', done: Boolean(provider.location) },
    { label: 'Weekly hours', done: availability.some((day) => day.is_available) },
    { label: 'Identity verification', done: provider.identity_verified },
    { label: 'Portfolio', done: portfolioCount > 0 },
    { label: 'Certifications', done: provider.certification_verified },
  ];
  const providerCompletion = Math.round((completionChecks.filter((item) => item.done).length / completionChecks.length) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="relative isolate mb-6 flex min-h-32 items-center justify-between overflow-hidden rounded-xl border border-orange-200 bg-orange-50 px-5 py-5 sm:px-7">
        <img src={constructionImage} alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-orange-50/95 via-orange-50/90 to-orange-50/35" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {provider?.full_name?.split(' ')[0]}</h1>
          <p className="text-slate-500 text-sm mt-1">{provider?.professional_title}</p>
        </div>
        <div className="relative flex gap-2">
            <button onClick={() => { setSelectedProviderId(provider.id); setCurrentPage('provider'); }} className="inline-flex items-center gap-2 rounded-full border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-50"><ShieldCheck className="h-4 w-4" />Provider profile &amp; verification</button>
            <button onClick={() => setCurrentPage('documents')} className="inline-flex items-center gap-2 rounded-full border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-50"><FileText className="h-4 w-4" />CV &amp; Portfolio</button>
          <div className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getAvailabilityColor(provider?.availability_status || 'available')}`}>
            {getAvailabilityLabel(provider?.availability_status || 'available')}
          </div>
        </div>
      </div>

      {provider.provider_status !== 'active' && <div className={`mb-5 rounded-md border p-4 ${provider.provider_status === 'suspended' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}><p className="text-sm font-semibold text-slate-900">{provider.provider_status === 'suspended' ? 'Your public listing is suspended' : 'Your profile is under review'}</p><p className="mt-1 text-xs text-slate-700">{provider.provider_status === 'suspended' ? 'Contact HomiCare support to review your listing status.' : 'Your public provider card appears in search and featured providers after HomiCare approval.'}</p></div>}

      <section className="mb-5 rounded-md border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-slate-900">Profile completion</h2><p className="mt-1 text-xs text-slate-500">Verified items require HomiCare review; they cannot be self-approved.</p></div><span className="text-lg font-bold text-orange-700">{providerCompletion}%</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${providerCompletion}%` }} /></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{completionChecks.map((item) => <span key={item.label} className={`inline-flex items-center gap-1.5 text-xs ${item.done ? 'text-emerald-700' : 'text-slate-500'}`}>{item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}{item.label}</span>)}</div>
        {listedServiceCount === 0 && <button onClick={() => setCurrentPage('provider-services')} className="mt-3 text-xs font-semibold text-orange-800">Add a service</button>}
      </section>

      {/* Trust profile bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-slate-700">Trust Profile</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'Identity', v: provider?.identity_verified },
              { label: 'Skills', v: provider?.skills_verified },
              { label: 'Certification', v: provider?.certification_verified },
              { label: 'Portfolio', v: provider?.portfolio_verified },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-1 text-sm">
                {t.v ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300" />}
                <span className={t.v ? 'text-slate-700' : 'text-slate-400'}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Today's Jobs", value: todaysJobs, icon: Calendar, color: 'blue' },
          { label: 'Pending Requests', value: pendingRequests, icon: AlertCircle, color: 'orange' },
          { label: 'Completed Jobs', value: provider?.completed_jobs || 0, icon: CheckCircle2, color: 'emerald' },
          { label: 'Rating', value: provider?.rating || 0, icon: Star, color: 'orange' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5" aria-label="Weekly availability settings">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Weekly availability</h2><p className="mt-1 text-xs text-slate-500">Publish the hours when customers may request scheduled services. Times use your local time.</p></div><button onClick={saveAvailability} disabled={availabilitySaving} className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50">{availabilitySaving ? 'Saving...' : 'Save hours'}</button></div>
        {availabilityError && <p role="alert" className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{availabilityError}</p>}
        {availabilityNotice && <p role="status" className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{availabilityNotice}</p>}
        <div className="divide-y divide-slate-100">{availability.map((day) => <div key={day.day_of_week} className="grid gap-2 py-3 sm:grid-cols-[7rem_6rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
          <span className="text-sm font-medium text-slate-800">{weekdayNames[day.day_of_week]}</span>
          <label className="inline-flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={day.is_available} onChange={(event) => updateAvailabilityDay(day.day_of_week, { is_available: event.target.checked, emergency_only: event.target.checked ? day.emergency_only : false })} className="h-4 w-4 accent-orange-600" />Available</label>
          <label className="text-xs text-slate-500">Start<input type="time" disabled={!day.is_available} value={(day.start_time || '08:00').slice(0, 5)} onChange={(event) => updateAvailabilityDay(day.day_of_week, { start_time: event.target.value })} className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm text-slate-800 disabled:bg-slate-50" /></label>
          <label className="text-xs text-slate-500">End<input type="time" disabled={!day.is_available} value={(day.end_time || '18:00').slice(0, 5)} onChange={(event) => updateAvailabilityDay(day.day_of_week, { end_time: event.target.value })} className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm text-slate-800 disabled:bg-slate-50" /></label>
          <label className="inline-flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" disabled={!day.is_available} checked={day.emergency_only} onChange={(event) => updateAvailabilityDay(day.day_of_week, { emergency_only: event.target.checked })} className="h-4 w-4 accent-orange-600" />Emergency only</label>
        </div>)}</div>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bookings */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Recent Job Requests</h2>
            {quoteError && <p role="alert" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{quoteError}</p>}
            {requestActionError && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{requestActionError}</p>}
            <div className="space-y-3">
              {bookings.map((b) => {
                const quote = quotes.find((item) => item.booking_id === b.id);
                const canSubmitQuote = b.request_type === 'quote' && b.status === 'requested' && (!quote || quote.status === 'revision_requested');
                return <article key={b.id} className="rounded-xl bg-slate-50 p-3">
                  <button onClick={() => { setActiveBookingCode(b.booking_code); setCurrentPage('tracking'); }} className="flex w-full items-center gap-3 text-left">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${b.urgency === 'emergency' ? 'bg-red-100' : 'bg-orange-100'}`}><Wrench className={`h-5 w-5 ${b.urgency === 'emergency' ? 'text-red-600' : 'text-orange-700'}`} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-900">{b.service_name}</span><span className="block text-xs text-slate-500">{b.customer_name} · {b.location}</span>{b.scheduled_date && <span className="mt-0.5 block text-xs text-slate-400">{formatDate(b.scheduled_date)} at {b.scheduled_time}</span>}</span>
                    <span className="text-right"><span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-medium ${getBookingStatusColor(b.status)}`}>{getBookingStatusLabel(b.status)}</span>{quote && <span className="mt-1 block text-xs font-semibold text-slate-700">{formatUGX(quote.total_amount)} · Quote {quote.status.replace('_', ' ')}</span>}</span>
                  </button>
                  {b.request_type === 'quote' && quote?.status === 'sent' && <p className="mt-2 text-xs text-slate-600">Quote sent. Waiting for the customer’s response.</p>}
                  {b.request_type !== 'quote' && b.status === 'requested' && <div className="mt-3 flex justify-end gap-2"><button disabled={requestActionId === b.id} onClick={() => respondToServiceRequest(b, 'declined')} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-50">Decline</button><button disabled={requestActionId === b.id} onClick={() => respondToServiceRequest(b, 'accepted')} className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50">{requestActionId === b.id ? 'Updating...' : 'Accept request'}</button></div>}
                  {canSubmitQuote && <>
                    <button onClick={() => { setQuoteError(''); setQuoteDraft({ labor: '', materials: '0', transport: '0', duration: '', warranty: '', message: '' }); setQuoteOpenBookingId(quoteOpenBookingId === b.id ? null : b.id); }} className="mt-3 rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700">{quote?.status === 'revision_requested' ? 'Revise quote' : 'Send itemized quote'}</button>
                    {quoteOpenBookingId === b.id && <form onSubmit={(event) => submitProviderQuote(event, b)} className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                      <div className="grid grid-cols-3 gap-2">{[
                        { key: 'labor' as const, label: 'Labor (UGX)', required: true },
                        { key: 'materials' as const, label: 'Materials (UGX)', required: false },
                        { key: 'transport' as const, label: 'Transport (UGX)', required: false },
                      ].map((field) => <label key={field.key} className="text-[10px] font-medium text-slate-600">{field.label}<input required={field.required} type="number" min="0" step="1" value={quoteDraft[field.key]} onChange={(event) => setQuoteDraft((current) => ({ ...current, [field.key]: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-xs text-slate-900" /></label>)}</div>
                      <p className="text-xs font-semibold text-slate-800">Total: {formatUGX(Number(quoteDraft.labor || 0) + Number(quoteDraft.materials || 0) + Number(quoteDraft.transport || 0))}</p>
                      <div className="grid grid-cols-2 gap-2"><label className="text-[10px] font-medium text-slate-600">Estimated duration<input value={quoteDraft.duration} onChange={(event) => setQuoteDraft((current) => ({ ...current, duration: event.target.value }))} placeholder="e.g. 2 hours" className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-xs" /></label><label className="text-[10px] font-medium text-slate-600">Warranty<input value={quoteDraft.warranty} onChange={(event) => setQuoteDraft((current) => ({ ...current, warranty: event.target.value }))} placeholder="e.g. 30 days" className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-xs" /></label></div>
                      <label className="block text-[10px] font-medium text-slate-600">Quote details<textarea required maxLength={2000} value={quoteDraft.message} onChange={(event) => setQuoteDraft((current) => ({ ...current, message: event.target.value }))} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-xs" placeholder="Explain what is included and any assumptions." /></label>
                      {quoteError && <p role="alert" className="text-xs text-red-700">{quoteError}</p>}
                      <div className="flex justify-end gap-2"><button type="button" onClick={() => setQuoteOpenBookingId(null)} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Cancel</button><button disabled={quoteSubmitting} className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{quoteSubmitting ? 'Sending...' : 'Send quote'}</button></div>
                    </form>}
                  </>}
                </article>;
              })}
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Earnings
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400">Available Balance</p>
                <p className="text-2xl font-bold">{formatUGXFull(availableBalance)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Pending</p>
                <p className="text-lg font-semibold text-amber-400">{formatUGXFull(pendingBalance)}</p>
              </div>
            </div>
            <button onClick={() => setCurrentPage('wallet')} className="w-full mt-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors">
              View Wallet
            </button>
          </div>

          {/* Quick links */}
          <div className="mt-4 space-y-2">
            {[
              { label: 'Manage Services', icon: Wrench, page: 'provider-services' as const },
              { label: 'Provider Settings', icon: Settings, page: 'profile-edit' as const },
              { label: 'Earnings & Withdrawals', icon: Wallet, page: 'wallet' as const },
              { label: 'Calendar & Availability', icon: Calendar, page: 'provider-calendar' as const },
              { label: 'Messages', icon: MessageSquare, page: 'messages' as const },
              { label: 'Opportunities', icon: Briefcase, page: 'opportunities' as const },
              { label: 'Learn', icon: GraduationCap, page: 'learn' as const },
            ].map((link, i) => (
              <button key={i} onClick={() => setCurrentPage(link.page)} className="flex items-center gap-3 w-full p-3 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left">
                <link.icon className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">{link.label}</span>
                <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProviderServicesPage() {
  const { setCurrentPage } = useApp();
  const [providerId, setProviderId] = useState('');
  const [providerServices, setProviderServices] = useState<ProviderService[]>([]);
  const [catalog, setCatalog] = useState<{ id: string; name: string }[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const savedId = localStorage.getItem('homicare-provider-id');
      const providerResult = authData.user
        ? await supabase.from('providers').select('id').eq('user_id', authData.user.id).maybeSingle()
        : await (savedId
          ? supabase.from('public_provider_profiles').select('id').eq('id', savedId).maybeSingle()
          : supabase.from('public_provider_profiles').select('id').order('rating', { ascending: false }).limit(1).maybeSingle());
      const { data: provider, error: providerError } = providerResult;
      if (providerError || !provider) {
        setError('Create a provider profile before adding services.');
        setLoading(false);
        return;
      }
      setProviderId(provider.id);
      const [servicesResult, catalogResult] = await Promise.all([
        supabase.from('provider_services').select('*, service:services(*)').eq('provider_id', provider.id).order('created_at', { ascending: false }),
        supabase.from('services').select('id, name').order('name'),
      ]);
      setProviderServices(servicesResult.data || []);
      setCatalog(catalogResult.data || []);
      if (servicesResult.error) setError('Could not load provider services. Check the provider services schema and access policy.');
      setLoading(false);
    };
    load();
  }, []);

  const toggleService = async (service: ProviderService) => {
    setError('');
    setNotice('');
    const nextActive = !service.is_active;
    const { error: updateError } = await supabase.from('provider_services').update({ is_active: nextActive }).eq('id', service.id).eq('provider_id', providerId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setProviderServices((items) => items.map((item) => item.id === service.id ? { ...item, is_active: nextActive } : item));
    setNotice(`${service.custom_name || service.service?.name || 'Service'} ${nextActive ? 'listed' : 'paused'}.`);
  };

  const addService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!providerId || !selectedService || Number(price) < 0) return;
    setSaving(true);
    setError('');
    setNotice('');
    const { data, error: insertError } = await supabase.from('provider_services').insert({
      provider_id: providerId,
      service_id: selectedService,
      price_from: Number(price),
      is_active: true,
    }).select('*, service:services(*)').single();
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setProviderServices((items) => [data, ...items]);
    setSelectedService('');
    setPrice('');
    setNotice('Service added to your public listing.');
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <button onClick={() => setCurrentPage('provider-dashboard')} className="mb-4 text-sm font-semibold text-orange-700">← Provider dashboard</button>
      <div className="mb-5"><p className="text-xs font-bold uppercase tracking-wide text-orange-700">Provider workspace</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Manage services</h1><p className="mt-1 text-sm text-slate-600">Control which services appear in your customer profile and set a starting price.</p></div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <form onSubmit={addService} className="mb-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <label className="text-sm font-medium text-slate-700">Service<select required value={selectedService} onChange={(event) => setSelectedService(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5"><option value="">Choose a service</option>{catalog.filter((option) => !providerServices.some((item) => item.service_id === option.id)).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">Starting price (UGX)<input required type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5" /></label>
        <button disabled={saving || !catalog.length} className="rounded-md bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">{saving ? 'Adding...' : 'Add service'}</button>
      </form>
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {loading ? <p className="p-5 text-sm text-slate-500">Loading services...</p> : providerServices.length === 0 ? <p className="p-5 text-sm text-slate-500">No services listed yet. Add a service to appear in customer search.</p> : providerServices.map((service) => <div key={service.id} className="flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-orange-50 text-orange-700"><Wrench className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{service.custom_name || service.service?.name || 'Provider service'}</p><p className="text-xs text-slate-500">From {formatUGXFull(service.price_from)} · {service.pricing_model}</p></div>
          <span className={`text-xs font-semibold ${service.is_active ? 'text-emerald-700' : 'text-slate-500'}`}>{service.is_active ? 'Active' : 'Paused'}</span>
          <button type="button" role="switch" aria-checked={service.is_active} aria-label={`${service.is_active ? 'Pause' : 'Activate'} ${service.custom_name || service.service?.name || 'service'}`} onClick={() => toggleService(service)} className={`relative h-6 w-11 rounded-full transition-colors ${service.is_active ? 'bg-emerald-600' : 'bg-slate-300'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${service.is_active ? 'translate-x-6' : 'translate-x-1'}`} /></button>
        </div>)}
      </div>
      <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setCurrentPage('provider-calendar')} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Availability</button><button onClick={() => setCurrentPage('wallet')} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Earnings</button><button onClick={() => setCurrentPage('profile-edit')} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Provider settings</button></div>
    </section>
  );
}

function HelpCenterPage() {
  const { setCurrentPage } = useApp();
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-5"><p className="text-xs font-bold uppercase tracking-wide text-orange-700">HomiCare</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Help &amp; Support</h1></header>
      <section className="max-w-2xl border-y border-slate-200 bg-white">
        <a href="#help-faq" className="flex items-center gap-3 border-b border-slate-200 p-4 transition-colors hover:bg-orange-50"><HelpCircle className="h-5 w-5 shrink-0 text-orange-600" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">FAQ</span><span className="mt-0.5 block text-xs text-slate-500">Find answers to common questions</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></a>
        <a href="tel:+256705123456" className="flex items-center gap-3 border-b border-slate-200 p-4 transition-colors hover:bg-orange-50"><Smartphone className="h-5 w-5 shrink-0 text-orange-600" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">Contact Us</span><span className="mt-0.5 block text-xs text-slate-500">+256 705 123456</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></a>
        <button onClick={() => setCurrentPage('messages')} className="flex w-full items-center gap-3 border-b border-slate-200 p-4 text-left transition-colors hover:bg-orange-50"><MessageSquare className="h-5 w-5 shrink-0 text-orange-600" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">Live Chat</span><span className="mt-0.5 block text-xs text-slate-500">Chat with our support team</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></button>
        <button onClick={() => setCurrentPage('complaints')} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-orange-50"><MapPin className="h-5 w-5 shrink-0 text-orange-600" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">Report a Problem</span><span className="mt-0.5 block text-xs text-slate-500">Report issues or fraud</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></button>
      </section>
      <button onClick={() => setCurrentPage('messages')} className="mt-4 w-full max-w-2xl rounded-md bg-orange-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-700">Start a Chat</button>
      <section id="help-faq" className="mt-8 max-w-2xl scroll-mt-24">
        <h2 className="mb-2 text-lg font-bold text-slate-950">Frequently Asked Questions</h2>
        <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white px-4">
          <details className="py-4"><summary className="cursor-pointer text-sm font-semibold text-slate-900">How do I book a household service?</summary><p className="mt-2 text-sm leading-relaxed text-slate-600">Browse services, choose a provider, enter the job details and preferred schedule, then submit the request. You can follow updates from My Bookings.</p><button onClick={() => setCurrentPage('search')} className="mt-3 text-sm font-semibold text-orange-700">Find a service</button></details>
          <details className="py-4"><summary className="cursor-pointer text-sm font-semibold text-slate-900">When will I be charged?</summary><p className="mt-2 text-sm leading-relaxed text-slate-600">For confirmed booking prices, payment starts in Flutterwave checkout. Mobile-money approval happens on your operator’s prompt; HomiCare never asks for your PIN. A booking is marked paid only after the gateway verifies it.</p></details>
          <details className="py-4"><summary className="cursor-pointer text-sm font-semibold text-slate-900">What should I do in an emergency?</summary><p className="mt-2 text-sm leading-relaxed text-slate-600">Contact local emergency services first if anyone is in immediate danger. HomiCare guidance is not a replacement for emergency responders.</p><button onClick={() => setCurrentPage('emergency')} className="mt-3 text-sm font-semibold text-orange-700">Open emergency guidance</button></details>
          <details className="py-4"><summary className="cursor-pointer text-sm font-semibold text-slate-900">How can I update my account details?</summary><p className="mt-2 text-sm leading-relaxed text-slate-600">Open your profile to update personal details, privacy, password, and notification preferences.</p><button onClick={() => setCurrentPage('profile')} className="mt-3 text-sm font-semibold text-orange-700">Open profile settings</button></details>
        </div>
      </section>
    </main>
  );
}

// ============================================================
// MESSAGES PAGE
// ============================================================
function MessagesPage() {
  return <MessagingPages view="dashboard" />;
}

// ============================================================
// WALLET PAGE
// ============================================================
function WalletPage() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAction, setWalletAction] = useState<'deposit' | 'withdrawal' | null>(null);
  const [walletError, setWalletError] = useState('');
  const [walletMethod, setWalletMethod] = useState<'mtn_mobile_money' | 'airtel_money' | 'visa'>('mtn_mobile_money');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletPhoneNumber, setWalletPhoneNumber] = useState('');
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletNotice, setWalletNotice] = useState('');

  const refreshWalletTransactions = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { data: providerProfiles } = await supabase.from('providers').select('id').eq('user_id', authData.user.id);
    const providerIds = (providerProfiles || []).map((profile) => profile.id);
    let query = supabase.from('wallet_transactions').select('*');
    query = providerIds.length > 0
      ? query.or(`owner_id.eq.${authData.user.id},provider_id.in.(${providerIds.join(',')})`)
      : query.eq('owner_id', authData.user.id);
    const { data } = await query.order('created_at', { ascending: false }).limit(20);
    setTransactions(data || []);
  };

  const verifyWalletReturn = async (txRef: string, transactionId: string) => {
    setWalletBusy(true);
    const { data, error: verifyError } = await supabase.functions.invoke('flutterwave-verify', {
      body: { payment_kind: 'wallet_topup', tx_ref: txRef, transaction_id: transactionId },
    });
    setWalletBusy(false);
    if (verifyError) {
      setWalletError('Wallet top-up could not be confirmed yet. Check the transaction history again shortly.');
      setWalletAction('deposit');
      return;
    }
    if (data?.status === 'successful') {
      setWalletNotice('Wallet top-up confirmed.');
      await refreshWalletTransactions();
    } else if (data?.status === 'pending') {
      setWalletNotice('Mobile-money approval is still pending. Approve the prompt on your phone.');
      setWalletAction('deposit');
    } else {
      setWalletError(`Wallet top-up ${data?.status || 'could not be confirmed'}. No balance was added.`);
      setWalletAction('deposit');
    }
  };

  const startWalletTopup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(walletAmount);
    if (!Number.isSafeInteger(amount) || amount < 1000 || amount > 5000000) {
      setWalletError('Enter a wallet top-up from UGX 1,000 to UGX 5,000,000.');
      return;
    }
    const normalizedPhone = walletMethod === 'visa' ? null : normalizeUgandaMobileNumber(walletPhoneNumber);
    if (walletMethod !== 'visa' && !normalizedPhone) {
      setWalletError('Enter a valid Uganda mobile-money number, such as +256 7XX XXX XXX.');
      return;
    }
    setWalletBusy(true);
    setWalletError('');
    setWalletNotice('');
    const { data, error: checkoutError } = await supabase.functions.invoke('flutterwave-initialize', {
      body: { payment_kind: 'wallet_topup', amount, payment_method: walletMethod, phone_number: normalizedPhone },
    });
    setWalletBusy(false);
    if (checkoutError || typeof data?.checkout_url !== 'string') {
      let responseError = data?.error;
      if (checkoutError?.context instanceof Response) {
        try {
          const errorBody = await checkoutError.context.clone().json();
          if (typeof errorBody?.error === 'string') responseError = errorBody.error;
        } catch {
          responseError = undefined;
        }
      }
      setWalletError(responseError || checkoutError?.message || 'Secure checkout could not start. Try again.');
      return;
    }
    window.location.assign(data.checkout_url);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_kind') === 'wallet_topup') {
      const txRef = params.get('tx_ref') || '';
      const transactionId = params.get('transaction_id') || '';
      if (txRef && transactionId) void verifyWalletReturn(txRef, transactionId);
      else {
        setWalletNotice('Complete the mobile-money approval prompt. Your wallet will update after confirmation.');
        setWalletAction('deposit');
      }
      window.history.replaceState({}, '', '/wallet');
    }
    const loadWallet = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setWalletError('Sign in to view your wallet activity.');
        setTransactions([]);
        setLoading(false);
        return;
      }

      const { data: providerProfiles } = await supabase.from('providers').select('id').eq('user_id', authData.user.id);
      const providerIds = (providerProfiles || []).map((profile) => profile.id);
      let query = supabase.from('wallet_transactions').select('*');
      query = providerIds.length > 0
        ? query.or(`owner_id.eq.${authData.user.id},provider_id.in.(${providerIds.join(',')})`)
        : query.eq('owner_id', authData.user.id);
      const { data, error: transactionError } = await query.order('created_at', { ascending: false }).limit(20);
      setTransactions(data || []);
      if (transactionError) setWalletError(transactionError.message.includes('owner_id') ? 'Apply the secure wallet migration to view account transactions.' : transactionError.message);
      setLoading(false);
    };
    loadWallet();
  }, []);

  const earnings = transactions.filter(t => t.transaction_type === 'earning' && t.status === 'completed').reduce((s, t) => s + t.amount, 0);
  const deposits = transactions.filter(t => t.transaction_type === 'topup' && t.status === 'completed').reduce((s, t) => s + t.amount, 0);
  const pending = transactions.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0);
  const withdrawn = transactions.filter(t => t.transaction_type === 'withdrawal' && t.status === 'completed').reduce((s, t) => s + t.amount, 0);
  const available = earnings + deposits - withdrawn;

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#fffaf4] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-orange-950">HomiCare Wallet</h1>
      {walletError && <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{walletError}</p>}

      {/* Balance card */}
      <div className="mb-6 rounded-2xl border border-orange-200 bg-gradient-to-br from-white via-[#fff8ee] to-[#ffefd9] p-6 text-orange-950 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-orange-700" />
            <span className="text-sm text-orange-950">Available Balance</span>
          </div>
          <span className="text-xs font-semibold text-orange-800">UGX</span>
        </div>
        <p className="text-4xl font-bold mb-4">{available.toLocaleString()}</p>
        <div className="flex gap-3">
          <div className="flex-1 rounded-lg border border-orange-100 bg-white/80 p-3">
            <p className="text-xs text-slate-600">Pending</p>
            <p className="font-semibold text-orange-700">{pending.toLocaleString()}</p>
          </div>
          <div className="flex-1 rounded-lg border border-orange-100 bg-white/80 p-3">
            <p className="text-xs text-slate-600">Total Earnings</p>
            <p className="font-semibold text-orange-950">{earnings.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setWalletAction('deposit')} className="flex-1 rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700">Top Up</button>
          <button onClick={() => setWalletAction('withdrawal')} className="flex-1 rounded-lg border border-orange-300 bg-white py-2.5 text-sm font-semibold text-orange-800 transition-colors hover:bg-orange-50">Withdraw</button>
        </div>
      </div>

      {walletAction && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#3a2418]/35 p-4" role="presentation" onClick={() => setWalletAction(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="wallet-action-title" className="w-full max-w-sm rounded-xl border border-orange-100 bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-800"><Wallet className="h-5 w-5" /></div>
            <h2 id="wallet-action-title" className="text-lg font-semibold text-slate-950">{walletAction === 'deposit' ? 'Top up wallet' : 'Withdraw funds'}</h2>
            {walletAction === 'deposit' ? <form onSubmit={startWalletTopup} className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">Amount in UGX<input type="number" min={1000} max={5000000} step={1000} required value={walletAmount} onChange={(event) => setWalletAmount(event.target.value)} placeholder="e.g. 50000" className="mt-1.5 w-full rounded-md border border-orange-200 px-3 py-2.5 text-sm font-normal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" /></label>
              <p className="text-[11px] text-slate-500">Minimum UGX 1,000 · Maximum UGX 5,000,000</p>
              <div className="space-y-2">{[
                { id: 'mtn_mobile_money' as const, name: 'MTN Mobile Money', logo: '/payment-logos/mtn-mobile-money.svg' },
                { id: 'airtel_money' as const, name: 'Airtel Money', logo: '/payment-logos/airtel-money.svg' },
                { id: 'visa' as const, name: 'Card payment', logo: '/payment-logos/card-brands.svg' },
              ].map((option) => <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-md border p-2.5 ${walletMethod === option.id ? 'border-orange-500 bg-orange-50' : 'border-orange-100 bg-[#fffaf4]'}`}><img src={option.logo} alt={option.name} className="h-9 w-28 rounded-md object-contain" /><span className="flex-1 text-xs font-semibold text-slate-800">{option.name}</span><input type="radio" name="wallet-payment-method" checked={walletMethod === option.id} onChange={() => setWalletMethod(option.id)} className="accent-orange-600" /></label>)}</div>
              {walletMethod !== 'visa' && <label className="block text-xs font-semibold text-slate-700">Mobile-money number to charge<input type="tel" inputMode="tel" autoComplete="tel" required value={walletPhoneNumber} onChange={(event) => setWalletPhoneNumber(event.target.value)} placeholder="+256 7XX XXX XXX" className="mt-1.5 w-full rounded-md border border-orange-200 px-3 py-2.5 text-sm font-normal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" /><span className="mt-1 block font-normal text-slate-500">We’ll send this number to Flutterwave for the operator approval prompt.</span></label>}
              <div className="rounded-md bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">Continue to secure checkout to approve the payment on your phone. HomiCare never requests your PIN. Card authentication happens with the payment provider.</div>
              {walletNotice && <p role="status" className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">{walletNotice}</p>}
              {walletError && <p role="alert" className="rounded-md bg-red-50 p-3 text-xs text-red-800">{walletError}</p>}
              <button disabled={walletBusy} className="w-full rounded-md bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{walletBusy ? 'Opening payment approval...' : 'Continue to payment approval'}</button>
            </form> : <>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Withdrawals are not enabled yet. They require a verified payout account and server-side disbursement setup.</p>
              <button onClick={() => setWalletAction(null)} className="mt-5 w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white">Close</button>
            </>}
          </section>
        </div>
      )}

      {/* Payment methods */}
      <div className="mb-6 rounded-xl border border-orange-100 bg-white p-5">
        <h2 className="mb-4 font-semibold text-orange-950">Payment Methods</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { name: 'MTN Mobile Money', icon: Smartphone, logo: '/payment-logos/mtn-mobile-money.svg', color: 'bg-white' },
            { name: 'Airtel Money', icon: Smartphone, logo: '/payment-logos/airtel-money.svg', color: 'bg-white' },
            { name: 'Visa card', icon: CreditCard, logo: '/payment-logos/card-brands.svg', color: 'bg-white' },
            { name: 'HomiCare Wallet', icon: Wallet, color: 'bg-emerald-50 text-emerald-700' },
            { name: 'Google Pay', icon: CreditCard, logo: '/payment-logos/google-pay.svg', color: 'bg-white' },
            { name: 'Bank Transfer', icon: Landmark, color: 'bg-white text-slate-400' },
          ].map((m, i) => (
            <div key={i} aria-disabled={['Google Pay', 'Bank Transfer'].includes(m.name)} className={`flex items-center gap-2 rounded-lg border border-orange-100 p-3 ${['Google Pay', 'Bank Transfer'].includes(m.name) ? 'bg-[#fffaf4] opacity-60' : 'bg-[#fffaf4]'}`}>
              <div className={`grid h-9 w-20 shrink-0 place-items-center overflow-hidden rounded-md ${m.color}`}>
                {m.logo ? <img src={m.logo} alt="" className="max-h-8 w-full object-contain" /> : <m.icon className="h-4 w-4" />}
              </div>
              <span className="text-sm font-medium text-slate-700">{m.name}{m.name === 'Google Pay' && <span className="ml-1 block text-[10px] font-normal text-slate-500">Unavailable in Uganda</span>}{m.name === 'Bank Transfer' && <span className="ml-1 block text-[10px] font-normal text-slate-500">Account details not configured</span>}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-xl border border-orange-100 bg-white p-5">
        <h2 className="mb-4 font-semibold text-orange-950">Recent Transactions</h2>
        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-orange-50" />)}</div>
        ) : (
          <div className="space-y-2">
            {transactions.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No wallet transactions for this account yet.</p> : transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-[#fffaf4]">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  ['earning', 'topup'].includes(t.transaction_type) ? 'bg-orange-50' : t.transaction_type === 'withdrawal' ? 'bg-orange-50' : 'bg-[#fffaf4]'
                }`}>
                  {['earning', 'topup'].includes(t.transaction_type) ? <ArrowUpRight className="w-5 h-5 text-orange-700" /> : <ArrowRight className="w-5 h-5 text-orange-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{t.description}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(t.created_at)} · {t.payment_method}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold text-sm ${['earning', 'topup'].includes(t.transaction_type) ? 'text-orange-700' : 'text-slate-700'}`}>
                    {['earning', 'topup'].includes(t.transaction_type) ? '+' : '-'}{formatUGXFull(t.amount)}
                  </p>
                  <span className={`text-xs ${t.status === 'completed' ? 'text-orange-700' : 'text-amber-700'}`}>
                    {t.status === 'completed' ? 'Completed' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN COMMAND CENTER
// ============================================================
function AdminPage() {
  const { setCurrentPage, setSelectedProviderId } = useApp();
  const [activeSection, setActiveSection] = useState<'overview' | 'providers' | 'bookings' | 'users' | 'finance' | 'analytics' | 'settings'>('overview');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [reviewQueue, setReviewQueue] = useState<Provider[]>([]);
  const [reviewQueueError, setReviewQueueError] = useState('');
  const [reviewActionId, setReviewActionId] = useState<string | null>(null);
  const [verificationSubmissions, setVerificationSubmissions] = useState<ProviderVerificationSubmission[]>([]);
  const [verificationReviewError, setVerificationReviewError] = useState('');
  const [verificationActionId, setVerificationActionId] = useState<string | null>(null);
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [adminPreferences, setAdminPreferences] = useState(() => ({
    darkMode: localStorage.getItem('homicare-admin-dark-mode') === 'true',
    language: localStorage.getItem('homicare-admin-language') || 'English',
    currency: localStorage.getItem('homicare-admin-currency') || 'UGX',
    timeZone: localStorage.getItem('homicare-admin-timezone') || 'Africa/Kampala',
  }));
  const [settingsNotice, setSettingsNotice] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('public_provider_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('admin_provider_review_queue').select('*').order('created_at', { ascending: false }),
      supabase.from('provider_verification_submissions').select('*').eq('status', 'pending').order('submitted_at', { ascending: false }),
    ]).then(([pRes, bRes, tRes, queueRes, verificationRes]) => {
      setProviders(pRes.data || []);
      setBookings(bRes.data || []);
      setTransactions(tRes.data || []);
      setReviewQueue(queueRes.data || []);
      setVerificationSubmissions(verificationRes.data || []);
      if (queueRes.error) setReviewQueueError('The provider approval queue needs the public-profiles migration and an authenticated admin role.');
      if (verificationRes.error) setVerificationReviewError('Verification evidence review needs the provider-verification migration and an authenticated admin role.');
    });
  }, []);

  const setReviewStatus = async (providerId: string, status: 'active' | 'suspended') => {
    setReviewActionId(providerId);
    setReviewQueueError('');
    const { error: actionError } = await supabase.rpc('admin_set_provider_status', { p_provider_id: providerId, p_status: status });
    setReviewActionId(null);
    if (actionError) {
      setReviewQueueError(actionError.message.includes('Admin authorization required') ? 'Only a server-authorized HomiCare admin can approve provider profiles.' : actionError.message);
      return;
    }
    setReviewQueue((current) => current.map((provider) => provider.id === providerId ? { ...provider, provider_status: status } : provider));
  };

  const reviewVerificationSubmission = async (submissionId: string, status: 'approved' | 'rejected') => {
    setVerificationActionId(submissionId);
    setVerificationReviewError('');
    const { error: actionError } = await supabase.rpc('admin_review_provider_verification', {
      p_submission_id: submissionId,
      p_status: status,
      p_review_notes: status === 'rejected' ? 'Please review the evidence requirements and resubmit a clearer document.' : null,
    });
    setVerificationActionId(null);
    if (actionError) {
      setVerificationReviewError(actionError.message.includes('Admin authorization required') ? 'Only a server-authorized HomiCare admin can review evidence.' : actionError.message);
      return;
    }
    setVerificationSubmissions((current) => current.filter((submission) => submission.id !== submissionId));
  };

  const loadVerificationEvidence = async (submission: ProviderVerificationSubmission) => {
    setVerificationReviewError('');
    const { data, error: signedUrlError } = await supabase.storage.from('verification-evidence').createSignedUrl(submission.storage_path, 300);
    if (signedUrlError) {
      setVerificationReviewError(signedUrlError.message);
      return;
    }
    setEvidenceUrls((current) => ({ ...current, [submission.id]: data.signedUrl }));
  };

  const categoryDemand = Object.entries(bookings.reduce<Record<string, number>>((counts, booking) => {
    const category = booking.service_category || 'Other';
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {})).sort((left, right) => right[1] - left[1]).slice(0, 5);
  const maxCategoryDemand = Math.max(1, ...categoryDemand.map(([, count]) => count));
  const verificationNeeds = providers.filter((provider) => !provider.identity_verified || !provider.skills_verified || !provider.certification_verified).length;
  const transactionVolume = transactions.filter((transaction) => transaction.status === 'completed').reduce((total, transaction) => total + transaction.amount, 0);

  const stats = [
    { label: 'Provider Profiles', value: providers.length, icon: Users, color: 'blue' },
    { label: 'Providers', value: providers.length, icon: Wrench, color: 'orange' },
    { label: 'Active Bookings', value: bookings.filter(b => !['completed', 'cancelled'].includes(b.status)).length, icon: Calendar, color: 'emerald' },
    { label: 'Completed Jobs (recent)', value: bookings.filter(b => b.status === 'completed').length, icon: CheckCircle2, color: 'purple' },
    { label: 'Completed Transaction Volume', value: transactions.length ? formatUGX(transactionVolume) : 'Restricted', icon: DollarSign, color: 'emerald' },
    { label: 'Provider Verification Needs', value: verificationNeeds, icon: AlertCircle, color: 'amber' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900">Admin Command Center</h1>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-hide border-b border-slate-200">
        {[
          { id: 'overview' as const, label: 'Overview', icon: Activity },
          { id: 'providers' as const, label: 'Providers', icon: Wrench },
          { id: 'bookings' as const, label: 'Bookings', icon: Calendar },
          { id: 'users' as const, label: 'Users', icon: Users },
          { id: 'finance' as const, label: 'Finance', icon: DollarSign },
          { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
          { id: 'settings' as const, label: 'Settings', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeSection === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Alerts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Needs Attention
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'Provider Verification Needs', value: verificationNeeds, color: 'amber' },
                  { label: 'Safety Reports', value: 'Restricted', color: 'red' },
                  { label: 'Payment Issues', value: 'Restricted', color: 'orange' },
                  { label: 'Moderation Queue', value: 'Restricted', color: 'blue' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold bg-${item.color}-100 text-${item.color}-600`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                Service Demand
              </h2>
              <div className="space-y-3">
                {categoryDemand.map(([name, value], i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-600">{name}</span>
                      <span className="font-medium text-slate-900">{value}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${(value / maxCategoryDemand) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {categoryDemand.length === 0 && <p className="py-5 text-center text-sm text-slate-500">No booking data available.</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {activeSection === 'providers' && (
        <div className="space-y-4">
          <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-4"><h2 className="font-semibold text-slate-900">Verification evidence</h2><p className="mt-1 text-xs text-slate-500">Private documents submitted by providers for review.</p></div>
            {verificationReviewError && <p role="alert" className="m-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{verificationReviewError}</p>}
            {verificationSubmissions.length === 0 ? <p className="p-4 text-sm text-slate-500">No verification submissions are waiting for review.</p> : <div className="divide-y divide-slate-100">{verificationSubmissions.map((submission) => {
              const providerRecord = reviewQueue.find((item) => item.id === submission.provider_id);
              return <div key={submission.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold capitalize text-slate-900">{submission.verification_type} · {providerRecord?.full_name || 'Provider'}</p><p className="mt-0.5 text-xs text-slate-500">{submission.notes || 'No note provided'} · {formatDateTime(submission.submitted_at)}</p></div>
                {evidenceUrls[submission.id] ? <a href={evidenceUrls[submission.id]} target="_blank" rel="noreferrer" className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Open evidence</a> : <button onClick={() => loadVerificationEvidence(submission)} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">View evidence</button>}
                <button disabled={verificationActionId === submission.id} onClick={() => reviewVerificationSubmission(submission.id, 'approved')} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Approve</button>
                <button disabled={verificationActionId === submission.id} onClick={() => reviewVerificationSubmission(submission.id, 'rejected')} className="rounded-md border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Reject</button>
              </div>;
            })}</div>}
          </section>
          <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-4"><h2 className="font-semibold text-slate-900">Provider approval queue</h2><p className="mt-1 text-xs text-slate-500">New provider profiles remain hidden from discovery until an authorized admin approves them.</p></div>
            {reviewQueueError && <p role="alert" className="m-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{reviewQueueError}</p>}
            {reviewQueue.filter((provider) => provider.provider_status !== 'active').length === 0 ? <p className="p-4 text-sm text-slate-500">No pending provider reviews available to this admin account.</p> : <div className="divide-y divide-slate-100">{reviewQueue.filter((provider) => provider.provider_status !== 'active').map((provider) => <div key={provider.id} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{provider.full_name}</p><p className="text-xs text-slate-500">{provider.professional_title} · {provider.location}</p><p className="mt-1 text-[10px] text-slate-500">Identity {provider.identity_verified ? 'checked' : 'pending'} · Skills {provider.skills_verified ? 'checked' : 'pending'} · Credentials {provider.certification_verified ? 'checked' : 'pending'}</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold capitalize text-amber-800">{provider.provider_status || 'pending'}</span>{provider.provider_status === 'pending' ? <button disabled={reviewActionId === provider.id} onClick={() => setReviewStatus(provider.id, 'active')} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{reviewActionId === provider.id ? 'Reviewing...' : 'Approve listing'}</button> : <button disabled={reviewActionId === provider.id} onClick={() => setReviewStatus(provider.id, 'active')} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Restore listing</button>}</div>)}</div>}
          </section>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Provider Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Provider</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Location</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Rating</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Jobs</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Verified</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {providers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden">
                          {p.avatar_url && <ProfileMediaImage source={p.avatar_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{p.full_name}</p>
                          <p className="text-xs text-slate-400">{p.professional_title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.location}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.rating} ★</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.completed_jobs}</td>
                    <td className="px-4 py-3">
                      {p.identity_verified ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300" />}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getAvailabilityColor(p.availability_status)}`}>
                        {getAvailabilityLabel(p.availability_status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {activeSection === 'bookings' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Bookings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Code</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Service</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Price</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-mono text-slate-500">{b.booking_code}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{b.customer_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{b.service_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{b.scheduled_date ? formatDate(b.scheduled_date) : 'Flexible'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{b.quoted_price ? formatUGX(b.quoted_price) : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getBookingStatusColor(b.status)}`}>
                        {getBookingStatusLabel(b.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSection === 'users' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">User Management</h2>
            <p className="mt-1 text-xs text-slate-500">Provider profiles are available from this browser session. Customer identity records require a protected server-side admin endpoint.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Customer accounts', value: 'Restricted', icon: User, color: 'blue' },
              { label: 'Providers', value: providers.length, icon: Wrench, color: 'orange' },
              { label: 'Businesses', value: providers.filter(p => p.is_business).length, icon: Building, color: 'emerald' },
              { label: 'Provider profiles', value: providers.length, icon: Users, color: 'red' },
            ].map((stat, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                <stat.icon className={`w-5 h-5 text-${stat.color}-500 mb-2`} />
                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-4"><label className="block text-xs font-semibold text-slate-600">Search provider accounts<input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Name, service, or location" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label></div>
            <div className="divide-y divide-slate-100">{providers.filter((provider) => `${provider.full_name} ${provider.professional_title} ${provider.location}`.toLowerCase().includes(userSearch.toLowerCase())).map((provider) => <div key={provider.id} className="flex flex-wrap items-center gap-3 p-4"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-100 text-sm font-bold text-orange-800">{provider.full_name.slice(0, 1)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{provider.full_name}</p><p className="truncate text-xs text-slate-500">{provider.professional_title} · {provider.location}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${provider.identity_verified ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{provider.identity_verified ? 'Verified' : 'Verification needed'}</span><button onClick={() => { setSelectedProviderId(provider.id); setCurrentPage('provider'); }} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">View profile</button></div>)}{providers.length === 0 && <p className="p-5 text-sm text-slate-500">No provider profiles are available.</p>}</div>
          </div>
        </div>
      )}

      {activeSection === 'analytics' && (() => {
        const months = Array.from({ length: 6 }, (_, index) => {
          const date = new Date();
          date.setDate(1);
          date.setMonth(date.getMonth() - (5 - index));
          const value = bookings.filter((booking) => {
            const created = new Date(booking.created_at);
            return created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth();
          }).length;
          return { label: date.toLocaleDateString('en', { month: 'short' }), value };
        });
        const maxMonthValue = Math.max(1, ...months.map((month) => month.value));
        const categoryCounts = bookings.reduce<Record<string, number>>((counts, booking) => {
          const category = booking.service_category || 'Other';
          counts[category] = (counts[category] || 0) + 1;
          return counts;
        }, {});
        const categories = Object.entries(categoryCounts).sort((left, right) => right[1] - left[1]).slice(0, 6);
        return <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Booking activity</h2><p className="mt-1 text-xs text-slate-500">Recent booking records loaded for this admin view</p><div className="mt-5 flex h-44 items-end gap-3 border-b border-l border-slate-200 px-3">{months.map((month) => <div key={`${month.label}-${month.value}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-semibold text-slate-700">{month.value}</span><div className="w-full rounded-t-sm bg-orange-500" style={{ height: `${Math.max(6, (month.value / maxMonthValue) * 100)}%` }} /><span className="pb-2 text-[10px] text-slate-500">{month.label}</span></div>)}</div></section>
          <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Service distribution</h2><p className="mt-1 text-xs text-slate-500">Categories represented in loaded bookings</p><div className="mt-5 space-y-4">{categories.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No booking data available to chart.</p> : categories.map(([category, value]) => <div key={category}><div className="mb-1 flex justify-between text-xs"><span className="text-slate-700">{category}</span><span className="font-semibold text-slate-900">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.max(4, (value / Math.max(1, bookings.length)) * 100)}%` }} /></div></div>)}</div></section>
          <section className="grid grid-cols-2 gap-3 lg:col-span-2">{[{ label: 'Provider profiles', value: providers.length }, { label: 'Loaded bookings', value: bookings.length }, { label: 'Active bookings', value: bookings.filter((booking) => !['completed', 'cancelled'].includes(booking.status)).length }, { label: 'Completed jobs', value: bookings.filter((booking) => booking.status === 'completed').length }].map((metric) => <div key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-2xl font-bold text-slate-900">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.label}</p></div>)}</section>
        </div>;
      })()}

      {activeSection === 'settings' && <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">System settings</h2><p className="mt-1 text-xs text-slate-500">These preferences are saved in this browser only. Platform-wide configuration requires a protected admin service.</p><div className="mt-5 divide-y divide-slate-100">
        <label className="flex items-center justify-between gap-4 py-4 text-sm font-medium text-slate-800">Dark mode<input type="checkbox" checked={adminPreferences.darkMode} onChange={(event) => setAdminPreferences((current) => ({ ...current, darkMode: event.target.checked }))} className="h-4 w-4 accent-orange-600" /></label>
        <label className="flex items-center justify-between gap-4 py-4 text-sm font-medium text-slate-800">Language<select value={adminPreferences.language} onChange={(event) => setAdminPreferences((current) => ({ ...current, language: event.target.value }))} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option>English</option><option>Luganda</option><option>Swahili</option></select></label>
        <label className="flex items-center justify-between gap-4 py-4 text-sm font-medium text-slate-800">Currency<select value={adminPreferences.currency} onChange={(event) => setAdminPreferences((current) => ({ ...current, currency: event.target.value }))} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option>UGX</option><option>KES</option><option>TZS</option></select></label>
        <label className="flex items-center justify-between gap-4 py-4 text-sm font-medium text-slate-800">Time zone<select value={adminPreferences.timeZone} onChange={(event) => setAdminPreferences((current) => ({ ...current, timeZone: event.target.value }))} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option>Africa/Kampala</option><option>Africa/Nairobi</option><option>Africa/Dar_es_Salaam</option></select></label>
      </div><button onClick={() => { localStorage.setItem('homicare-admin-dark-mode', String(adminPreferences.darkMode)); localStorage.setItem('homicare-admin-language', adminPreferences.language); localStorage.setItem('homicare-admin-currency', adminPreferences.currency); localStorage.setItem('homicare-admin-timezone', adminPreferences.timeZone); setSettingsNotice('Preferences saved on this device.'); }} className="mt-4 inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"><Save className="h-4 w-4" />Save settings</button>{settingsNotice && <p role="status" className="mt-3 text-sm text-emerald-700">{settingsNotice}</p>}</section>}

      {activeSection === 'finance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Today Volume', value: 'UGX 18.4M', icon: DollarSign, color: 'emerald' },
              { label: 'Platform Revenue', value: 'UGX 2.4M', icon: TrendingUp, color: 'blue' },
              { label: 'Pending Payouts', value: 'UGX 3.2M', icon: Clock, color: 'amber' },
              { label: 'Refunds', value: 'UGX 120K', icon: RefreshCw, color: 'red' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
                <p className="text-lg font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Payment Methods Distribution</h2>
            <div className="space-y-3">
              {[
                { name: 'MTN Mobile Money', value: 48, amount: 'UGX 84.2M', color: 'bg-yellow-500' },
                { name: 'Airtel Money', value: 28, amount: 'UGX 42.7M', color: 'bg-red-500' },
                { name: 'Bank Transfer', value: 14, amount: 'UGX 18.4M', color: 'bg-blue-500' },
                { name: 'Cards', value: 6, amount: 'UGX 6.8M', color: 'bg-purple-500' },
                { name: 'HomiCare Wallet', value: 4, amount: 'UGX 12.1M', color: 'bg-emerald-500' },
              ].map((m, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">{m.name}</span>
                    <span className="font-medium text-slate-900">{m.amount} ({m.value}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
function AppContent() {
  const { currentPage, authReady, isAuthenticated } = useApp();
  const [studioOpen, setStudioOpen] = useState(false);
  const nativeApp = Capacitor.isNativePlatform();

  if (nativeApp && !authReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f5f9]">
        <div className="text-center">
          <img src="/icons/HomiCare%20Glossy%20Heart%20Logo.png" alt="HomiCare" className="mx-auto h-20 w-20 rounded-2xl object-cover" />
          <p className="mt-4 text-sm font-medium text-slate-600">Checking your secure sign-in…</p>
        </div>
      </main>
    );
  }
  if (nativeApp && !isAuthenticated && currentPage !== 'signup') {
    return <AuthPage mode="login" />;
  }
  if (currentPage === 'signup' || currentPage === 'login') {
    return <AuthPage mode={currentPage} />;
  }
  if (currentPage === 'provider-onboarding') return <ProviderOnboardingPage />;
  if (['profile-edit', 'profile-password', 'privacy-settings', 'notification-settings'].includes(currentPage)) {
    return <ProfileSettingsPage page={currentPage as 'profile-edit' | 'profile-password' | 'privacy-settings' | 'notification-settings'} />;
  }

  return (
    <div className="min-h-screen bg-violet-50/50">
      <Header />
      <main className="pb-24 md:pb-0">
        {currentPage === 'home' && <LandingPage />}
        {currentPage === 'search' && <SearchPage />}
        {currentPage === 'provider' && <ProviderProfilePage />}
        {currentPage === 'booking' && <BookingPage />}
        {currentPage === 'my-bookings' && <MyBookingsPage />}
        {currentPage === 'customer-dashboard' && <CustomerDashboard />}
        {currentPage === 'provider-dashboard' && <ProviderDashboard />}
        {currentPage === 'provider-services' && <ProviderServicesPage />}
        {currentPage === 'messages' && <MessagesPage />}
        {(currentPage === 'people' || currentPage === 'member-messages') && <PeoplePage conversation={currentPage === 'member-messages'} />}
        {currentPage === 'message-conversation' && <MessagingPages view="conversation" />}
        {currentPage === 'communication-center' && <MessagingPages view="center" />}
        {currentPage === 'booking-communication' && <MessagingPages view="booking" />}
        {currentPage === 'wallet' && <WalletPage />}
        {currentPage === 'finance' && <FinanceCenterPage />}
        {currentPage === 'refunds' && <RefundRequestPage />}
        {currentPage === 'complaints' && <ComplaintsPage />}
        {currentPage === 'safety' && <SafetyCenterPage />}
        {currentPage === 'verification-details' && <VerificationDetailsPage />}
        {currentPage === 'call-history' && <CallHistoryPage />}
        {currentPage === 'shared-media' && <SharedMediaPage />}
        {currentPage === 'contact-details' && <ContactDetailsPage />}
        {currentPage === 'referrals' && <ReferralCenterPage />}
        {currentPage === 'rewards' && <RewardsCenterPage />}
        {currentPage === 'service-matcher' && <ServiceAssistantPage />}
        {currentPage === 'communities' && <CommunityHub />}
        {currentPage === 'household-planner' && <HouseholdPlannerPage />}
        {currentPage === 'service-bundles' && <ServiceBundlesPage />}
        {currentPage === 'admin' && <AdminPage />}
        {currentPage === 'help' && <HelpCenterPage />}
        {currentPage === 'tracking' && <TrackingPage />}
        {currentPage === 'payment' && <PaymentPage />}
        {currentPage === 'invoice' && <InvoicePage />}
        {currentPage === 'review' && <ReviewPage />}
        {currentPage === 'calendar' && <CalendarPage />}
        {currentPage === 'provider-calendar' && <ProviderCalendarPage />}
        {currentPage === 'subscriptions' && <SubscriptionsPage />}
        {currentPage === 'emergency' && <EmergencyPage />}
        {currentPage === 'profile' && <MyProfilePage />}
        {currentPage === 'public-profile' && <PublicProfilePage />}
        {currentPage === 'providers' && <ProvidersPage />}
        {isEcosystemPage(currentPage) && currentPage !== 'communities' && <EcosystemPage page={currentPage} />}
      </main>
      <BottomNav onOpenStudio={() => setStudioOpen(true)} />
      {studioOpen && <CreatorStudioModal onClose={() => setStudioOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
