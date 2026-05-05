// Supabase configuration. Replace these placeholders with the values from
// your project's "Project Settings → API" page in the Supabase dashboard.
//
//   SUPABASE_URL      = "Project URL"          (https://xxxxx.supabase.co)
//   SUPABASE_ANON_KEY = "Project API key (anon, public)"
//
// The anon key is safe to expose in client-side code — Row-Level Security
// in the database is what actually enforces who can read/write what.

export const SUPABASE_URL = 'https://pvlyujfdmiqinnfeskgl.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_kWp7pOpxv7Mi2XR8pJCG3Q_bdaBX72G';

export function isConfigured() {
  return (
    SUPABASE_URL &&
    SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' &&
    SUPABASE_ANON_KEY &&
    SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE'
  );
}
