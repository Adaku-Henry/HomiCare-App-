export type PageDataset = {
  page: string;
  title: string;
  summary: Record<string, unknown>;
  sections: Record<string, unknown>;
};

export const fallbackCategories = [
  { id: 'cleaning', name: 'Cleaning', slug: 'cleaning', icon: 'Sparkles', description: 'Routine and deep cleaning for homes and offices.', sort_order: 1 },
  { id: 'plumbing', name: 'Plumbing', slug: 'plumbing', icon: 'Wrench', description: 'Repairs, installations, and maintenance for pipes and fixtures.', sort_order: 2 },
  { id: 'electrical', name: 'Electrical', slug: 'electrical', icon: 'Zap', description: 'Electrical repairs, rewiring, and troubleshooting.', sort_order: 3 },
  { id: 'carpentry', name: 'Carpentry', slug: 'carpentry', icon: 'Hammer', description: 'Joinery, repair, and custom woodwork.', sort_order: 4 },
  { id: 'painting', name: 'Painting', slug: 'painting', icon: 'Paintbrush', description: 'Interior and exterior painting services.', sort_order: 5 },
  { id: 'laundry', name: 'Laundry', slug: 'laundry', icon: 'Settings', description: 'Washing, ironing, and linen care.', sort_order: 6 },
  { id: 'cooking', name: 'Cooking', slug: 'cooking', icon: 'Sun', description: 'Home cooking and meal prep support.', sort_order: 7 },
  { id: 'delivery', name: 'Delivery', slug: 'delivery', icon: 'Truck', description: 'Errands, logistics, and home delivery support.', sort_order: 8 },
];

export const fallbackProviders = [
  {
    id: 'provider-1',
    full_name: 'Arua Home Fix Co.',
    professional_title: 'Plumbing & Pipe Repair Specialist',
    avatar_url: null,
    cover_url: null,
    bio: 'Trusted local maintenance team for pipe repairs and bathroom upgrades.',
    primary_service_category_id: 'plumbing',
    location: 'Arua City, Uganda',
    service_radius_km: 25,
    availability_status: 'available',
    identity_verified: true,
    phone_verified: true,
    skills_verified: true,
    certification_verified: true,
    business_verified: true,
    portfolio_verified: true,
    rating: 4.8,
    review_count: 120,
    completed_jobs: 320,
    years_experience: 8,
    response_rate: 94,
    response_time_min: 18,
    on_time_rate: 96,
    starting_price: 80000,
    member_since: '2022-03-01',
    is_business: true,
    business_name: 'Arua Home Fix Co.',
    public_phone: '+256 700 123 456',
  },
  {
    id: 'provider-2',
    full_name: 'Joy Cleaning Crew',
    professional_title: 'Home Cleaning & Deep Cleaning',
    avatar_url: null,
    cover_url: null,
    bio: 'Cleaning professionals for homes, rentals, and private offices.',
    primary_service_category_id: 'cleaning',
    location: 'Lira, Uganda',
    service_radius_km: 14,
    availability_status: 'available',
    identity_verified: true,
    phone_verified: true,
    skills_verified: true,
    certification_verified: false,
    business_verified: false,
    portfolio_verified: true,
    rating: 4.6,
    review_count: 78,
    completed_jobs: 180,
    years_experience: 5,
    response_rate: 89,
    response_time_min: 27,
    on_time_rate: 91,
    starting_price: 65000,
    member_since: '2021-11-10',
    is_business: true,
    business_name: 'Joy Cleaning Crew',
    public_phone: '+256 777 890 162',
  },
  {
    id: 'provider-3',
    full_name: 'Musa Electric Works',
    professional_title: 'Electrical Installation & Repairs',
    avatar_url: null,
    cover_url: null,
    bio: 'Residential and commercial electrical maintenance with warranty support.',
    primary_service_category_id: 'electrical',
    location: 'Gulu, Uganda',
    service_radius_km: 30,
    availability_status: 'busy',
    identity_verified: true,
    phone_verified: true,
    skills_verified: true,
    certification_verified: true,
    business_verified: true,
    portfolio_verified: true,
    rating: 4.9,
    review_count: 188,
    completed_jobs: 440,
    years_experience: 10,
    response_rate: 92,
    response_time_min: 21,
    on_time_rate: 97,
    starting_price: 95000,
    member_since: '2020-05-18',
    is_business: true,
    business_name: 'Musa Electric Works',
    public_phone: '+256 772 500 110',
  },
];

