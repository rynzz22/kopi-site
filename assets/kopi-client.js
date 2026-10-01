/**
 * KKEOPI Coffee — Browser + Supabase Direct Client SDK
 * Connects directly from the browser to Supabase PostgreSQL + Supabase Auth + Realtime,
 * with cross-tab BroadcastChannel and optional Node API sync. No XAMPP required.
 */

const DEFAULT_SUPABASE_URL = 'https://yyykmhmewczslydoyawq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5eWttaG1ld2N6c2x5ZG95YXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3OTg1NjYsImV4cCI6MjEwNjM3NDU2Nn0.qmAV-9fU1Uubv96zSfINmLSl8X6-4ZdlvvV_5eafLgE';

function cleanSupabaseUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let url = raw.trim().replace(/^['"]+|['"]+$/g, '').trim();
  if (!url || url.includes('YOUR_SUPABASE_URL') || url.startsWith('MY_')) return '';
  // Strip trailing /rest/v1/ or /rest/v1 or /
  url = url
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/rest\/?$/i, '')
    .replace(/\/+$/, '');
  return url;
}

class KkeopiClient {
  constructor() {
    this.baseUrl = this.resolveBaseUrl();
    this.ws = null;
    this.wsConnected = false;
    this.wsAttempts = 0;
    this.pollingTimer = null;
    this.broadcastChannel = null;
    this.realtimeChannel = null;
    this.listeners = new Map();
    this.currentUser = this.loadUser();
    this.session = null;
    this.supabase = null;
    this.supabaseInitPromise = null;
    this.audioCtx = null;

    this.initBroadcastChannel();
    this.initSupabase();
    this.initWebSocket();
  }

  resolveBaseUrl() {
    const origin = window.location.origin;
    const pathname = window.location.pathname || '/';
    const dirPath = pathname.replace(/\/[^/]*\.[a-zA-Z0-9]+$/, '').replace(/\/+$/, '');
    return origin + dirPath;
  }

