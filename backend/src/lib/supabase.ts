import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const currentModuleDirectory = path.dirname(fileURLToPath(import.meta.url));

function loadSharedEnvFiles() {
  const candidateDirectories = Array.from(new Set([
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(currentModuleDirectory, '..', '..'),
    path.resolve(currentModuleDirectory, '..', '..', '..'),
  ]));

  for (const directory of candidateDirectories) {
    for (const fileName of ['.env', '.env.local', '.env.development', '.env.production']) {
      const filePath = path.join(directory, fileName);
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const equalsIndex = trimmed.indexOf('=');
        if (equalsIndex === -1) continue;

        const key = trimmed.slice(0, equalsIndex).trim();
        const value = trimmed.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!key || process.env[key] !== undefined) continue;

        process.env[key] = value;
      }
    }
  }

  if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  }
  if (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_PUBLISHABLE_KEY && process.env.VITE_SUPABASE_ANON_KEY) {
    process.env.SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
  }
}

loadSharedEnvFiles();

function getConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY in the project .env or backend/.env.local.');
  return { url, key };
}

function createSupabase(accessToken?: string): SupabaseClient {
  const { url, key } = getConfig();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {}),
  });
}

export function getPublicSupabase(accessToken?: string) {
  return createSupabase(accessToken);
}

export async function getRequestContext(request: Request): Promise<{
  supabase: SupabaseClient;
  user: User | null;
  authError: string | null;
}> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabase = createSupabase(token);
  if (!token) return { supabase, user: null, authError: 'Sign in is required.' };

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { supabase, user: null, authError: 'Your session is invalid or expired.' };
  return { supabase, user: data.user, authError: null };
}