export const fallbackBookings = [
  {
    id: 'booking-1',
    booking_code: 'HC-2024-1001',
    provider_id: 'provider-1',
    customer_name: 'Henry Adaku',
    customer_phone: '+256 777 234 127',
    customer_id: 'customer-1',
    service_name: 'Leak Repair',
    service_category: 'Plumbing',
    description: 'Fix leaking kitchen sink pipe and replace drainage pipe.',
    location: 'Arua City',
    scheduled_date: '2026-10-02',
    scheduled_time: '09:00',
    urgency: 'moderate',
    status: 'accepted',
    quoted_price: 140000,
    final_price: 140000,
    payment_method: 'mobile-money',
    payment_status: 'paid',
    provider_notes: 'Bring measuring tools and spare washers.',
    customer_confirmed: true,
    created_at: '2026-09-29T10:30:00.000Z',
  },
  {
    id: 'booking-2',
    booking_code: 'HC-2024-1002',
    provider_id: 'provider-2',
    customer_name: 'Henry Adaku',
    customer_phone: '+256 777 234 127',
    customer_id: 'customer-1',
    service_name: 'Apartment Cleaning',
    service_category: 'Cleaning',
    description: 'Full apartment cleaning including kitchen, bedroom, and bathrooms.',
    location: 'Arua City',
    scheduled_date: '2026-10-04',
    scheduled_time: '14:00',
    urgency: 'standard',
    status: 'in_progress',
    quoted_price: 95000,
    final_price: 95000,
    payment_method: 'wallet',
    payment_status: 'pending',
    provider_notes: 'Please clear storage cabinets before cleaning.',
    customer_confirmed: true,
    created_at: '2026-09-27T08:15:00.000Z',
  },
];

export const fallbackMessages = [
  {
    id: 'message-1',
    provider_id: 'provider-1',
    customer_id: 'customer-1',
    customer_name: 'Henry Adaku',
    sender: 'customer',
    content: 'Can you confirm the arrival time for tomorrow?',
    message_type: 'text',
    attachment_url: null,
    created_at: '2026-09-29T09:10:00.000Z',
  },
  {
    id: 'message-2',
    provider_id: 'provider-1',
    customer_id: 'customer-1',
    customer_name: 'Henry Adaku',
    sender: 'provider',
    content: 'Yes. I will arrive around 9:00 AM with the spare parts.',
    message_type: 'text',
    attachment_url: null,
    created_at: '2026-09-29T09:14:00.000Z',
  },
];

export const fallbackWallet = [
  { id: 'wallet-1', transaction_type: 'topup', amount: 500000, currency: 'UGX', description: 'Wallet top up', status: 'completed', created_at: '2026-09-12T14:00:00.000Z' },
  { id: 'wallet-2', transaction_type: 'payment', amount: -140000, currency: 'UGX', description: 'Pipe repair booking', status: 'completed', created_at: '2026-09-28T10:31:00.000Z' },
];

export const fallbackNotifications = [
  { id: 'note-1', recipient_type: 'customer', category: 'booking', priority: 'medium', title: 'Provider confirmed your slot', body: 'Arua Home Fix Co. accepted your booking for tomorrow.', action_url: '/provider', is_read: false, created_at: '2026-09-29T10:00:00.000Z' },
  { id: 'note-2', recipient_type: 'customer', category: 'wallet', priority: 'low', title: 'Payment summary updated', body: 'Your wallet has been debited for the approved quote.', action_url: '/wallet', is_read: true, created_at: '2026-09-28T10:35:00.000Z' },
];

export const fallbackHousehold = [
  {
    id: 'property-1',
    owner_name: 'Henry Adaku',
    property_name: 'Arua Residence',
    property_type: 'home',
    address: 'Arua City, Adumi Ward',
    bedrooms: 3,
    bathrooms: 2,
    has_kitchen: true,
    has_compound: true,
    has_garage: false,
    assets: ['plumbing', 'electrical', 'cleaning'],
  },
];

