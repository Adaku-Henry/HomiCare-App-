import { NextRequest, NextResponse } from 'next/server';
import { getPublicSupabase } from '../../../../lib/supabase';
import { buildFallbackPageData } from '../../../../lib/page-data';

const supportedPages = new Set([
  'home',
  'search',
  'customer-dashboard',
  'provider-dashboard',
  'my-bookings',
  'messages',
  'wallet',
  'profile',
  'profile-edit',
  'privacy-settings',
  'notification-settings',
  'booking',
  'payment',
  'invoice',
  'review',
  'calendar',
  'provider-calendar',
  'subscriptions',
  'emergency',
  'help',
  'verification-details',
  'call-history',
  'shared-media',
  'contact-details',
  'referrals',
  'rewards',
  'service-matcher',
  'household-planner',
  'service-bundles',
  'safety',
  'finance',
  'refunds',
  'complaints',
  'analytics',
  'notifications',
  'provider',
  'household',
  'message-conversation',
  'communication-center',
  'booking-communication',
]);

async function queryPageData(page: string) {
  const supabase = getPublicSupabase();

  const pageQueries: Record<string, PromiseLike<unknown>> = {
    home: Promise.all([
      supabase.from('service_categories').select('id, name, slug, icon, description, sort_order').order('sort_order'),
      supabase.from('public_provider_profiles').select('*').limit(4),
    ]),
    search: Promise.all([
      supabase.from('service_categories').select('id, name, slug, icon, description, sort_order').order('sort_order'),
      supabase.from('public_provider_profiles').select('*').limit(12),
    ]),
    'customer-dashboard': Promise.all([
      supabase.from('bookings').select('*').limit(10),
      supabase.from('wallet_transactions').select('*').limit(10),
      supabase.from('notifications').select('*').limit(10),
    ]),
    'provider-dashboard': Promise.all([
      supabase.from('providers').select('*').limit(10),
      supabase.from('bookings').select('*').limit(10),
      supabase.from('messages').select('*').limit(10),
    ]),
    'my-bookings': supabase.from('bookings').select('*').limit(20),
    messages: supabase.from('messages').select('*').limit(20),
    wallet: supabase.from('wallet_transactions').select('*').limit(20),
    profile: supabase.from('profiles').select('*').limit(20),
    household: Promise.all([
      supabase.from('household_properties').select('*').limit(20),
      supabase.from('maintenance_reminders').select('*').limit(20),
    ]),
    notifications: supabase.from('notifications').select('*').limit(20),
  };

  const request = pageQueries[page];
  if (!request) {
    return null;
  }

  try {
    const outcome = await request;
    return outcome;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: { page: string } }) {
  const page = String(params?.page || 'home').toLowerCase();

  if (!supportedPages.has(page)) {
    return NextResponse.json({ error: 'Page not found.' }, { status: 404 });
  }

  try {
    const data = await queryPageData(page);
    const fallbackData = buildFallbackPageData(page);

    if (!data) {
      return NextResponse.json({ data: fallbackData });
    }

    if (page === 'home' || page === 'search') {
      const pageResults = Array.isArray(data) ? data as { data?: unknown }[] : [];
      const categoriesResult = pageResults[0];
      const providersResult = pageResults[1];
      const categories = categoriesResult?.data ?? fallbackData.sections.categories;
      const providers = providersResult?.data ?? fallbackData.sections.featuredProviders ?? fallbackData.sections.providers;
      return NextResponse.json({ data: { ...fallbackData, sections: { ...fallbackData.sections, categories, providers } } });
    }

    if (page === 'customer-dashboard' || page === 'provider-dashboard') {
      const dataList = Array.isArray(data) ? data : [];
      const bookings = dataList[0]?.data ?? fallbackData.sections.bookings ?? [];
      const wallet = dataList[1]?.data ?? fallbackData.sections.wallet ?? [];
      const messages = dataList[2]?.data ?? fallbackData.sections.messages ?? [];
      return NextResponse.json({ data: { ...fallbackData, sections: { ...fallbackData.sections, bookings, wallet, messages } } });
    }

    if (page === 'my-bookings' || page === 'messages' || page === 'wallet' || page === 'notifications' || page === 'profile' || page === 'household') {
      const rowSets = Array.isArray(data) ? data : [data];
      const primaryResult = rowSets[0];
      const secondResult = rowSets[1];

      if (page === 'my-bookings') return NextResponse.json({ data: { ...fallbackData, sections: { bookings: primaryResult?.data ?? fallbackData.sections.bookings } } });
      if (page === 'messages') return NextResponse.json({ data: { ...fallbackData, sections: { conversations: primaryResult?.data ?? fallbackData.sections.conversations } } });
      if (page === 'wallet') return NextResponse.json({ data: { ...fallbackData, sections: { transactions: primaryResult?.data ?? fallbackData.sections.transactions } } });
      if (page === 'notifications') return NextResponse.json({ data: { ...fallbackData, sections: { notifications: primaryResult?.data ?? fallbackData.sections.notifications } } });
      if (page === 'profile') return NextResponse.json({ data: { ...fallbackData, sections: { profile: primaryResult?.data ?? fallbackData.sections.profile } } });
      if (page === 'household') return NextResponse.json({ data: { ...fallbackData, sections: { properties: primaryResult?.data ?? fallbackData.sections.properties, reminders: secondResult?.data ?? fallbackData.sections.reminders } } });
    }

    return NextResponse.json({ data: fallbackData });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Page data is unavailable.';
    return NextResponse.json({ data: buildFallbackPageData(page), error: message }, { status: 200 });
  }
}
