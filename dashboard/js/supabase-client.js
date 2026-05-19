import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL      = 'https://izzxupiukzbmgmijqvru.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6enh1cGl1a3pibWdtaWpxdnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTUwNjgsImV4cCI6MjA5NDQzMTA2OH0.swTI1SVX0k9RnSG3ayeT083wH_ew8N9SrM5udMw2bD4';
export const REGISTRATIONS_TABLE = 'registrations';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: window.localStorage,
    storageKey: '10x10-admin-auth',
  },
});

export async function requireSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace('./login.html');
    return null;
  }
  return session;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.replace('./login.html');
}
