import nextEnv from '@next/env';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { loadEnvConfig } = nextEnv;
const backendDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(backendDirectory, '..');

loadEnvConfig(projectDirectory, process.env.NODE_ENV !== 'production', true, true);
loadEnvConfig(backendDirectory, process.env.NODE_ENV !== 'production', true, true);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  env: {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseAnonKey,
  },
};

export default nextConfig;