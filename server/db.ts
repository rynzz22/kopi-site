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
  price: number;
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

// Initial Seed Products (Matches the 4-table Supabase schema)
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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

  private sanitizeSecret(raw?: string): string {
    if (!raw || typeof raw !== 'string') return '';
    return raw.trim().replace(/^['"]+|['"]+$/g, '').trim();
  }

  public sanitizeSupabaseUrl(rawUrl?: string): string | null {
    const cleaned = this.sanitizeSecret(rawUrl);
    if (!cleaned) return null;

    // Ignore placeholder values
    if (
      cleaned.startsWith('MY_') ||
      cleaned.includes('your-project') ||
      cleaned.includes('example.com') ||
      cleaned === 'undefined' ||
      cleaned === 'null'
    ) {
      return null;
    }

    // Handle case where user pasted Supabase dashboard URL: https://supabase.com/dashboard/project/<project-ref>
    const dashMatch = cleaned.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
    if (dashMatch && dashMatch[1]) {
      return `https://${dashMatch[1]}.supabase.co`;
    }

    let url = cleaned
      .replace(/\/rest\/v1\/?$/i, '')
      .replace(/\/rest\/?$/i, '')
      .replace(/\/+$/, '');

    if (!/^https?:\/\//i.test(url)) {
      if (/^[a-z0-9-]+\.supabase\.co$/i.test(url)) {
        url = `https://${url}`;
      } else {
        return null;
      }
    }

    try {
      const parsed = new URL(url);
      if (!parsed.hostname || !parsed.hostname.includes('.')) return null;
      return parsed.origin;
    } catch {
      return null;
    }
  }

  public getPublicSupabaseConfig() {
    const url = this.sanitizeSupabaseUrl(process.env.SUPABASE_URL);
    const anonKey = this.sanitizeSecret(process.env.SUPABASE_ANON_KEY);
    // Only expose client config if backend verified connectivity or valid URL+key exist
    if (!url || !anonKey || anonKey.startsWith('MY_')) {
      return { supabaseUrl: '', supabaseAnonKey: '' };
    }
    return {
      supabaseUrl: url,
      supabaseAnonKey: anonKey,
    };
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
          // Ensure all seed products exist in local store
          const existingIds = new Set(parsed.products.map((p: Product) => p.id));
          for (const seed of SEED_PRODUCTS) {
            if (!existingIds.has(seed.id)) {
              parsed.products.push(seed);
            }
          }
          this.memoryStore = parsed;
        }
      } else {
        this.saveToDisk();
      }
    } catch {
      // Fallback to in-memory seed
    }
  }

  private saveToDisk() {
    try {
      const dataDir = path.dirname(this.storageFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.storageFile, JSON.stringify(this.memoryStore, null, 2), 'utf-8');
    } catch {
      // Ignore write issues in read-only environments
    }
  }

  public async initSupabase() {
    const url = this.sanitizeSupabaseUrl(process.env.SUPABASE_URL);
    const serviceKey = this.sanitizeSecret(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const anonKey = this.sanitizeSecret(process.env.SUPABASE_ANON_KEY);
    const key = serviceKey || anonKey;

    if (!url || !key || key.startsWith('MY_')) {
      this.isSupabaseConnected = false;
      this.supabaseStatusMessage = 'Operating on persistent local storage';
      return;
    }

    try {
      this.supabase = createClient(url, key, {
        auth: { persistSession: false },
      });

      // Test query against products table
      const { error } = await this.supabase.from('products').select('id').limit(1);
      if (!error) {
        this.isSupabaseConnected = true;
        this.supabaseStatusMessage = 'Connected to remote Supabase PostgreSQL';
        console.log('[DB] Connected to Supabase PostgreSQL database.');

        // Ensure all seed products (including peach-hibiscus-tea) are present in remote products table
        try {
          await this.supabase
            .from('products')
            .upsert(
              this.memoryStore.products.map((p) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                price: p.price,
                image: p.image,
                category: p.category,
                is_available: p.is_available,
              })),
              { onConflict: 'id', ignoreDuplicates: true }
            );
        } catch {
          // Ignore seed sync notice if RLS restricts anonymous upsert
        }
      } else {
        this.isSupabaseConnected = false;
        const msg = String(error.message || '');
        if (
          error.code === 'PGRST205' ||
          msg.includes('schema cache') ||
          msg.includes('does not exist')
        ) {
          this.supabaseStatusMessage =
            'Supabase project reachable. Tables not yet created — operating on persistent local storage.';
          console.log('[DB] Supabase reachable; using persistent local storage until tables are initialized.');
        } else if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
          this.supabaseStatusMessage =
            'Supabase remote endpoint unreachable — operating seamlessly on persistent local storage.';
          console.log('[DB] Operating seamlessly on persistent local storage (data/kopi_store.json).');
        } else {
          this.supabaseStatusMessage = 'Operating seamlessly on persistent local storage.';
          console.log('[DB] Operating seamlessly on persistent local storage.');
        }
      }
    } catch {
      this.isSupabaseConnected = false;
      this.supabaseStatusMessage = 'Operating seamlessly on persistent local storage.';
      console.log('[DB] Operating seamlessly on persistent local storage.');
    }
  }

  public getSupabaseStatus() {
    const cleanUrl = this.sanitizeSupabaseUrl(process.env.SUPABASE_URL);
    return {
      connected: this.isSupabaseConnected,
      url: cleanUrl || 'Local persistent JSON store',
      tablesReady: this.isSupabaseConnected,
      message: this.supabaseStatusMessage,
      ordersCount: this.memoryStore.orders.length,
      productsCount: this.memoryStore.products.length,
    };
  }

  private normalizeProduct(raw: any): Product {
    let category: 'Coffee' | 'Non-Coffee' | 'Pastries' = 'Coffee';
    const rawCat = String(raw.category || raw.category_id || 'Coffee').toLowerCase();
    if (rawCat.includes('non') || rawCat.includes('tea') || rawCat.includes('matcha')) {
      category = 'Non-Coffee';
    } else if (rawCat.includes('pastr') || rawCat.includes('croissant') || rawCat.includes('bakery')) {
      category = 'Pastries';
    } else {
      category = 'Coffee';
    }

    return {
      id: String(raw.id),
      name: String(raw.name || ''),
      description: String(raw.description || ''),
      price: Number(raw.price || 0),
      image:
        raw.image ||
        'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
      category,
      is_available: raw.is_available !== undefined ? Boolean(raw.is_available) : true,
      created_at: raw.created_at || new Date().toISOString(),
      updated_at: raw.updated_at || new Date().toISOString(),
    };
  }

  private normalizeOrder(raw: any): Order {
    const rawItems = Array.isArray(raw.items) ? raw.items : [];
    const items: OrderItem[] = rawItems.map((it: any) => {
      const unitPrice = Number(it.price ?? it.product_price ?? 0);
      const qty = Math.max(1, Number(it.quantity || 1));
      return {
        id: it.id,
        order_id: it.order_id,
        product_id: String(it.product_id || ''),
        product_name: String(it.product_name || 'Specialty Drink'),
        price: unitPrice,
        product_price: unitPrice,
        quantity: qty,
        subtotal: Number(it.subtotal ?? unitPrice * qty),
        created_at: it.created_at,
      };
    });

    return {
      id: raw.id,
      user_id: raw.user_id || raw.customer_id || null,
      customer_name: String(raw.customer_name || 'Valued Customer'),
      customer_email: raw.customer_email || '',
      status: (raw.status as OrderStatus) || 'PENDING',
      total_amount: Number(raw.total_amount || 0),
      notes: raw.notes || '',
      items,
      created_at: raw.created_at || new Date().toISOString(),
      updated_at: raw.updated_at || new Date().toISOString(),
    };
  }

  // --- PRODUCTS ---
  public async getProducts(category?: string): Promise<Product[]> {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          let normalized = data.map((p) => this.normalizeProduct(p));
          if (category && category !== 'all') {
            normalized = normalized.filter(
              (p) => p.category.toLowerCase() === category.toLowerCase()
            );
          }
          return normalized;
        }
      } catch {
        // Fallback to local store
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
        const { data, error } = await this.supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
        if (!error && data) return this.normalizeProduct(data);
      } catch {
        // Fallback
      }
    }
    return this.memoryStore.products.find((p) => p.id === id) || null;
  }

  public async createProduct(
    product: Omit<Product, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Product> {
    const id =
      slugify(product.name || 'product') + '-' + Math.floor(100 + Math.random() * 900);

    const now = new Date().toISOString();
    const newProduct: Product = {
      id,
      name: product.name,
      description: product.description || '',
      price: Number(product.price),
      image:
        product.image ||
        'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
      category: product.category,
      is_available: product.is_available ?? true,
      created_at: now,
      updated_at: now,
    };

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('products')
          .insert([
            {
              id: newProduct.id,
              name: newProduct.name,
              description: newProduct.description,
              price: newProduct.price,
              image: newProduct.image,
              category: newProduct.category,
              is_available: newProduct.is_available,
              created_at: now,
              updated_at: now,
            },
          ])
          .select()
          .single();
        if (!error && data) {
          const normalized = this.normalizeProduct(data);
          this.memoryStore.products.unshift(normalized);
          this.saveToDisk();
          return normalized;
        }
      } catch {
        // Fallback to local store
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
        const payload: Record<string, any> = { updated_at: now };
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.price !== undefined) payload.price = updates.price;
        if (updates.image !== undefined) payload.image = updates.image;
        if (updates.category !== undefined) payload.category = updates.category;
        if (updates.is_available !== undefined) payload.is_available = updates.is_available;

        const { data, error } = await this.supabase
          .from('products')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          const normalized = this.normalizeProduct(data);
          const idx = this.memoryStore.products.findIndex((p) => p.id === id);
          if (idx !== -1) {
            this.memoryStore.products[idx] = normalized;
            this.saveToDisk();
          }
          return normalized;
        }
      } catch {
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
      } catch {
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
          return data.map((o) => this.normalizeOrder(o));
        }
      } catch {
        // Fallback
      }
    }

    let list = this.memoryStore.orders;
    if (userId) {
      list = list.filter((o) => o.user_id === userId);
    }
    return [...list]
      .map((o) => this.normalizeOrder(o))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async getOrderById(id: string | number): Promise<Order | null> {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('orders')
          .select(`*, items:order_items(*)`)
          .eq('id', id)
          .single();
        if (!error && data) return this.normalizeOrder(data);
      } catch {
        // Fallback
      }
    }

    const order = this.memoryStore.orders.find((o) => String(o.id) === String(id));
    return order ? this.normalizeOrder(order) : null;
  }

  private findMatchingProduct(
    products: Product[],
    rawProductId: string,
    rawProductName?: string
  ): Product | undefined {
    const cleanId = String(rawProductId || '').trim();
    const slugId = slugify(cleanId);

    // 1. Exact ID or slug match
    let found = products.find(
      (p) => p.id === cleanId || p.id === slugId || slugify(p.name) === slugId
    );
    if (found) return found;

    // 2. Match by product name (ignoring customization suffix in parentheses)
    if (rawProductName) {
      const baseTitle = rawProductName.split('(')[0].trim();
      const titleSlug = slugify(baseTitle);
      found = products.find(
        (p) =>
          p.id === titleSlug ||
          slugify(p.name) === titleSlug ||
          p.name.toLowerCase().includes(baseTitle.toLowerCase()) ||
          baseTitle.toLowerCase().includes(p.name.toLowerCase())
      );
      if (found) return found;
    }

    // 3. Partial slug match (e.g. 'butter-croissant' vs 'artisan-butter-croissant')
    if (slugId && slugId !== '1') {
      found = products.find(
        (p) => p.id.includes(slugId) || slugify(p.name).includes(slugId)
      );
      if (found) return found;
    }

    return undefined;
  }

  public async createOrder(orderInput: {
    user_id?: string | null;
    customer_name: string;
    customer_email?: string | null;
    notes?: string;
    items: Array<{
      product_id: string;
      product_name?: string;
      price?: number;
      quantity: number;
    }>;
  }): Promise<Order> {
    const products = await this.getProducts();

    const validatedItems: OrderItem[] = [];
    let totalAmount = 0;

    for (const item of orderInput.items) {
      const prod = this.findMatchingProduct(products, item.product_id, item.product_name);
      if (!prod) {
        throw new Error(`Product not found: ${item.product_name || item.product_id}`);
      }
      if (!prod.is_available) {
        throw new Error(`Product "${prod.name}" is currently unavailable.`);
      }

      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const basePrice = Number(prod.price);
      // Allow customized unit price (size/milk/add-ons) if >= basePrice, capped reasonably
      const requestedPrice = Number(item.price || 0);
      const unitPrice =
        requestedPrice >= basePrice && requestedPrice <= basePrice + 300
          ? requestedPrice
          : basePrice;
      const subtotal = unitPrice * qty;
      totalAmount += subtotal;

      const displayProductName =
        item.product_name && item.product_name.trim() ? item.product_name.trim() : prod.name;

      validatedItems.push({
        product_id: prod.id,
        product_name: displayProductName,
        quantity: qty,
        product_price: unitPrice,
        price: unitPrice,
        subtotal,
      });
    }

    const now = new Date().toISOString();
    let orderId: number | string = this.memoryStore.nextOrderId++;

    const newOrder: Order = {
      id: orderId,
      user_id: orderInput.user_id || null,
      customer_name: orderInput.customer_name,
      customer_email: orderInput.customer_email || '',
      status: 'PENDING',
      total_amount: totalAmount,
      notes: orderInput.notes || '',
      items: validatedItems,
      created_at: now,
      updated_at: now,
    };

    if (this.isSupabaseConnected && this.supabase) {
      try {
        // Ensure foreign key safety for user_id REFERENCES users(id)
        let safeUserId: string | null = null;
        if (newOrder.user_id) {
          const { data: existingUser } = await this.supabase
            .from('users')
            .select('id')
            .eq('id', newOrder.user_id)
            .maybeSingle();
          if (existingUser) {
            safeUserId = newOrder.user_id;
          }
        }

        // Insert into orders table matching the user's exact 4-table Supabase schema:
        // (user_id, customer_name, customer_email, status, total_amount, notes, created_at, updated_at)
        const { data: orderData, error: orderErr } = await this.supabase
          .from('orders')
          .insert([
            {
              user_id: safeUserId,
              customer_name: newOrder.customer_name,
              customer_email: newOrder.customer_email || '', // Empty string satisfies NOT NULL when email is omitted
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
          orderId = orderData.id;
          newOrder.id = orderData.id;

          // Insert into order_items table matching the user's exact schema:
          // (order_id, product_id, product_name, quantity, price, subtotal, created_at)
          const itemsToInsert = validatedItems.map((it) => ({
            order_id: orderData.id,
            product_id: it.product_id,
            product_name: it.product_name,
            quantity: it.quantity,
            price: it.price,
            subtotal: it.subtotal,
            created_at: now,
          }));
          await this.supabase.from('order_items').insert(itemsToInsert);
        }
      } catch {
        // Fallback to local store seamlessly
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
        const { data, error } = await this.supabase
          .from('orders')
          .update({ status, updated_at: now })
          .eq('id', id)
          .select(`*, items:order_items(*)`)
          .single();

        if (!error && data) {
          const updatedOrder = this.normalizeOrder(data);
          const localIdx = this.memoryStore.orders.findIndex((o) => String(o.id) === String(id));
          if (localIdx !== -1) {
            this.memoryStore.orders[localIdx] = updatedOrder;
          } else {
            this.memoryStore.orders.unshift(updatedOrder);
          }
          this.saveToDisk();
          return updatedOrder;
        }
      } catch {
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
      user.id = userData.id;
      if (userData.name) user.name = userData.name;
      if (userData.profile_image) user.profile_image = userData.profile_image;
      user.updated_at = now;
    } else {
      user = {
        id: userData.id,
        name: userData.name || userData.email.split('@')[0],
        email: userData.email,
        profile_image:
          userData.profile_image ||
          `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(userData.name || userData.email)}`,
        role: 'CUSTOMER',
        created_at: now,
        updated_at: now,
      };
      this.memoryStore.users.push(user);
    }

    if (this.isSupabaseConnected && this.supabase) {
      try {
        // Sync with the `users` table in the user's Supabase schema
        await this.supabase.from('users').upsert(
          [
            {
              id: user.id,
              name: user.name,
              email: user.email,
              profile_image: user.profile_image,
              role: user.role,
              updated_at: now,
            },
          ],
          { onConflict: 'id' }
        );
      } catch {
        // Fallback handled seamlessly
      }
    }

    this.saveToDisk();
    return user;
  }

  public async verifySupabaseToken(token: string): Promise<User | null> {
    if (!token) return null;

    if (this.isSupabaseConnected && this.supabase) {
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
      } catch {
        // Ignore token verification error and check local store
      }
    }

    const existing = this.memoryStore.users.find((u) => u.id === token);
    return existing || null;
  }

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
    const orders = await this.getOrders();
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
