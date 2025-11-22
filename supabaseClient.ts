import { createClient } from '@supabase/supabase-js';

// Safely access environment variables. 
// We use a fallback empty object because import.meta.env might be undefined in some environments.
const env = (import.meta as any).env || {};

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

// Create a single supabase client for interacting with your database
// If keys are missing, this will return null, and the UI will fallback to local storage
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;