<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $table = 'orders';

    protected $fillable = [
        'customer_id',
        'customer_name',
        'customer_email',
        'status',
        'total_amount',
        'notes',
    ];

    protected $casts = [
        'total_amount' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationship: Order has many OrderItems
     */
    public function items()
    {
        return $this->hasMany(OrderItem::class, 'order_id', 'id');
    }

    /**
     * Relationship: Order belongs to a customer Profile
     */
    public function profile()
    {
        return $this->belongsTo(Profile::class, 'customer_id', 'id');
    }

    /**
     * Alias for profile (convenience)
     */
    public function customer()
    {
        return $this->belongsTo(Profile::class, 'customer_id', 'id');
    }
}
