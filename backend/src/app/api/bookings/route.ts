import { NextResponse } from 'next/server';
import { getRequestContext } from '../../../lib/supabase';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requiredText: Record<string, number> = {
  provider_id: 36,
  customer_name: 120,
  customer_phone: 40,
  service_name: 120,
  service_category: 120,
  location: 300,
};

export async function GET(request: Request) {
  try {
    const { supabase, user, authError } = await getRequestContext(request);
    if (!user) return NextResponse.json({ error: authError }, { status: 401 });

    const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json({ data });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Bookings could not be loaded.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, authError } = await getRequestContext(request);
    if (!user) return NextResponse.json({ error: authError }, { status: 401 });

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Send a booking object.' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    for (const [field, maxLength] of Object.entries(requiredText)) {
      if (typeof input[field] !== 'string' || !input[field].trim() || input[field].length > maxLength) {
        return NextResponse.json({ error: `${field} is required and must be at most ${maxLength} characters.` }, { status: 400 });
      }
    }
    if (!uuidPattern.test(input.provider_id as string)) {
      return NextResponse.json({ error: 'provider_id must be a valid UUID.' }, { status: 400 });
    }
    if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 3000)) {
      return NextResponse.json({ error: 'description must be text up to 3000 characters.' }, { status: 400 });
    }
    if (input.scheduled_date !== undefined && input.scheduled_date !== null && (typeof input.scheduled_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.scheduled_date))) {
      return NextResponse.json({ error: 'scheduled_date must use YYYY-MM-DD format.' }, { status: 400 });
    }

    const booking = {
      provider_id: input.provider_id,
      customer_id: user.id,
      customer_name: (input.customer_name as string).trim(),
      customer_phone: (input.customer_phone as string).trim(),
      service_name: (input.service_name as string).trim(),
      service_category: (input.service_category as string).trim(),
      request_type: input.request_type === 'quote' ? 'quote' : 'booking',
      location: (input.location as string).trim(),
      description: typeof input.description === 'string' ? input.description.trim() : null,
      scheduled_date: input.scheduled_date || null,
      scheduled_time: typeof input.scheduled_time === 'string' ? input.scheduled_time.slice(0, 30) : null,
      urgency: input.urgency === 'urgent' ? 'urgent' : 'normal',
      payment_method: typeof input.payment_method === 'string' ? input.payment_method.slice(0, 80) : null,
      status: 'requested',
      payment_status: 'pending',
    };
    const { data, error } = await supabase.from('bookings').insert(booking).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Booking could not be created.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}