<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * GET /api/products
     * Retrieve all available products, optionally filtered by category.
     */
    public function index(Request $request)
    {
        $query = Product::query();

        if ($request->has('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        $products = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    /**
     * GET /api/products/{id}
     */
    public function show($id)
    {
        $product = Product::find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'error' => 'Product not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $product,
        ]);
    }

    /**
     * POST /api/products
     * Admin creates a new product with Laravel validation.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:1',
            'category' => 'required|in:Coffee,Non-Coffee,Pastries',
            'image' => 'nullable|string|url',
            'is_available' => 'nullable|boolean',
        ]);

        $id = Str::slug($validated['name']) . '-' . rand(100, 999);

        $product = Product::create([
            'id' => $id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? '',
            'price' => $validated['price'],
            'category' => $validated['category'],
            'image' => $validated['image'] ?? 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
            'is_available' => $validated['is_available'] ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product created successfully',
            'data' => $product,
        ], 201);
    }

    /**
     * PUT /api/products/{id}
     */
    public function update(Request $request, $id)
    {
        $product = Product::find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'error' => 'Product not found',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|required|numeric|min:1',
            'category' => 'sometimes|required|in:Coffee,Non-Coffee,Pastries',
            'image' => 'nullable|string|url',
            'is_available' => 'sometimes|boolean',
        ]);

        $product->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Product updated successfully',
            'data' => $product,
        ]);
    }

    /**
     * DELETE /api/products/{id}
     */
    public function destroy($id)
    {
        $product = Product::find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'error' => 'Product not found',
            ], 404);
        }

        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully',
        ]);
    }
}
