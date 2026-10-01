<?php
/**
 * KKEOPI — Admin Auth
 * POST /api/admin/login    { username, password } → { token, user }
 * POST /api/admin/logout
 * GET  /api/admin/me
 *
 * Credentials stored in DB (users table, role=ADMIN, password_hash column).
 * Default: admin@kkeopi.com / kkeopi2026
 */

function handleAdmin(string $method, ?string $action): void {
    $db = getDB();

    // --- LOGIN ---
    if ($action === 'login' && $method === 'POST') {
        $b = body();
        // Accept either 'username' or 'email' field (kopi-client sends 'username')
        $email = $b['username'] ?? $b['email'] ?? '';
        $pass  = $b['password'] ?? '';

        if (!$email || !$pass) json_err('Email and password required');

        $stmt = $db->prepare("SELECT * FROM users WHERE email=? AND role='ADMIN'");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($pass, $user['password_hash'])) {
            json_err('Invalid admin credentials', 401);
        }

        // Store in PHP session
        $_SESSION['admin_id']    = $user['id'];
        $_SESSION['admin_email'] = $user['email'];
        $_SESSION['admin_name']  = $user['name'];

        // Simple token: just the session id (client stores it in sessionStorage)
        $token = session_id();

        json_ok([
            'token' => $token,
            'user'  => [
                'id'    => $user['id'],
                'name'  => $user['name'],
                'email' => $user['email'],
                'role'  => 'ADMIN',
            ]
        ]);
    }

    // --- LOGOUT ---
    if ($action === 'logout' && $method === 'POST') {
        session_destroy();
        json_ok(['message' => 'Logged out']);
    }

    // --- ME ---
    if ($action === 'me' && $method === 'GET') {
        if (!isAdmin()) json_err('Not authenticated', 401);
        json_ok([
            'id'    => $_SESSION['admin_id']    ?? 'adm',
            'name'  => $_SESSION['admin_name']  ?? 'Barista Admin',
            'email' => $_SESSION['admin_email'] ?? 'admin@kkeopi.com',
            'role'  => 'ADMIN',
        ]);
    }

    json_err('Admin endpoint not found', 404);
}
