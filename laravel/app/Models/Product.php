<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $table = 'products';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'description',
        'price',
        'image',
        'category_id',
        'is_available',
    ];

    protected $casts = [
        'price' => 'float',
        'is_available' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationship: Product belongs to a Category
     */
    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id', 'id');
    }

    /**
     * Relationship: Product has many OrderItems
     */
    public function orderItems()
    {
        return $this->hasMany(OrderItem::class, 'product_id', 'id');
    }
}
