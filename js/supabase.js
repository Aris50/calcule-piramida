// Lazy-initialised Supabase client. Imports from a CDN ESM build so there is
// no bundler/build step.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured } from './config.js';

let client = null;

export function getClient() {
  if (!isConfigured()) {
    throw new Error(
      'Supabase nu este configurat. Editează js/config.js cu URL-ul ' +
      'și cheia anonimă din proiectul tău Supabase.'
    );
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'calcule-piramida-auth',
      },
    });
  }
  return client;
}

export { isConfigured };
