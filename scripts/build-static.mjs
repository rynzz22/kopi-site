import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(root, 'dist');
// Only remove this project's generated output, never source directories.
if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== 'dist') {
  throw new Error('Unexpected static output directory');
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// Explicit allowlist: no PHP, server bundles, SQL, .env, or customer data.
const files = [
  'index.html', 'KKEOPI.html', 'products.html', 'about.html',
  'gallery.html', 'admin.html', 'order-status.html',
  'KKEOPI.css', 'products.css', 'about.css', 'gallery.css',
  'KKEOPI.js', 'products.js', 'config.js', 'assets',
];
for (const file of files) {
  await cp(path.join(root, file), path.join(output, file), { recursive: true });
}

// Use the existing public Supabase config by default. Optional Vercel env
// overrides allow a separate preview database. Only these two public values
// can enter the browser; never copy a service-role key or admin password.
const configPath = path.join(output, 'config.js');
const source = await readFile(configPath, 'utf8');
const overrides = { disableLocalWebSocket: true, staticHosting: true };
if (process.env.SUPABASE_URL) overrides.supabaseUrl = process.env.SUPABASE_URL;
if (process.env.SUPABASE_ANON_KEY) overrides.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
await writeFile(configPath, source + '\nObject.assign(window.KKEOPI_CONFIG, ' + JSON.stringify(overrides) + ');\n');
console.log('Static site ready in dist. No Node/PHP backend or private files included.');
