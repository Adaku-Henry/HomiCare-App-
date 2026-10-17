import { NextResponse } from 'next/server';
import { getPublicSupabase } from '../../../../lib/supabase';
import { buildFallbackPageData } from '../../../../lib/page-data';

function isMissingTableError(message: string) {
  return /Could not find the table|does not exist|relation .* does not exist|not found/i.test(message);
}

export async function GET() {
  try {
    const { data, error } = await getPublicSupabase()
      .from('service_categories')
      .select('id, name, slug, icon, description, sort_order')
      .order('sort_order');

    if (error) {
      if (isMissingTableError(error.message)) {
        return NextResponse.json({
          data: (buildFallbackPageData('search').sections.categories ?? []) as Record<string, unknown>[],
        });
      }
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ data });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Supabase is not configured.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}