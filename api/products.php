<?php
/**
 * KKEOPI — Products CRUD
 * GET    /api/products           list all (optional ?category=)
 * GET    /api/products/{id}      single product
 * POST   /api/products           create  [admin]
 * PUT    /api/products/{id}      update  [admin]
 * DELETE /api/products/{id}      delete  [admin]
 */

function handleProducts(string $method, ?string $id, ?string $sub): void {
    $db = getDB();

    // LIST or GET single
    if ($method === 'GET') {
        if ($id === null) {
            // Optional category filter
            $cat = $_GET['category'] ?? '';
            if ($cat) {
                $stmt = $db->prepare('SELECT * FROM products WHERE LOWER(category)=LOWER(?) ORDER BY name');
                $stmt->execute([$cat]);
            } else {
                $stmt = $db->query('SELECT * FROM products ORDER BY name');
            }
            $rows = $stmt->fetchAll();
            // Cast types so JS gets booleans/numbers
            $rows = array_map('castProduct', $rows);
            json_ok($rows);
        } else {
            $stmt = $db->prepare('SELECT * FROM products WHERE id=?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) json_err('Product not found', 404);
            json_ok(castProduct($row));
        }
    }

    // CREATE [admin only]
    if ($method === 'POST') {
        if (!isAdmin()) json_err('Unauthorized', 401);
        $b = body();
        if (empty($b['name']) || !isset($b['price'])) json_err('name and price are required');
        $stmt = $db->prepare('INSERT INTO products (id, name, description, price, image, category, is_available)
                              VALUES (?, ?, ?, ?, ?, ?, ?)');
        // Generate slug ID from name
        $newId = preg_replace('/[^a-z0-9]+/', '-', strtolower(trim($b['name'])));
        $newId = trim($newId, '-');
        $stmt->execute([
            $newId,
            $b['name'],
            $b['description'] ?? '',
            (float)$b['price'],
            $b['image'] ?? '',
            $b['category'] ?? 'Coffee',
            isset($b['is_available']) ? (int)(bool)$b['is_available'] : 1,
        ]);
        $stmt2 = $db->prepare('SELECT * FROM products WHERE id=?');
        $stmt2->execute([$newId]);
        json_ok(castProduct($stmt2->fetch()), 201);
    }

    // UPDATE [admin only]
    if ($method === 'PUT') {
        if (!isAdmin()) json_err('Unauthorized', 401);
        if (!$id) json_err('Product id required');
        $b = body();
        $db->prepare('UPDATE products SET name=?, description=?, price=?, image=?, category=?, is_available=?, updated_at=NOW()
                      WHERE id=?')
           ->execute([
                $b['name'] ?? '',
                $b['description'] ?? '',
                (float)($b['price'] ?? 0),
                $b['image'] ?? '',
                $b['category'] ?? 'Coffee',
                isset($b['is_available']) ? (int)(bool)$b['is_available'] : 1,
                $id,
           ]);
        $stmt = $db->prepare('SELECT * FROM products WHERE id=?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) json_err('Product not found', 404);
        json_ok(castProduct($row));
    }

    // DELETE [admin only]
    if ($method === 'DELETE') {
        if (!isAdmin()) json_err('Unauthorized', 401);
        if (!$id) json_err('Product id required');
        $db->prepare('DELETE FROM products WHERE id=?')->execute([$id]);
        json_ok(['id' => $id]);
    }

    json_err('Method not allowed', 405);
}

/** Cast DB row types for JS consumption */
function castProduct(array $row): array {
    $row['price']        = (float)$row['price'];
    $row['is_available'] = (bool)(int)$row['is_available'];
    return $row;
}
