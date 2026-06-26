// Client Supabase unique (clé ANON uniquement — JAMAIS la service_role côté app).
// L'app ne parle jamais à l'ESP32 : elle lit `readings`/`care_log` et écrit `care_log`.
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Variables manquantes : EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (voir .env.example).',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // Pas d'auth utilisateur : un seul appareil, une seule utilisatrice.
    persistSession: false,
    autoRefreshToken: false,
  },
});