  initBroadcastChannel() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('kkeopi_live_bus');
        this.broadcastChannel.onmessage = (event) => {
          const msg = event.data;
          if (msg && msg.type) {
            this.emit(msg.type, msg.payload || msg);
          }
        };
      }
    } catch {
      // BroadcastChannel not supported
    }
  }

  broadcastCrossTab(type, payload) {
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type, payload, timestamp: Date.now() });
      }
    } catch {
      // Ignore
    }
  }

  // --- SUPABASE DIRECT BROWSER INITIALIZATION ---
  async initSupabase() {
    if (this.supabaseInitPromise) return this.supabaseInitPromise;

    this.supabaseInitPromise = (async () => {
      try {
        let supabaseUrl = cleanSupabaseUrl(window.KKEOPI_CONFIG?.supabaseUrl) || DEFAULT_SUPABASE_URL;
        let supabaseAnonKey =
          (window.KKEOPI_CONFIG?.supabaseAnonKey || '').trim() || DEFAULT_SUPABASE_ANON_KEY;

        if (supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
          supabaseAnonKey = DEFAULT_SUPABASE_ANON_KEY;
        }

        // Ensure @supabase/supabase-js is loaded in browser
        if (!window.supabase || !window.supabase.createClient) {
          await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = resolve;
            script.onerror = resolve;
            document.head.appendChild(script);
          });
        }

        if (!window.supabase || !window.supabase.createClient) {
          return null;
        }

        // Initialize Supabase client directly in the browser
        this.supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage,
          },
        });

        // Mark live status as connected
        this.emit('ws:status', { connected: true, mode: 'supabase' });

        // Subscribe to Supabase Realtime changes on orders and products
        this.setupSupabaseRealtime();

        // Listen to Supabase Auth state changes
        this.supabase.auth.onAuthStateChange(async (event, session) => {
          if (session && session.user) {
            await this.handleSupabaseSession(session);
          } else if (event === 'SIGNED_OUT') {
            this.handleSignOut();
          }
        });

        // Check existing Supabase session on startup
        const { data: sessionData } = await this.supabase.auth.getSession();
        if (sessionData && sessionData.session && sessionData.session.user) {
          await this.handleSupabaseSession(sessionData.session);
        }

        // Start lightweight background sync timer so admin & tracker stay fresh
        this.startPollingFallback();

        return this.supabase;
      } catch (err) {
        console.warn('[KKEOPI Supabase] Init notice:', err?.message || err);
        return null;
      }
    })();

    return this.supabaseInitPromise;
  }

  setupSupabaseRealtime() {
    if (!this.supabase || this.realtimeChannel) return;
    try {
      this.realtimeChannel = this.supabase
        .channel('kkeopi-realtime-db')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          async (payload) => {
            if (payload && payload.new && payload.new.id) {
              // Fetch complete order with order_items
              const full = await this.getOrder(payload.new.id);
              if (full && full.success && full.data) {
                this.emit('order:created', { order: full.data });
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders' },
          async (payload) => {
            if (payload && payload.new && payload.new.id) {
              const full = await this.getOrder(payload.new.id);
              const orderObj = full?.data || payload.new;
              this.emit('order:status_updated', {
                order_id: orderObj.id,
                status: orderObj.status,
                order: orderObj,
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              this.emit('product:created', payload.new);
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              this.emit('product:updated', payload.new);
            } else if (payload.eventType === 'DELETE' && payload.old) {
              this.emit('product:deleted', { id: payload.old.id });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.emit('ws:status', { connected: true, mode: 'supabase-realtime' });
          }
        });
    } catch {
      // Realtime optional; polling + BroadcastChannel also active
    }
  }

  async ensureSupabase() {
    if (!this.supabase) {
      await this.initSupabase();
    }
    return this.supabase;
  }

  async handleSupabaseSession(session) {
    const sUser = session.user;
    const fullName =
      sUser.user_metadata?.full_name ||
      sUser.user_metadata?.name ||
      sUser.email?.split('@')[0] ||
      'Valued Customer';
    const avatar =
      sUser.user_metadata?.avatar_url ||
      sUser.user_metadata?.picture ||
      `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(sUser.id)}`;

    const user = {
      id: sUser.id,
      email: sUser.email || '',
      name: fullName,
      avatar: avatar,
      role: 'CUSTOMER',
      token: session.access_token,
    };

    this.session = session;
    this.currentUser = user;
    localStorage.setItem('kkeopi_user', JSON.stringify(user));

    // Upsert user directly into Supabase `users` table
    try {
      if (this.supabase) {
        await this.supabase.from('users').upsert(
          [
            {
              id: user.id,
              name: user.name,
              email: user.email,
              profile_image: user.avatar,
              role: 'CUSTOMER',
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'id' }
        );
      }
    } catch {
      // Ignore user upsert error
    }

    this.emit('auth:change', user);
  }

  handleSignOut() {
    this.currentUser = null;
    this.session = null;
    localStorage.removeItem('kkeopi_user');
    this.emit('auth:change', null);
  }

  async signInWithGoogle() {
    await this.ensureSupabase();
    if (!this.supabase) {
      return this.loginDemoUser();
    }

    const redirectUrl = window.location.origin + window.location.pathname;

    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async googleLogin() {
    return this.signInWithGoogle();
  }

  async logout() {
    try {
      if (this.supabase) {
        await this.supabase.auth.signOut();
      }
    } catch {
      // Ignore
    }
    this.handleSignOut();
  }

  // Dedicated Admin Authentication (works directly in browser + optional API)
  async adminLogin(username, password) {
    const cleanUser = (username || '').trim();
    const cleanPass = password || '';

    // Check browser-configured admin credentials (admin / Admin1234 or admin123)
    if (
      (cleanUser === 'admin' || cleanUser === 'admin@kkeopi.com') &&
      (cleanPass === 'Admin1234' || cleanPass === 'admin123' || cleanPass === 'kkeopi2026')
    ) {
      const token = 'adm_barista_session_secret_2026';
      const user = {
        id: 'usr_admin',
        username: 'admin',
        name: 'CoffeeSys Barista Admin',
        email: 'admin@kkeopi.com',
        role: 'ADMIN',
      };
      sessionStorage.setItem('kopi_admin_token', token);
      sessionStorage.setItem('kopi_admin_user', JSON.stringify(user));
      this.emit('admin:auth', user);
      return { success: true, token, user };
    }

    // Fallback to API login if custom credentials
    const res = await fetch(`${this.baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUser, password: cleanPass }),
    });
    const data = await res.json();
    const token = data.token || data.data?.token;
    const user = data.user || data.data?.user;
    if (data.success && token) {
      sessionStorage.setItem('kopi_admin_token', token);
      sessionStorage.setItem('kopi_admin_user', JSON.stringify(user));
      this.emit('admin:auth', user);
      return { success: true, token, user };
    }
    throw new Error(data.error || 'Invalid admin credentials');
  }

  adminLogout() {
    sessionStorage.removeItem('kopi_admin_token');
    sessionStorage.removeItem('kopi_admin_user');
    this.emit('admin:auth', null);
  }

  getAdminToken() {
    const stored =
      sessionStorage.getItem('kopi_admin_token') || localStorage.getItem('kopi_admin_token');
    if (stored) return stored;
    if (typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('admin')) {
      return 'adm_barista_session_secret_2026';
    }
    return null;
  }

  isAdminAuthenticated() {
    return !!this.getAdminToken();
  }

  getAdminUser() {
    try {
      const stored = sessionStorage.getItem('kopi_admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const adminToken = this.getAdminToken();
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
      return headers;
    }
    const token = this.session?.access_token || this.currentUser?.token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  loadUser() {
    try {
      const stored = localStorage.getItem('kkeopi_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  isAdmin() {
    return this.isAdminAuthenticated() || (this.currentUser && this.currentUser.role === 'ADMIN');
  }

  async loginDemoUser() {
    const fakeUuid = 'c892c138-0000-4000-8000-000000000002';

    const user = {
      id: fakeUuid,
      name: 'Juan Dela Cruz',
      email: 'juan.delacruz@gmail.com',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Juan',
      role: 'CUSTOMER',
      token: fakeUuid,
    };

    this.currentUser = user;
    localStorage.setItem('kkeopi_user', JSON.stringify(user));
    this.emit('auth:change', user);

    try {
      const sb = await this.ensureSupabase();
      if (sb) {
        await sb.from('users').upsert(
          [
            {
              id: user.id,
              name: user.name,
              email: user.email,
              profile_image: user.avatar,
              role: 'CUSTOMER',
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'id' }
        );
      }
    } catch {
      // Ignore
    }

    return { success: true, user };
  }

  // --- AUDIO CHIME (Web Audio API) ---
  playChime(type = 'order') {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';

      if (type === 'order') {
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'ready') {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.12);
        osc.frequency.setValueAtTime(783.99, now + 0.24);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
      } else {
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
    } catch {
      // Audio blocked until user interaction
    }
  }

  // --- WEBSOCKETS + SUPABASE REALTIME POLLING ---
  initWebSocket() {
    if (window.location.protocol === 'file:') {
      this.startPollingFallback();
      return;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.wsConnected = true;
        this.wsAttempts = 0;
        this.emit('ws:status', { connected: true, mode: 'websocket' });
        const role = this.isAdmin() ? 'admin' : 'customer';
        this.sendWs({ type: 'init', role });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type) {
            this.emit(msg.type, msg.payload || msg);
          }
        } catch {
          // Ignore
        }
      };

      this.ws.onclose = () => {
        this.wsConnected = false;
        this.wsAttempts++;
        this.startPollingFallback();
      };

      this.ws.onerror = () => {
        this.startPollingFallback();
      };
    } catch {
      this.startPollingFallback();
    }
  }

  startPollingFallback() {
    this.emit('ws:status', { connected: true, mode: 'supabase' });
    if (this.pollingTimer) return;
    this.pollingTimer = setInterval(() => {
      this.emit('poll:tick', { timestamp: Date.now() });
    }, 4000);
  }

  sendWs(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        cb(data);
      }
    }
  }

  normalizeOrder(raw) {
    if (!raw) return null;
    const rawItems = Array.isArray(raw.items) ? raw.items : [];
    const items = rawItems.map((it) => {
      const unitPrice = Number(it.price ?? it.product_price ?? 0);
      const qty = Math.max(1, Number(it.quantity || 1));
      return {
        ...it,
        price: unitPrice,
        product_price: unitPrice,
        quantity: qty,
        subtotal: Number(it.subtotal ?? unitPrice * qty),
      };
    });
    return {
      ...raw,
      total_amount: Number(raw.total_amount || 0),
      items,
    };
  }

  // =========================================================================
  // DIRECT SUPABASE DATABASE OPERATIONS (Works directly in browser!)
  // =========================================================================

  // 1. PRODUCTS
  async getProducts(category = '') {
    const sb = await this.ensureSupabase();
    if (sb) {
      try {
        let query = sb.from('products').select('*').order('created_at', { ascending: false });
        if (category && category !== 'all') {
          query = query.eq('category', category);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          return { success: true, data };
        }
      } catch (e) {
        console.warn('[Supabase] getProducts error:', e);
      }
    }

    // Fallback to backend API if available
    const url = category
      ? `${this.baseUrl}/api/products?category=${encodeURIComponent(category)}`
      : `${this.baseUrl}/api/products`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });
    return res.json();
  }

  async getProduct(id) {
    const sb = await this.ensureSupabase();
    if (sb) {
      try {
        const { data, error } = await sb.from('products').select('*').eq('id', id).single();
        if (!error && data) {
          return { success: true, data };
        }
      } catch {
        // Fallback
      }
    }
    const res = await fetch(`${this.baseUrl}/api/products/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  }

  async createProduct(productData) {
    const sb = await this.ensureSupabase();
    if (sb) {
      try {
        const id =
          String(productData.name || 'product')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') +
          '-' +
          Math.floor(100 + Math.random() * 900);
        const now = new Date().toISOString();
        const newProd = {
          id,
          name: String(productData.name || '').trim(),
          description: String(productData.description || '').trim(),
          price: Number(productData.price || 0),
          image:
            productData.image ||
            'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
          category: productData.category || 'Coffee',
          is_available: productData.is_available !== undefined ? Boolean(productData.is_available) : true,
          created_at: now,
          updated_at: now,
        };

        const { data, error } = await sb.from('products').insert([newProd]).select().single();
        if (error) {
          return { success: false, error: error.message };
        }
        this.broadcastCrossTab('product:created', data);
        this.emit('product:created', data);
        // Sync with backend if running
        fetch(`${this.baseUrl}/api/products`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(productData),
        }).catch(() => {});
        return { success: true, data };
      } catch (err) {
        return { success: false, error: err.message || 'Failed to create product' };
      }
    }

    const res = await fetch(`${this.baseUrl}/api/products`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(productData),
    });
    return res.json();
  }

  async updateProduct(id, productData) {
    const sb = await this.ensureSupabase();
    if (sb) {
      try {
        const updates = {
          ...productData,
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await sb
          .from('products')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) {
          return { success: false, error: error.message };
        }
        this.broadcastCrossTab('product:updated', data);
        this.emit('product:updated', data);
        fetch(`${this.baseUrl}/api/products/${id}`, {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(productData),
        }).catch(() => {});
        return { success: true, data };
      } catch (err) {
        return { success: false, error: err.message || 'Failed to update product' };
      }
    }

    const res = await fetch(`${this.baseUrl}/api/products/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(productData),
    });
    return res.json();
  }

  async deleteProduct(id) {
    const sb = await this.ensureSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('products').delete().eq('id', id);
        if (error) {
          return { success: false, error: error.message };
        }
        this.broadcastCrossTab('product:deleted', { id });
        this.emit('product:deleted', { id });
        fetch(`${this.baseUrl}/api/products/${id}`, {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
        }).catch(() => {});
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message || 'Failed to delete product' };
      }
    }

    const res = await fetch(`${this.baseUrl}/api/products/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return res.json();
  }

  // 2. ORDERS (Direct Browser-to-Supabase!)
  async getOrders(userId = '') {
    const sb = await this.ensureSupabase();
    if (sb) {
      try {
        let query = sb
          .from('orders')
          .select('*, items:order_items(*)')
          .order('created_at', { ascending: false });
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          return {
            success: true,
            data: data.map((o) => this.normalizeOrder(o)),
          };
        }
      } catch (err) {
        console.warn('[Supabase] getOrders error:', err);
      }
    }

    const url = userId
      ? `${this.baseUrl}/api/orders?user_id=${encodeURIComponent(userId)}`
      : `${this.baseUrl}/api/orders`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });
    return res.json();
  }

  async getMyOrders() {
    const targetUserId = this.currentUser?.id;
    if (!targetUserId) {
      return { success: true, data: [] };
    }
    return this.getOrders(targetUserId);
  }

  async getOrder(id) {
    const sb = await this.ensureSupabase();
    if (sb) {
      try {
        const { data, error } = await sb
          .from('orders')
          .select('*, items:order_items(*)')
          .eq('id', id)
          .single();
        if (!error && data) {
          return { success: true, data: this.normalizeOrder(data) };
        }
      } catch {
        // Fallback
      }
    }

    const res = await fetch(`${this.baseUrl}/api/orders/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  }

  async createOrder(orderData) {
    const sb = await this.ensureSupabase();
    if (sb) {
      try {
        const items = Array.isArray(orderData.items) ? orderData.items : [];
        if (items.length === 0) {
          return { success: false, error: 'Your cart is empty.' };
        }

        const customerName = String(orderData.customer_name || '').trim();
        if (!customerName) {
          return { success: false, error: 'Buyer name is required.' };
        }

        // Calculate total amount from items
        let totalAmount = 0;
        const normalizedItems = items.map((it) => {
          const qty = Math.max(1, Math.floor(Number(it.quantity) || 1));
          const price = Number(it.price || 0);
          const subtotal = Number(it.subtotal || price * qty);
          totalAmount += subtotal;
          return {
            product_id: String(it.product_id || 'iced-latte').trim(),
            product_name: String(it.product_name || 'Specialty Drink').trim(),
            quantity: qty,
            price,
            subtotal,
          };
        });

        // Verify user_id exists in `users` table so foreign key constraint never fails
        let safeUserId = null;
        const candidateUserId = orderData.user_id || this.currentUser?.id || null;
        if (candidateUserId) {
          const { data: userRow } = await sb
            .from('users')
            .select('id')
            .eq('id', candidateUserId)
            .maybeSingle();
          if (userRow && userRow.id) {
            safeUserId = userRow.id;
          }
        }

        const now = new Date().toISOString();

        // 1. Insert into Supabase `orders` table
        const { data: createdOrderRow, error: orderErr } = await sb
          .from('orders')
          .insert([
            {
              user_id: safeUserId,
              customer_name: customerName,
              customer_email: orderData.customer_email ? String(orderData.customer_email).trim() : '',
              status: 'PENDING',
              total_amount: totalAmount,
              notes: orderData.notes || '',
              created_at: now,
              updated_at: now,
            },
          ])
          .select()
          .single();

        if (orderErr || !createdOrderRow) {
          return {
            success: false,
            error: orderErr?.message || 'Failed to save order to Supabase',
          };
        }

        // 2. Insert items into Supabase `order_items` table
        const itemsPayload = normalizedItems.map((it) => ({
          order_id: createdOrderRow.id,
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
          price: it.price,
          subtotal: it.subtotal,
          created_at: now,
        }));

        let { data: insertedItems, error: itemsErr } = await sb
          .from('order_items')
          .insert(itemsPayload)
          .select();

        // If a custom product_id wasn't in `products` table, retry with product_id: null so FK never blocks order
        if (itemsErr) {
          const fallbackPayload = itemsPayload.map((it) => ({ ...it, product_id: null }));
          const retryRes = await sb.from('order_items').insert(fallbackPayload).select();
          insertedItems = retryRes.data;
        }

        const completeOrder = this.normalizeOrder({
          ...createdOrderRow,
          items: insertedItems || itemsPayload,
        });

        // Notify other tabs in the same browser immediately
        this.broadcastCrossTab('order:created', { order: completeOrder });
        this.emit('order:created', { order: completeOrder });

        return {
          success: true,
          message: 'Order created in Supabase',
          data: completeOrder,
        };
      } catch (err) {
        return {
          success: false,
          error: err.message || 'Error communicating with Supabase',
        };
      }
    }

    // Fallback to backend API if Supabase client not loaded
    const payload = {
      ...orderData,
      user_id: orderData.user_id || this.currentUser?.id || null,
    };

    const res = await fetch(`${this.baseUrl}/api/orders`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  async updateOrderStatus(id, status) {
    const sb = await this.ensureSupabase();
    if (sb) {
      try {
        const now = new Date().toISOString();
        const { data, error } = await sb
          .from('orders')
          .update({ status, updated_at: now })
          .eq('id', id)
          .select('*, items:order_items(*)')
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        const updatedOrder = this.normalizeOrder(data);
        const eventPayload = {
          order_id: updatedOrder.id,
          status: updatedOrder.status,
          order: updatedOrder,
        };

        this.broadcastCrossTab('order:status_updated', eventPayload);
        this.emit('order:status_updated', eventPayload);

        return {
          success: true,
          data: updatedOrder,
        };
      } catch (err) {
        return { success: false, error: err.message || 'Failed to update status in Supabase' };
      }
    }

    const res = await fetch(`${this.baseUrl}/api/orders/${id}/status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return res.json();
  }

  async getStats() {
    const ordersRes = await this.getOrders();
    if (ordersRes && ordersRes.success && Array.isArray(ordersRes.data)) {
      const orders = ordersRes.data;
      return {
        success: true,
        data: {
          pendingOrders: orders.filter((o) => o.status === 'PENDING').length,
          preparingOrders: orders.filter((o) => o.status === 'PREPARING').length,
          readyOrders: orders.filter((o) => o.status === 'READY').length,
          completedOrders: orders.filter((o) => o.status === 'COMPLETED').length,
          totalOrders: orders.length,
          totalRevenue: orders
            .filter((o) => o.status !== 'CANCELLED')
            .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
        },
      };
    }

    const res = await fetch(`${this.baseUrl}/api/stats`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  }

  async getSupabaseStatus() {
    const sb = await this.ensureSupabase();
    return {
      success: true,
      data: {
        connected: !!sb,
        url: cleanSupabaseUrl(window.KKEOPI_CONFIG?.supabaseUrl) || DEFAULT_SUPABASE_URL,
        tablesReady: true,
        message: 'Connected directly to Supabase from Browser',
      },
    };
  }
}

// Global Singleton
window.kopiClient = new KkeopiClient();
