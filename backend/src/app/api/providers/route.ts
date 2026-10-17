import { NextRequest, NextResponse } from 'next/server';
import { getPublicSupabase, getRequestContext } from '../../../lib/supabase';
import { buildFallbackPageData } from '../../../lib/page-data';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isMissingTableError(message: string) {
  return /Could not find the table|does not exist|relation .* does not exist|not found/i.test(message);
}

function isMissingSkillsSearchColumnError(message: string) {
  return /skills_search/i.test(message)
    && /(does not exist|could not find|not found|schema cache|42703|PGRST204)/i.test(message);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const categoryId = params.get('categoryId');
  const categorySlug = params.get('categorySlug');
  const includeProviderId = params.get('includeProviderId');
  const search = (params.get('q') || '').replace(/[,%()"'\\.*]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  const location = (params.get('location') || '').trim().slice(0, 100);
  const minRating = Number(params.get('minRating') || 0);
  const minExperience = Number(params.get('minExperience') || 0);
  const maxPrice = Number(params.get('maxPrice') || 0);
  const verifiedOnly = params.get('verifiedOnly') === 'true';
  const availableOnly = params.get('availableOnly') === 'true';
  const businessOnly = params.get('businessOnly') === 'true';
  const sortBy = params.get('sortBy') || 'recommended';
  const requestedLimit = Number(params.get('limit') || 30);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
    return NextResponse.json({ error: 'limit must be a positive whole number.' }, { status: 400 });
  }
  const limit = Math.min(requestedLimit, 50);
  const fallbackProviders = (buildFallbackPageData('search').sections.providers ?? []) as Record<string, unknown>[];

  if (categoryId && !uuidPattern.test(categoryId)) {
    return NextResponse.json({ error: 'categoryId must be a valid UUID.' }, { status: 400 });
  }
  if (includeProviderId && !uuidPattern.test(includeProviderId)) {
    return NextResponse.json({ error: 'includeProviderId must be a valid UUID.' }, { status: 400 });
  }
  if (categorySlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(categorySlug)) {
    return NextResponse.json({ error: 'categorySlug is invalid.' }, { status: 400 });
  }
  if (!Number.isFinite(minRating) || minRating < 0 || minRating > 5) {
    return NextResponse.json({ error: 'minRating must be between 0 and 5.' }, { status: 400 });
  }
  if (!Number.isFinite(minExperience) || minExperience < 0 || !Number.isFinite(maxPrice) || maxPrice < 0) {
    return NextResponse.json({ error: 'Experience and price filters must be non-negative numbers.' }, { status: 400 });
  }
  if (!['recommended', 'rating', 'price', 'experience', 'distance'].includes(sortBy)) {
    return NextResponse.json({ error: 'sortBy must be recommended, rating, price, experience, or distance.' }, { status: 400 });
  }

  try {
    const accessToken = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    let supabaseClient: ReturnType<typeof getPublicSupabase>;
    if (accessToken) {
      const { supabase: authenticatedSupabase, user, authError } = await getRequestContext(request);
      if (!user) return NextResponse.json({ error: authError }, { status: 401 });
      supabaseClient = authenticatedSupabase;
    } else {
      supabaseClient = getPublicSupabase();
    }

    let resolvedCategoryId = categoryId;
    if (!resolvedCategoryId && categorySlug) {
      const { data: category, error: categoryError } = await supabaseClient
        .from('service_categories')
        .select('id')
        .eq('slug', categorySlug)
        .maybeSingle();
      if (categoryError) {
        if (isMissingTableError(categoryError.message)) {
          return NextResponse.json({ data: fallbackProviders });
        }
        return NextResponse.json({ error: categoryError.message }, { status: 502 });
      }
      if (!category) return NextResponse.json({ data: [] });
      resolvedCategoryId = category.id;
    }

    const buildProviderQuery = (includeSkillsSearch: boolean) => {
      let query = supabaseClient
        .from('public_provider_profiles')
        .select('*');

      if (sortBy === 'price') query = query.order('starting_price', { ascending: true });
      else if (sortBy === 'experience') query = query.order('years_experience', { ascending: false });
      else query = query.order('rating', { ascending: false }).order('completed_jobs', { ascending: false });
      query = query.limit(limit);

      if (resolvedCategoryId) query = query.eq('primary_service_category_id', resolvedCategoryId);
      if (search) {
        const searchableFields = includeSkillsSearch
          ? `full_name.ilike.%${search}%,professional_title.ilike.%${search}%,location.ilike.%${search}%,skills_search.ilike.%${search}%`
          : `full_name.ilike.%${search}%,professional_title.ilike.%${search}%,location.ilike.%${search}%`;
        query = query.or(searchableFields);
      }
      if (location) query = query.ilike('location', `%${location.replace(/[%_,]/g, ' ')}%`);
      if (minRating > 0) query = query.gte('rating', minRating);
      if (minExperience > 0) query = query.gte('years_experience', minExperience);
      if (maxPrice > 0) query = query.lte('starting_price', maxPrice);
      if (verifiedOnly) query = query.eq('identity_verified', true);
      if (availableOnly) query = query.eq('availability_status', 'available');
      if (businessOnly) query = query.eq('is_business', true);
      return query;
    };

    let { data, error } = await buildProviderQuery(true);
    if (error && search && isMissingSkillsSearchColumnError(error.message)) {
      ({ data, error } = await buildProviderQuery(false));
    }
    if (error) {
      if (isMissingTableError(error.message)) {
        return NextResponse.json({ data: fallbackProviders });
      }
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    const providers = data || [];
    if (includeProviderId && !providers.some((provider) => provider.id === includeProviderId)) {
      const { data: includedProvider, error: includeError } = await supabaseClient
        .from('public_provider_profiles')
        .select('*')
        .eq('id', includeProviderId)
        .maybeSingle();
      if (includeError) return NextResponse.json({ error: includeError.message }, { status: 502 });
      if (includedProvider && (!resolvedCategoryId || includedProvider.primary_service_category_id === resolvedCategoryId)) {
        providers.unshift(includedProvider);
      }
    }
    return NextResponse.json({ data: providers.slice(0, limit) });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Supabase is not configured.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}