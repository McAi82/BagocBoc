<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Budget extends Model
{
    use HasFactory;

    protected $fillable = [
        'year',
        'category',
        'allocated',
        'utilized',
        'remaining',
        'description',
        'status',
    ];

    protected $casts = [
        'allocated' => 'decimal:2',
        'utilized' => 'decimal:2',
        'remaining' => 'decimal:2',
    ];
}