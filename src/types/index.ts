export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  sort_order: number;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price_from: number | null;
  pricing_model: string;
  emergency_available: boolean;
}

export interface Provider {
  id: string;
  user_id: string | null;
  full_name: string;
  professional_title: string;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  primary_service_category_id: string | null;
  location: string;
  service_radius_km: number;
  availability_status: string;
  identity_verified: boolean;
  phone_verified: boolean;
  skills_verified: boolean;
  certification_verified: boolean;
  business_verified: boolean;
  portfolio_verified: boolean;
  rating: number;
  review_count: number;
  completed_jobs: number;
  years_experience: number;
  response_rate: number;
  response_time_min: number;
  on_time_rate: number;
  starting_price: number;
  total_earnings: number;
  member_since: string;
  is_business: boolean;
  business_name: string | null;
  public_phone?: string | null;
  skills?: string[];
  skills_search?: string;
  provider_status?: 'pending' | 'active' | 'suspended';
  created_at: string;
}

export interface ProviderService {
  id: string;
  provider_id: string;
  service_id: string;
  custom_name: string | null;
  description: string | null;
  price_from: number;
  price_to: number | null;
  pricing_model: string;
  estimated_duration: string | null;
  emergency_available: boolean;
  materials_included: boolean;
  warranty: string | null;
  is_active: boolean;
  service?: Service | null;
}

export interface ProviderAvailability {
  id?: string;
  provider_id: string;
  day_of_week: number;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  emergency_only: boolean;
  updated_at?: string;
}

export interface ProviderTimeOff {
  id: string;
  provider_id: string;
  starts_on: string;
  ends_on: string;
  created_at: string;
}

export interface Review {
  id: string;
  provider_id: string;
  booking_id: string | null;
  customer_name: string;
  rating_quality: number;
  rating_professionalism: number;
  rating_communication: number;
  rating_timeliness: number;
  rating_value: number;
  rating_cleanliness: number;
  overall_rating: number;
  comment: string | null;
  would_hire_again: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  booking_code: string;
  provider_id: string;
  customer_name: string;
  customer_phone: string;
  customer_id: string | null;
  service_name: string;
  service_category: string;
  description: string | null;
  location: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  urgency: string;
  status: string;
  quoted_price: number | null;
  final_price: number | null;
  payment_method: string | null;
  payment_status: string;
  provider_notes: string | null;
  customer_confirmed: boolean;
  created_at: string;
  request_type?: 'booking' | 'quote';
}

export interface BookingQuote {
  id: string;
  booking_id: string;
  provider_id: string;
  customer_id: string;
  labor_amount: number;
  materials_amount: number;
  transport_amount: number;
  total_amount: number;
  estimated_duration: string | null;
  warranty: string | null;
  message: string;
  status: 'sent' | 'accepted' | 'rejected' | 'revision_requested';
  revision_count: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioProject {
  id: string;
  provider_id: string;
  title: string;
  category: string;
  description: string | null;
  before_image_url: string | null;
  during_image_url: string | null;
  after_image_url: string | null;
  location: string | null;
  completion_date: string | null;
  project_value: number | null;
  services_performed: string[] | null;
  customer_confirmed: boolean;
  customer_rating: number | null;
  created_at: string;
}

export interface CvWorkExperience {
  id: string;
  title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string;
  current: boolean;
  description: string;
}

export interface CvEducation {
  id: string;
  qualification: string;
  institution: string;
  field: string;
  start_year: string;
  end_year: string;
  grade: string;
  description: string;
}

export interface CvCredential {
  id: string;
  name: string;
  issuer: string;
  issued_on: string;
  expires_on: string;
  status: string;
}

export interface CvAchievement {
  id: string;
  title: string;
  issuer: string;
  awarded_on: string;
  description: string;
  verified: boolean;
}

export interface CvLanguage {
  id: string;
  name: string;
  proficiency: string;
}

export interface ProviderCvProfile {
  provider_id: string;
  summary: string;
  experiences: CvWorkExperience[];
  education: CvEducation[];
  skills: string[];
  certifications: CvCredential[];
  licenses: CvCredential[];
  achievements: CvAchievement[];
  languages: CvLanguage[];
  template: string;
  is_published: boolean;
  updated_at: string;
}

export interface ProviderCvReference {
  id: string;
  provider_id: string;
  name: string;
  role: string;
  organization: string;
  phone: string;
  email: string;
}

export interface Message {
  id: string;
  provider_id: string;
  customer_id?: string | null;
  customer_name: string;
  sender: string;
  content: string;
  message_type: string;
  attachment_url: string | null;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  provider_id: string | null;
  transaction_type: string;
  amount: number;
  currency: string;
  description: string | null;
  booking_id: string | null;
  payment_method: string | null;
  transaction_reference: string | null;
  status: string;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string | null;
  recipient_type: string;
  category: string;
  priority: string;
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface HouseholdProperty {
  id: string;
  owner_name: string;
  property_name: string;
  property_type: string;
  address: string | null;
  bedrooms: number;
  bathrooms: number;
  has_kitchen: boolean;
  has_compound: boolean;
  has_garage: boolean;
  assets: string[];
}

export interface MaintenanceReminder {
  id: string;
  property_id: string | null;
  asset_name: string;
  service_category: string;
  last_service_date: string | null;
  next_due_date: string | null;
  frequency: string;
  status: string;
}

export type Page =
  | 'signup'
  | 'login'
  | 'provider-onboarding'
  | 'home'
  | 'search'
  | 'providers'
  | 'people'
  | 'member-messages'
  | 'provider'
  | 'booking'
  | 'my-bookings'
  | 'customer-dashboard'
  | 'provider-dashboard'
  | 'provider-services'
  | 'messages'
  | 'message-conversation'
  | 'communication-center'
  | 'booking-communication'
  | 'wallet'
  | 'finance'
  | 'refunds'
  | 'complaints'
  | 'verification-details'
  | 'call-history'
  | 'shared-media'
  | 'contact-details'
  | 'referrals'
  | 'rewards'
  | 'service-matcher'
  | 'household-planner'
  | 'service-bundles'
  | 'admin'
  | 'help'
  | 'household'
  | 'learn'
  | 'opportunities'
  | 'communities'
  | 'events'
  | 'passport'
  | 'documents'
  | 'copilot'
  | 'business-copilot'
  | 'trust'
  | 'safety'
  | 'analytics'
  | 'notifications'
  | 'access'
  | 'tracking'
  | 'payment'
  | 'invoice'
  | 'review'
  | 'calendar'
  | 'provider-calendar'
  | 'subscriptions'
  | 'emergency'
  | 'profile'
  | 'public-profile'
  | 'profile-edit'
  | 'profile-password'
  | 'privacy-settings'
  | 'notification-settings';

export interface AppContext {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  selectedProviderId: string | null;
  setSelectedProviderId: (id: string | null) => void;
  selectedServiceSlug: string | null;
  setSelectedServiceSlug: (slug: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  userRole: 'customer' | 'provider' | 'admin';
  setUserRole: (role: 'customer' | 'provider' | 'admin') => void;
}
