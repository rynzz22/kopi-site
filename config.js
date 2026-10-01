/**
 * KKEOPI — Browser + Supabase Configuration
 * Loaded before assets/kopi-client.js on every page.
 * Works directly in the browser without XAMPP.
 */

window.KKEOPI_CONFIG = {
  // Automatically sanitized in kopi-client.js even if /rest/v1/ is appended
  supabaseUrl: 'https://yyykmhmewczslydoyawq.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5eWttaG1ld2N6c2x5ZG95YXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3OTg1NjYsImV4cCI6MjEwNjM3NDU2Nn0.qmAV-9fU1Uubv96zSfINmLSl8X6-4ZdlvvV_5eafLgE',
  adminUser: 'admin',
  adminEmail: 'admin@kkeopi.com',
};
