<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * POST /api/auth/sync
     * Synchronize customer authenticated via Supabase Google OAuth
     */
    public function syncUser(Request $request)
    {
        $validated = $request->validate([
            'id' => 'required|string', // Supabase Auth user UUID
            'email' => 'required|email',
            'name' => 'nullable|string',
            'profile_image' => 'nullable|string',
            'role' => 'nullable|string',
        ]);

        $user = User::where('id', $validated['id'])
                    ->orWhere('email', $validated['email'])
                    ->first();

        $role = $validated['role'] ?? (str_contains(strtolower($validated['email']), 'admin') ? 'ADMIN' : 'CUSTOMER');

        if ($user) {
            $user->update([
                'id' => $validated['id'],
                'name' => $validated['name'] ?? $user->name,
                'profile_image' => $validated['profile_image'] ?? $user->profile_image,
                'role' => $role,
            ]);
        } else {
            $user = User::create([
                'id' => $validated['id'],
                'name' => $validated['name'] ?? explode('@', $validated['email'])[0],
                'email' => $validated['email'],
                'profile_image' => $validated['profile_image'] ?? null,
                'role' => $role,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Supabase user synchronized successfully',
            'data' => $user,
        ]);
    }

    /**
     * GET /api/auth/config
     * Provide public Supabase credentials for client-side Auth
     */
    public function config()
    {
        $rawUrl = env('SUPABASE_URL', '');
        $cleanUrl = preg_replace('/\/rest\/v1\/?$/i', '', $rawUrl);
        $cleanUrl = rtrim($cleanUrl, '/');

        return response()->json([
            'success' => true,
            'data' => [
                'supabaseUrl' => $cleanUrl,
                'supabaseAnonKey' => env('SUPABASE_ANON_KEY', ''),
            ],
        ]);
    }

    /**
     * GET /api/auth/me
     */
    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'authenticated' => false,
                'guest' => true,
            ],
        ]);
    }
}
