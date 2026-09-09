/**
 * KKEOPI Coffee — Shared Client SDK
 * Handles REST API calls, WebSockets, Google Auth, and Real-Time Notifications
 */

class KkeopiClient {
  constructor() {
    this.baseUrl = window.location.origin;
    this.ws = null;
    this.listeners = new Map();
    this.currentUser = this.loadUser();
    this.session = null;
    this.supabase = null;
    this.supabaseInitPromise = null;
    this.audioCtx = null;

    this.initWebSocket();
    this.initSupabase();
  }

  // --- SUPABASE AUTHENTICATION INTEGRATION ---
  async initSupabase() {
    if (this.supabaseInitPromise) return this.supabaseInitPromise;

    this.supabaseInitPromise = (async () => {
      try {
        // 1. Fetch public Supabase configuration from Laravel/Express API
        const configRes = await fetch(`${this.baseUrl}/api/auth/config`).then((r) => r.json());
        if (!configRes.success || !configRes.data || !configRes.data.supabaseUrl) {
          console.warn('[Supabase Auth] Public Supabase config not available from API');
          return;
        }

        const { supabaseUrl, supabaseAnonKey } = configRes.data;

        // 2. Ensure @supabase/supabase-js is loaded in browser
        if (!window.supabase) {
          await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = resolve;
            script.onerror = resolve;
            document.head.appendChild(script);
          });
        }

        if (!window.supabase || !window.supabase.createClient) {
          console.warn('[Supabase Auth] Supabase client library could not be loaded');
          return;
        }

        // 3. Initialize Supabase Auth client
        this.supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage,
          },
        });

        // 4. Listen to Supabase Auth state changes (Google OAuth login, callback, session refresh, signout)
        this.supabase.auth.onAuthStateChange(async (event, session) => {
          if (session && session.user) {
            await this.handleSupabaseSession(session);
          } else if (event === 'SIGNED_OUT') {
            this.handleSignOut();
          }
        });

        // 5. Check existing Supabase session on startup
        const { data: sessionData } = await this.supabase.auth.getSession();
        if (sessionData && sessionData.session && sessionData.session.user) {
          await this.handleSupabaseSession(sessionData.session);
        }
      } catch (err) {
        console.warn('[Supabase Auth] Initialization note:', err?.message || err);
      }
    })();

    return this.supabaseInitPromise;
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
      id: sUser.id, // Stable Supabase Auth UUID
      email: sUser.email || '',
      name: fullName,
      avatar: avatar,
      role: 'CUSTOMER', // Strict security: Google OAuth users are always customers
      token: session.access_token,
    };

    this.session = session;
    this.currentUser = user;
    localStorage.setItem('kkeopi_user', JSON.stringify(user));

    // Synchronize authenticated Supabase user identity with Laravel / DB
    try {
      await fetch(`${this.baseUrl}/api/auth/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
        }),
      });
    } catch (e) {
      console.warn('[Supabase Auth] Backend sync notice:', e);
    }

    this.emit('auth:change', user);
    this.sendWs({ type: 'init', role: this.isAdmin() ? 'admin' : 'customer' });
  }

  handleSignOut() {
    this.currentUser = null;
    this.session = null;
    localStorage.removeItem('kkeopi_user');
    this.emit('auth:change', null);
    this.sendWs({ type: 'init', role: 'customer' });
  }

  /**
   * Supabase Google OAuth Sign-In
   * Customer clicks "Continue with Google"
   * -> Supabase Auth redirects to Google OAuth
   * -> Customer returns to application
   * -> Supabase manages authenticated session
   */
  async signInWithGoogle() {
    await this.ensureSupabase();
    if (!this.supabase) {
      throw new Error('Supabase Auth is connecting. Please try again.');
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
      console.error('[Supabase Auth] Google OAuth error:', error);
      throw error;
    }

    return data;
  }

  // Alias for backward compatibility
  async googleLogin() {
    return this.signInWithGoogle();
  }

  async logout() {
    try {
      if (this.supabase) {
        await this.supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('[Supabase Auth] Logout notice:', e);
    }
    this.handleSignOut();
  }

  // Dedicated Admin Authentication
  async adminLogin(username, password) {
    const res = await fetch(`${this.baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success && data.token) {
      sessionStorage.setItem('kopi_admin_token', data.token);
      sessionStorage.setItem('kopi_admin_user', JSON.stringify(data.user));
      this.sendWs({ type: 'init', role: 'admin' });
      this.emit('admin:auth', data.user);
      return data;
    }
    throw new Error(data.error || 'Invalid admin credentials');
  }

  adminLogout() {
    const token = this.getAdminToken();
    if (token) {
      fetch(`${this.baseUrl}/api/admin/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    sessionStorage.removeItem('kopi_admin_token');
    sessionStorage.removeItem('kopi_admin_user');
    this.sendWs({ type: 'init', role: 'customer' });
    this.emit('admin:auth', null);
  }

  getAdminToken() {
    return sessionStorage.getItem('kopi_admin_token') || localStorage.getItem('kopi_admin_token') || null;
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

  loginDemoUser(type = 'customer') {
    const fakeUuid = 'c' + Math.random().toString(16).substring(2, 9) + '-0000-4000-8000-000000000002';

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
    this.sendWs({ type: 'init', role: 'customer' });

    // Sync with backend
    fetch(`${this.baseUrl}/api/auth/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify(user),
    }).catch(() => {});

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
        // High upbeat barista ding
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'ready') {
        // Double ding for ready
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
      } else {
        // Standard notification ping
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
    } catch (e) {
      // Audio might be blocked by autoplay policies until first user click
    }
  }

  // --- WEBSOCKETS ---
  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.emit('ws:status', { connected: true });
        // Identify role if admin or tracking order
        const role = this.isAdmin() ? 'admin' : 'customer';
        this.sendWs({ type: 'init', role });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type) {
            this.emit(msg.type, msg.payload || msg);
          }
        } catch (err) {
          console.error('[WS] Parse error', err);
        }
      };

      this.ws.onclose = () => {
        this.emit('ws:status', { connected: false });
        setTimeout(() => this.initWebSocket(), 3000);
      };

      this.ws.onerror = (err) => {
        this.emit('ws:status', { connected: false, error: err });
      };
    } catch (e) {
      console.warn('[WS] Connection failed:', e);
    }
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

  // --- REST API CALLS ---

  // Products
  async getProducts(category = '') {
    const url = category ? `${this.baseUrl}/api/products?category=${encodeURIComponent(category)}` : `${this.baseUrl}/api/products`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });
    return res.json();
  }

  async getProduct(id) {
    const res = await fetch(`${this.baseUrl}/api/products/${id}`, { headers: this.getAuthHeaders() });
    return res.json();
  }

  async createProduct(productData) {
    const res = await fetch(`${this.baseUrl}/api/products`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(productData),
    });
    return res.json();
  }

  async updateProduct(id, productData) {
    const res = await fetch(`${this.baseUrl}/api/products/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(productData),
    });
    return res.json();
  }

  async deleteProduct(id) {
    const res = await fetch(`${this.baseUrl}/api/products/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return res.json();
  }

  // Orders
  async getOrders(userId = '') {
    const url = userId ? `${this.baseUrl}/api/orders?user_id=${encodeURIComponent(userId)}` : `${this.baseUrl}/api/orders`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });
    return res.json();
  }

  // Retrieve authenticated customer's own orders
  async getMyOrders() {
    const targetUserId = this.currentUser?.id;
    const url = targetUserId
      ? `${this.baseUrl}/api/orders/my-orders?user_id=${encodeURIComponent(targetUserId)}`
      : `${this.baseUrl}/api/orders/my-orders`;

    const res = await fetch(url, { headers: this.getAuthHeaders() });
    return res.json();
  }

  async getOrder(id) {
    const res = await fetch(`${this.baseUrl}/api/orders/${id}`, { headers: this.getAuthHeaders() });
    return res.json();
  }

  async createOrder(orderData) {
    // Automatically attach authenticated Supabase user ID if available
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
    const res = await fetch(`${this.baseUrl}/api/orders/${id}/status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return res.json();
  }

  async getStats() {
    const res = await fetch(`${this.baseUrl}/api/stats`, { headers: this.getAuthHeaders() });
    return res.json();
  }

  async getSupabaseStatus() {
    const res = await fetch(`${this.baseUrl}/api/supabase/status`, { headers: this.getAuthHeaders() });
    return res.json();
  }
}

// Global Singleton
window.kopiClient = new KkeopiClient();
