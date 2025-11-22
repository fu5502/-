import { createClient } from '@supabase/supabase-js';

// Safely access environment variables. 
// We use a fallback empty object because import.meta.env might be undefined in some environments.
const env = (import.meta as any).env || {};

// Use environment variables or fallback to provided hardcoded keys (Safe for Supabase Anon Key)
const supabaseUrl = env.VITE_SUPABASE_URL || "https://rzlpyqcvrglpfkbmwlsa.supabase.co";
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bHB5cWN2cmdscGZrYm13bHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MDc5NjksImV4cCI6MjA3OTM4Mzk2OX0.kKIBQtVCBFhclsE3BqkyorEB8Zb1VM6IoqRd533Nr4I";

// Create a single supabase client for interacting with your database
// If keys are missing, this will return null, and the UI will fallback to local storage
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;