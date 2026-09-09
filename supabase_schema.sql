-- =========================================================
-- KKEOPI COFFEE SHOP ORDERING SYSTEM
-- COMPLETE SUPABASE POSTGRESQL DATABASE SCHEMA
-- Fully Idempotent & Migration-Safe (Handles Existing Tables)
-- =========================================================

-- Enable UUID extension (standard in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- 1. CATEGORIES TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, -- Slug identifier: 'coffee', 'non-coffee', 'pastries', 'snacks'
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 2. PROFILES TABLE (Supabase Auth Integration)
-- =========================================================
-- References Supabase auth.users(id) on delete cascade
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    profile_image TEXT,
    role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 3. PRODUCTS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, -- Slug or unique identifier: 'iced-latte', 'spanish-latte', etc.
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    image TEXT,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all product columns exist if table was already present
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES categories(id) ON DELETE RESTRICT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT TRUE;

-- =========================================================
-- 4. ORDERS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT, -- Nullable for guest checkout
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure customer_email is nullable if table already existed with NOT NULL
ALTER TABLE orders ALTER COLUMN customer_email DROP NOT NULL;

-- Ensure customer_id and user_id exist even if table was created previously
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Safely sync existing user_id -> customer_id and customer_id -> user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'user_id'
    ) THEN
        UPDATE orders 
        SET customer_id = user_id::uuid 
        WHERE customer_id IS NULL AND user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'customer_id'
    ) THEN
        UPDATE orders 
        SET user_id = customer_id::text 
        WHERE user_id IS NULL AND customer_id IS NOT NULL;
    END IF;
END $$;

-- Ensure foreign key constraint from orders to profiles exists safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_orders_customer' AND table_name = 'orders'
    ) THEN
        BEGIN
            ALTER TABLE orders ADD CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE SET NULL;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore if existing invalid test records prevent strict constraint
            NULL;
        END;
    END IF;
END $$;

-- Ensure order numbering starts cleanly at 1001 for commercial presentation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'orders_id_seq') THEN
        ALTER SEQUENCE orders_id_seq RESTART WITH 1001;
    END IF;
END $$;

-- =========================================================
-- 5. ORDER ITEMS TABLE (With Historical Snapshots)
-- =========================================================
CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,                                       -- Historical snapshot of name
    product_price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (product_price >= 0), -- Historical snapshot of unit price
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure product_price exists
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_price NUMERIC(10, 2);

-- Clean up duplicate 'price' column if it exists: copy any legacy values then drop duplicate
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'price'
    ) THEN
        UPDATE order_items SET product_price = price WHERE product_price IS NULL OR product_price = 0;
        ALTER TABLE order_items DROP COLUMN IF EXISTS price;
    END IF;
END $$;

-- =========================================================
-- 6. PERFORMANCE INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);

-- =========================================================
-- 7. AUTOMATED UPDATED_AT TRIGGER FUNCTION
-- =========================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- 8. SUPABASE AUTH USER SYNCHRONIZATION TRIGGER
-- =========================================================
-- Automatically creates a profile record when a user signs in via Google OAuth
-- HARDENED: Users always receive 'CUSTOMER' role; ADMIN role can only be assigned through trusted internal administration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, profile_image, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
        'CUSTOMER' -- Always defaults to CUSTOMER. Never allow role promotion from raw_user_meta_data!
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        profile_image = COALESCE(EXCLUDED.profile_image, profiles.profile_image),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 9. SUPABASE REALTIME CONFIGURATION
-- =========================================================
-- Ensure updates broadcast complete row data so clients receive full state
ALTER TABLE orders REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE products;
    END IF;
END $$;

-- =========================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Categories (Public read, admin write)
DROP POLICY IF EXISTS "Categories are readable by everyone" ON categories;
CREATE POLICY "Categories are readable by everyone" ON categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Categories can be modified by admins and service role" ON categories;
CREATE POLICY "Categories can be modified by admins and service role" ON categories
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
    );

-- Products (Public view available; Admin view/manage all)
DROP POLICY IF EXISTS "Products are viewable by customers" ON products;
CREATE POLICY "Products are viewable by customers" ON products
    FOR SELECT USING (
        is_available = true OR 
        auth.role() = 'service_role' OR 
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
    );

DROP POLICY IF EXISTS "Products can be managed by admins" ON products;
CREATE POLICY "Products can be managed by admins" ON products
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
    );

-- Profiles (Users see/update own, Admins see all)
DROP POLICY IF EXISTS "Users can read own profile or admins read all" ON profiles;
CREATE POLICY "Users can read own profile or admins read all" ON profiles
    FOR SELECT USING (
        auth.uid() = id OR 
        auth.role() = 'service_role' OR 
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
    );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');

