<?php
/**
 * KKEOPI — Orders API
 * POST   /api/orders                    create order (any)
 * GET    /api/orders                    list all [admin] or filter by ?user_id=
 * GET    /api/orders/my-orders          customer's own orders (?user_id=)
 * GET    /api/orders/{id}               single order with items
 * PUT    /api/orders/{id}/status        update status [admin]
 */

function handleOrders(string $method, ?string $id, ?string $sub): void {
    $db = getDB();

    // --- GET /api/orders/my-orders ---
    if ($method === 'GET' && $id === 'my-orders') {
        $userId = $_GET['user_id'] ?? '';
        if (!$userId) json_err('user_id required', 400);
        $stmt = $db->prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC');
        $stmt->execute([$userId]);
        $orders = $stmt->fetchAll();
        $orders = array_map(fn($o) => withItems($o, $db), $orders);
        json_ok($orders);
    }

    // --- GET /api/orders or /api/orders?user_id= ---
    if ($method === 'GET' && $id === null) {
        $userId = $_GET['user_id'] ?? '';
        if ($userId) {
            $stmt = $db->prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC');
            $stmt->execute([$userId]);
        } elseif (isAdmin()) {
            // Admin sees all orders
            $stmt = $db->query('SELECT * FROM orders ORDER BY created_at DESC');
        } else {
            json_err('Unauthorized', 401);
            return;
        }
        $orders = $stmt->fetchAll();
        $orders = array_map(fn($o) => withItems($o, $db), $orders);
        json_ok($orders);
    }

    // --- GET /api/orders/{id} ---
    if ($method === 'GET' && $id !== null) {
        $stmt = $db->prepare('SELECT * FROM orders WHERE id=?');
        $stmt->execute([$id]);
        $order = $stmt->fetch();
        if (!$order) json_err('Order not found', 404);
        json_ok(withItems($order, $db));
    }

    // --- POST /api/orders ---
    if ($method === 'POST') {
        $b = body();
        if (empty($b['customer_name'])) json_err('customer_name is required');
        if (empty($b['items']) || !is_array($b['items'])) json_err('items array is required');

        // Calculate total from items
        $total = 0;
        foreach ($b['items'] as $item) {
            $total += (float)($item['subtotal'] ?? ($item['price'] * $item['quantity']));
        }

        $db->beginTransaction();
        try {
            $db->prepare('INSERT INTO orders (user_id, customer_name, customer_email, notes, total_amount, status)
                          VALUES (?, ?, ?, ?, ?, "PENDING")')
               ->execute([
                   $b['user_id'] ?? null,
                   $b['customer_name'],
                   $b['customer_email'] ?? null,
                   $b['notes'] ?? null,
                   $total,
               ]);
            $orderId = (int)$db->lastInsertId();

            // Insert each order item
            $iStmt = $db->prepare('INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal)
                                   VALUES (?, ?, ?, ?, ?, ?)');
            foreach ($b['items'] as $item) {
                $iStmt->execute([
                    $orderId,
                    $item['product_id'] ?? null,
                    $item['product_name'] ?? '',
                    (float)($item['price'] ?? 0),
                    (int)($item['quantity'] ?? 1),
                    (float)($item['subtotal'] ?? ($item['price'] * $item['quantity'])),
                ]);
            }
            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            json_err('Failed to create order: ' . $e->getMessage(), 500);
        }

        // Return new order with items
        $stmt = $db->prepare('SELECT * FROM orders WHERE id=?');
        $stmt->execute([$orderId]);
        json_ok(withItems($stmt->fetch(), $db), 201);
    }

    // --- PUT /api/orders/{id}/status  [admin] ---
    if ($method === 'PUT' && $sub === 'status') {
        if (!isAdmin()) json_err('Unauthorized', 401);
        $b = body();
        $allowed = ['PENDING','CONFIRMED','PREPARING','READY','COMPLETED','CANCELLED'];
        $status = strtoupper($b['status'] ?? '');
        if (!in_array($status, $allowed, true)) json_err('Invalid status');

        $db->prepare('UPDATE orders SET status=?, updated_at=NOW() WHERE id=?')
           ->execute([$status, $id]);

        $stmt = $db->prepare('SELECT * FROM orders WHERE id=?');
        $stmt->execute([$id]);
        $order = $stmt->fetch();
        if (!$order) json_err('Order not found', 404);
        json_ok(withItems($order, $db));
    }

    json_err('Method not allowed', 405);
}

/** Attach order_items array to order row */
function withItems(array $order, PDO $db): array {
    $order['total_amount'] = (float)$order['total_amount'];
    $stmt = $db->prepare('SELECT * FROM order_items WHERE order_id=?');
    $stmt->execute([$order['id']]);
    $items = $stmt->fetchAll();
    $order['items'] = array_map(function($item) {
        $item['price']    = (float)$item['price'];
        $item['subtotal'] = (float)$item['subtotal'];
        $item['quantity'] = (int)$item['quantity'];
        return $item;
    }, $items);
    return $order;
}
