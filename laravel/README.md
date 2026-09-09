# KKEOPI Coffee — Laravel Backend Architecture

This directory contains the modular Laravel backend structure designed to power the Coffee Shop Ordering System with Supabase PostgreSQL and WebSockets.

### Directory Structure
```
laravel/
├── app/
│   ├── Http/Controllers/
│   │   ├── ProductController.php  (CRUD + Validation)
│   │   ├── OrderController.php    (Order Placement, Real-Time Dispatches, Stats)
│   │   └── AuthController.php     (Google Authentication & Sessions)
│   ├── Models/
│   │   ├── Product.php
│   │   ├── Order.php
│   │   ├── OrderItem.php
│   │   └── User.php
│   └── Events/
│       ├── OrderCreated.php       (Broadcasts 'order:created' via WebSocket)
│       └── OrderStatusUpdated.php (Broadcasts 'order:status_updated' via WebSocket)
├── config/
│   └── database.php               (Preconfigured for Supabase PostgreSQL)
├── database/
│   └── migrations/                (Users, Products, Orders, OrderItems)
├── routes/
│   └── api.php                    (Clean REST endpoints: /api/products, /api/orders, /api/auth)
└── .env.example
```

### Setup Instructions
1. Copy `.env.example` to `.env`.
2. Configure your Supabase PostgreSQL credentials in `.env`:
   ```env
   DB_CONNECTION=pgsql
   DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
   DB_PORT=5432
   DB_DATABASE=postgres
   DB_USERNAME=postgres.YOUR_PROJECT_REF
   DB_PASSWORD=YOUR_PASSWORD
   ```
3. Run `php artisan migrate`.
4. Run `php artisan serve`.
