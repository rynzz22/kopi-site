import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface User {
  id: string; // Stable Supabase Auth user UUID
  name: string;
  email: string;
  profile_image?: string;
  role: 'CUSTOMER' | 'ADMIN';
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: 'Coffee' | 'Non-Coffee' | 'Pastries';
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id?: number | string;
  order_id?: number | string;
  product_id: string;
  product_name: string;
  product_price: number;
  price?: number; // Kept for backwards compatibility
  quantity: number;
  subtotal: number;
  created_at?: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Order {
  id: number | string;
  user_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  status: OrderStatus;
  total_amount: number;
  notes?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

// Initial Seed Products
const SEED_PRODUCTS: Product[] = [
  {
    id: 'iced-latte',
    name: 'Iced Latte',
    description: 'Rich espresso poured over chilled silky milk and crystal clear ice cubes.',
    price: 120,
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
    category: 'Coffee',
    is_available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'spanish-latte',
    name: 'Spanish Latte',
    description: 'Double espresso combined with fresh textured milk and sweet condensed milk drizzle.',
    price: 140,
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80',
    category: 'Coffee',
    is_available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'matcha-latte',
    name: 'Matcha Latte',
    description: 'Ceremonial grade Uji Japanese matcha whisked with silky milk and gentle sweetness.',
    price: 130,
    image: 'https://cdn.shopify.com/s/files/1/0560/1699/4381/files/unnamed-1_1024x1024_a794ea7e-13eb-4360-9b3b-96cd7c8c3113.webp?v=1782242740',
    category: 'Non-Coffee',
    is_available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'caramel-macchiato',
    name: 'Caramel Macchiato',
    description: 'Velvety milk infused with vanilla, marked with dark espresso and golden caramel drizzle.',
    price: 165,
    image: 'https://frostingandfettuccine.com/wp-content/uploads/2022/12/Caramel-Iced-Coffee-6.jpg',
    category: 'Coffee',
    is_available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'hazelnut-latte',
    name: 'Hazelnut Latte',
    description: 'Smooth espresso blended with slow-roasted hazelnut cream and velvety microfoam.',
    price: 170,
    image: 'https://i.pinimg.com/736x/ca/73/28/ca732820d569e6c2a5d3f7ee340ab848.jpg',
    category: 'Coffee',
    is_available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'iced-americano',
    name: 'Iced Americano',
    description: 'Iconic Korean cafe staple: crisp iced double shot of high-altitude Arabica blend.',
    price: 110,
    image: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=800&q=80',
    category: 'Coffee',
    is_available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'strawberry-cream-latte',
    name: 'Strawberry Cream Latte',
    description: 'Chuncheon strawberry compote with real fruit chunks topped with creamy milk and cold foam.',
    price: 155,
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
    category: 'Non-Coffee',
    is_available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'peach-hibiscus-tea',
    name: 'Peach Hibiscus Tea',
    description: 'Cold-brewed Egyptian hibiscus infused with sweet white peach puree and edible blossoms.',
    price: 145,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80',
    category: 'Non-Coffee',
    is_available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'butter-croissant',
    name: 'Artisan Butter Croissant',
    description: 'Flaky, 36-layer French butter croissant baked fresh every morning with golden crumb.',
    price: 95,
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80',
    category: 'Pastries',
    is_available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'apple-turnover',
    name: 'Spiced Apple Turnover',
    description: 'Crisp puff pastry pocket filled with slow-simmered cinnamon Fuji apples and raw sugar glaze.',
    price: 110,
    image: 'https://sallysbakingaddiction.com/wp-content/uploads/2013/09/homemade-apple-turnovers-2-600x600.jpg',
    category: 'Pastries',
    is_available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pain-au-chocolat',
    name: 'Pain au Chocolat',
    description: 'Buttery laminated pastry dough folded around double batons of 70% dark Valrhona chocolate.',
    price: 105,
    image: 'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?auto=format&fit=crop&w=800&q=80',
    category: 'Pastries',
    is_available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

class DatabaseService {
  private supabase: SupabaseClient | null = null;
  private isSupabaseConnected = false;
  private supabaseStatusMessage = 'Local file storage active';
  private storageFile = path.resolve(process.cwd(), 'data', 'kopi_store.json');
  private memoryStore: {
    users: User[];
    products: Product[];
    orders: Order[];
    nextOrderId: number;
  };

  constructor() {
    this.memoryStore = {
      users: [
        {
          id: 'usr_admin',
          name: 'Barista Admin',
          email: 'admin@kkeopi.com',
          profile_image: 'https://api.dicebear.com/7.x/bottts/svg?seed=kkeopi_barista',
          role: 'ADMIN',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      products: [...SEED_PRODUCTS],
      orders: [],
      nextOrderId: 1024,
    };

    this.loadFromDisk();
    this.initSupabase();
  }

  private sanitizeSupabaseUrl(rawUrl?: string): string | null {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let url = rawUrl.trim();
    // Strip trailing /rest/v1 or /rest/v1/ or /rest
    url = url.replace(/\/rest\/v1\/?$/i, '').replace(/\/rest\/?$/i, '').replace(/\/+$/, '');
    return url.startsWith('http') ? url : null;
  }

  private loadFromDisk() {
    try {
      const dataDir = path.dirname(this.storageFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.products && parsed.products.length > 0) {
          this.memoryStore = parsed;
        }
      } else {
        this.saveToDisk();
      }
    } catch (err) {
      console.error('[DB] Failed to load local store:', err);
    }
  }

  private saveToDisk() {
    try {
      const dataDir = path.dirname(this.storageFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.storageFile, JSON.stringify(this.memoryStore, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to save local store:', err);
    }
  }

  public async initSupabase() {
    const rawUrl = process.env.SUPABASE_URL;
    const url = this.sanitizeSupabaseUrl(rawUrl);
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

    if (url && key) {
      try {
        this.supabase = createClient(url, key, {
          auth: { persistSession: false },
        });

        // Test query against products table
        const { error } = await this.supabase.from('products').select('id').limit(1);
        if (!error) {
          this.isSupabaseConnected = true;
          this.supabaseStatusMessage = 'Connected to remote Supabase PostgreSQL';
          console.log('[DB] Connected successfully to Supabase PostgreSQL database.');

          // Sync any seed products if remote table is empty
          try {
            const { count } = await this.supabase.from('products').select('*', { count: 'exact', head: true });
            if (count === 0) {
              await this.supabase.from('products').insert(this.memoryStore.products);
              console.log('[DB] Seeded initial products to remote Supabase table.');
            }
          } catch (syncErr) {
            console.warn('[DB] Supabase product sync note:', syncErr);
          }
        } else {
          this.isSupabaseConnected = false;
          if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
            this.supabaseStatusMessage = 'Supabase credentials verified. Remote tables not yet generated (run supabase_schema.sql). Operating on persistent local storage.';
            console.log(`[DB] Supabase project connected (${url}). Schema tables not yet created — operating seamlessly on persistent local storage.`);
          } else {
            this.supabaseStatusMessage = `Supabase notice: ${error.message}`;
            console.log('[DB] Supabase check notice:', error.message);
          }
        }
      } catch (err: any) {
        this.isSupabaseConnected = false;
        this.supabaseStatusMessage = err?.message || 'Connection error';
        console.warn('[DB] Supabase connection notice:', err?.message);
      }
    } else {
      this.isSupabaseConnected = false;
      this.supabaseStatusMessage = 'Operating on local storage';
    }
  }

  public getSupabaseStatus() {
    const cleanUrl = this.sanitizeSupabaseUrl(process.env.SUPABASE_URL);
    return {
      connected: this.isSupabaseConnected,
      url: cleanUrl || 'Local in-memory / JSON store',
      tablesReady: this.isSupabaseConnected,
      message: this.supabaseStatusMessage,
      ordersCount: this.memoryStore.orders.length,
      productsCount: this.memoryStore.products.length,
    };
  }

  // --- PRODUCTS ---
  public async getProducts(category?: string): Promise<Product[]> {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        let q = this.supabase.from('products').select('*').order('created_at', { ascending: false });
        if (category && category !== 'all') {
          q = q.eq('category', category);
        }
        const { data, error } = await q;
        if (!error && data) return data as Product[];
      } catch (e) {
        console.warn('[DB] Supabase fetch products fallback to local store');
      }
    }

    let list = this.memoryStore.products;
    if (category && category !== 'all') {
      list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }
    return list;
  }

  public async getProductById(id: string): Promise<Product | null> {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { data, error } = await this.supabase.from('products').select('*').eq('id', id).single();
        if (!error && data) return data as Product;
      } catch (e) {
        // Fallback
      }
    }
    return this.memoryStore.products.find((p) => p.id === id) || null;
  }

  public async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const id = (product.name || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-') + '-' + Math.floor(Math.random() * 1000);

    const now = new Date().toISOString();
    const newProduct: Product = {
      id,
      name: product.name,
      description: product.description || '',
      price: Number(product.price),
      image: product.image || 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
      category: product.category,
      is_available: product.is_available ?? true,
      created_at: now,
      updated_at: now,
    };

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { data, error } = await this.supabase.from('products').insert([newProduct]).select().single();
        if (!error && data) {
          this.memoryStore.products.unshift(data as Product);
          this.saveToDisk();
          return data as Product;
        }
      } catch (e) {
        console.warn('[DB] Supabase insert product fallback to local store');
      }
    }

    this.memoryStore.products.unshift(newProduct);
    this.saveToDisk();
    return newProduct;
  }

  public async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const now = new Date().toISOString();

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('products')
          .update({ ...updates, updated_at: now })
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          const idx = this.memoryStore.products.findIndex((p) => p.id === id);
          if (idx !== -1) {
            this.memoryStore.products[idx] = data as Product;
            this.saveToDisk();
          }
          return data as Product;
        }
      } catch (e) {
        // Fallback
      }
    }

    const idx = this.memoryStore.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    this.memoryStore.products[idx] = {
      ...this.memoryStore.products[idx],
      ...updates,
      updated_at: now,
    };
    this.saveToDisk();
    return this.memoryStore.products[idx];
  }

  public async deleteProduct(id: string): Promise<boolean> {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        await this.supabase.from('products').delete().eq('id', id);
      } catch (e) {
        // Fallback
      }
    }

    const initialLen = this.memoryStore.products.length;
    this.memoryStore.products = this.memoryStore.products.filter((p) => p.id !== id);
    this.saveToDisk();
    return this.memoryStore.products.length < initialLen;
  }

  // --- ORDERS ---
  public async getOrders(userId?: string): Promise<Order[]> {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        let q = this.supabase
          .from('orders')
          .select(`*, items:order_items(*)`)
          .order('created_at', { ascending: false });
        if (userId) {
          q = q.eq('user_id', userId);
        }
        const { data, error } = await q;
        if (!error && data) {
          return data as Order[];
        }
      } catch (e) {
        // Fallback
      }
    }

    let list = this.memoryStore.orders;
    if (userId) {
      list = list.filter((o) => o.user_id === userId);
    }
    return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async getOrderById(id: string | number): Promise<Order | null> {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('orders')
          .select(`*, items:order_items(*)`)
          .eq('id', id)
          .single();
        if (!error && data) return data as Order;
      } catch (e) {
        // Fallback
      }
    }

    const order = this.memoryStore.orders.find((o) => String(o.id) === String(id));
    return order || null;
  }

  public async createOrder(orderInput: {
    user_id?: string | null;
    customer_name: string;
    customer_email?: string | null;
    notes?: string;
    items: Array<{ product_id: string; quantity: number }>;
  }): Promise<Order> {
    const products = await this.getProducts();
    const productMap = new Map<string, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    const validatedItems: OrderItem[] = [];
    let totalAmount = 0;

    for (const item of orderInput.items) {
      const prod = productMap.get(item.product_id);
      if (!prod) {
        throw new Error(`Product not found with id: ${item.product_id}`);
      }
      if (!prod.is_available) {
        throw new Error(`Product "${prod.name}" is currently unavailable.`);
      }

      const qty = Math.max(1, Math.floor(item.quantity || 1));
      const unitPrice = Number(prod.price);
      const subtotal = unitPrice * qty;
      totalAmount += subtotal;

      validatedItems.push({
        product_id: prod.id,
        product_name: prod.name,
        quantity: qty,
        product_price: unitPrice,
        price: unitPrice,
        subtotal,
      });
    }

    const now = new Date().toISOString();
    const orderId = this.memoryStore.nextOrderId++;

    const newOrder: Order = {
      id: orderId,
      user_id: orderInput.user_id || null,
      customer_name: orderInput.customer_name,
      customer_email: orderInput.customer_email || null,
      status: 'PENDING',
      total_amount: totalAmount,
      notes: orderInput.notes || '',
      items: validatedItems,
      created_at: now,
      updated_at: now,
    };

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { data: orderData, error: orderErr } = await this.supabase
          .from('orders')
          .insert([
            {
              id: orderId,
              customer_id: newOrder.user_id && /^[0-9a-fA-F-]{36}$/.test(newOrder.user_id) ? newOrder.user_id : null,
              user_id: newOrder.user_id,
              customer_name: newOrder.customer_name,
              customer_email: newOrder.customer_email,
              status: newOrder.status,
              total_amount: newOrder.total_amount,
              notes: newOrder.notes,
              created_at: now,
              updated_at: now,
            },
          ])
          .select()
          .single();

        if (!orderErr && orderData) {
          const itemsToInsert = validatedItems.map((it) => ({
            order_id: orderData.id,
            product_id: it.product_id,
            product_name: it.product_name,
            product_price: it.product_price,
            quantity: it.quantity,
            subtotal: it.subtotal,
            created_at: now,
          }));
          await this.supabase.from('order_items').insert(itemsToInsert);
        }
      } catch (e: any) {
        console.warn('[DB] Supabase createOrder error, local store handled:', e?.message);
      }
    }

    this.memoryStore.orders.unshift(newOrder);
    this.saveToDisk();
    return newOrder;
  }

  public async updateOrderStatus(id: string | number, status: OrderStatus): Promise<Order | null> {
    const validStatuses: OrderStatus[] = [
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'COMPLETED',
      'CANCELLED',
    ];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status "${status}". Allowed: ${validStatuses.join(', ')}`);
    }

    const now = new Date().toISOString();

    if (this.isSupabaseConnected && this.supabase) {
      try {
        await this.supabase
          .from('orders')
          .update({ status, updated_at: now })
          .eq('id', id);
      } catch (e) {
        // Fallback
      }
    }

    const order = this.memoryStore.orders.find((o) => String(o.id) === String(id));
    if (!order) return null;

    order.status = status;
    order.updated_at = now;
    this.saveToDisk();
    return order;
  }

  // --- USERS & AUTH (SUPABASE AUTH INTEGRATION) ---
  public async syncSupabaseUser(userData: {
    id: string; // Supabase user.id UUID
    email: string;
    name?: string;
    profile_image?: string;
    role?: 'CUSTOMER' | 'ADMIN';
  }): Promise<User> {
    const now = new Date().toISOString();
    let user = this.memoryStore.users.find(
      (u) => u.id === userData.id || u.email.toLowerCase() === userData.email.toLowerCase()
    );

    if (user) {
      user.id = userData.id; // Enforce stable Supabase Auth UUID
      if (userData.name) user.name = userData.name;
      if (userData.profile_image) user.profile_image = userData.profile_image;
      user.updated_at = now;
      // Note: Preserve existing ADMIN role if already established, but do NOT promote based on email pattern
    } else {
      user = {
        id: userData.id,
        name: userData.name || userData.email.split('@')[0],
        email: userData.email,
        profile_image:
          userData.profile_image ||
          `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(userData.name || userData.email)}`,
        role: 'CUSTOMER', // Default all synced external users to CUSTOMER
        created_at: now,
        updated_at: now,
      };
      this.memoryStore.users.push(user);
    }

    if (this.isSupabaseConnected && this.supabase) {
      try {
        await this.supabase.from('profiles').upsert([
          {
            id: user.id,
            name: user.name,
            email: user.email,
            profile_image: user.profile_image,
            role: user.role,
            updated_at: now,
          },
        ], { onConflict: 'id' });
      } catch (e) {
        // Fallback handled seamlessly
      }
    }

    this.saveToDisk();
    return user;
  }

  public async verifySupabaseToken(token: string): Promise<User | null> {
    if (!token) return null;

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.auth.getUser(token);
        if (!error && data?.user) {
          const sUser = data.user;
          const fullName =
            sUser.user_metadata?.full_name ||
            sUser.user_metadata?.name ||
            sUser.email?.split('@')[0] ||
            'Valued Customer';
          const avatar = sUser.user_metadata?.avatar_url || sUser.user_metadata?.picture;

          return await this.syncSupabaseUser({
            id: sUser.id,
            email: sUser.email || '',
            name: fullName,
            profile_image: avatar,
          });
        }
      } catch (err: any) {
        console.warn('[DB] Supabase token verification failed:', err?.message);
      }
    }

    // Fallback: check if token represents a user ID already in memory
    const existing = this.memoryStore.users.find((u) => u.id === token);
    return existing || null;
  }

  // Backwards-compatible adapter for legacy callers
  public async upsertGoogleUser(userData: {
    google_id?: string;
    name: string;
    email: string;
    profile_image?: string;
    role?: 'CUSTOMER' | 'ADMIN';
  }): Promise<User> {
    return this.syncSupabaseUser({
      id: userData.google_id || `user_${Math.random().toString(36).substring(2, 9)}`,
      name: userData.name,
      email: userData.email,
      profile_image: userData.profile_image,
      role: userData.role,
    });
  }

  public async getUserById(id: string): Promise<User | null> {
    return this.memoryStore.users.find((u) => u.id === id) || null;
  }

  // --- STATS ---
  public async getStats() {
    const orders = this.memoryStore.orders;
    const pending = orders.filter((o) => o.status === 'PENDING').length;
    const preparing = orders.filter((o) => o.status === 'PREPARING').length;
    const ready = orders.filter((o) => o.status === 'READY').length;
    const completed = orders.filter((o) => o.status === 'COMPLETED').length;
    const revenue = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);

    return {
      pendingOrders: pending,
      preparingOrders: preparing,
      readyOrders: ready,
      completedOrders: completed,
      totalOrders: orders.length,
      totalRevenue: revenue,
    };
  }
}

export const db = new DatabaseService();
