<?php
/**
 * KKEOPI — Main API Router
 * Handles all /api/* requests via mod_rewrite (.htaccess).
 * Routes: products, orders, admin, auth, stats
 */

require_once __DIR__ . '/db.php';

// --- CORS & JSON headers ---
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Session start (for admin auth) ---
session_name('kkeopi_admin');
session_start();

// --- Helpers ---
function json_ok($data = null, int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

function json_err(string $message, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

function body(): array {
    $raw = file_get_contents('php://input');
    return $raw ? (json_decode($raw, true) ?? []) : [];
}

function isAdmin(): bool {
    // Check session first
    if (!empty($_SESSION['admin_id'])) return true;
    // Also accept the hardcoded demo bearer token (kopi-client.js fallback)
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($auth === 'Bearer adm_barista_session_secret_2026') return true;
    return false;
}

// --- Path parsing ---
// Expected: /api/<resource>[/<id>][/<sub>]
$requestUri  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$requestUri  = str_replace('/api', '', $requestUri); // strip /api prefix
$parts       = array_values(array_filter(explode('/', $requestUri)));
$resource    = $parts[0] ?? '';
$id          = $parts[1] ?? null;
$sub         = $parts[2] ?? null;
$method      = $_SERVER['REQUEST_METHOD'];

// ============================================================
//  ROUTER
// ============================================================

switch ($resource) {

    // --------------------------------------------------------
    //  PRODUCTS
    // --------------------------------------------------------
    case 'products':
        require_once __DIR__ . '/products.php';
        handleProducts($method, $id, $sub);
        break;

    // --------------------------------------------------------
    //  ORDERS
    // --------------------------------------------------------
    case 'orders':
        require_once __DIR__ . '/orders.php';
        handleOrders($method, $id, $sub);
        break;

    // --------------------------------------------------------
    //  ADMIN
    // --------------------------------------------------------
    case 'admin':
        require_once __DIR__ . '/admin.php';
        handleAdmin($method, $id); // $id = login | logout | me
        break;

    // --------------------------------------------------------
    //  AUTH  (Supabase sync / me / config)
    // --------------------------------------------------------
    case 'auth':
        require_once __DIR__ . '/auth.php';
        handleAuth($method, $id);
        break;

    // --------------------------------------------------------
    //  STATS
    // --------------------------------------------------------
    case 'stats':
        require_once __DIR__ . '/stats.php';
        handleStats();
        break;

    default:
        json_err('API endpoint not found', 404);
}
