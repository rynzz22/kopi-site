-- =========================================================
-- KKEOPI COFFEE SHOP ORDERING SYSTEM - SUPABASE POSTGRESQL SCHEMA
-- Compatible with existing 4-table setup (users, products, orders, order_items)
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Stores Supabase Auth user identity)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- Stores Supabase Auth user.id UUID
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    profile_image TEXT,
    role TEXT NOT NULL DEFAULT 'CUSTOMER', -- 'CUSTOMER' or 'ADMIN'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    image TEXT,
    category TEXT NOT NULL, -- 'Coffee', 'Non-Coffee', 'Pastries'
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT DEFAULT '', -- Optional email (defaults to empty string for guest checkout)
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely allow optional email on existing orders table
ALTER TABLE orders ALTER COLUMN customer_email SET DEFAULT '';
ALTER TABLE orders ALTER COLUMN customer_email DROP NOT NULL;

-- 4. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 1),
    price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Products RLS
DROP POLICY IF EXISTS "Allow public read of products" ON products;
CREATE POLICY "Allow public read of products" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow modify products" ON products;
CREATE POLICY "Allow modify products" ON products FOR ALL USING (true) WITH CHECK (true);

-- Orders RLS
DROP POLICY IF EXISTS "Allow read orders" ON orders;
CREATE POLICY "Allow read orders" ON orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert orders" ON orders;
CREATE POLICY "Allow insert orders" ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update orders" ON orders;
CREATE POLICY "Allow update orders" ON orders FOR UPDATE USING (true);

-- Order Items RLS
DROP POLICY IF EXISTS "Allow read order items" ON order_items;
CREATE POLICY "Allow read order items" ON order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert order items" ON order_items;
CREATE POLICY "Allow insert order items" ON order_items FOR INSERT WITH CHECK (true);

-- Users RLS
DROP POLICY IF EXISTS "Allow read users" ON users;
CREATE POLICY "Allow read users" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert users" ON users;
CREATE POLICY "Allow insert users" ON users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update users" ON users;
CREATE POLICY "Allow update users" ON users FOR UPDATE USING (true);

-- =========================================================
-- INITIAL MENU SEED DATA (KKEOPI Coffee & Pastries)
-- =========================================================
INSERT INTO products (id, name, description, price, image, category, is_available)
VALUES
  ('iced-latte', 'Iced Latte', 'Rich espresso poured over chilled silky milk and crystal clear ice cubes.', 120, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80', 'Coffee', true),
  ('spanish-latte', 'Spanish Latte', 'Double espresso combined with fresh textured milk and sweet condensed milk drizzle.', 140, 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80', 'Coffee', true),
  ('matcha-latte', 'Matcha Latte', 'Ceremonial grade Uji Japanese matcha whisked with silky milk and gentle sweetness.', 130, 'https://cdn.shopify.com/s/files/1/0560/1699/4381/files/unnamed-1_1024x1024_a794ea7e-13eb-4360-9b3b-96cd7c8c3113.webp?v=1782242740', 'Non-Coffee', true),
  ('caramel-macchiato', 'Caramel Macchiato', 'Velvety milk infused with vanilla, marked with dark espresso and golden caramel drizzle.', 165, 'https://frostingandfettuccine.com/wp-content/uploads/2022/12/Caramel-Iced-Coffee-6.jpg', 'Coffee', true),
  ('hazelnut-latte', 'Hazelnut Latte', 'Smooth espresso blended with slow-roasted hazelnut cream and velvety microfoam.', 170, 'https://i.pinimg.com/736x/ca/73/28/ca732820d569e6c2a5d3f7ee340ab848.jpg', 'Coffee', true),
  ('iced-americano', 'Iced Americano', 'Iconic Korean cafe staple: crisp iced double shot of high-altitude Arabica blend.', 110, 'https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=800&q=80', 'Coffee', true),
  ('strawberry-cream-latte', 'Strawberry Cream Latte', 'Chuncheon strawberry compote with real fruit chunks topped with creamy milk and cold foam.', 155, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80', 'Non-Coffee', true),
  ('peach-hibiscus-tea', 'Peach Hibiscus Tea', 'Cold-brewed Egyptian hibiscus infused with sweet white peach puree and edible blossoms.', 145, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80', 'Non-Coffee', true),
  ('butter-croissant', 'Artisan Butter Croissant', 'Flaky, 36-layer French butter croissant baked fresh every morning with golden crumb.', 95, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80', 'Pastries', true),
  ('apple-turnover', 'Spiced Apple Turnover', 'Crisp puff pastry pocket filled with slow-simmered cinnamon Fuji apples and raw sugar glaze.', 110, 'https://sallysbakingaddiction.com/wp-content/uploads/2013/09/homemade-apple-turnovers-2-600x600.jpg', 'Pastries', true),
  ('pain-au-chocolat', 'Pain au Chocolat', 'Buttery laminated pastry dough folded around double batons of 70% dark Valrhona chocolate.', 105, 'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?auto=format&fit=crop&w=800&q=80', 'Pastries', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image = EXCLUDED.image,
  category = EXCLUDED.category,
  is_available = EXCLUDED.is_available;
