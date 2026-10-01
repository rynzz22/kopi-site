<?php
/**
 * KKEOPI — Stats
 * GET /api/stats  [admin]
 * Returns: total_orders, total_sales, total_products, today_orders, today_sales, pending_count
 */

function handleStats(): void {
    if (!isAdmin()) json_err('Unauthorized', 401);

    $db = getDB();
    $today = date('Y-m-d');

    $stats = [];

    // Total counts
    $stats['total_orders']   = (int)$db->query('SELECT COUNT(*) FROM orders')->fetchColumn();
    $stats['total_products'] = (int)$db->query('SELECT COUNT(*) FROM products')->fetchColumn();
    $stats['total_sales']    = (float)$db->query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status!='CANCELLED'")->fetchColumn();

    // Today
    $stmt = $db->prepare("SELECT COUNT(*), COALESCE(SUM(total_amount),0) FROM orders WHERE DATE(created_at)=? AND status!='CANCELLED'");
    $stmt->execute([$today]);
    [$todayOrders, $todaySales] = $stmt->fetch(PDO::FETCH_NUM);
    $stats['today_orders'] = (int)$todayOrders;
    $stats['today_sales']  = (float)$todaySales;

    // Pending
    $stats['pending_count'] = (int)$db->query("SELECT COUNT(*) FROM orders WHERE status='PENDING'")->fetchColumn();

    json_ok($stats);
}