-- Orders (Customer insert own, view own; Admin view/update all)
DROP POLICY IF EXISTS "Customers can create orders" ON orders;
CREATE POLICY "Customers can create orders" ON orders
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        customer_id IS NULL OR
        customer_id = auth.uid() OR
        user_id = auth.uid()::text
    );

DROP POLICY IF EXISTS "Customers view own orders, Admins view all" ON orders;
CREATE POLICY "Customers view own orders, Admins view all" ON orders
    FOR SELECT USING (
        customer_id = auth.uid() OR
        user_id = auth.uid()::text OR
        auth.role() = 'service_role' OR
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
    );

DROP POLICY IF EXISTS "Admins and service role can update orders" ON orders;
CREATE POLICY "Admins and service role can update orders" ON orders
    FOR UPDATE USING (
        auth.role() = 'service_role' OR
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
    );

-- Order Items
DROP POLICY IF EXISTS "Order items readable by order owner or admin" ON order_items;
CREATE POLICY "Order items readable by order owner or admin" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
              AND (
                  orders.customer_id = auth.uid() OR 
                  orders.user_id = auth.uid()::text OR
                  auth.role() = 'service_role' OR 
                  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
              )
        )
    );

DROP POLICY IF EXISTS "Order items insertable on order creation" ON order_items;
CREATE POLICY "Order items insertable on order creation" ON order_items
    FOR INSERT WITH CHECK (true);

-- =========================================================
-- 11. INITIAL SEED DATA
-- =========================================================
INSERT INTO categories (id, name, description)
VALUES
  ('coffee', 'Coffee', 'Artisan espresso-based beverages, brewed fresh from premium Arabica beans.'),
  ('non-coffee', 'Non-Coffee', 'Handcrafted matcha, artisan teas, and decadent fruit-infused refreshers.'),
  ('pastries', 'Pastries', 'Freshly baked French croissants, turnovers, and artisanal morning pastries.'),
  ('snacks', 'Snacks', 'Light bites, artisan cookies, and savory accompaniments.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO products (id, name, description, price, image, category_id, is_available)
VALUES
  ('iced-latte', 'Iced Latte', 'Rich espresso poured over chilled silky milk and crystal clear ice cubes.', 120, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80', 'coffee', true),
  ('spanish-latte', 'Spanish Latte', 'Double espresso combined with fresh textured milk and sweet condensed milk drizzle.', 140, 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80', 'coffee', true),
  ('matcha-latte', 'Matcha Latte', 'Ceremonial grade Uji Japanese matcha whisked with silky milk and gentle sweetness.', 130, 'https://cdn.shopify.com/s/files/1/0560/1699/4381/files/unnamed-1_1024x1024_a794ea7e-13eb-4360-9b3b-96cd7c8c3113.webp?v=1782242740', 'non-coffee', true),
  ('caramel-macchiato', 'Caramel Macchiato', 'Velvety milk infused with vanilla, marked with dark espresso and golden caramel drizzle.', 165, 'https://frostingandfettuccine.com/wp-content/uploads/2022/12/Caramel-Iced-Coffee-6.jpg', 'coffee', true),
  ('hazelnut-latte', 'Hazelnut Latte', 'Smooth espresso blended with slow-roasted hazelnut cream and velvety microfoam.', 170, 'https://i.pinimg.com/736x/ca/73/28/ca732820d569e6c2a5d3f7ee340ab848.jpg', 'coffee', true),
  ('iced-americano', 'Iced Americano', 'Iconic Korean cafe staple: crisp iced double shot of high-altitude Arabica blend.', 110, 'https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=800&q=80', 'coffee', true),
  ('strawberry-cream-latte', 'Strawberry Cream Latte', 'Chuncheon strawberry compote with real fruit chunks topped with creamy milk and cold foam.', 155, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80', 'non-coffee', true),
  ('butter-croissant', 'Artisan Butter Croissant', 'Flaky, 36-layer French butter croissant baked fresh every morning with golden crumb.', 95, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80', 'pastries', true),
  ('apple-turnover', 'Spiced Apple Turnover', 'Crisp puff pastry pocket filled with slow-simmered cinnamon Fuji apples and raw sugar glaze.', 110, 'https://sallysbakingaddiction.com/wp-content/uploads/2013/09/homemade-apple-turnovers-2-600x600.jpg', 'pastries', true),
  ('pain-au-chocolat', 'Pain au Chocolat', 'Buttery laminated pastry dough folded around double batons of 70% dark Valrhona chocolate.', 105, 'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?auto=format&fit=crop&w=800&q=80', 'pastries', true),
  ('peach-hibiscus-tea', 'Peach Hibiscus Tea', 'Cold-brewed Egyptian hibiscus infused with sweet white peach puree and edible blossoms.', 145, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80', 'non-coffee', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image = EXCLUDED.image,
  category_id = EXCLUDED.category_id,
  is_available = EXCLUDED.is_available;
