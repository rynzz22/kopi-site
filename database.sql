-- ============================================================
--  KKEOPI Coffee Shop — Database Schema
--  Import this file in phpMyAdmin or run:
--    mysql -u root kkeopi < database.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS kkeopi
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kkeopi;

-- --------------------------------------------------------
--  USERS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(100) PRIMARY KEY,          -- UUID from Supabase or slug
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NULL,                 -- only for admin accounts
  profile_image TEXT         NULL,
  role          ENUM('ADMIN','CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
  created_at    DATETIME NOT NULL DEFAULT NOW(),
  updated_at    DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
--  PRODUCTS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id           VARCHAR(100) PRIMARY KEY,            -- slug e.g. "iced-latte"
  name         VARCHAR(255) NOT NULL,
  description  TEXT         NULL,
  price        DECIMAL(10,2) NOT NULL DEFAULT 0,
  image        TEXT         NULL,
  category     VARCHAR(100) NOT NULL DEFAULT 'Coffee',
  is_available TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   DATETIME     NOT NULL DEFAULT NOW(),
  updated_at   DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
--  ORDERS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        VARCHAR(100) NULL,
  customer_name  VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NULL,
  notes          TEXT         NULL,
  total_amount   DECIMAL(10,2) NOT NULL DEFAULT 0,
  status         ENUM('PENDING','CONFIRMED','PREPARING','READY','COMPLETED','CANCELLED')
                 NOT NULL DEFAULT 'PENDING',
  created_at     DATETIME NOT NULL DEFAULT NOW(),
  updated_at     DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=1026;

-- --------------------------------------------------------
--  ORDER ITEMS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id     INT UNSIGNED NOT NULL,
  product_id   VARCHAR(100) NULL,
  product_name VARCHAR(255) NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  quantity     INT UNSIGNED NOT NULL DEFAULT 1,
  subtotal     DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  SEED DATA
-- ============================================================

-- Admin user  (password: kkeopi2026)
INSERT IGNORE INTO users (id, name, email, password_hash, profile_image, role) VALUES
('a0000000-0000-4000-8000-000000000001',
 'Barista Admin',
 'admin@kkeopi.com',
 '$2y$12$S8kUF1XP/o4S6FIFhCKip.hMxAJaiOEeV7pAR0U/ZfOVFCG1xkqZ2',
 'https://api.dicebear.com/7.x/bottts/svg?seed=kkeopi_barista',
 'ADMIN');

-- Sample customers
INSERT IGNORE INTO users (id, name, email, profile_image, role) VALUES
('b1285493-5473-4556-9b16-e4ffba29a281','Min-ji Kim','minji.kim@gmail.com',
 'https://api.dicebear.com/7.x/adventurer/svg?seed=Min-ji%20Kim','CUSTOMER'),
('c0326462-850f-48d6-95b8-50fa71ad7136','Kate Lorene','obenakatelorene@gmail.com',
 'https://api.dicebear.com/7.x/adventurer/svg?seed=Kate%20Lorene','CUSTOMER'),
('c892c138-0000-4000-8000-000000000002','Juan Dela Cruz','juan.delacruz@gmail.com',
 'https://api.dicebear.com/7.x/adventurer/svg?seed=Juan','CUSTOMER');

-- Products
INSERT IGNORE INTO products (id, name, description, price, image, category, is_available) VALUES
('iced-latte','Iced Latte',
 'Rich espresso poured over chilled silky milk and crystal clear ice cubes.',
 120,'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80','Coffee',1),

('spanish-latte','Spanish Latte',
 'Double espresso combined with fresh textured milk and sweet condensed milk drizzle.',
 140,'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80','Coffee',1),

('matcha-latte','Matcha Latte',
 'Ceremonial grade Uji Japanese matcha whisked with silky milk and gentle sweetness.',
 130,'https://cdn.shopify.com/s/files/1/0560/1699/4381/files/unnamed-1_1024x1024_a794ea7e-13eb-4360-9b3b-96cd7c8c3113.webp?v=1782242740','Non-Coffee',1),

('caramel-macchiato','Caramel Macchiato',
 'Velvety milk infused with vanilla, marked with dark espresso and golden caramel drizzle.',
 165,'https://frostingandfettuccine.com/wp-content/uploads/2022/12/Caramel-Iced-Coffee-6.jpg','Coffee',1),

('hazelnut-latte','Hazelnut Latte',
 'Smooth espresso blended with slow-roasted hazelnut cream and velvety microfoam.',
 170,'https://i.pinimg.com/736x/ca/73/28/ca732820d569e6c2a5d3f7ee340ab848.jpg','Coffee',1),

('iced-americano','Iced Americano',
 'Iconic Korean cafe staple: crisp iced double shot of high-altitude Arabica blend.',
 110,'https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=800&q=80','Coffee',1),

('strawberry-cream-latte','Strawberry Cream Latte',
 'Chuncheon strawberry compote with real fruit chunks topped with creamy milk and cold foam.',
 155,'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80','Non-Coffee',1),

('butter-croissant','Artisan Butter Croissant',
 'Flaky, 36-layer French butter croissant baked fresh every morning with golden crumb.',
 95,'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80','Pastries',1),

('apple-turnover','Spiced Apple Turnover',
 'Crisp puff pastry pocket filled with slow-simmered cinnamon Fuji apples and raw sugar glaze.',
 110,'https://sallysbakingaddiction.com/wp-content/uploads/2013/09/homemade-apple-turnovers-2-600x600.jpg','Pastries',1),

('pain-au-chocolat','Pain au Chocolat',
 'Buttery laminated pastry dough folded around double batons of 70% dark Valrhona chocolate.',
 105,'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?auto=format&fit=crop&w=800&q=80','Pastries',1),

('peach-hibiscus-tea','Peach Hibiscus Tea',
 'Cold-brewed Egyptian hibiscus infused with sweet white peach puree and edible blossoms.',
 145,'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80','Non-Coffee',1);

-- Sample orders (start AUTO_INCREMENT at 1026 so new orders get 1026+)
ALTER TABLE orders AUTO_INCREMENT = 1026;

INSERT IGNORE INTO orders (id, user_id, customer_name, customer_email, notes, total_amount, status, created_at) VALUES
(1024,'b1285493-5473-4556-9b16-e4ffba29a281','Min-ji Kim','minji.kim@gmail.com',
 'Oat milk please',240,'COMPLETED','2026-09-08 23:41:35'),
(1025,'c0326462-850f-48d6-95b8-50fa71ad7136','Kate Lorene','obenakatelorene@gmail.com',
 'Less ice, oat milk',140,'READY','2026-09-08 23:57:49');

INSERT IGNORE INTO order_items (order_id, product_id, product_name, price, quantity, subtotal) VALUES
(1024,'iced-latte','Iced Latte',120,2,240),
(1025,'spanish-latte','Spanish Latte',140,1,140);
