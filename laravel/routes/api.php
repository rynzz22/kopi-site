<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\AuthController;

/*
|--------------------------------------------------------------------------
| KKEOPI Coffee Shop API Routes
|--------------------------------------------------------------------------
| Simple, clean, and functional API routes.
*/

// Products API
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::post('/products', [ProductController::class, 'store']);
Route::put('/products/{id}', [ProductController::class, 'update']);
Route::delete('/products/{id}', [ProductController::class, 'destroy']);

// Orders API
Route::post('/orders', [OrderController::class, 'store']);
Route::get('/orders', [OrderController::class, 'index']);
Route::get('/orders/my-orders', [OrderController::class, 'myOrders']);
Route::get('/orders/{id}', [OrderController::class, 'show']);
Route::put('/orders/{id}/status', [OrderController::class, 'updateStatus']);

// Supabase Auth Integration API
Route::post('/auth/sync', [AuthController::class, 'syncUser']);
Route::get('/auth/config', [AuthController::class, 'config']);
Route::get('/auth/me', [AuthController::class, 'me']);
Route::get('/stats', [OrderController::class, 'stats']);
