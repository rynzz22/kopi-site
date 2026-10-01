<?php
/**
 * KKEOPI — Auth Endpoints (Supabase/Google stub → plain PHP)
 *
 * GET  /api/auth/config   Returns success:true but empty supabaseUrl
 *                         so kopi-client.js skips Supabase init gracefully.
 *
 * POST /api/auth/sync     Upsert customer user into DB (called after Google login
 *                         or demo login). We store / update the record so orders
 *                         can reference a real user_id.
 *
 * GET  /api/auth/me       Returns current user from localStorage (front-end
 *                         already handles this; this is a server-side fallback).
 */

function handleAuth(string $method, ?string $action): void {
    $db = getDB();

    // --- CONFIG: tell the JS there is no Supabase ---
    if ($action === 'config' && $method === 'GET') {
        // Return success:true but empty supabaseUrl so the JS skips Supabase init
        json_ok(['supabaseUrl' => null, 'supabaseAnonKey' => null]);
    }

    // --- SYNC: upsert customer user ---
    if ($action === 'sync' && $method === 'POST') {
        $b = body();
        $userId = $b['id']     ?? null;
        $email  = $b['email']  ?? '';
        $name   = $b['name']   ?? 'Guest';
        $avatar = $b['avatar'] ?? '';
        $role   = 'CUSTOMER';   // Google / demo users are always CUSTOMER

        if (!$userId) json_err('user id required');

        // Upsert into users table
        $db->prepare('INSERT INTO users (id, name, email, profile_image, role)
                      VALUES (?, ?, ?, ?, ?)
                      ON DUPLICATE KEY UPDATE name=VALUES(name), profile_image=VALUES(profile_image), updated_at=NOW()')
           ->execute([$userId, $name, $email, $avatar, $role]);

        json_ok(['id' => $userId, 'name' => $name, 'email' => $email, 'role' => $role]);
    }

    // --- ME: server-side session read (optional) ---
    if ($action === 'me' && $method === 'GET') {
        if (!empty($_SESSION['admin_id'])) {
            json_ok([
                'id'    => $_SESSION['admin_id'],
                'name'  => $_SESSION['admin_name']  ?? 'Admin',
                'email' => $_SESSION['admin_email'] ?? '',
                'role'  => 'ADMIN',
            ]);
        }
        json_err('Not authenticated', 401);
    }

    json_err('Auth endpoint not found', 404);
}
