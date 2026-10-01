/**
 * KKEOPI — Supabase Configuration
 * ─────────────────────────────────────────────────────────────────
 * 1. Go to https://supabase.com → your project → Settings → API
 * 2. Copy "Project URL" and "anon / public" key
 * 3. Paste them below and save
 * ─────────────────────────────────────────────────────────────────
 * This file is loaded before kopi-client.js on every page.
 */

window.KKEOPI_CONFIG = {
  supabaseUrl:     'YOUR_SUPABASE_URL',        // e.g. https://xyzabcdef.supabase.co
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',   // eyJhbGci...
  adminEmail:      'admin@kkeopi.com',          // default admin email (for display only)
};
