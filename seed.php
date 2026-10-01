<?php
/**
 * KKEOPI — Database Seeder
 * Run: php seed.php (from the kopi-site root via CLI, with XAMPP running)
 * Or open: http://localhost/kkeopi/seed.php  (then DELETE this file!)
 *
 * This script reads data/kopi_store.json and populates the DB.
 * Run ONCE after importing database.sql.
 */

require_once __DIR__ . '/api/db.php';

header('Content-Type: text/plain; charset=utf-8');

$json = file_get_contents(__DIR__ . '/data/kopi_store.json');
$data = json_decode($json, true);
$db   = getDB();

echo "=== KKEOPI Seeder ===\n";

// --- Users ---
$adminHash = password_hash('kkeopi2026', PASSWORD_BCRYPT);
$uStmt = $db->prepare(
    'INSERT IGNORE INTO users (id, name, email, password_hash, profile_image, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
);
foreach ($data['users'] as $u) {
    $hash = ($u['role'] === 'ADMIN') ? $adminHash : null;
    $uStmt->execute([
        $u['id'], $u['name'], $u['email'],
        $hash, $u['profile_image'], $u['role'], $u['created_at']
    ]);
    echo "User: {$u['email']} [{$u['role']}]\n";
}

// --- Products ---
$pStmt = $db->prepare(
    'INSERT IGNORE INTO products (id, name, description, price, image, category, is_available, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
foreach ($data['products'] as $p) {
    $pStmt->execute([
        $p['id'], $p['name'], $p['description'],
        $p['price'], $p['image'], $p['category'],
        $p['is_available'] ? 1 : 0, $p['created_at']
    ]);
    echo "Product: {$p['name']}\n";
}

// --- Orders ---
foreach ($data['orders'] as $o) {
    // Insert order (use specific IDs from JSON)
    $db->prepare(
        'INSERT IGNORE INTO orders (id, user_id, customer_name, customer_email, notes, total_amount, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $o['id'], $o['user_id'] ?? null,
        $o['customer_name'], $o['customer_email'] ?? null,
        $o['notes'] ?? null, $o['total_amount'],
        $o['status'], $o['created_at']
    ]);
    echo "Order #{$o['id']}: {$o['customer_name']}\n";

    // Order items
    $iStmt = $db->prepare(
        'INSERT IGNORE INTO order_items (order_id, product_id, product_name, price, quantity, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    foreach ($o['items'] as $item) {
        $iStmt->execute([
            $o['id'], $item['product_id'],
            $item['product_name'], $item['price'],
            $item['quantity'], $item['subtotal']
        ]);
    }
}

// Set next auto_increment above seed data
$nextId = $data['nextOrderId'] ?? 1026;
$db->exec("ALTER TABLE orders AUTO_INCREMENT = {$nextId}");

echo "\n=== Done! Delete seed.php now. ===\n";
echo "Admin login: admin@kkeopi.com / kkeopi2026\n";
echo "Admin hash stored: {$adminHash}\n";
