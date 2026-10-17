import { NextResponse } from 'next/server';
import { getRequestContext } from '../../../../lib/supabase';

const writableFields = new Set([
  'display_name', 'phone_private', 'date_of_birth', 'gender', 'marital_status', 'bio',
  'alternate_phone_private', 'whatsapp_private', 'preferred_contact', 'country', 'city',
  'district', 'address_private', 'avatar_url', 'cover_url', 'website', 'linkedin',
  'facebook', 'occupation', 'household_interests', 'profile_visibility', 'show_phone', 'show_location',
]);
const booleanFields = new Set(['show_phone', 'show_location']);

function isMissingTableError(message: string) {
  return /Could not find the table|does not exist|relation .* does not exist|not found/i.test(message);
}

export async function GET(request: Request) {
  try {
    const { supabase, user, authError } = await getRequestContext(request);
    if (!user) return NextResponse.json({ error: authError }, { status: 401 });

    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (error) {
      if (isMissingTableError(error.message)) {
        return NextResponse.json({ error: 'The profiles table is missing. Apply the HomiCare profile foundation migration before loading profile data.' }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ data: data ?? null });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Profile lookup failed.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user, authError } = await getRequestContext(request);
    if (!user) return NextResponse.json({ error: authError }, { status: 401 });

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Send a profile object.' }, { status: 400 });
    }

    const updates: Record<string, string | boolean | null> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!writableFields.has(key)) continue;
      if ((key === 'avatar_url' || key === 'cover_url') && value === null) {
        updates[key] = null;
        continue;
      }
      if (booleanFields.has(key)) {
        if (typeof value !== 'boolean') return NextResponse.json({ error: `${key} must be a boolean.` }, { status: 400 });
        updates[key] = value;
      } else {
        if (typeof value !== 'string' || value.length > 3000) {
          return NextResponse.json({ error: `${key} must be text up to 3000 characters.` }, { status: 400 });
        }
        if (key === 'profile_visibility' && !['private', 'members', 'public'].includes(value)) {
          return NextResponse.json({ error: 'profile_visibility must be private, members, or public.' }, { status: 400 });
        }
        updates[key] = value;
      }
    }
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No supported profile fields were provided.' }, { status: 400 });

    const { data, error } = await supabase.from('profiles')
      .upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' })
      .select('*')
      .single();
    if (error) {
      if (isMissingTableError(error.message)) {
        return NextResponse.json({ error: 'Your profile was not saved because the profiles table is missing. Apply the HomiCare profile foundation migration and retry.' }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ data });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Profile update failed.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}