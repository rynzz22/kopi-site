<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Events\OrderCreated;
use App\Events\OrderStatusUpdated;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * GET /api/orders
     */
    public function index(Request $request)
    {
        $query = Order::with('items');

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $orders = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    /**
     * GET /api/orders/my-orders
     * Retrieve orders associated with the authenticated Supabase customer
     */
    public function myOrders(Request $request)
    {
        $userId = $request->query('user_id');
        if (!$userId) {
            return response()->json([
                'success' => false,
                'error' => 'Authentication required. Please sign in with Supabase Google Auth.',
            ], 401);
        }

        $orders = Order::with('items')
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    /**
     * GET /api/orders/{id}
     */
    public function show($id)
    {
        $order = Order::with('items')->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'error' => 'Order not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }

    /**
     * POST /api/orders
     * Customer creates an order.
     * Request validated, calculated, saved to DB, and WebSocket event triggered.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'required|email|max:255',
            'user_id' => 'nullable|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($validated) {
            $totalAmount = 0;
            $itemsData = [];

            foreach ($validated['items'] as $itemInput) {
                $product = Product::findOrFail($itemInput['product_id']);

                if (!$product->is_available) {
                    return response()->json([
                        'success' => false,
                        'error' => "Product {$product->name} is currently out of stock.",
                    ], 400);
                }

                $quantity = (int) $itemInput['quantity'];
                $price = (float) $product->price;
                $subtotal = $price * $quantity;
                $totalAmount += $subtotal;

                $itemsData[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $quantity,
                    'price' => $price,
                    'subtotal' => $subtotal,
                ];
            }

            $order = Order::create([
                'user_id' => $validated['user_id'] ?? null,
                'customer_name' => $validated['customer_name'],
                'customer_email' => $validated['customer_email'],
                'status' => 'PENDING',
                'total_amount' => $totalAmount,
                'notes' => $validated['notes'] ?? '',
            ]);

            foreach ($itemsData as $item) {
                $order->items()->create($item);
            }

            $order->load('items');

            // Dispatch WebSocket Event to notify Admin in real time
            event(new OrderCreated($order));

            return response()->json([
                'success' => true,
                'message' => 'Order placed successfully',
                'data' => $order,
            ], 201);
        });
    }

    /**
     * PUT /api/orders/{id}/status
     */
    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:PENDING,CONFIRMED,PREPARING,READY,COMPLETED,CANCELLED',
        ]);

        $order = Order::with('items')->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'error' => 'Order not found',
            ], 404);
        }

        $order->status = $validated['status'];
        $order->save();

        // Dispatch WebSocket Event to notify Customer tracking page
        event(new OrderStatusUpdated($order));

        return response()->json([
            'success' => true,
            'message' => "Order #{$order->id} status updated to {$order->status}",
            'data' => $order,
        ]);
    }

    /**
     * GET /api/stats
     */
    public function stats()
    {
        $pending = Order::where('status', 'PENDING')->count();
        $preparing = Order::where('status', 'PREPARING')->count();
        $ready = Order::where('status', 'READY')->count();
        $completed = Order::where('status', 'COMPLETED')->count();
        $totalRevenue = Order::where('status', '!=', 'CANCELLED')->sum('total_amount');

        return response()->json([
            'success' => true,
            'data' => [
                'pendingOrders' => $pending,
                'preparingOrders' => $preparing,
                'readyOrders' => $ready,
                'completedOrders' => $completed,
                'totalOrders' => Order::count(),
                'totalRevenue' => (float) $totalRevenue,
            ],
        ]);
    }
}
