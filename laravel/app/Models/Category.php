<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $table = 'categories';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'description',
    ];

    /**
     * Relationship: Category has many Products
     */
    public function products()
    {
        return $this->hasMany(Product::class, 'category_id', 'id');
    }
}