export function buildFallbackPageData(page: string) {
  const titleMap: Record<string, string> = {
    home: 'Home',
    search: 'Find services',
    'customer-dashboard': 'Customer dashboard',
    'provider-dashboard': 'Provider dashboard',
    'my-bookings': 'My bookings',
    messages: 'Messages',
    wallet: 'Wallet',
    profile: 'Profile',
    'profile-edit': 'Profile settings',
    'privacy-settings': 'Privacy settings',
    'notification-settings': 'Notification settings',
    booking: 'Booking',
    payment: 'Payments',
    invoice: 'Invoice',
    review: 'Review service',
    'provider-calendar': 'Provider calendar',
    calendar: 'Calendar',
    subscriptions: 'Subscriptions',
    emergency: 'Emergency support',
    'help': 'Help center',
    'verification-details': 'Verification details',
    'call-history': 'Call history',
    'shared-media': 'Shared media',
    'contact-details': 'Contact details',
    'referrals': 'Referrals',
    'rewards': 'Rewards',
    'service-matcher': 'Service matcher',
    'household-planner': 'Household planner',
    'service-bundles': 'Service bundles',
    'safety': 'Safety center',
    'finance': 'Finance center',
    'refunds': 'Refund request',
    'complaints': 'Complaints',
    'analytics': 'Analytics',
    notifications: 'Notifications',
    'provider': 'Provider profile',
    'household': 'Household management',
  };

  const pageKey = String(page || 'home');
  const normalized = pageKey.toLowerCase();

  switch (normalized) {
    case 'home':
      return {
        page: normalized,
        title: titleMap[normalized] || 'Overview',
        summary: {
          trustedProviders: 184,
          servicesCompleted: 2840,
          responseTime: '18m',
          customerRating: '4.8/5',
        },
        sections: {
          categories: fallbackCategories,
          featuredProviders: fallbackProviders,
          highlights: ['Same-day service', 'Verified professionals', 'Secure payments'],
        },
      };
    case 'search':
      return {
        page: normalized,
        title: titleMap[normalized] || 'Search',
        summary: { query: '', totalMatches: fallbackProviders.length },
        sections: {
          categories: fallbackCategories,
          providers: fallbackProviders,
        },
      };
    case 'customer-dashboard':
      return {
        page: normalized,
        title: titleMap[normalized] || 'Dashboard',
        summary: { activeBookings: 2, walletBalance: 'UGX 360,000', completedJobs: 18 },
        sections: {
          bookings: fallbackBookings,
          wallet: fallbackWallet,
          notifications: fallbackNotifications,
        },
      };
    case 'provider-dashboard':
      return {
        page: normalized,
        title: titleMap[normalized] || 'Dashboard',
        summary: { pendingJobs: 6, monthlyEarnings: 'UGX 1.2M', responseRate: '92%' },
        sections: {
          bookings: fallbackBookings,
          messages: fallbackMessages,
          providers: fallbackProviders,
        },
      };
    case 'my-bookings':
    case 'booking':
    case 'calendar':
    case 'provider-calendar':
      return {
        page: normalized,
        title: titleMap[normalized] || 'Bookings',
        summary: { total: fallbackBookings.length },
        sections: {
          bookings: fallbackBookings,
        },
      };
    case 'messages':
    case 'message-conversation':
    case 'communication-center':
    case 'booking-communication':
      return {
        page: normalized,
        title: titleMap[normalized] || 'Messages',
        summary: { unread: 3 },
        sections: {
          conversations: fallbackMessages,
          providers: fallbackProviders,
        },
      };
    case 'wallet':
    case 'finance':
      return {
        page: normalized,
        title: titleMap[normalized] || 'Wallet',
        summary: { balance: 'UGX 360,000', pending: 'UGX 95,000' },
        sections: {
          transactions: fallbackWallet,
        },
      };
    case 'profile':
    case 'profile-edit':
    case 'privacy-settings':
    case 'notification-settings':
      return {
        page: normalized,
        title: titleMap[normalized] || 'Profile',
        summary: { completion: 68, location: 'Arua City, Uganda' },
        sections: {
          profile: {
            display_name: 'Henry Adaku',
            email: 'henryadaku46@gmail.com',
            phone: '+256 777234127',
            country: 'Uganda',
            city: 'Arua City',
            profile_visibility: 'public',
          },
          settings: ['general', 'notifications', 'privacy'],
        },
      };
    case 'household':
    case 'household-planner':
      return {
        page: normalized,
        title: titleMap[normalized] || 'Household',
        summary: { properties: 1 },
        sections: {
          properties: fallbackHousehold,
          reminders: [{ id: 'reminder-1', service_category: 'plumbing', next_due_date: '2026-10-03', status: 'upcoming' }],
        },
      };
    case 'notifications':
    case 'safety':
    case 'help':
    case 'verification-details':
    case 'call-history':
    case 'shared-media':
    case 'contact-details':
    case 'referrals':
    case 'rewards':
    case 'service-matcher':
    case 'service-bundles':
    case 'refunds':
    case 'complaints':
    case 'analytics':
    case 'payment':
    case 'invoice':
    case 'review':
    case 'emergency':
    case 'provider':
      return {
        page: normalized,
        title: titleMap[normalized] || 'Workspace',
        summary: { status: 'ready' },
        sections: {
          items: fallbackProviders,
        },
      };
    default:
      return {
        page: normalized,
        title: titleMap[normalized] || 'Workspace',
        summary: { status: 'ready' },
        sections: {
          categories: fallbackCategories,
          providers: fallbackProviders,
        },
      };
  }
}
