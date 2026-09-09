<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Profile extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $table = 'profiles';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',            // Supabase auth.users(id) UUID
        'name',
        'email',
        'profile_image',
        'role',          // 'CUSTOMER' or 'ADMIN'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationship: Profile has many Orders
     */
    public function orders()
    {
        return $this->hasMany(Order::class, 'customer_id', 'id');
    }

    /**
     * Convenience helper: check if profile is admin
     */
    public function isAdmin(): bool
    {
        return strtoupper($this->role) === 'ADMIN';
    }

    /**
     * Convenience helper: check if profile is customer
     */
    public function isCustomer(): bool
    {
        return strtoupper($this->role) === 'CUSTOMER';
    }
}
